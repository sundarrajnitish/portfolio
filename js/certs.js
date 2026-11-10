/* "Beyond the degree": filter the certification cards by theme, and open one at a time. An open card takes the
 * full row so its live demo (js/demos/certs.js) has room; the demo mounts the first time its card opens. */
(function () {
  'use strict';
  const root = document.getElementById('certs');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-cert-filter]')];
  const cards = [...root.querySelectorAll('.cert')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  buttons.forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.certFilter;
    buttons.forEach((x) => x.classList.toggle('on', x === b));
    cards.forEach((c) => { c.hidden = !(g === 'all' || c.dataset.group === g || (g === 'live' && c.querySelector('[data-demo]'))); });
  }));

  cards.forEach((c) => {
    c.setAttribute('name', 'cert'); // native exclusive accordion where supported
    c.addEventListener('toggle', () => {
      if (!c.open) return;
      cards.forEach((o) => { if (o !== c) o.open = false; });
      c.querySelectorAll('[data-demo]').forEach((d) => window.Demos && window.Demos.mount(d));
      // the grid reflows when a card widens; keep the one just opened in view
      requestAnimationFrame(() => {
        const r = c.getBoundingClientRect();
        if (r.top < 90 || r.top > innerHeight * 0.55) scrollTo({ top: scrollY + r.top - 110, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });
})();
