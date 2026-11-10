/* "Beyond the degree": seven of the certifications run the idea they taught, live, inside their card.
 * Each one is the card's code sample made executable, small enough to read in one sitting. */
(function () {
  'use strict';
  const ACC = '#ff8a3d', BLUE = '#5ac8fa', INK = '#f5f5f7', DIM = 'rgba(255,255,255,.28)';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const deg = (r) => (r * 180) / Math.PI;
  function rng(seed) { // mulberry32: the same "random" data on every visit
    return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /** small bilingual UI kit shared by the demos below */
  function kit({ T, h, onLang }) {
    const relabel = [];
    onLang(() => relabel.forEach((f) => f()));
    const text = (tag, cls, en, fr) => { const e = h(tag, { class: cls }); const f = () => { e.textContent = T(en, fr); }; f(); relabel.push(f); return e; };
    const btn = (en, fr, onclick, cls = 'd-btn') => { const b = text('button', cls, en, fr); b.type = 'button'; b.addEventListener('click', onclick); return b; };
    const range = (en, fr, min, max, step, val, fmt, oninput) => {
      const out = h('b', { class: 'd-mono' }), inp = h('input', { type: 'range', min, max, step, value: val });
      const upd = () => { out.textContent = fmt(+inp.value); };
      inp.addEventListener('input', () => { upd(); oninput(+inp.value); });
      upd();
      return h('label', { class: 'c-range' }, h('span', { class: 'c-range-top' }, text('span', 'd-label', en, fr), out), inp);
    };
    /** kpis([[en, fr], ...]) -> set(i, value); the tiles are built once and only their text changes */
    const kpis = (labels) => {
      const vals = labels.map(() => h('b', {}, '–'));
      const box = h('div', { class: 'd-kpis c-kpis' }, labels.map(([en, fr], i) => h('div', { class: 'd-kpi' }, vals[i], text('span', '', en, fr))));
      return { box, set: (i, v) => { if (vals[i].textContent !== v) vals[i].textContent = v; } };
    };
    return { text, btn, range, kpis };
  }

  /* ---------- Self-Driving Cars: Stanley lateral controller on a kinematic bicycle ---------- */
  Demos.register('c-stanley', (el, api) => {
    const { h, loop, fitCanvas } = api, U = kit(api);
    const L = 26, A = 44, W0 = (2 * Math.PI) / 340, KS = 1;
    let k = 1.5, v = 90, err = 0, herr = 0, steer = 0, n = 0;
    const s = { x: 0, y: 0, yaw: 0 }, trail = [];
    const py = (x) => A * Math.sin(x * W0), pyaw = (x) => Math.atan(A * W0 * Math.cos(x * W0));
    const cv = h('canvas', { class: 'd-canvas' });
    const K = U.kpis([['cross-track error', 'écart latéral'], ['heading error', 'erreur de cap'], ['steering', 'braquage']]);
    el.append(K.box, cv, h('div', { class: 'd-row c-ctl' },
      U.range('gain k', 'gain k', 0.1, 5, 0.1, k, (x) => x.toFixed(1), (x) => { k = x; }),
      U.range('speed', 'vitesse', 40, 160, 5, v, (x) => `${(x / 10).toFixed(1)} m/s`, (x) => { v = x; }),
      U.btn('Knock it off the line', 'Pousser hors de la trajectoire', () => { const d = Math.random() < 0.5 ? -1 : 1; s.y += d * 48; s.yaw = wrap(s.yaw + d * 0.6); }, 'd-btn primary')));
    loop((dt) => {
      const fx = s.x + L * Math.cos(s.yaw), fy = s.y + L * Math.sin(s.yaw), yawP = pyaw(fx);
      err = (fy - py(fx)) * Math.cos(yawP);                 // signed distance, front axle to path
      herr = wrap(yawP - s.yaw);
      steer = clamp(herr + Math.atan2(-k * err, KS + v), -1.22, 1.22);
      s.x += v * Math.cos(s.yaw) * dt; s.y += v * Math.sin(s.yaw) * dt; s.yaw = wrap(s.yaw + (v / L) * Math.tan(steer) * dt);
      trail.push(s.x, s.y); if (trail.length > 320) trail.splice(0, 2);

      const { ctx, w, h: H } = fitCanvas(cv, 200), cx = s.x - w * 0.32, cy = H / 2;
      ctx.clearRect(0, 0, w, H);
      ctx.setLineDash([8, 8]); ctx.strokeStyle = DIM; ctx.lineWidth = 2; ctx.beginPath();
      for (let px = 0; px <= w; px += 6) ctx.lineTo(px, cy + py(cx + px));
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = ACC; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7; ctx.beginPath();
      for (let i = 0; i < trail.length; i += 2) ctx.lineTo(trail[i] - cx, cy + trail[i + 1]);
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ff453a'; ctx.beginPath(); ctx.moveTo(fx - cx, cy + fy); ctx.lineTo(fx - cx, cy + py(fx)); ctx.stroke();
      ctx.save(); ctx.translate(s.x - cx, cy + s.y); ctx.rotate(s.yaw);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-7, -9, L + 14, 18, 5); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(-4, -12, 9, 4); ctx.fillRect(-4, 8, 9, 4);
      for (const side of [-10, 10]) { ctx.save(); ctx.translate(L, side); ctx.rotate(steer); ctx.fillRect(-5, -2, 10, 4); ctx.restore(); }
      ctx.restore();
      if (n++ % 6 === 0) { K.set(0, `${(err / 20).toFixed(2)} m`); K.set(1, `${deg(herr).toFixed(1)}°`); K.set(2, `${deg(steer).toFixed(1)}°`); }
    });
  });

  /* ---------- Control of Mobile Robots: go-to-goal on a differential drive ---------- */
  Demos.register('c-goal', (el, api) => {
    const { h, loop, fitCanvas } = api, U = kit(api);
    const LW = 22, R = 6, VMAX = 95;
    let K = 3, g = null, idle = 0, user = 0, n = 0, W = 300, H = 210;
    const r = { x: 50, y: 150, th: -0.6 }, trail = [];
    const cv = h('canvas', { class: 'd-canvas', style: 'cursor:crosshair;touch-action:none' });
    cv.addEventListener('pointerdown', (e) => { const b = cv.getBoundingClientRect(); g = { x: e.clientX - b.left, y: e.clientY - b.top }; user = 6; });
    const Kp = U.kpis([['left wheel', 'roue gauche'], ['right wheel', 'roue droite'], ['heading error', 'erreur de cap']]);
    el.append(Kp.box, cv, h('div', { class: 'd-row c-ctl' }, U.range('gain K', 'gain K', 0.5, 8, 0.1, K, (x) => x.toFixed(1), (x) => { K = x; })));
    loop((dt) => {
      const fit = fitCanvas(cv, 210), ctx = fit.ctx; W = fit.w; H = fit.h;
      if (!g) g = { x: 30 + Math.random() * (W - 60), y: 30 + Math.random() * (H - 60) };
      g.x = clamp(g.x, 10, W - 10); g.y = clamp(g.y, 10, H - 10);
      const dx = g.x - r.x, dy = g.y - r.y, dist = Math.hypot(dx, dy);
      let v = 0, w = 0, e = 0;
      if (dist > 5) {
        e = wrap(Math.atan2(dy, dx) - r.th);
        w = clamp(K * e, -7, 7); v = Math.min(VMAX, dist * 2); idle = 0;
      } else { idle += dt; user = Math.max(0, user - dt); if (idle > 1.1 && user === 0) g = null; }
      r.x += v * Math.cos(r.th) * dt; r.y += v * Math.sin(r.th) * dt; r.th = wrap(r.th + w * dt);
      const vR = (2 * v + w * LW) / (2 * R), vL = (2 * v - w * LW) / (2 * R);
      trail.push(r.x, r.y); if (trail.length > 400) trail.splice(0, 2);

      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = ACC; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < trail.length; i += 2) ctx.lineTo(trail[i], trail[i + 1]);
      ctx.stroke(); ctx.globalAlpha = 1;
      if (g) {
        ctx.strokeStyle = DIM; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(g.x, g.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, 7); ctx.moveTo(g.x - 13, g.y); ctx.lineTo(g.x + 13, g.y); ctx.moveTo(g.x, g.y - 13); ctx.lineTo(g.x, g.y + 13); ctx.stroke();
      }
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.th);
      ctx.fillStyle = '#111'; ctx.fillRect(-7, -LW / 2 - 3, 14, 5); ctx.fillRect(-7, LW / 2 - 2, 14, 5);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.restore();
      if (n++ % 6 === 0) { Kp.set(0, `${vL.toFixed(1)} rad/s`); Kp.set(1, `${vR.toFixed(1)} rad/s`); Kp.set(2, `${deg(e).toFixed(0)}°`); }
    });
  });

  /* ---------- Deep Learning: logistic regression trained by hand-written gradient descent ---------- */
  Demos.register('c-logreg', (el, api) => {
    const { h, loop, fitCanvas } = api, U = kit(api);
    let seed = 7, pts = [], W = [0, 0], b = 0, lr = 0.5, steps = 0, loss = 0, acc = 0, hist = [], n = 0;
    const lrOf = (t) => 0.02 * Math.pow(1500, t / 100);
    function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }
    function reset() { const r = rng(seed * 31 + 5); W = [r() - 0.5, r() - 0.5]; b = 0; steps = 0; hist = []; }
    function gen() {
      const r = rng(seed++), c = [[-0.6 + r() * 0.3, -0.3 + r() * 0.6], [0.6 - r() * 0.3, 0.3 - r() * 0.6]];
      pts = Array.from({ length: 72 }, (_, i) => { const y = i % 2; return [c[y][0] + gauss(r) * 0.36, c[y][1] + gauss(r) * 0.3, y]; });
      reset();
    }
    function step() {                                      // exactly the four lines in the sample
      let dW0 = 0, dW1 = 0, db = 0, J = 0, ok = 0;
      for (const [x0, x1, y] of pts) {
        const a = 1 / (1 + Math.exp(-clamp(W[0] * x0 + W[1] * x1 + b, -30, 30))), dZ = a - y;
        dW0 += dZ * x0; dW1 += dZ * x1; db += dZ;
        J -= y ? Math.log(a + 1e-12) : Math.log(1 - a + 1e-12); ok += (a > 0.5) === !!y;
      }
      const m = pts.length;
      W[0] -= (lr * dW0) / m; W[1] -= (lr * dW1) / m; b -= (lr * db) / m;
      loss = J / m; acc = ok / m; steps++;
      hist.push(loss); if (hist.length > 90) hist.shift();
    }
    gen();
    const cv = h('canvas', { class: 'd-canvas' });
    const K = U.kpis([['loss', 'perte'], ['accuracy', 'exactitude'], ['steps', 'itérations']]);
    el.append(K.box, cv, h('div', { class: 'd-row c-ctl' },
      U.range('learning rate', 'taux d’apprentissage', 0, 100, 1, 44, (t) => lrOf(t).toFixed(2), (t) => { lr = lrOf(t); }),
      U.btn('New data', 'Nouvelles données', gen, 'd-btn primary'), U.btn('Restart training', 'Recommencer', reset)));
    lr = lrOf(44);
    loop(() => {
      if (steps < 4000) step();
      const { ctx, w, h: H } = fitCanvas(cv, 220), X = (x) => w / 2 + x * (w / 3.4), Y = (y) => H / 2 - y * (H / 2.3);
      ctx.clearRect(0, 0, w, H);
      // decision boundary: W·x + b = 0
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath();
      if (Math.abs(W[1]) > Math.abs(W[0])) { ctx.moveTo(X(-1.7), Y(-(W[0] * -1.7 + b) / W[1])); ctx.lineTo(X(1.7), Y(-(W[0] * 1.7 + b) / W[1])); }
      else if (W[0]) { ctx.moveTo(X(-(W[1] * -1.2 + b) / W[0]), Y(-1.2)); ctx.lineTo(X(-(W[1] * 1.2 + b) / W[0]), Y(1.2)); }
      ctx.stroke();
      for (const [x0, x1, y] of pts) {
        const right = (W[0] * x0 + W[1] * x1 + b > 0) === !!y;
        ctx.fillStyle = y ? ACC : BLUE; ctx.globalAlpha = right ? 1 : 0.45;
        ctx.beginPath(); ctx.arc(X(x0), Y(x1), 4, 0, 7); ctx.fill();
        if (!right) { ctx.globalAlpha = 1; ctx.strokeStyle = '#ff453a'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      // loss curve, top right
      const top = Math.max(0.7, ...hist);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
      hist.forEach((v, i) => ctx.lineTo(w - 100 + i, 10 + 36 * (1 - Math.min(v / top, 1))));
      ctx.stroke();
      if (n++ % 6 === 0) { K.set(0, loss.toFixed(3)); K.set(1, `${Math.round(acc * 100)} %`); K.set(2, String(steps)); }
    });
  });

  /* ---------- TensorFlow deployment: what post-training quantisation does to the weights ---------- */
  Demos.register('c-quant', (el, api) => {
    const { h, loop, fitCanvas } = api, U = kit(api);
    const r = rng(11), wts = Array.from({ length: 320 }, () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())).sort((a, b) => a - b);
    const lo = wts[0], hi = wts[wts.length - 1];
    let bits = 8, drawnW = 0, dirty = true;
    const cv = h('canvas', { class: 'd-canvas' });
    const K = U.kpis([['smaller than float32', 'plus petit que float32'], ['levels', 'niveaux'], ['RMS error, of range', 'erreur RMS, de la plage']]);
    el.append(K.box, cv, h('div', { class: 'd-row c-ctl' }, U.range('bits per weight', 'bits par poids', 1, 8, 1, bits, (x) => `${x} bit${x > 1 ? 's' : ''}`, (x) => { bits = x; dirty = true; })));
    loop(() => {
      if (!dirty && cv.clientWidth === drawnW) return;
      const { ctx, w, h: H } = fitCanvas(cv, 190); drawnW = w; dirty = false;
      const levels = 2 ** bits, d = (hi - lo) / (levels - 1), q = wts.map((x) => lo + Math.round((x - lo) / d) * d);
      const X = (i) => 8 + (i / (wts.length - 1)) * (w - 16), Y = (x) => H - 10 - ((x - lo) / (hi - lo)) * (H - 20);
      ctx.clearRect(0, 0, w, H);
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
      if (levels <= 32) for (let i = 0; i < levels; i++) { ctx.beginPath(); ctx.moveTo(0, Y(lo + i * d)); ctx.lineTo(w, Y(lo + i * d)); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); wts.forEach((x, i) => ctx.lineTo(X(i), Y(x))); ctx.stroke();
      ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.beginPath();
      q.forEach((x, i) => { if (i) ctx.lineTo(X(i), Y(q[i - 1])); ctx.lineTo(X(i), Y(x)); }); ctx.stroke();
      const rms = Math.sqrt(wts.reduce((a, x, i) => a + (x - q[i]) ** 2, 0) / wts.length) / (hi - lo);
      K.set(0, `${+(32 / bits).toFixed(1)}×`); K.set(1, String(levels)); K.set(2, `${(rms * 100).toFixed(rms < 0.01 ? 2 : 1)} %`);
    });
  });

  /* ---------- Computer Vision Basics: Sobel gradients and a threshold, on a live image ---------- */
  Demos.register('c-sobel', (el, api) => {
    const { h, loop } = api, U = kit(api);
    const SW = 176, SH = 116;
    let thr = 70, held = 0, bx = 60, by = 50, n = 0;
    const mk = () => { const c = h('canvas', { class: 'd-canvas', width: SW, height: SH }); return c; };
    const src = mk(), out = mk();
    src.style.cursor = 'grab'; src.style.touchAction = 'none';
    const sctx = src.getContext('2d', { willReadFrequently: true }), octx = out.getContext('2d');
    const img = octx.createImageData(SW, SH), g = new Float32Array(SW * SH);
    const point = (e) => { const b = src.getBoundingClientRect(); bx = ((e.clientX - b.left) / b.width) * SW; by = ((e.clientY - b.top) / b.height) * SH; held = 1.5; };
    src.addEventListener('pointermove', point); src.addEventListener('pointerdown', point);
    const K = U.kpis([['edge pixels', 'pixels de contour']]);
    el.append(h('div', { class: 'c-pair' },
      h('div', {}, src, U.text('span', 'd-label', 'camera · move the ball', 'caméra · déplacez la balle')),
      h('div', {}, out, U.text('span', 'd-label', 'edges · |∇I| > threshold', 'contours · |∇I| > seuil'))),
    h('div', { class: 'd-row c-ctl' }, U.range('threshold', 'seuil', 15, 220, 1, thr, (x) => String(x), (x) => { thr = x; }), K.box));
    loop((dt, t) => {
      if (held > 0) held -= dt; else { bx = SW / 2 + Math.cos(t * 0.8) * 52; by = SH / 2 + Math.sin(t * 1.3) * 30; }
      const bg = sctx.createLinearGradient(0, 0, SW, SH); bg.addColorStop(0, '#1c1c1c'); bg.addColorStop(1, '#5a5a5a');
      sctx.fillStyle = bg; sctx.fillRect(0, 0, SW, SH);
      sctx.fillStyle = '#9a9a9a'; sctx.fillRect(18, 62, 44, 36);
      sctx.fillStyle = '#2a2a2a'; sctx.beginPath(); sctx.moveTo(118, 96); sctx.lineTo(142, 46); sctx.lineTo(166, 96); sctx.fill();
      sctx.strokeStyle = '#d0d0d0'; sctx.lineWidth = 5; sctx.beginPath(); sctx.arc(120, 28, 14, 0, 7); sctx.stroke();
      const ball = sctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, 16); ball.addColorStop(0, '#fff'); ball.addColorStop(1, '#b0b0b0');
      sctx.fillStyle = ball; sctx.beginPath(); sctx.arc(bx, by, 16, 0, 7); sctx.fill();
      const px = sctx.getImageData(0, 0, SW, SH).data, o = img.data;
      for (let i = 0; i < SW * SH; i++) g[i] = px[i * 4];
      let edges = 0;
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
        const i = y * SW + x; let on = false;
        if (x > 0 && y > 0 && x < SW - 1 && y < SH - 1) {
          const ix = g[i - SW + 1] + 2 * g[i + 1] + g[i + SW + 1] - g[i - SW - 1] - 2 * g[i - 1] - g[i + SW - 1];
          const iy = g[i + SW - 1] + 2 * g[i + SW] + g[i + SW + 1] - g[i - SW - 1] - 2 * g[i - SW] - g[i - SW + 1];
          on = Math.hypot(ix, iy) > thr;
        }
        if (on) edges++;
        o[i * 4] = on ? 255 : 8; o[i * 4 + 1] = on ? 138 : 8; o[i * 4 + 2] = on ? 61 : 10; o[i * 4 + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      if (n++ % 8 === 0) K.set(0, `${((edges / (SW * SH)) * 100).toFixed(1)} %`);
    });
  });

  /* ---------- Fusion 360: a parameter-driven feature ---------- */
  Demos.register('c-param', (el, api) => {
    const { h } = api, U = kit(api);
    let bolt = 6, wall = 2.5;
    const svg = h('svg', { class: 'd-svg c-plot', viewBox: '0 0 360 190' });
    const K = U.kpis([['boss_od = bolt_d + 2 · wall', 'boss_od = bolt_d + 2 · wall'], ['wall cross-section', 'section de la paroi']]);
    function draw() {
      const od = bolt + 2 * wall, S = 7, cx = 110, cy = 100, R = (od / 2) * S, r = (bolt / 2) * S, yd = cy - R - 12;
      const t = (x, y, s, cls = 'c-t') => h('text', { x, y, class: cls }, s);
      svg.replaceChildren(
        h('circle', { cx, cy, r: R, fill: 'rgba(255,138,61,.16)', stroke: ACC, 'stroke-width': 2 }),
        h('circle', { cx, cy, r, fill: '#0b0b0d', stroke: INK, 'stroke-width': 1.5 }),
        h('path', { d: `M${cx - R} ${yd}H${cx + R}M${cx - R} ${yd - 5}V${cy}M${cx + R} ${yd - 5}V${cy}`, stroke: DIM, fill: 'none' }),
        t(cx, yd - 6, `⌀ ${od.toFixed(1)}`, 'c-t mid acc'),
        h('path', { d: `M${cx - r} ${cy}H${cx + r}`, stroke: DIM, fill: 'none' }), t(cx, cy - 5, `⌀ ${bolt}`, 'c-t mid'),
        t(222, 62, 'User parameters', 'c-t dim'), t(222, 84, `bolt_d  = ${bolt} mm`), t(222, 104, `wall    = ${wall.toFixed(1)} mm`),
        t(222, 132, 'Driven', 'c-t dim'), t(222, 154, `boss_od = ${od.toFixed(1)} mm`, 'c-t acc'));
      K.set(0, `${od.toFixed(1)} mm`); K.set(1, `${((Math.PI / 4) * (od * od - bolt * bolt)).toFixed(0)} mm²`);
    }
    el.append(K.box, svg, h('div', { class: 'd-row c-ctl' },
      U.range('bolt_d', 'bolt_d', 3, 12, 1, bolt, (x) => `M${x}`, (x) => { bolt = x; draw(); }),
      U.range('wall', 'wall', 1, 5, 0.5, wall, (x) => `${x.toFixed(1)} mm`, (x) => { wall = x; draw(); })));
    draw();
  });

  /* ---------- Financial Markets: the capital asset pricing model ---------- */
  Demos.register('c-capm', (el, api) => {
    const { h } = api, U = kit(api);
    let beta = 1.3, rf = 3, rm = 8;
    const svg = h('svg', { class: 'd-svg c-plot', viewBox: '0 0 360 200' });
    const K = U.kpis([['expected return E[Rᵢ]', 'rendement espéré E[Rᵢ]'], ['risk premium β · (E[Rₘ] − r_f)', 'prime de risque β · (E[Rₘ] − r_f)']]);
    function draw() {
      const X = (b) => 42 + (b / 2.5) * 300, Y = (p) => 172 - (clamp(p, -2, 34) / 34) * 150, er = rf + beta * (rm - rf);
      const t = (x, y, s, cls = 'c-t dim') => h('text', { x, y, class: cls }, s);
      svg.replaceChildren(
        ...[0, 10, 20, 30].map((p) => h('path', { d: `M42 ${Y(p)}H342`, stroke: 'rgba(255,255,255,.08)', fill: 'none' })),
        ...[0, 10, 20, 30].map((p) => t(34, Y(p) + 4, `${p}%`, 'c-t dim end')),
        ...[0, 1, 2].map((b) => t(X(b), 190, `β ${b}`, 'c-t dim mid')),
        h('path', { d: `M${X(0)} ${Y(rf)}L${X(2.5)} ${Y(rf + 2.5 * (rm - rf))}`, stroke: INK, 'stroke-width': 2, fill: 'none' }),
        h('path', { d: `M${X(beta)} ${Y(0)}V${Y(er)}H${X(0)}`, stroke: ACC, 'stroke-dasharray': '4 4', fill: 'none' }),
        h('circle', { cx: X(0), cy: Y(rf), r: 4, fill: BLUE }), t(X(0) + 8, Y(rf) + 15, 'r_f'),
        h('circle', { cx: X(1), cy: Y(rm), r: 4, fill: INK }), t(X(1), Y(rm) - 10, api.T('market', 'marché'), 'c-t dim mid'),
        h('circle', { cx: X(beta), cy: Y(er), r: 6, fill: ACC }));
      K.set(0, `${er.toFixed(1)} %`); K.set(1, `${(beta * (rm - rf)).toFixed(1)} %`);
    }
    el.append(K.box, svg, h('div', { class: 'd-row c-ctl' },
      U.range('β', 'β', 0, 2.5, 0.05, beta, (x) => x.toFixed(2), (x) => { beta = x; draw(); }),
      U.range('risk-free r_f', 'sans risque r_f', 0, 8, 0.25, rf, (x) => `${x.toFixed(2)} %`, (x) => { rf = x; draw(); }),
      U.range('market E[Rₘ]', 'marché E[Rₘ]', 2, 14, 0.5, rm, (x) => `${x.toFixed(1)} %`, (x) => { rm = x; draw(); })));
    draw();
    api.onLang(draw);
  });
})();
