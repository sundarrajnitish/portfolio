/* Hero: the character waves hello and takes his sunglasses off when clicked. Around him, the nine layers of
 * the stack are wired into the laptop; one project at a time lights the layers it crosses (same data as the
 * Systems section), so the first thing on the page is the orchestration itself. */
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
  const AR = 1.12, TX = 48.5 * AR, TY = 84; // the laptop, in a 112 x 100 box that matches the stage
  const f = (n) => n.toFixed(1);

  // the layers pull in to stay on the stage: on the desktop their labels would run into the headline
  const narrow = matchMedia('(max-width: 900px)');
  let now, parts, current;
  function build() {
    const X = (px) => Math.min(Math.max(px, 9), 91);
    const lines = layers.map((L, i) => {
      const x = X(POS[i][0]) * AR, py = POS[i][1];
      const d = `M${f(x)} ${f(py)}Q${f((x + TX) / 2)} ${f(py)} ${f(TX)} ${f(TY)}`;
      return `<g class="ol" data-l="${L.id}" style="--c:${L.color}"><path class="ol-base" d="${d}"/><path class="ol-pulse" d="${d}" pathLength="100"/></g>`;
    }).join('');
    const orbs = layers.map((L, i) => {
      const [en, fr] = SHORT[L.id] || [L.en, L.fr];
      return `<a class="orb" href="#systems" data-l="${L.id}" style="--x:${X(POS[i][0])}%;--y:${POS[i][1]}%;--c:${L.color};--d:${(-i * 0.7).toFixed(1)}s"><i></i><span><span lang="en">${esc(en)}</span><span lang="fr">${esc(fr)}</span></span></a>`;
    }).join('');
    orch.innerHTML = `<svg class="orch-lines" viewBox="0 0 ${100 * AR} 100" aria-hidden="true">${lines}</svg>${orbs}
      <a class="orch-now" id="orchNow" href="#systems"><i class="led"></i><b></b><span class="v"></span></a>`;
    now = orch.querySelector('#orchNow');
    parts = [...orch.querySelectorAll('.ol, .orb')];
    if (current) show(current);
  }

  let step = 0;
  function show(p) {
    current = p;
    parts.forEach((el) => {
      const i = p.layers.indexOf(el.dataset.l);
      el.style.setProperty('--i', Math.max(i, 0));
      el.classList.toggle('on', i >= 0);
    });
    const n = p.layers.length;
    now.classList.add('swap');
    clearTimeout(show.t);
    show.t = setTimeout(() => {
      now.href = '#' + p.id;
      now.querySelector('b').textContent = p.name;
      now.querySelector('.v').innerHTML = `<span lang="en">${n} ${n === 1 ? 'layer' : 'layers'}</span><span lang="fr">${n} ${n === 1 ? 'couche' : 'couches'}</span>`;
      now.classList.remove('swap');
    }, 220);
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
  }, 3200);
})();
