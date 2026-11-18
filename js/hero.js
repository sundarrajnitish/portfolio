/* Hero Convergence Console: live HiDPI interactive signal-topology canvas
 * connecting Nitish's four engineering threads across atoms, silicon, autonomy, and cloud. */
(function () {
  'use strict';
  const host = document.getElementById('heroConsole');
  if (!host) return;
  const lang = () => document.documentElement.dataset.lang || 'en';
  const T = (en, fr) => (lang() === 'fr' ? fr : en);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const NODES = [
    { id: 'power',    x: 0.14, y: 0.24, c: '#ff9442', en: 'Power · EPMS', fr: 'Énergie · EPMS' },
    { id: 'mech',     x: 0.15, y: 0.76, c: '#ffb020', en: 'Mechanics',    fr: 'Mécanique' },
    { id: 'control',  x: 0.26, y: 0.50, c: '#e3d633', en: 'Control',      fr: 'Commande' },
    { id: 'embedded', x: 0.50, y: 0.18, c: '#a3e635', en: 'Embedded',     fr: 'Embarqué' },
    { id: 'silicon',  x: 0.50, y: 0.82, c: '#34d399', en: 'Silicon · RTL',fr: 'Silicium · RTL' },
    { id: 'verify',   x: 0.74, y: 0.50, c: '#2dd4bf', en: 'Verification', fr: 'Vérification' },
    { id: 'robotics', x: 0.86, y: 0.24, c: '#38bdf8', en: 'Autonomy',     fr: 'Autonomie' },
    { id: 'ai',       x: 0.85, y: 0.76, c: '#60a5fa', en: 'AI · Vision',  fr: 'IA · Vision' },
    { id: 'cloud',    x: 0.50, y: 0.50, c: '#a78bfa', en: 'Systems Core', fr: 'Cœur système' },
  ];
  const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]));

  const THREADS = [
    {
      id: 't-power',
      color: '#ff9442',
      tabEn: 'Power & OT', tabFr: 'Énergie & TO',
      eyebrowEn: 'Thread 01 · Physical Foundation of AI',
      eyebrowFr: 'Fil 01 · Socle physique de l’IA',
      titleEn: 'Mission-Critical Power & Trusted Telemetry',
      titleFr: 'Énergie critique et télémétrie fiable',
      descEn: '2N data-centre EPMS, SCADA mimics, Modbus/BACnet IT-OT integration, and CRC-protected 500 kbit/s F1 CAN telemetry.',
      descFr: 'EPMS de centres de données 2N, synoptiques SCADA, intégration TI/TO Modbus/BACnet et télémétrie CAN F1 à 500 kbit/s.',
      nodes: ['power', 'control', 'embedded', 'verify', 'cloud'],
      edges: [['power', 'control'], ['control', 'cloud'], ['embedded', 'verify'], ['power', 'embedded'], ['cloud', 'verify']],
      metrics: [
        ['2N EPMS', 'Data-centre SCADA', 'SCADA centre de données'],
        ['500 kb/s', 'CRC-8 CAN telemetry', 'Télémétrie CAN CRC-8'],
        ['FAT → SAT', 'Zero-surprise handover', 'Mise en service fiable'],
      ],
    },
    {
      id: 't-silicon',
      color: '#34d399',
      tabEn: 'Verified Silicon', tabFr: 'Silicium vérifié',
      eyebrowEn: 'Thread 02 · Provable Correctness',
      eyebrowFr: 'Fil 02 · Exactitude prouvable',
      titleEn: 'Formal Proof, UVM & Cycle-Accurate RTL',
      titleFr: 'Preuve formelle, UVM et RTL exact au cycle',
      descEn: 'Equivalence checking that auto-repairs 14 netlist bugs, UVM scoreboards catching 14/14 faults, and a 5-stage MIPS pipeline.',
      descFr: 'Vérification d’équivalence réparant 14 bogues netlist, bancs UVM à 14/14 et processeur MIPS à 5 étages.',
      nodes: ['silicon', 'verify', 'embedded', 'cloud'],
      edges: [['silicon', 'verify'], ['embedded', 'silicon'], ['verify', 'cloud'], ['silicon', 'cloud']],
      metrics: [
        ['14 / 14', 'Bugs caught, 0 false fails', 'Bogues détectés, 0 faux'],
        ['98,669', 'Verified CPU cycles', 'Cycles CPU vérifiés'],
        ['~5 sec', 'Formal netlist auto-fix', 'Réparation formelle'],
      ],
    },
    {
      id: 't-autonomy',
      color: '#38bdf8',
      tabEn: 'Autonomy', tabFr: 'Autonomie',
      eyebrowEn: 'Thread 03 · Closed-Loop Machines',
      eyebrowFr: 'Fil 03 · Machines en boucle fermée',
      titleEn: 'Sensing, Control & Fail-Safe Robotics',
      titleFr: 'Perception, commande et robotique sûre',
      descEn: 'Monte Carlo localization recovering kidnapped robots, gesture telerobotics with CRC gating, and fault-safe hydroponic control.',
      descFr: 'Localisation Monte Carlo, bras télécommandé avec garde CRC et contrôleur hydroponique à sécurité intégrée.',
      nodes: ['mech', 'control', 'embedded', 'robotics', 'ai', 'cloud'],
      edges: [['mech', 'control'], ['control', 'embedded'], ['embedded', 'robotics'], ['ai', 'robotics'], ['robotics', 'cloud'], ['control', 'cloud']],
      metrics: [
        ['4 cm', 'vs 36 cm odometry drift', 'vs 36 cm dérive odo'],
        ['5 / 5', 'Kidnapped recovery', 'Récupération robot'],
        ['100%', '14-day in-band pH', 'pH en plage sur 14 j'],
      ],
    },
    {
      id: 't-cloud',
      color: '#a78bfa',
      tabEn: 'Cloud & AI', tabFr: 'Nuage & IA',
      eyebrowEn: 'Thread 04 · Resilient Scale & UX',
      eyebrowFr: 'Fil 04 · Échelle résiliente et UX',
      titleEn: 'Serverless Atomicity & Edge-to-Cloud Products',
      titleFr: 'Atomicité sans serveur et produits complets',
      descEn: 'Compare-and-swap AWS auctions, cryptographically verified Stripe fulfillment, sentiment insights, and accessible React 19 UI.',
      descFr: 'Enchères AWS compare-and-swap, exécution par webhooks Stripe signés, analyse de sentiment et React 19 accessible.',
      nodes: ['cloud', 'verify', 'ai', 'robotics'],
      edges: [['cloud', 'ai'], ['cloud', 'verify'], ['ai', 'verify'], ['ai', 'robotics']],
      metrics: [
        ['43 ms', 'p95 at 300 live users', 'p95 à 300 utilisateurs'],
        ['0 lost', 'Atomic DynamoDB bids', 'Mises DynamoDB atomiques'],
        ['$0.07/d', 'Launch-day AWS cost', 'Coût AWS jour 1'],
      ],
    },
  ];

  // Build static console chrome
  host.innerHTML = `
    <div class="hc-bar">
      <span class="hc-bar-left"><span class="hc-live">LIVE</span><span id="hcHeader"></span></span>
      <span id="hcClock">SYS // 09 LAYERS</span>
    </div>
    <div class="hc-stage"><canvas class="hc-canvas" id="heroCanvas" aria-hidden="true"></canvas></div>
    <div class="hc-readout" id="hcReadout">
      <div class="hc-meta">
        <div>
          <div class="hc-thread-eyebrow" id="hcEyebrow"></div>
          <div class="hc-thread-title" id="hcTitle"></div>
          <p class="hc-thread-desc" id="hcDesc"></p>
        </div>
        <a class="hc-jump" id="hcJump" href="#t-power"></a>
      </div>
      <div class="hc-metrics" id="hcMetrics"></div>
      <div class="hc-tabs" id="hcTabs" role="tablist"></div>
    </div>`;

  const cv = host.querySelector('#heroCanvas');
  const ctx = cv.getContext('2d');
  const elHeader = host.querySelector('#hcHeader');
  const elEyebrow = host.querySelector('#hcEyebrow');
  const elTitle = host.querySelector('#hcTitle');
  const elDesc = host.querySelector('#hcDesc');
  const elJump = host.querySelector('#hcJump');
  const elMetrics = host.querySelector('#hcMetrics');
  const elTabs = host.querySelector('#hcTabs');
  const elReadout = host.querySelector('#hcReadout');

  let activeIdx = 0;
  let userPinned = false;
  let visible = true;
  let hoveredNode = null;
  let ptr = { x: 0.5, y: 0.5, active: false };
  const packets = Array.from({ length: 18 }, (_, i) => ({
    edgeIdx: i,
    t: (i * 0.17) % 1,
    speed: 0.22 + (i % 5) * 0.055,
    dir: i % 2 === 0 ? 1 : -1,
  }));

  function renderTabs() {
    elTabs.innerHTML = THREADS.map((th, i) => `
      <button type="button" class="hc-tab${i === activeIdx ? ' on' : ''}" data-idx="${i}" style="--c:${th.color}" role="tab" aria-selected="${i === activeIdx}">
        ${T(th.tabEn, th.tabFr)}
      </button>`).join('');
  }

  function renderReadout() {
    const th = THREADS[activeIdx];
    elReadout.style.setProperty('--hc-c', th.color);
    elHeader.textContent = T('Systems Convergence Topology', 'Topologie de convergence système');
    elEyebrow.textContent = T(th.eyebrowEn, th.eyebrowFr);
    elTitle.textContent = T(th.titleEn, th.titleFr);
    elDesc.textContent = T(th.descEn, th.descFr);
    elJump.href = '#' + th.id;
    elJump.innerHTML = `${T('Explore thread', 'Voir le fil')} <span aria-hidden="true">↓</span>`;
    elMetrics.innerHTML = th.metrics.map(([val, en, fr]) => `
      <div class="hc-metric"><b>${val}</b><span>${T(en, fr)}</span></div>`).join('');
    elTabs.querySelectorAll('.hc-tab').forEach((b, i) => {
      b.classList.toggle('on', i === activeIdx);
      b.setAttribute('aria-selected', String(i === activeIdx));
    });
  }

  elTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.hc-tab');
    if (!btn) return;
    activeIdx = +btn.dataset.idx;
    userPinned = true;
    renderReadout();
  });

  // Canvas geometry & pointer hit-test
  let W = 540, H = 332;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || 540;
    H = cv.clientHeight || 332;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function nodePos(n, time) {
    const bobX = reduce ? 0 : Math.sin(time * 0.65 + n.x * 9) * 3.5;
    const bobY = reduce ? 0 : Math.cos(time * 0.8 + n.y * 11) * 3.5;
    const parX = ptr.active ? (ptr.x - 0.5) * (n.id === 'cloud' ? 10 : 18) : 0;
    const parY = ptr.active ? (ptr.y - 0.5) * (n.id === 'cloud' ? 8 : 14) : 0;
    return {
      x: 42 + n.x * (W - 84) + bobX + parX,
      y: 34 + n.y * (H - 68) + bobY + parY,
    };
  }

  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    ptr = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, active: true };
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let found = null;
    const now = performance.now() / 1000;
    for (const n of NODES) {
      const p = nodePos(n, now);
      if (Math.hypot(mx - p.x, my - p.y) < 28) { found = n.id; break; }
    }
    hoveredNode = found;
  });
  cv.addEventListener('pointerleave', () => { ptr.active = false; hoveredNode = null; });
  cv.addEventListener('click', () => {
    if (!hoveredNode) return;
    const idx = THREADS.findIndex((th) => th.nodes.includes(hoveredNode));
    if (idx >= 0) { activeIdx = idx; userPinned = true; renderReadout(); }
  });

  // Base mesh links between adjacent layers
  const MESH = [
    ['power', 'mech'], ['power', 'control'], ['mech', 'control'], ['control', 'embedded'],
    ['control', 'silicon'], ['embedded', 'verify'], ['silicon', 'verify'], ['verify', 'robotics'],
    ['verify', 'ai'], ['robotics', 'ai'], ['power', 'embedded'], ['mech', 'silicon'],
    ['embedded', 'robotics'], ['silicon', 'ai'], ['control', 'cloud'], ['verify', 'cloud'],
    ['embedded', 'cloud'], ['silicon', 'cloud'],
  ];

  let lastT = performance.now();
  function draw(now) {
    const dt = Math.min((now - lastT) / 1000, 0.08);
    lastT = now;
    if (visible) {
      resize();
      const t = now / 1000;
      const th = THREADS[activeIdx];
      const activeSet = new Set(th.nodes);
      const pos = Object.fromEntries(NODES.map((n) => [n.id, nodePos(n, t)]));

      ctx.clearRect(0, 0, W, H);

      // Subtle architectural rings centered on Systems Core
      const core = pos.cloud;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 1;
      [68, 126, 184].forEach((rad, i) => {
        ctx.setLineDash(i === 1 ? [3, 6] : []);
        ctx.beginPath();
        ctx.ellipse(core.x, core.y, rad * 1.25, rad * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // Faint structural mesh
      ctx.lineWidth = 1;
      for (const [a, b] of MESH) {
        const pa = pos[a], pb = pos[b];
        ctx.strokeStyle = 'rgba(255,255,255,0.065)';
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      // Active thread signal buses
      for (const [a, b] of th.edges) {
        const pa = pos[a], pb = pos[b];
        const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
        grad.addColorStop(0, nodeById[a].c);
        grad.addColorStop(1, nodeById[b].c);
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.shadowColor = th.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      }

      // Animated telemetry packets traveling along active edges
      if (!reduce) {
        packets.forEach((pk, idx) => {
          const edge = th.edges[idx % th.edges.length];
          pk.t = (pk.t + dt * pk.speed) % 1;
          const u = pk.dir > 0 ? pk.t : 1 - pk.t;
          const pa = pos[edge[0]], pb = pos[edge[1]];
          const x = pa.x + (pb.x - pa.x) * u;
          const y = pa.y + (pb.y - pa.y) * u;
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = th.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Nodes + labels
      for (const n of NODES) {
        const p = pos[n.id];
        const on = activeSet.has(n.id);
        const hov = hoveredNode === n.id;
        const isCore = n.id === 'cloud';

        // Outer halo
        if (on || hov) {
          const pulse = reduce ? 1 : 1 + Math.sin(t * 2.8 + n.x * 6) * 0.14;
          ctx.save();
          ctx.fillStyle = n.c;
          ctx.globalAlpha = hov ? 0.34 : 0.18;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (isCore ? 20 : 15) * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Node body
        ctx.save();
        ctx.fillStyle = on ? '#0a0d14' : '#090b10';
        ctx.strokeStyle = on || hov ? n.c : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = on || hov ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isCore ? 9.5 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner core dot
        ctx.fillStyle = on || hov ? n.c : 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isCore ? 4 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        const label = T(n.en, n.fr);
        const fs = W < 420 ? 10 : 11.5;
        ctx.save();
        ctx.font = `${on || hov ? '600' : '500'} ${fs}px "Inter Tight", Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = on || hov ? '#f4f6fb' : 'rgba(158,167,184,0.72)';
        const ly = n.y < 0.35 ? p.y - 15 : isCore ? p.y + 23 : p.y + 20;
        ctx.fillText(label, p.x, ly);
        ctx.restore();
      }
    }
    requestAnimationFrame(draw);
  }

  renderTabs();
  renderReadout();
  document.addEventListener('langchange', () => { renderTabs(); renderReadout(); });

  new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; })).observe(host);
  if (!reduce) {
    setInterval(() => {
      if (!visible || document.hidden || userPinned || host.matches(':hover')) return;
      activeIdx = (activeIdx + 1) % THREADS.length;
      renderReadout();
    }, 5200);
  }
  requestAnimationFrame(draw);
})();
