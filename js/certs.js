/* "Beyond the degree": filter the certification cards by theme. The cards themselves are plain <details>. */
(function () {
  'use strict';
  const root = document.getElementById('certs');
  if (!root) return;
  const buttons = [...root.querySelectorAll('[data-cert-filter]')];
  const cards = [...root.querySelectorAll('.cert')];
  buttons.forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.certFilter;
    buttons.forEach((x) => x.classList.toggle('on', x === b));
    cards.forEach((c) => { c.hidden = g !== 'all' && c.dataset.group !== g; });
  }));
})();
