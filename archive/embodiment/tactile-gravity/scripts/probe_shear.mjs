// Probe: what do contactTangentImpulseX/Y mean? Rapier's JS API exposes the two tangent impulses
// but not the tangent basis they are expressed in. Identify it empirically: a sphere at rest on a
// tilted plane needs friction f = −m·g − N·n exactly (equilibrium), so test candidate
// (basis, sign) conventions against that across several plane orientations and both collider
// creation orders (which flips the manifold's collider order).
//   node scripts/probe_shear.mjs
import RAPIER from '@dimforge/rapier3d-compat';
import { tangentBasis } from '../src/skin.js';

await RAPIER.init();
const G = 9.81, M = 1.0, R = 0.5;
const deg = Math.PI / 180;

function axisAngle(ax, ay, az, ang) {
  const l = Math.hypot(ax, ay, az), s = Math.sin(ang / 2);
  return { x: (ax / l) * s, y: (ay / l) * s, z: (az / l) * s, w: Math.cos(ang / 2) };
}
function rotate(q, v) {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + (q.y * tz - q.z * ty), y: v.y + q.w * ty + (q.z * tx - q.x * tz), z: v.z + q.w * tz + (q.x * ty - q.y * tx) };
}
const add = (a, b, k = 1) => ({ x: a.x + k * b.x, y: a.y + k * b.y, z: a.z + k * b.z });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const norm = (a) => Math.hypot(a.x, a.y, a.z);
const fmt = (v) => `[${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}]`;

// One settled reading: plane rotated by q (normal = q·ŷ), sphere resting on it, rotation locked.
function reading(q, sphereFirst) {
  const world = new RAPIER.World({ x: 0, y: -G, z: 0 });
  const n = rotate(q, { x: 0, y: 1, z: 0 });
  const make = {
    floor: () => world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5).setTranslation(-0.1 * n.x, -0.1 * n.y, -0.1 * n.z)
      .setRotation(q).setFriction(1), world.createRigidBody(RAPIER.RigidBodyDesc.fixed())),
    sphere: () => {
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(n.x * (R + 1e-3), n.y * (R + 1e-3), n.z * (R + 1e-3)).setCanSleep(false));
      b.lockRotations(true, true);
      return world.createCollider(RAPIER.ColliderDesc.ball(R).setMass(M).setFriction(1), b);
    },
  };
  let sphere, floor;
  if (sphereFirst) { sphere = make.sphere(); floor = make.floor(); } else { floor = make.floor(); sphere = make.sphere(); }
  for (let i = 0; i < 240; i++) world.step();
  let out = null;
  world.contactPair(sphere, floor, (m, flipped) => {
    let jn = 0, jx = 0, jy = 0;
    for (let i = 0; i < m.numContacts(); i++) { jn += m.contactImpulse(i); jx += m.contactTangentImpulseX(i); jy += m.contactTangentImpulseY(i); }
    const nm = m.normal();
    out = { flipped, nm: { x: nm.x, y: nm.y, z: nm.z }, N: jn / world.timestep, tx: jx / world.timestep, ty: jy / world.timestep,
      v: norm(sphere.parent().linvel()), contacts: m.numContacts() };
  });
  world.free();
  // Ground truth friction on the sphere from equilibrium: N·n_into_sphere + f + m·g = 0.
  const nInto = out.flipped ? out.nm : scale(out.nm, -1);
  out.fTrue = add(scale({ x: 0, y: -G, z: 0 }, -M), nInto, -out.N);
  return out;
}

// Candidate conventions: basis built from the manifold normal or its negative; the impulse acts on
// manifold collider2 with sign s (collider1 gets the opposite).
const candidates = [];
for (const fromNeg of [false, true]) for (const s of [1, -1]) candidates.push({ fromNeg, s, name: `basis(${fromNeg ? '−' : '+'}n_manifold), s=${s > 0 ? '+' : '−'}` });
function predict(c, r) {
  const [t1, t2] = tangentBasis(c.fromNeg ? scale(r.nm, -1) : r.nm);
  const onCollider2 = scale(add(scale(t1, r.tx), t2, r.ty), c.s);
  return r.flipped ? onCollider2 : scale(onCollider2, -1); // sphere is collider2 iff flipped
}

const planes = [
  ['tilt 20° about z', axisAngle(0, 0, 1, 20 * deg)],
  ['tilt −35° about z', axisAngle(0, 0, 1, -35 * deg)],
  ['tilt 25° about x', axisAngle(1, 0, 0, 25 * deg)],
  ['tilt 30° about (1,0,1)', axisAngle(1, 0, 1, 30 * deg)],
  ['tilt 40° about (−2,0,1)', axisAngle(-2, 0, 1, 40 * deg)],
];
const err = candidates.map(() => 0);
for (const [label, q] of planes) {
  for (const sphereFirst of [true, false]) {
    const r = reading(q, sphereFirst);
    console.log(`${label.padEnd(24)} ${sphereFirst ? 'sphere created first' : 'floor created first '}  flipped=${String(r.flipped).padEnd(5)} contacts=${r.contacts}` +
      `  N=${r.N.toFixed(4)}  tangent (x,y)=(${r.tx.toFixed(4)}, ${r.ty.toFixed(4)})  |v|=${r.v.toExponential(1)}`);
    console.log(`${''.padEnd(26)}friction from equilibrium ${fmt(r.fTrue)} |f|=${norm(r.fTrue).toFixed(4)}`);
    candidates.forEach((c, k) => { err[k] = Math.max(err[k], norm(add(predict(c, r), r.fTrue, -1))); });
  }
}
console.log('\nmax |predicted − equilibrium friction| per convention (N):');
candidates.forEach((c, k) => console.log(`  ${c.name.padEnd(26)} ${err[k].toExponential(2)}`));
