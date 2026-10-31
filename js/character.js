/* Side character: one persistent Figure that follows the page. Each chapter changes its gear, pose and props
 * (hard hat on site, grad cap and a new ID badge in 2025, grad cap in 2022...) without rebuilding the drawing. */
(function () {
  'use strict';
  const host = document.getElementById('character');
  if (!host || !window.Figure) return;
  const T = (en, fr) => (document.documentElement.dataset.lang === 'fr' ? fr : en);

  host.innerHTML = '<div class="ch-fig"></div><p class="ch-cap"><span></span></p>';
  const fig = new Figure(host.querySelector('.ch-fig'), { scene: 'hello' });
  const cap = host.querySelector('.ch-cap span');

  const BY_YEAR = { 2025: 'site', '2025b': 'launch', 2024: 'desk', 2023: 'desk', 2022: 'grad', 2021: 'hand', 2020: 'bench', 2019: 'bench', 2018: 'chair' };
  const zones = [
    ...[...document.querySelectorAll('.chapter')].map((el) => [el, BY_YEAR[el.dataset.year] || 'hello']),
    [document.getElementById('curriculum'), 'study'],
    [document.getElementById('contact'), 'contact'],
  ].filter(([el]) => el);

  let current = null;
  function caption(name) {
    cap.parentElement.classList.add('swap');
    clearTimeout(caption.t);
    caption.t = setTimeout(() => { cap.textContent = T(...Figure.SCENES[name].cap); cap.parentElement.classList.remove('swap'); }, 180);
  }
  function setScene(name) {
    if (name === current) return;
    current = name;
    fig.set(Figure.SCENES[name]);
    caption(name);
  }

  let ticking = false;
  function onScroll() {
    ticking = false;
    const mid = innerHeight * 0.5;
    let scene = 'hello';
    for (const [el, s] of zones) { const r = el.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) scene = s; }
    setScene(scene);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  document.addEventListener('langchange', () => { if (current) cap.textContent = T(...Figure.SCENES[current].cap); });
  onScroll();
})();
