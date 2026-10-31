/* Hero: the character waves hello, follows the cursor, and takes his sunglasses off when clicked. */
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
  // floating readouts: small, plausible telemetry jitter so the chips read as live instruments
  const live = (k) => stage.querySelector(`[data-live="${k}"]`);
  const L = { hz: live('hz'), pf: live('pf'), wns: live('wns'), can: live('can'), pose: live('pose') };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tick = 0;
  if (!reduce && L.hz) setInterval(() => {
    if (document.hidden) return;
    tick++;
    const r = (a, b) => a + Math.random() * (b - a);
    L.hz.textContent = `${r(59.97, 60.03).toFixed(2)} Hz`;
    if (tick % 3 === 0) L.pf.textContent = r(0.96, 0.99).toFixed(2);
    if (tick % 4 === 0) L.wns.textContent = `+${r(0.38, 0.46).toFixed(2)}`;
    L.can.textContent = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')).join(' ');
    const th = (31 + Math.sin(tick / 6) * 24).toFixed(0);
    L.pose.textContent = `x ${(1.42 + Math.sin(tick / 9) * 0.6).toFixed(2)} · θ ${th}°`;
  }, 900);

  stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === stage) stage.click(); });
})();
