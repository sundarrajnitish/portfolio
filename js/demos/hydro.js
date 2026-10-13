/* Hydroponinator pH control: dose-and-wait (start above 6.3, aim for 6.0, dose sized from the learned
 * response and aimed 20% short, circulate 150 s before judging). Three doses with no effect lock dosing out;
 * a reading at the ADC rail or above pH 9 is a probe fault. */
Demos.register('hydro', (el, { T, h, onLang, loop, fitCanvas }) => {
  let S;
  function reset() {
    S = { t: 6 * 3600, ph: 6.05, mixed: 6.05, rTrue: 0.022, rEst: 0.015, state: 'IDLE', wait: 0, pre: 0, dose: 0, bad: 0, lock: false,
      fault: false, probe: 'ok', frozenAt: 6.42, dosed: 0, corr: 0, inBand: 0, total: 0, hist: [], doses: [], temp: 24.1, rh: 62 };
  }
  function warm() { for (let i = 0; i < 24 * 3600; i++) simSecond(); }
  reset(); warm();
  let speed = 180;  // sim seconds per real second

  function measure() {
    if (S.probe === 'rail') return 14.0;
    if (S.probe === 'frozen') return S.frozenAt;
    return S.mixed + (Math.random() - 0.5) * 0.02;
  }
  function simSecond() {
    S.t += 1;
    // plants and evaporation push pH up; added acid mixes in over ~2 minutes
    S.ph += 0.032 / 3600;
    S.mixed += (S.ph - S.mixed) / 90;
    const m = measure();
    S.fault = m > 9 || m >= 13.9;
    if (S.t % 60 === 0) {
      S.hist.push([S.t, m, S.mixed]);
      if (S.hist.length > 24 * 60) S.hist.shift();
      S.total++; if (S.mixed >= 5.5 && S.mixed <= 6.5) S.inBand++;
    }
    if (S.fault || S.lock) return;
    if (S.state === 'IDLE' && m > 6.3) {
      S.dose = Math.max(1, Math.min(15, ((m - 6.0) / S.rEst) * 0.8));
      S.ph -= S.dose * S.rTrue * (S.probe === 'frozen' ? 1 : 1);
      S.dosed += S.dose; S.corr++; S.pre = m; S.state = 'WAIT'; S.wait = 150;
      S.doses.push(S.t);
    } else if (S.state === 'WAIT' && --S.wait <= 0) {
      const effect = S.pre - m;
      if (effect < 0.25 * S.dose * S.rEst) { if (++S.bad >= 3) S.lock = true; }
      else { S.bad = 0; S.rEst = Math.max(0.005, Math.min(0.06, 0.6 * S.rEst + 0.4 * (effect / S.dose))); }
      S.state = 'IDLE';
    }
  }

  const cv = h('canvas', { class: 'd-canvas' });
  const lcd = h('div', { class: 'hy-lcd' });
  const kp = h('div', { class: 'd-kpis' });
  const ctl = h('div', { class: 'd-row' });
  el.append(h('style', { text: `
      .hy-lcd{background:#9fc23a;color:#14200a;font:600 15px/1.35 var(--mono);padding:10px 12px;border-radius:8px;white-space:pre;box-shadow:inset 0 0 0 3px #4f6b17;letter-spacing:.06em;width:fit-content}
    ` }),
  cv, h('div', { class: 'd-grid2', style: 'margin-top:14px' }, h('div', { class: 'd-col' }, ctl, kp), h('div', { class: 'd-col', style: 'align-items:flex-start' }, h('span', { class: 'd-label' }, '16×2 LCD'), lcd)));

  function controls() {
    const probeLbl = { ok: T('Probe: OK', 'Sonde : OK'), rail: T('Probe: stuck at rail', 'Sonde : bloquée en butée'), frozen: T('Probe: frozen reading', 'Sonde : lecture figée') }[S.probe];
    ctl.replaceChildren(...[
      h('button', { class: 'd-btn primary', onclick: () => { S.ph = S.mixed = 7.9; S.bad = 0; } }, T('Refill with tap water (pH 7.9)', 'Remplir à l’eau du robinet (pH 7,9)')),
      h('button', { class: 'd-btn' + (S.probe === 'ok' ? '' : ' danger'), onclick: () => { S.probe = { ok: 'rail', rail: 'frozen', frozen: 'ok' }[S.probe]; S.frozenAt = Math.max(6.4, S.mixed + 0.15); controls(); } }, probeLbl),
      S.lock ? h('button', { class: 'd-btn', onclick: () => { S.lock = false; S.bad = 0; controls(); } }, T('Acknowledge lockout', 'Acquitter le verrouillage')) : null,
      h('button', { class: 'd-btn', onclick: () => { speed = speed === 180 ? 900 : 180; controls(); } }, speed === 180 ? '×180' : '×900'),
      h('button', { class: 'd-btn', onclick: () => { reset(); warm(); controls(); } }, T('Reset', 'Réinitialiser')),
    ].filter(Boolean));
  }
  const clock = (t) => `${String(Math.floor(t / 3600) % 24).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}`;
  function panel() {
    const m = measure();
    const status = S.fault ? 'PH PROBE FAULT ' : S.lock ? 'DOSING HALTED  ' : S.state === 'WAIT' ? `DOSE ${S.dose.toFixed(0).padStart(2)}mL WAIT` : 'pH OK          ';
    lcd.textContent = `pH ${m.toFixed(2).padStart(5)} ${clock(S.t)}\n${status.slice(0, 16).padEnd(16)}`;
    const k = (v, l, c = '') => h('div', { class: 'd-kpi' }, h('b', { class: c }, v), h('span', {}, l));
    kp.replaceChildren(
      k(S.total ? `${Math.round((S.inBand / S.total) * 100)}%` : '—', T('time in 5.5–6.5', 'temps dans 5,5–6,5'), S.inBand === S.total ? 'ok' : 'warn'),
      k(`${S.dosed.toFixed(0)} mL`, T('pH-down dosed', 'pH-moins dosé')),
      k(String(S.corr), T('corrections', 'corrections')),
      k(S.fault ? T('FAULT', 'DÉFAUT') : S.lock ? T('LOCKED', 'VERROUILLÉ') : S.state === 'WAIT' ? T(`wait ${S.wait}s`, `attente ${S.wait}s`) : T('watching', 'surveille'),
        T('controller', 'contrôleur'), S.fault || S.lock ? 'bad' : ''),
    );
  }
  controls(); onLang(() => { controls(); panel(); });
  let acc = 0, pT = 0;
  loop((dt) => {
    acc += dt * speed;
    const wasLock = S.lock;
    while (acc >= 1) { acc -= 1; simSecond(); }
    if (S.lock !== wasLock) controls();
    pT += dt; if (pT > 0.15) { pT = 0; panel(); }
    const { ctx, w, h: H } = fitCanvas(cv, 200);
    const pad = 34, t1 = S.t, t0 = t1 - 24 * 3600;
    const X = (t) => pad + ((t - t0) / (t1 - t0)) * (w - pad - 10), Y = (p) => 10 + ((8.2 - p) / (8.2 - 5.0)) * (H - 30);
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = 'rgba(48,209,88,.10)'; ctx.fillRect(pad, Y(6.5), w - pad - 10, Y(5.5) - Y(6.5));
    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily; ctx.fillStyle = '#6e6e73';
    for (const p of [5.5, 6.0, 6.5, 7.5]) { ctx.fillText(p.toFixed(1), 4, Y(p) + 4); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(pad, Y(p)); ctx.lineTo(w - 10, Y(p)); ctx.stroke(); }
    ctx.fillText(T('last 24 h', '24 dernières h'), w - 80, H - 6);
    ctx.fillStyle = '#64d2ff';
    for (const d of S.doses) if (d > t0) { ctx.beginPath(); ctx.arc(X(d), 16, 3, 0, 7); ctx.fill(); }
    const line = (i, color, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      S.hist.forEach((r, k) => { const y = Y(Math.min(8.2, r[i])); k ? ctx.lineTo(X(r[0]), y) : ctx.moveTo(X(r[0]), y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    line(2, 'rgba(255,255,255,.35)', [4, 4]);
    line(1, S.fault || S.probe !== 'ok' ? '#ff453a' : '#f5f5f7', []);
  });
});
