// Skin map: two equal-area hemisphere discs (Lambert azimuthal), body frame.
// Left disc centred on body −y (the underside at rest on a level floor), right disc on body +y.
// Same orientation in both: +x to the right, +z downward. Rim = equator.

// One hue (blue), sequential, fixed in newtons. Low pressure recedes, high pressure is bright.
export const RAMP = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'];
export const ZERO_COLOR = '#343941';
const rgb = RAMP.map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
export function pressureRGB(p, scaleMax) {
  if (!(p > 0)) return null;
  const t = Math.min(p / scaleMax, 1) * (rgb.length - 1);
  const i = Math.min(Math.floor(t), rgb.length - 2), f = t - i;
  return rgb[i].map((c, k) => Math.round(c + (rgb[i + 1][k] - c) * f));
}

export function createSkinMap(canvas, unit, count) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, disc = null, pts = [];

  // Unit vector (body frame) → point on the map.
  function project(x, y, z) {
    const lower = y < 0;
    const theta = Math.acos(Math.min(1, Math.abs(y))); // angle from the disc's pole
    const rho = (2 * Math.sin(theta / 2)) / Math.SQRT2;  // 0 at pole, 1 at equator
    const az = Math.atan2(z, x);
    const cx = disc.cx[lower ? 0 : 1];
    return { x: cx + disc.r * rho * Math.cos(az), y: disc.cy + disc.r * rho * Math.sin(az) };
  }
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    if (w * dpr !== canvas.width || h * dpr !== canvas.height) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (w !== W || h !== H) {
      W = w; H = h;
      const r = Math.min(w / 4 - 10, (h - 30) / 2 - 6);
      disc = { r, cy: 22 + (h - 22) / 2, cx: [w / 4, (3 * w) / 4] };
      pts = Array.from({ length: count }, (_, i) => project(unit[3 * i], unit[3 * i + 1], unit[3 * i + 2]));
    }
    return true;
  }

  // pressure: per-taxel N. patches: [{ where: {x,y,z} }] numbered markers. dim: touch not given to the model.
  function draw(pressure, { scaleMax = 3, patches = [], dim = false } = {}) {
    if (!layout()) return;
    ctx.clearRect(0, 0, W, H);
    const dotR = Math.max(2.5, disc.r * 0.052);
    disc.cx.forEach((cx, k) => {
      const g = ctx.createRadialGradient(cx, disc.cy, 0, cx, disc.cy, disc.r + 8);
      g.addColorStop(0, '#141a21'); g.addColorStop(1, '#0f1317');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, disc.cy, disc.r + 8, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#2a323c'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([2, 4]); ctx.strokeStyle = '#222a33';
      ctx.beginPath(); ctx.moveTo(cx - disc.r, disc.cy); ctx.lineTo(cx + disc.r, disc.cy);
      ctx.moveTo(cx, disc.cy - disc.r); ctx.lineTo(cx, disc.cy + disc.r); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#8b95a3'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k === 0 ? 'UNDERSIDE  ·  body −y' : 'TOP  ·  body +y', cx, 13);
      ctx.fillStyle = '#5c6673'; ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('+x', cx + disc.r + 2, disc.cy - 4);
      ctx.fillText('+z', cx + 9, disc.cy + disc.r + 6);
    });
    // Zero taxels first, then pressed ones (glow) on top.
    ctx.globalAlpha = dim ? 0.45 : 1;
    ctx.fillStyle = ZERO_COLOR;
    for (let i = 0; i < count; i++) {
      if (pressure[i] > 0) continue;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, dotR * 0.7, 0, 2 * Math.PI); ctx.fill();
    }
    for (let i = 0; i < count; i++) {
      const c = pressureRGB(pressure[i], scaleMax);
      if (!c) continue;
      const col = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.shadowColor = col; ctx.shadowBlur = dotR * 1.6;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, dotR, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // Patch markers at each patch's centre of pressure.
    patches.forEach((p, k) => {
      if (!p.where) return;
      const m = project(p.where.x, p.where.y, p.where.z);
      ctx.strokeStyle = '#e9eef4'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, dotR * 2.6, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#e9eef4'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(String(k + 1), m.x + dotR * 2.6 + 3, m.y - dotR * 2.6 + 4);
    });
  }

  // Nearest taxel to a client point, or -1.
  function hit(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let best = -1, bestD = (disc ? disc.r * 0.09 : 10) ** 2;
    pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bestD) { bestD = d; best = i; } });
    return best;
  }
  return { draw, hit };
}
