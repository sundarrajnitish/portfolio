/* Hero: the character waves hello and takes his sunglasses off when clicked. Around him, the nine layers of
 * the stack are stops on an agent loop that starts and ends at the harness under the laptop; one project at a time
 * lights the layers it crosses (same data as the Systems section), so the first thing on the page is the
 * orchestration itself. */
(function () {
  'use strict';
  const host = document.getElementById('heroFig');
  if (!host || !window.Figure) return;
  const T = (en, fr) => (document.documentElement.dataset.lang === 'fr' ? fr : en);
  const fig = new Figure(host, { scene: 'hello', viewBox: '-62 6 540 446' });
  const bubble = document.getElementById('heroBubble');
  let shades = true;

  function say(en, fr, ms = 2600) {
    if (!bubble) return;
    bubble.textContent = T(en, fr);
    bubble.classList.add('on');
    clearTimeout(say.t);
    say.t = setTimeout(() => bubble.classList.remove('on'), ms);
  }

  setTimeout(() => { fig.wave(3); say('Hi, I’m Nitish!', 'Salut, moi c’est Nitish !', 3200); }, 900);

  const stage = host.closest('.hero-stage');
  stage.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    shades = !shades;
    fig.set({ gear: shades ? ['sunglasses'] : [] });
    fig.wave(1.6);
    if (shades) say('Back to building.', 'On retourne construire.');
    else say('Okay, no sunglasses.', 'D’accord, sans lunettes.');
  });
  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === stage) stage.click(); });

  /* ---------- orchestration ---------- */
  const D = window.CURRICULUM, orch = document.getElementById('orch');
  if (!D || !orch) return;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const SHORT = (window.Systems && window.Systems.SHORT) || {};
  const layers = D.layers;
  const order = Object.fromEntries(layers.map((L, i) => [L.id, i]));
  const projects = Object.keys(D.related).map((id) => ({
    id, name: D.related[id][0],
    layers: [...new Set(D.related[id][1].map((c) => D.layerOf[c]).filter((l) => l in order))].sort((a, b) => order[a] - order[b]),
  }));

  // where each layer sits around the stage (% of its box), physical on the left round to digital on the right
  const POS = [[2, 70], [-3, 48], [2, 26], [22, 5], [50, -3], [78, 5], [98, 26], [103, 48], [98, 70]];
  const AR = 1.12;   // the drawing is a 112 x 100 box that matches the stage
  const f = (n) => n.toFixed(1);
  const PERIOD = 3200;   // one run of the loop, and one project on show

  // one glyph per layer, drawn on a 16 x 16 grid
  const ICON = {
    math: '<path d="M11.5 3.5H4.5L8.5 8L4.5 12.5H11.5"/>',
    mech: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.8V4M8 12v2.2M1.8 8H4M12 8h2.2M3.6 3.6l1.6 1.6M10.8 10.8l1.6 1.6M12.4 3.6l-1.6 1.6M5.2 10.8l-1.6 1.6"/>',
    power: '<path d="M9.2 1.8L4 9h3.6L6.8 14.2L12 7H8.4Z"/>',
    control: '<rect x="5.5" y="3.5" width="5" height="4.5" rx="1"/><path d="M1.5 5.75h4M10.5 5.75h4M12.6 5.75v6.5H3.4V5.75"/>',
    embedded: '<rect x="4.5" y="4.5" width="7" height="7" rx="1.2"/><path d="M6.5 2v2.5M9.5 2v2.5M6.5 11.5V14M9.5 11.5V14M2 6.5h2.5M2 9.5h2.5M11.5 6.5H14M11.5 9.5H14"/>',
    silicon: '<path d="M4 3.5h4a4.5 4.5 0 0 1 0 9H4ZM1.5 6H4M1.5 10H4M12.5 8h2"/>',
    robotics: '<path d="M2.5 13.5h6M5.5 13.5V9.5L9.5 5.5L12.4 7.6M12.4 7.6l1.6-1M12.4 7.6l.5 1.9"/><circle cx="5.5" cy="9.5" r="1.1"/><circle cx="9.5" cy="5.5" r="1.1"/>',
    data: '<ellipse cx="8" cy="4" rx="4.5" ry="1.8"/><path d="M3.5 4v8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V4M3.5 8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8"/>',
    cloud: '<path d="M4.8 12.4a2.8 2.8 0 0 1-.3-5.6a3.8 3.8 0 0 1 7.3 1a2.4 2.4 0 0 1-.2 4.6Z"/>',
  };
  const icon = (id) => `<svg viewBox="0 0 16 16" aria-hidden="true">${ICON[id] || '<circle cx="8" cy="8" r="3"/>'}</svg>`;

  // The layers are stops on one closed loop that leaves the harness (the run chip under the laptop), passes every
  // layer and comes back. A run lights the stretch between a project's first and last layer; the rest of the loop
  // is the dashed way back, and a token keeps going round.
  const narrow = matchMedia('(max-width: 900px)');
  let now, nodes, segs, tokens, current;
  function build() {
    const X = (px) => Math.min(Math.max(px, 9), 91);
    const pts = [[50 * AR, 100], ...layers.map((L, i) => [X(POS[i][0]) * AR, POS[i][1]])];
    const N = pts.length, P = (i) => pts[((i % N) + N) % N];
    // a smooth closed curve through every stop (Catmull-Rom, written as cubic Béziers)
    const seg = (k) => {
      const a = P(k - 1), b = P(k), c = P(k + 1), d = P(k + 2);
      return `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (d[0] - b[0]) / 6)} ${f(c[1] - (d[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
    };
    const whole = `M${f(pts[0][0])} ${f(pts[0][1])}${pts.map((_, k) => seg(k)).join('')}Z`;
    const pieces = pts.map((b, k) => `<path class="og-seg" data-k="${k}" style="--c:${k ? layers[k - 1].color : 'var(--accent)'}" d="M${f(b[0])} ${f(b[1])}${seg(k)}"/>`).join('');
    const orbs = layers.map((L, i) => {
      const [en, fr] = SHORT[L.id] || [L.en, L.fr];
      return `<a class="orb" href="#systems" data-l="${L.id}" style="--x:${X(POS[i][0])}%;--y:${POS[i][1]}%;--c:${L.color};--d:${(-i * 0.7).toFixed(1)}s"><i>${icon(L.id)}</i><span><span lang="en">${esc(en)}</span><span lang="fr">${esc(fr)}</span></span></a>`;
    }).join('');
    orch.innerHTML = `<svg class="orch-lines" viewBox="0 0 ${100 * AR} 100" aria-hidden="true">
        <path class="og-base" d="${whole}"/>${pieces}
        <path class="og-token halo" d="${whole}" pathLength="100"/><path class="og-token" d="${whole}" pathLength="100"/></svg>${orbs}
      <a class="orch-now" id="orchNow" href="#systems"><svg class="loop" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.75M13.4 2.2v2.6h-2.6"/></svg><b></b><span class="v"></span></a>`;
    now = orch.querySelector('#orchNow');
    nodes = [...orch.querySelectorAll('.orb')];
    segs = [...orch.querySelectorAll('.og-seg')];
    tokens = [...orch.querySelectorAll('.og-token')];
    if (current) show(current);
  }

  // what the harness is doing, shown on the chip while the token goes round
  const phase = (n) => [
    ['plan', 'planifier'],
    [`build · ${n} ${n === 1 ? 'layer' : 'layers'}`, `construire · ${n} ${n === 1 ? 'couche' : 'couches'}`],
    ['verify ✓', 'vérifier ✓'],
  ];
  function setPhase(k) {
    const [en, fr] = phase(current.layers.length)[k];
    now.querySelector('.v').innerHTML = `<span lang="en">${en}</span><span lang="fr">${fr}</span>`;
  }

  let step = 0;
  function show(p) {
    current = p;
    const on = p.layers.map((l) => order[l]);            // positions of this project's layers on the loop
    const first = on[0], last = on[on.length - 1];
    nodes.forEach((el) => {
      const i = p.layers.indexOf(el.dataset.l);
      el.style.setProperty('--i', Math.max(i, 0));
      el.classList.toggle('on', i >= 0);
    });
    // piece k joins layer k - 1 to layer k; the pieces between the first and last layer are the work, the rest the way back
    segs.forEach((el) => {
      const k = +el.dataset.k, fwd = k > first && k <= last;
      el.style.setProperty('--i', fwd ? on.filter((x) => x < k).length - 1 : 0);
      el.classList.toggle('fwd', fwd);
    });
    // each run starts the token again from the harness
    tokens.forEach((el) => { el.style.animation = 'none'; void el.getBoundingClientRect(); el.style.animation = ''; });
    now.classList.add('swap');
    clearTimeout(show.t); clearTimeout(show.t2); clearTimeout(show.t3);
    show.t = setTimeout(() => {
      now.href = '#' + p.id;
      now.querySelector('b').textContent = p.name;
      setPhase(0);
      now.classList.remove('swap');
    }, 220);
    show.t2 = setTimeout(() => setPhase(1), PERIOD * 0.3);
    show.t3 = setTimeout(() => setPhase(2), PERIOD * 0.74);
  }
  build();
  show(projects[0]);
  narrow.addEventListener('change', build);

  // runs through the projects while the hero is on screen
  let visible = true;
  new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; })).observe(stage);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => {
    if (!visible || document.hidden || orch.matches(':hover')) return;
    step = (step + 1) % projects.length;
    show(projects[step]);
  }, PERIOD);
})();
