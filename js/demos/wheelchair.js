/* Bluetooth miniature wheelchair: differential drive from a controller (or arrow keys), with an ultrasonic
 * range sensor that vetoes any forward command closer than 25 cm. Top-down room; 1 px = 0.5 cm. */
Demos.register('wheelchair', (el, { T, h, onLang, loop, fitCanvas }) => {
  const RW = 560, RH = 300, STOP_CM = 25, CM = 0.5;
  const OBST = [[120, 70, 70, 60], [300, 170, 60, 90], [420, 40, 80, 50], [200, 220, 50, 50]];   // x, y, w, h
  const WALLS = [[0, 0, RW, 0], [RW, 0, RW, RH], [RW, RH, 0, RH], [0, RH, 0, 0]];
  const segs = [...WALLS];
  for (const [x, y, w, hh] of OBST) segs.push([x, y, x + w, y], [x + w, y, x + w, y + hh], [x + w, y + hh, x, y + hh], [x, y + hh, x, y]);

  let c = { x: 60, y: 150, th: 0 }, cmd = { f: 0, t: 0 }, keys = new Set(), blocked = false, trail = [], bt = true;

  function ray(x, y, th, max = 400) {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = max;
    for (const [x1, y1, x2, y2] of segs) {
      const ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - x) * ey - (y1 - y) * ex) / den, u = ((x1 - x) * dy - (y1 - y) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    return best;
  }
  // HC-SR04-style cone: the nearest echo across +-25 degrees, measured from the chair's nose
  function range() {
    let best = 400;
    for (let a = -25; a <= 25; a += 5) best = Math.min(best, ray(c.x + Math.cos(c.th) * 18, c.y + Math.sin(c.th) * 18, c.th + (a * Math.PI) / 180));
    return best * CM;
  }
  function hits(x, y) {
    const r = 15;
    if (x < r || y < r || x > RW - r || y > RH - r) return true;
    return OBST.some(([ox, oy, w, hh]) => x > ox - r && x < ox + w + r && y > oy - r && y < oy + hh + r);
  }

  const cv = h('canvas', { class: 'd-canvas' });
  const kp = h('div', { class: 'd-kpis' });
  const pad = h('div', { class: 'wc-pad' });
  const mk = (label, f, t) => {
    const b = h('button', { class: 'd-btn wc-b', 'aria-label': label }, label);
    const on = (e) => { e.preventDefault(); cmd = { f, t }; b.classList.add('on'); };
    const off = () => { cmd = { f: 0, t: 0 }; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    return b;
  };
  pad.append(h('span'), mk('▲', 1, 0), h('span'), mk('◀', 0, -1), mk('●', 0, 0), mk('▶', 0, 1), h('span'), mk('▼', -1, 0), h('span'));
  const bt_ = h('div', { class: 'd-label' });
  el.append(h('style', { text: `
      .wc-pad{display:grid;grid-template-columns:repeat(3,54px);gap:6px;justify-content:center}
      .wc-b{height:46px;border-radius:14px;font-size:18px;padding:0;touch-action:none;user-select:none}
    ` }),
  h('div', { class: 'd-grid2' }, h('div', { class: 'd-col' }, cv, bt_), h('div', { class: 'd-col', style: 'align-items:center;gap:14px' }, pad, kp)));
  el.tabIndex = 0;
  el.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); } });
  el.addEventListener('keyup', (e) => keys.delete(e.key));
  el.addEventListener('blur', () => keys.clear());

  function labels() { bt_.textContent = T('Bluetooth link: connected · controller → HC-05 → microcontroller → motor driver', 'Lien Bluetooth : connecté · manette → HC-05 → microcontrôleur → pilote de moteurs'); }
  labels(); onLang(labels);

  let kT = 0;
  loop((dt) => {
    const f = keys.has('ArrowUp') ? 1 : keys.has('ArrowDown') ? -1 : cmd.f;
    const t = keys.has('ArrowLeft') ? -1 : keys.has('ArrowRight') ? 1 : cmd.t;
    const d = range();
    blocked = f > 0 && d < STOP_CM;                    // the firmware vetoes forward motion near an obstacle
    const v = blocked ? 0 : f * 90 * dt, w = t * 2.2 * dt + (f !== 0 ? t * 0.4 * dt : 0);
    c.th += w;
    const nx = c.x + Math.cos(c.th) * v, ny = c.y + Math.sin(c.th) * v;
    if (!hits(nx, ny)) { if (v) trail.push([c.x, c.y]); c.x = nx; c.y = ny; }
    if (trail.length > 400) trail.shift();

    const { ctx, w: W, h: H } = fitCanvas(cv, Math.max(190, Math.min(300, cv.clientWidth * 0.54)));
    const sc = Math.min((W - 10) / RW, (H - 10) / RH), ox = (W - RW * sc) / 2, oy = (H - RH * sc) / 2;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.strokeRect(X(0), Y(0), RW * sc, RH * sc);
    ctx.fillStyle = '#26262a'; ctx.strokeStyle = '#a1a1a6'; ctx.lineWidth = 1.5;
    for (const [x, y, w2, h2] of OBST) { ctx.fillRect(X(x), Y(y), w2 * sc, h2 * sc); ctx.strokeRect(X(x), Y(y), w2 * sc, h2 * sc); }
    ctx.strokeStyle = 'rgba(100,210,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
    trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
    // ultrasonic cone
    const reach = Math.min(d / CM, 260);
    ctx.fillStyle = blocked ? 'rgba(255,69,58,.28)' : 'rgba(48,209,88,.16)';
    ctx.beginPath(); ctx.moveTo(X(c.x + Math.cos(c.th) * 18), Y(c.y + Math.sin(c.th) * 18));
    ctx.arc(X(c.x + Math.cos(c.th) * 18), Y(c.y + Math.sin(c.th) * 18), reach * sc, c.th - 0.44, c.th + 0.44); ctx.fill();
    // chair
    ctx.save(); ctx.translate(X(c.x), Y(c.y)); ctx.rotate(c.th); ctx.scale(sc, sc);
    ctx.fillStyle = '#0c0c0d'; ctx.strokeStyle = '#f5f5f7'; ctx.lineWidth = 2 / sc;
    ctx.beginPath(); ctx.roundRect(-14, -12, 26, 24, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f5f7'; ctx.fillRect(-14, -17, 14, 5); ctx.fillRect(-14, 12, 14, 5);              // big rear wheels
    ctx.strokeRect(-12, -8, 8, 16);                                                                      // backrest
    ctx.fillStyle = blocked ? '#ff453a' : '#30d158'; ctx.fillRect(12, -4, 5, 8);                         // sensor
    ctx.restore();
    kT += dt; if (kT > 0.12) {
      kT = 0;
      const k = (v2, l, cls = '') => h('div', { class: 'd-kpi' }, h('b', { class: cls }, v2), h('span', {}, l));
      kp.replaceChildren(k(d > 180 ? '> 180 cm' : `${d.toFixed(0)} cm`, T('ultrasonic range', 'distance ultrasons'), blocked ? 'bad' : d < 60 ? 'warn' : 'ok'),
        k(blocked ? T('STOPPED', 'ARRÊT') : (f || t) ? T('driving', 'en marche') : T('idle', 'repos'), T('motor driver', 'pilote de moteurs'), blocked ? 'bad' : ''));
    }
  });
});
