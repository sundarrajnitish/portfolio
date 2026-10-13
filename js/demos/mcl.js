/* Monte Carlo Localization in a hallway: odometry motion model, ray-cast beam model,
 * low-variance resampling and augmented MCL (w_slow / w_fast) for the kidnapped robot. */
Demos.register('mcl', (el, { T, h, onLang, loop, fitCanvas }) => {
  const L = 28, Wd = 3.4;                 // corridor, metres
  // walls as segments [x1,y1,x2,y2]; alcoves (doors) make places distinguishable, some look alike on purpose
  const top = [[5, 6.5], [8, 9.5], [15, 16.2], [21, 23.5]];          // alcoves on the top wall: [x0, x1]
  const bot = [[3, 4.5], [8, 9.5], [12, 14.5], [24, 26]];
  const segs = [];
  function wall(alc, y, dir) {
    let x = 0;
    for (const [a, b] of alc) {
      if (a > x) segs.push([x, y, a, y]);
      segs.push([a, y, a, y + dir], [a, y + dir, b, y + dir], [b, y + dir, b, y]);
      x = b;
    }
    if (x < L) segs.push([x, y, L, y]);
  }
  wall(top, 0, -1); segs.push([0, 0, 0, Wd], [L, 0, L, Wd]);
  wall(bot, Wd, 1);
  const inFree = (x, y) => x > 0.15 && x < L - 0.15 && y > 0.15 && y < Wd - 0.15;

  function ray(x, y, th, max = 8) {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = max;
    for (const [x1, y1, x2, y2] of segs) {
      const ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - x) * ey - (y1 - y) * ex) / den;
      const u = ((x1 - x) * dy - (y1 - y) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    return best;
  }
  const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const BEAMS = 15, SIG = 0.35;
  const beamAngles = Array.from({ length: BEAMS }, (_, i) => -Math.PI / 2 + (Math.PI * i) / (BEAMS - 1));

  let N = 600, augmented = true, P = [], robot, wSlow = 0, wFast = 0, est = null, updT = 0, dir = 1, travel = 0;
  const randomParticle = () => ({ x: 0.2 + Math.random() * (L - 0.4), y: 0.2 + Math.random() * (Wd - 0.4), th: Math.random() * 2 * Math.PI, w: 1 });
  function scatter() { P = Array.from({ length: N }, randomParticle); wSlow = wFast = 0; }
  function reset() { robot = { x: 2, y: Wd / 2, th: 0 }; dir = 1; travel = 0; scatter(); }
  reset();

  function moveRobot(dt) {
    const v = 1.4 * dt;
    travel += v;
    const nx = robot.x + dir * v;
    if (nx > L - 1.5 || nx < 1.5) dir = -dir;
    const old = { ...robot };
    robot.x += dir * v;
    robot.y = Wd / 2 + Math.sin(travel / 2.2) * 0.55;
    robot.th = Math.atan2(robot.y - old.y, robot.x - old.x);
    // odometry: (rot1, trans, rot2) with noise applied per particle
    const trans = Math.hypot(robot.x - old.x, robot.y - old.y);
    const rot1 = Math.atan2(robot.y - old.y, robot.x - old.x) - old.th;
    const rot2 = robot.th - old.th - rot1;
    for (const p of P) {
      const r1 = rot1 + randn() * (0.02 * Math.abs(rot1) + 0.01 * trans);
      const tr = trans + randn() * (0.05 * trans + 0.002);
      const r2 = rot2 + randn() * (0.02 * Math.abs(rot2) + 0.01 * trans);
      p.th += r1; p.x += tr * Math.cos(p.th); p.y += tr * Math.sin(p.th); p.th += r2;
    }
  }

  function sense() {
    const z = beamAngles.map((a) => ray(robot.x, robot.y, robot.th + a) + randn() * 0.03);
    let sum = 0;
    for (const p of P) {
      if (!inFree(p.x, p.y)) { p.w = 1e-12; continue; }
      let ll = 0;
      for (let i = 0; i < BEAMS; i++) {
        const e = ray(p.x, p.y, p.th + beamAngles[i]) - z[i];
        ll += Math.log(0.9 * Math.exp(-(e * e) / (2 * SIG * SIG)) + 0.1 / 8);
      }
      p.w = Math.exp(ll / 3);           // temperature 3: beams are not independent
      sum += p.w;
    }
    const avg = sum / P.length;
    wSlow += 0.05 * (avg - wSlow); wFast += 0.5 * (avg - wFast);
    P.forEach((p) => (p.w /= sum));
    const neff = 1 / P.reduce((a, p) => a + p.w * p.w, 0);
    if (neff < P.length / 2) resample();
    estimate();
  }

  function resample() {   // low-variance (systematic) resampling, with augmented-MCL injection
    const inject = augmented ? Math.max(0, 1 - wFast / Math.max(wSlow, 1e-300)) : 0;
    const out = [], M = P.length, r = Math.random() / M;
    let c = P[0].w, i = 0;
    for (let m = 0; m < M; m++) {
      if (Math.random() < inject * 0.5) { out.push(randomParticle()); continue; }
      const U = r + m / M;
      while (U > c && i < M - 1) c += P[++i].w;
      out.push({ ...P[i], w: 1 / M });
    }
    P = out;
  }

  function estimate() {   // weighted mean of the dominant mode (densest 1.5 m window), not of the whole cloud
    let best = null, bestW = -1;
    for (let k = 0; k < 40; k++) {
      const c = P[(Math.random() * P.length) | 0];
      let w = 0;
      for (const p of P) if (Math.abs(p.x - c.x) < 1.5 && Math.abs(p.y - c.y) < 1.5) w += p.w;
      if (w > bestW) { bestW = w; best = c; }
    }
    let sx = 0, sy = 0, sw = 0;
    for (const p of P) if (Math.abs(p.x - best.x) < 1.5 && Math.abs(p.y - best.y) < 1.5) { sx += p.x * p.w; sy += p.y * p.w; sw += p.w; }
    est = { x: sx / sw, y: sy / sw, mass: bestW };
  }

  /* ---------- UI ---------- */
  const cv = h('canvas', { class: 'd-canvas' });
  const readout = h('div', { class: 'd-kpis' });
  const nLbl = h('span', { class: 'd-label' });
  const slider = h('input', { type: 'range', min: 200, max: 2000, step: 100, value: N, oninput: (e) => { N = +e.target.value; nLbl.textContent = N; scatter(); } });
  const augBtn = h('button', { class: 'd-btn on', onclick: () => { augmented = !augmented; augBtn.classList.toggle('on', augmented); } });
  const bScatter = h('button', { class: 'd-btn primary', onclick: scatter });
  const bKidnap = h('button', { class: 'd-btn', onclick: () => { robot.x = robot.x > L / 2 ? 4 + Math.random() * 4 : 18 + Math.random() * 6; } });
  const sLbl = h('span', { class: 'd-label' });
  el.append(readout, h('div', { style: 'margin:14px 0' }, cv),
    h('div', { class: 'd-row' }, bScatter, bKidnap, augBtn, h('div', { style: 'flex:1;min-width:160px', class: 'd-col' }, h('div', { class: 'd-row' }, sLbl, nLbl), slider)));
  function labels() {
    bScatter.textContent = T('Scatter particles', 'Disperser les particules');
    bKidnap.textContent = T('Kidnap the robot', 'Kidnapper le robot');
    augBtn.textContent = T('Augmented MCL', 'MCL augmenté');
    sLbl.textContent = T('Particles', 'Particules');
    nLbl.textContent = N;
  }
  labels(); onLang(labels);

  function draw() {
    const { ctx, w } = fitCanvas(cv, Math.max(150, Math.min(230, el.clientWidth * 0.26)));
    const H = cv.clientHeight;
    const sc = Math.min((w - 20) / L, (H - 20) / (Wd + 2));
    const ox = (w - L * sc) / 2, oy = (H - (Wd + 2) * sc) / 2 + sc;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    ctx.clearRect(0, 0, w, H);
    // beams
    ctx.strokeStyle = 'rgba(255,159,10,.35)'; ctx.lineWidth = 1;
    for (const a of beamAngles) {
      const r = ray(robot.x, robot.y, robot.th + a);
      ctx.beginPath(); ctx.moveTo(X(robot.x), Y(robot.y)); ctx.lineTo(X(robot.x + r * Math.cos(robot.th + a)), Y(robot.y + r * Math.sin(robot.th + a))); ctx.stroke();
    }
    // walls
    ctx.strokeStyle = '#f5f5f7'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); for (const [a, b, c, d] of segs) { ctx.moveTo(X(a), Y(b)); ctx.lineTo(X(c), Y(d)); } ctx.stroke();
    // particles
    ctx.fillStyle = 'rgba(41,151,255,.75)';
    for (const p of P) ctx.fillRect(X(p.x) - 1.2, Y(p.y) - 1.2, 2.4, 2.4);
    // estimate
    if (est) { ctx.strokeStyle = '#30d158'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(est.x), Y(est.y), 11, 0, 7); ctx.stroke(); }
    // robot
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(robot.x), Y(robot.y), 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(robot.x), Y(robot.y)); ctx.lineTo(X(robot.x + 0.35 * Math.cos(robot.th)), Y(robot.y + 0.35 * Math.sin(robot.th))); ctx.stroke();
  }
  function kpis() {
    const err = est ? Math.hypot(est.x - robot.x, est.y - robot.y) : NaN;
    const ok = err < 0.3;
    const k = (v, l, c = '') => h('div', { class: 'd-kpi' }, h('b', { class: c }, v), h('span', {}, l));
    readout.replaceChildren(
      k(isFinite(err) ? (err < 1 ? `${Math.round(err * 100)} cm` : `${err.toFixed(1)} m`) : '—', T('Position error', 'Erreur de position'), ok ? 'ok' : 'warn'),
      k(ok ? T('Localized', 'Localisé') : T('Searching', 'Recherche'), T('Filter state', 'État du filtre'), ok ? 'ok' : ''),
      k(est ? `${Math.round(est.mass * 100)}%` : '—', T('Mass in best mode', 'Masse du mode principal')),
      k(String(P.length), T('Particles', 'Particules')),
    );
  }
  let kT = 0;
  loop((dt) => {
    if (!dt) return;
    moveRobot(dt);
    updT += dt; kT += dt;
    if (updT > 0.12) { updT = 0; sense(); }
    draw();
    if (kT > 0.25) { kT = 0; kpis(); }
  });
});
