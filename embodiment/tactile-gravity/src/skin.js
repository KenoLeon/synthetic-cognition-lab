// Tactile skin: taxels in body-local coordinates, contact forces distributed by geometry.
// Pure math (no three.js / DOM), shared by the browser app and headless scripts.
//
// Model (see README "Skin model"):
//   The physics engine supplies, per touching surface S, the TOTAL normal force F_S and the
//   contact normal n (world, pointing into the body).
//   Geometry supplies the DISTRIBUTION against the ideal tangent plane of the undeformed sphere:
//   taxel i at body-local p_i sits d_i = n·p_i + r above that plane; weight
//   w_i = clamp(1 − d_i / h, 0, 1) for skin thickness h; then P_i += F_S · w_i / Σ_j w_j,
//   so the taxels sum exactly to the engine's force.
//   The solver's penetration depth is deliberately NOT used: it is a soft-constraint artifact
//   that scales with load and differs between floor/wall setups (0.07–0.55 mm at the same m·g),
//   which would leak solver internals into the sensation. Consequence: patch shape is
//   load-independent; only pressure scales.
//   Shear (v0.1): each contact's tangential force T_S (body frame) is spread with the SAME weights,
//   s_i += T_S · w_i / Σ_j w_j, so shear sums exactly to the engine's tangential force.
//   The skin force vector is Σ_S (F_S n_S + T_S): the full contact force on the body.

export const DEFAULT_TAXELS = 200;
export const DEFAULT_THICKNESS = 0.05; // m
export const DEFAULT_THRESHOLD = 0.01; // N, per taxel, for "contact area"
export const PATCH_SEPARATION_DEG = 30; // pressed taxels further apart than this start a new patch

// Fibonacci sphere: N quasi-uniform unit vectors, returned as [x0,y0,z0, x1,...].
export function fibonacciSphere(n) {
  const out = new Float64Array(3 * n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden;
    out[3 * i] = Math.cos(phi) * r;
    out[3 * i + 1] = y;
    out[3 * i + 2] = Math.sin(phi) * r;
  }
  return out;
}

// Rotate vector v by unit quaternion q (both {x,y,z[,w]}).
export function rotate(q, v) {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}
export function rotateInverse(q, v) {
  return rotate({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v);
}

// Orthonormal tangent pair for unit normal n (branchless basis, as in parry's SimdBasis).
// Rapier expresses contactTangentImpulseX/Y in this basis; scripts/probe_shear.mjs checks which
// normal (± manifold normal) and sign reproduce equilibrium friction.
export function tangentBasis(n) {
  const sign = n.z >= 0 ? 1 : -1;
  const a = -1 / (sign + n.z);
  const b = n.x * n.y * a;
  return [
    { x: 1 + sign * n.x * n.x * a, y: sign * b, z: -sign * n.x },
    { x: b, y: sign + n.y * n.y * a, z: -n.y },
  ];
}

export function createSkin({
  radius, count = DEFAULT_TAXELS, thickness = DEFAULT_THICKNESS, threshold = DEFAULT_THRESHOLD,
} = {}) {
  const unit = fibonacciSphere(count);
  const local = unit.map((c) => c * radius); // body-local taxel positions
  const pressure = new Float64Array(count);
  const shear = new Float64Array(3 * count);      // tangential force per taxel, body frame
  const normalForce = new Float64Array(3 * count); // P_i along its contact normal, body frame
  const weight = new Float64Array(count);
  const linkCos = Math.cos((PATCH_SEPARATION_DEG * Math.PI) / 180);
  const taxelArea = (4 * Math.PI * radius * radius) / count;

  const skin = {
    count, radius, thickness, threshold, unit, local, pressure, shear, normalForce, taxelArea,

    // bodyRot: world orientation of the body. contacts: [{ force, normal, tangent? }], vectors in
    // the world frame (tangent = tangential force on the body; absent → no shear).
    sense(bodyRot, contacts) {
      pressure.fill(0);
      shear.fill(0);
      normalForce.fill(0);
      // Contact vectors go into the body frame once; taxels stay body-local.
      for (const c of contacts) {
        if (!(c.force > 0)) continue;
        const n = rotateInverse(bodyRot, c.normal);
        const tb = c.tangent ? rotateInverse(bodyRot, c.tangent) : { x: 0, y: 0, z: 0 };
        const deposit = (i, k) => { // k = this taxel's share of the contact
          pressure[i] += c.force * k;
          normalForce[3 * i] += c.force * k * n.x; normalForce[3 * i + 1] += c.force * k * n.y; normalForce[3 * i + 2] += c.force * k * n.z;
          shear[3 * i] += tb.x * k; shear[3 * i + 1] += tb.y * k; shear[3 * i + 2] += tb.z * k;
        };
        let sum = 0;
        for (let i = 0; i < count; i++) {
          const d = n.x * local[3 * i] + n.y * local[3 * i + 1] + n.z * local[3 * i + 2] + radius;
          const w = Math.min(1, Math.max(0, 1 - d / skin.thickness));
          weight[i] = w;
          sum += w;
        }
        // sum == 0 only if h is smaller than the gap between the tangent point and its nearest
        // taxel. Never silently drop the engine's force: give it to the nearest taxel.
        if (sum === 0) {
          let best = 0, bestD = Infinity;
          for (let i = 0; i < count; i++) {
            const d = n.x * local[3 * i] + n.y * local[3 * i + 1] + n.z * local[3 * i + 2];
            if (d < bestD) { bestD = d; best = i; }
          }
          deposit(best, 1);
          continue;
        }
        for (let i = 0; i < count; i++) if (weight[i] > 0) deposit(i, weight[i] / sum);
      }
      return skin.summary();
    },

    // Contact patches: pressed taxels (P > threshold) linked when within PATCH_SEPARATION_DEG of each
    // other (single linkage), so patches more than that apart are separate.
    patches() {
      const pressed = [];
      for (let i = 0; i < count; i++) if (pressure[i] > skin.threshold) pressed.push(i);
      const label = new Map();
      const out = [];
      for (const seed of pressed) {
        if (label.has(seed)) continue;
        const members = [seed];
        label.set(seed, out.length);
        for (let q = 0; q < members.length; q++) {
          const a = members[q];
          for (const b of pressed) {
            if (label.has(b)) continue;
            const c = unit[3 * a] * unit[3 * b] + unit[3 * a + 1] * unit[3 * b + 1] + unit[3 * a + 2] * unit[3 * b + 2];
            if (c >= linkCos) { label.set(b, out.length); members.push(b); }
          }
        }
        let f = 0, cx = 0, cy = 0, cz = 0;
        const vec = { x: 0, y: 0, z: 0 }, sh = { x: 0, y: 0, z: 0 };
        for (const i of members) {
          f += pressure[i];
          cx += pressure[i] * unit[3 * i]; cy += pressure[i] * unit[3 * i + 1]; cz += pressure[i] * unit[3 * i + 2];
          sh.x += shear[3 * i]; sh.y += shear[3 * i + 1]; sh.z += shear[3 * i + 2];
          vec.x += normalForce[3 * i] + shear[3 * i]; vec.y += normalForce[3 * i + 1] + shear[3 * i + 1]; vec.z += normalForce[3 * i + 2] + shear[3 * i + 2];
        }
        const l = Math.hypot(cx, cy, cz);
        out.push({
          taxels: members.length,
          force: f,                                            // normal force in this patch (N)
          direction: l > 0 ? { x: cx / l, y: cy / l, z: cz / l } : null, // where on the body (unit)
          shear: sh,                                           // tangential force in this patch (N)
          forceVector: vec,                                    // full force on the body here (N)
        });
      }
      return out.sort((a, b) => b.force - a.force);
    },

    // Summary computed from the skin arrays (pressure, shear, and the contact normal each taxel's
    // pressure acts along, which the skin knows from sensing).
    summary() {
      let total = 0, cx = 0, cy = 0, cz = 0, active = 0, peak = 0, peakIndex = -1;
      for (let i = 0; i < count; i++) {
        const p = pressure[i];
        total += p;
        cx += p * local[3 * i]; cy += p * local[3 * i + 1]; cz += p * local[3 * i + 2];
        if (p > skin.threshold) active++;
        if (p > peak) { peak = p; peakIndex = i; }
      }
      let cop = null, copDir = null;
      if (total > 0) {
        cop = { x: cx / total, y: cy / total, z: cz / total };
        const l = Math.hypot(cop.x, cop.y, cop.z);
        copDir = l > 0 ? { x: cop.x / l, y: cop.y / l, z: cop.z / l } : null;
      }
      const sf = { x: 0, y: 0, z: 0 };
      for (let i = 0; i < count; i++) {
        sf.x += normalForce[3 * i] + shear[3 * i]; sf.y += normalForce[3 * i + 1] + shear[3 * i + 1]; sf.z += normalForce[3 * i + 2] + shear[3 * i + 2];
      }
      const sfMag = Math.hypot(sf.x, sf.y, sf.z);
      const patches = skin.patches();
      return {
        totalForce: total,
        centerOfPressure: cop,      // body frame, metres (lies inside the sphere)
        centerOfPressureDir: copDir, // unit vector, body frame
        contactArea: { taxels: active, m2: active * taxelArea },
        peak: { value: peak, index: peakIndex },
        patchCount: patches.length,
        patches,
        skinForce: sf,                 // normal + shear, body frame: the full contact force on the body (N)
        skinForceMagnitude: sfMag,
        skinForceDir: sfMag > 1e-9 ? { x: sf.x / sfMag, y: sf.y / sfMag, z: sf.z / sfMag } : null,
      };
    },
  };
  return skin;
}
