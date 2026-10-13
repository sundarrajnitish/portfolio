/* Hero visage: the line-art portrait draws itself in, inside HUD rings, orbited by the work.
 * Each orbit node scrolls to its chapter. */
(function () {
  'use strict';
  const host = document.getElementById('visage');
  if (!host || !window.Portrait) return;
  const T = (en, fr) => (document.documentElement.dataset.lang === 'fr' ? fr : en);
  const CX = 203, CY = 200;

  // icons drawn in a 24 x 24 box centred on 0,0
  const ICONS = {
    scada: '<path d="M0 -10v5M-4 -5h8v6h-8zM0 1v3"/><circle cx="0" cy="7" r="3"/><circle cx="0" cy="11" r="3"/>',
    mcl: '<circle cx="0" cy="0" r="3.5"/><path d="M0 0l5 -2"/><g class="vz-dots"><circle cx="-8" cy="-6" r="1"/><circle cx="7" cy="6" r="1"/><circle cx="-6" cy="7" r="1"/><circle cx="8" cy="-7" r="1"/><circle cx="-10" cy="1" r="1"/><circle cx="10" cy="1" r="1"/></g>',
    can: '<path d="M-11 4h22M-9 4l3 -6h9l4 6"/><circle cx="-6" cy="6" r="2.5"/><circle cx="6" cy="6" r="2.5"/><path d="M-11 -8h4v3h4v-3h4v3h4v-3h4"/>',
    cloud: '<path d="M-9 5h17a5 5 0 0 0 -1 -10a7 7 0 0 0 -13 -1a5 5 0 0 0 -3 11z"/><path d="M-3 9l3 -6l3 6"/>',
    chip: '<rect x="-7" y="-7" width="14" height="14" rx="2"/><path d="M-3 -11v4M3 -11v4M-3 7v4M3 7v4M-11 -3h4M-11 3h4M7 -3h4M7 3h4"/><path d="M-3 -3h6v6h-6z"/>',
    sine: '<path d="M-11 0c3 -10 6 -10 8 0s5 10 8 0s4 -8 6 -4"/><path d="M-11 0h22" opacity=".35"/>',
    hand: '<path d="M-6 10v-8M-6 2v-9M-2 2v-11M2 2v-10M6 4v-7M-6 10h12v-6"/>',
    pen: '<path d="M-10 10l3 -1l12 -12l-2 -2l-12 12z"/><path d="M3 -5l2 2"/><path d="M-11 -9h6M-11 -6h4" opacity=".5"/>',
    leaf: '<path d="M-8 9c0 -12 6 -17 17 -18c0 11 -5 17 -17 18z"/><path d="M-8 9l10 -11"/>',
  };
  const NODES = [
    ['scada', 'SCADA', 'SCADA', '#now'], ['mcl', 'MCL', 'MCL', '[data-year="2026"]'], ['can', 'CAN bus', 'Bus CAN', '[data-year="2025b"]'],
    ['cloud', 'AWS λ', 'AWS λ', '[data-year="2024"]'], ['sine', 'DDS', 'DDS', '[data-year="2024"] .entry:nth-of-type(4)'],
    ['chip', 'RTL', 'RTL', '[data-year="2023"]'], ['hand', 'Robot hand', 'Main robot', '[data-year="2021"]'],
    ['pen', 'G-code', 'G-code', '[data-year="2020"]'], ['leaf', 'pH 6.0', 'pH 6,0', '[data-year="2020"] .entry:last-of-type'],
  ];
  const R = 238;
  const nodeXY = (i) => { const a = (-90 + (i * 360) / NODES.length) * Math.PI / 180; return [CX + Math.cos(a) * R, CY + Math.sin(a) * R]; };

  function build() {
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = (i * 5) * Math.PI / 180, r1 = i % 6 ? 202 : 196;
      return `<path d="M${(CX + Math.cos(a) * r1).toFixed(1)} ${(CY + Math.sin(a) * r1).toFixed(1)}L${(CX + Math.cos(a) * 208).toFixed(1)} ${(CY + Math.sin(a) * 208).toFixed(1)}"/>`;
    }).join('');
    const nodes = NODES.map(([k, en, fr], i) => {
      const [x, y] = nodeXY(i);
      const a = Math.atan2(y - CY, x - CX);
      const lx1 = CX + Math.cos(a) * 212, ly1 = CY + Math.sin(a) * 212, lx2 = x - Math.cos(a) * 22, ly2 = y - Math.sin(a) * 22;
      return `<g class="vz-node" data-i="${i}" style="--d:${(1.6 + i * 0.12).toFixed(2)}s" tabindex="0" role="link" aria-label="${T(en, fr)}">
        <path class="vz-lead" d="M${lx1.toFixed(1)} ${ly1.toFixed(1)}L${lx2.toFixed(1)} ${ly2.toFixed(1)}"/>
        <g class="vz-bob" style="animation-delay:-${(i * 0.7).toFixed(1)}s" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
          <circle class="vz-orb" r="21"/><g class="vz-ico">${ICONS[k]}</g>
          <text y="36" text-anchor="middle">${T(en, fr)}</text>
        </g></g>`;
    }).join('');
    host.innerHTML = `
<svg viewBox="-80 -70 566 540" class="vz" aria-hidden="true">
  <defs>
    <radialGradient id="vzGlow"><stop offset="0" stop-color="#2997ff" stop-opacity=".28"/><stop offset=".55" stop-color="#2997ff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="vzLens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a2a"/><stop offset=".5" stop-color="#0a0f16"/><stop offset="1" stop-color="#1b2f44"/></linearGradient>
    <linearGradient id="vzScan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#64d2ff" stop-opacity="0"/><stop offset=".5" stop-color="#64d2ff" stop-opacity=".35"/><stop offset="1" stop-color="#64d2ff" stop-opacity="0"/></linearGradient>
    <clipPath id="vzClip"><circle cx="${CX}" cy="${CY}" r="190"/></clipPath>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="260" fill="url(#vzGlow)"/>
  <g class="vz-rings">
    <circle class="vz-ring r1" cx="${CX}" cy="${CY}" r="190"/>
    <g class="vz-spin a">${ticks}</g>
    <circle class="vz-ring r2 vz-spin b" cx="${CX}" cy="${CY}" r="222" pathLength="100"/>
    <circle class="vz-ring r3 vz-spin c" cx="${CX}" cy="${CY}" r="${R}" pathLength="100"/>
  </g>
  <g clip-path="url(#vzClip)">
    <g class="vz-face">${Portrait.head({ body: true, gear: ['sunglasses'] })}</g>
    <g class="vz-hud">
      <polyline class="vz-wave" points="${Array.from({ length: 24 }, (_, i) => `${146 + i * 1.9},${154 + Math.sin(i / 2) * 4}`).join(' ')}"/>
      <text x="230" y="148">BUILD</text><text x="230" y="160" class="vz-blink">MODE: ON</text>
    </g>
    <rect class="vz-scan" x="0" y="-40" width="400" height="40" fill="url(#vzScan)"/>
  </g>
  ${nodes}
</svg>`;
    // stagger the line draw-in across the portrait
    host.querySelectorAll('.vz-face path').forEach((p, i) => { p.style.animationDelay = (0.15 + i * 0.035).toFixed(2) + 's'; });
    host.querySelectorAll('.vz-node').forEach((n) => {
      const go = () => { const t = document.querySelector(NODES[+n.dataset.i][3]); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      n.addEventListener('click', go);
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
  }
  build();
  document.addEventListener('langchange', () => {
    host.querySelectorAll('.vz-node').forEach((n) => {
      const [, en, fr] = NODES[+n.dataset.i];
      n.querySelector('text').textContent = T(en, fr);
      n.setAttribute('aria-label', T(en, fr));
    });
  });
})();
