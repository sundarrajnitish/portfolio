/* Hero Cyberpunk Convergence Console: Nitish's sci-fi cyberpunk character rig
 * integrated into a live HiDPI holographic 9-layer signal-topology HUD. */
(function () {
  'use strict';
  const host = document.getElementById('heroConsole');
  if (!host) return;
  const lang = () => document.documentElement.dataset.lang || 'en';
  const T = (en, fr) => (lang() === 'fr' ? fr : en);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 9 engineering layers arranged on a wide cyberpunk orbital halo around the character
  const NODES = [
    { id: 'mech',     x: 0.05, y: 0.80, c: '#ffb020', en: 'Mechanics',     fr: 'Mécanique' },
    { id: 'power',    x: 0.02, y: 0.54, c: '#ff9442', en: 'Power · EPMS',  fr: 'Énergie · EPMS' },
    { id: 'control',  x: 0.09, y: 0.29, c: '#e3d633', en: 'Control',       fr: 'Commande' },
    { id: 'embedded', x: 0.27, y: 0.11, c: '#a3e635', en: 'Embedded',      fr: 'Embarqué' },
    { id: 'cloud',    x: 0.50, y: 0.06, c: '#a78bfa', en: 'Systems Core',  fr: 'Cœur système' },
    { id: 'verify',   x: 0.73, y: 0.11, c: '#2dd4bf', en: 'Verification',  fr: 'Vérification' },
    { id: 'silicon',  x: 0.91, y: 0.29, c: '#34d399', en: 'Silicon · RTL', fr: 'Silicium · RTL' },
    { id: 'robotics', x: 0.98, y: 0.54, c: '#38bdf8', en: 'Autonomy',      fr: 'Autonomie' },
    { id: 'ai',       x: 0.95, y: 0.80, c: '#f472b6', en: 'AI · Vision',   fr: 'IA · Vision' },
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
      edges: [['power', 'control'], ['control', 'embedded'], ['embedded', 'cloud'], ['cloud', 'verify'], ['power', 'cloud']],
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
      edges: [['embedded', 'cloud'], ['cloud', 'verify'], ['verify', 'silicon'], ['embedded', 'verify']],
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
      edges: [['mech', 'control'], ['control', 'embedded'], ['embedded', 'cloud'], ['cloud', 'robotics'], ['robotics', 'ai']],
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
      edges: [['cloud', 'verify'], ['verify', 'robotics'], ['robotics', 'ai'], ['cloud', 'ai']],
      metrics: [
        ['43 ms', 'p95 at 300 live users', 'p95 à 300 utilisateurs'],
        ['0 lost', 'Atomic DynamoDB bids', 'Mises DynamoDB atomiques'],
        ['$0.07/d', 'Launch-day AWS cost', 'Coût AWS jour 1'],
      ],
    },
  ];

  // Build cyberpunk operator console chrome
  host.innerHTML = `
    <div class="hc-bar">
      <span class="hc-bar-left"><span class="hc-live">LIVE</span><span id="hcHeader"></span></span>
      <button type="button" class="hc-visor-btn on" id="hcVisorBtn" aria-pressed="true"><span id="hcVisorText" aria-hidden="true"></span></button>
    </div>
    <div class="hc-stage" id="hcStage">
      <canvas class="hc-canvas" id="heroCanvas" aria-hidden="true"></canvas>
      <div class="hc-scanlines" aria-hidden="true"></div>
      <div class="hc-char" id="heroCharWrap">
        <div class="hc-char-fig" id="heroFig" aria-hidden="true"></div>
        <button type="button" class="hc-char-hit" id="heroCharHit" tabindex="-1" aria-hidden="true"></button>
        <p class="hc-bubble" id="heroBubble"></p>
      </div>
      <span class="hc-hint" id="hcHint" aria-hidden="true"></span>
    </div>
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

  const stage = host.querySelector('#hcStage');
  const cv = host.querySelector('#heroCanvas');
  const ctx = cv.getContext('2d');
  const elCharWrap = host.querySelector('#heroCharWrap');
  const elChar = host.querySelector('#heroFig');
  const elCharHit = host.querySelector('#heroCharHit');
  const elVisorBtn = host.querySelector('#hcVisorBtn');
  const elVisorText = host.querySelector('#hcVisorText');
  const elBubble = host.querySelector('#heroBubble');
  const elHint = host.querySelector('#hcHint');
  const elHeader = host.querySelector('#hcHeader');
  const elEyebrow = host.querySelector('#hcEyebrow');
  const elTitle = host.querySelector('#hcTitle');
  const elDesc = host.querySelector('#hcDesc');
  const elJump = host.querySelector('#hcJump');
  const elMetrics = host.querySelector('#hcMetrics');
  const elTabs = host.querySelector('#hcTabs');

  // Mount the cyberpunk character rig strictly in the hero stage (only cyber props & gear built)
  const fig = window.Figure
    ? new window.Figure(elChar, {
      scene: 'cyber',
      cyberDeck: true,
      ambient: false,
      props: ['cyber'],
      gear: ['visor', 'cyberlink'],
      viewBox: '-24 22 448 432',
    })
    : null;

  if (!fig) {
    elVisorBtn.hidden = true;
    elCharWrap.hidden = true;
    elHint.hidden = true;
  }

  let visorOn = true;
  let activeIdx = 0;
  let userPinned = false;
  let visible = true;
  let hoveredNode = null;
  let bubbleMsg = null;
  let ptr = { x: 0.5, y: 0.5, active: false };
  const packets = Array.from({ length: 16 }, (_, i) => ({
    edgeIdx: i,
    t: (i * 0.19) % 1,
    speed: 0.24 + (i % 5) * 0.055,
    dir: i % 2 === 0 ? 1 : -1,
  }));

  function say(en, fr, ms = 2700, announce = true) {
    if (!elBubble) return;
    bubbleMsg = [en, fr];
    if (announce) elBubble.setAttribute('aria-live', 'polite');
    else elBubble.removeAttribute('aria-live');
    elBubble.textContent = T(en, fr);
    elBubble.classList.add('on');
    clearTimeout(say.t);
    clearTimeout(say.clearT);
    say.t = setTimeout(() => {
      elBubble.classList.remove('on');
      say.clearT = setTimeout(() => {
        if (!elBubble.classList.contains('on')) {
          elBubble.textContent = '';
          bubbleMsg = null;
        }
      }, 340);
    }, ms);
  }

  function updateVisorUI() {
    if (!fig) return;
    elVisorBtn.classList.toggle('on', visorOn);
    elVisorBtn.setAttribute('aria-pressed', String(visorOn));
    elVisorBtn.setAttribute('aria-label', T('AR visor', 'Visière RA'));
    elVisorText.textContent = visorOn
      ? T('VISOR // ON', 'VISIÈRE // ACTIF')
      : T('VISOR // OFF', 'VISIÈRE // ARRÊT');
  }

  function toggleVisor() {
    if (!fig) return;
    visorOn = !visorOn;
    if (elHint) elHint.classList.add('done');
    fig.set({ gear: visorOn ? ['visor', 'cyberlink'] : ['cyberlink'] });
    fig.wave(1.7);
    updateVisorUI();
    if (visorOn) say('HUD online. Back to the stack.', 'HUD actif. Retour à la pile.');
    else say('Visor off — eyes on the metal.', 'Visière levée — cap sur le réel.');
  }

  elCharHit.addEventListener('click', toggleVisor);
  elVisorBtn.addEventListener('click', toggleVisor);

  if (fig && !reduce) {
    setTimeout(() => {
      if (visible) {
        fig.wave(2.8);
        say('Link online — I’m Nitish.', 'Lien actif — moi c’est Nitish.', 3400, false);
      }
    }, 950);
  }

  function renderTabs() {
    elTabs.innerHTML = THREADS.map((th, i) => `
      <button type="button" class="hc-tab${i === activeIdx ? ' on' : ''}" data-idx="${i}" style="--c:${th.color}" role="tab" aria-selected="${i === activeIdx}">
        ${T(th.tabEn, th.tabFr)}
      </button>`).join('');
  }

  function renderReadout() {
    const th = THREADS[activeIdx];
    host.style.setProperty('--hc-c', th.color);
    host.setAttribute(
      'aria-label',
      T(
        'Interactive Cyberpunk Operator and Systems Convergence Topology',
        'Opérateur cyberpunk interactif et topologie de convergence système'
      )
    );
    if (fig) fig.set({ light: th.color });
    elHeader.textContent = T('Cyber-Deck // 09 Layers', 'Cyber-Deck // 09 couches');
    elHint.textContent = T('CLICK AVATAR · VISOR', 'CLIQUER · VISIÈRE');
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
    if (bubbleMsg && elBubble.classList.contains('on')) {
      elBubble.textContent = T(bubbleMsg[0], bubbleMsg[1]);
    }
    updateVisorUI();
    if (reduce) drawFrame(performance.now(), 0);
  }

  elTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.hc-tab');
    if (!btn) return;
    activeIdx = +btn.dataset.idx;
    userPinned = true;
    renderReadout();
  });

  // Canvas geometry cached via ResizeObserver (avoids per-frame forced layout)
  let W = 560, H = 392;
  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || 560;
    const h = cv.clientHeight || 392;
    W = w;
    H = h;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw;
      cv.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) drawFrame(performance.now(), 0);
  }
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(syncCanvasSize).observe(cv);
  } else {
    addEventListener('resize', syncCanvasSize);
  }

  function nodePos(n, time) {
    const bobX = reduce ? 0 : Math.sin(time * 0.72 + n.x * 9) * 2.6;
    const bobY = reduce ? 0 : Math.cos(time * 0.88 + n.y * 11) * 2.6;
    const parX = ptr.active ? (ptr.x - 0.5) * 10 : 0;
    const parY = ptr.active ? (ptr.y - 0.5) * 8 : 0;
    const padX = W < 420 ? 38 : 48;
    const padY = 28;
    return {
      x: padX + n.x * (W - padX * 2) + bobX + parX,
      y: padY + n.y * (H - padY * 2) + bobY + parY,
    };
  }

  function findNodeAt(mx, my) {
    const now = performance.now() / 1000;
    for (const n of NODES) {
      const p = nodePos(n, now);
      if (Math.hypot(mx - p.x, my - p.y) < 26) return n.id;
    }
    return null;
  }

  stage.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    ptr = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, active: true };
    const found = findNodeAt(e.clientX - r.left, e.clientY - r.top);
    if (found !== hoveredNode) {
      hoveredNode = found;
      cv.style.cursor = found ? 'pointer' : 'crosshair';
      if (reduce) drawFrame(performance.now(), 0);
    }
  });
  stage.addEventListener('pointerleave', () => {
    ptr.active = false;
    if (hoveredNode !== null) {
      hoveredNode = null;
      if (reduce) drawFrame(performance.now(), 0);
    }
  });
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const hit = hoveredNode || findNodeAt(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    const idx = THREADS.findIndex((th) => th.nodes.includes(hit));
    if (idx >= 0) { activeIdx = idx; userPinned = true; renderReadout(); }
  });

  // Base outer halo mesh links around the character
  const MESH = [
    ['mech', 'power'], ['power', 'control'], ['control', 'embedded'],
    ['embedded', 'cloud'], ['cloud', 'verify'], ['verify', 'silicon'],
    ['silicon', 'robotics'], ['robotics', 'ai'],
    ['control', 'cloud'], ['cloud', 'silicon'],
    ['power', 'embedded'], ['verify', 'robotics'],
  ];

  function drawFrame(now, dt) {
    const t = now / 1000;
    const th = THREADS[activeIdx];
    const activeSet = new Set(th.nodes);
    const pos = Object.fromEntries(NODES.map((n) => [n.id, nodePos(n, t)]));
    const cx = W * 0.5;
    const cy = H * 0.58;
    const deck = { x: cx, y: H * 0.88 };

    ctx.clearRect(0, 0, W, H);

    // Perspective cyber floor grid behind the desk
    ctx.save();
    const horizonY = H * 0.74;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const k = i / 5;
      const y = horizonY + Math.pow(k, 1.55) * (H - horizonY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * (W * 0.065), horizonY);
      ctx.lineTo(cx + i * (W * 0.16), H);
      ctx.stroke();
    }
    ctx.restore();

    // Cyberpunk HUD corner brackets + top-left coordinate telemetry
    ctx.save();
    ctx.strokeStyle = th.color;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 1.4;
    const m = 12, len = 14;
    [
      [m, m + len, m, m, m + len, m],
      [W - m - len, m, W - m, m, W - m, m + len],
      [m, H - m - len, m, H - m, m + len, H - m],
      [W - m - len, H - m, W - m, H - m, W - m, H - m - len],
    ].forEach(([x1, y1, x2, y2, x3, y3]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.font = '500 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(158, 167, 184, 0.48)';
    ctx.textAlign = 'left';
    ctx.fillText('MTL // 45.50°N', m + 8, m + 12);
    ctx.restore();

    // Holographic orbital rings centered behind the cyberpunk character
    ctx.save();
    const rxBase = Math.min(W * 0.36, 215);
    const ryBase = Math.min(H * 0.42, 162);
    [0.62, 0.88, 1.08].forEach((scale, i) => {
      ctx.strokeStyle = i === 1 ? th.color : 'rgba(255, 255, 255, 0.055)';
      ctx.globalAlpha = i === 1 ? 0.17 : 1;
      ctx.lineWidth = i === 1 ? 1.2 : 1;
      ctx.setLineDash(i === 1 ? [4, 7] : i === 2 ? [1, 8] : []);
      ctx.lineDashOffset = reduce ? 0 : (i % 2 ? -t * 14 : t * 8);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rxBase * scale, ryBase * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    // Subtle glowing neural tether conduits from active nodes into the cyber-deck behind Nitish
    ctx.save();
    for (const id of th.nodes) {
      const p = pos[id];
      const grad = ctx.createLinearGradient(p.x, p.y, deck.x, deck.y);
      grad.addColorStop(0, nodeById[id].c);
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.04)');
      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.24;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(cx, cy * 0.92, deck.x, deck.y);
      ctx.stroke();
    }
    ctx.restore();

    // Faint structural halo mesh
    ctx.lineWidth = 1;
    for (const [a, b] of MESH) {
      const pa = pos[a], pb = pos[b];
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.075)';
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
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 2;
      ctx.shadowColor = th.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.restore();
    }

    // Animated telemetry packets along active edges
    if (!reduce && dt > 0) {
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
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Nodes + crisp labels
    const compact = W < 520;
    for (const n of NODES) {
      const p = pos[n.id];
      const on = activeSet.has(n.id);
      const hov = hoveredNode === n.id;
      const isCore = n.id === 'cloud';

      if (on || hov) {
        const pulse = reduce ? 1 : 1 + Math.sin(t * 3 + n.x * 6) * 0.14;
        ctx.save();
        ctx.fillStyle = n.c;
        ctx.globalAlpha = hov ? 0.36 : 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (isCore ? 17 : 13.5) * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Hexagonal cyberpunk node frame for Systems Core, circle otherwise
      ctx.save();
      ctx.fillStyle = on ? '#090d16' : '#080b12';
      ctx.strokeStyle = on || hov ? n.c : 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = on || hov ? 2 : 1.2;
      const rad = isCore ? 8.5 : 6.4;
      ctx.beginPath();
      if (isCore) {
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k - Math.PI / 6;
          const hx = p.x + Math.cos(ang) * rad;
          const hy = p.y + Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
      } else {
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = on || hov ? n.c : 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isCore ? 3.2 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Label placement: crown nodes above; mech/ai also above on narrow stages to clear holo-props
      const label = T(n.en, n.fr);
      const fs = W < 420 ? 9.5 : 11;
      ctx.save();
      ctx.font = `${on || hov ? '600' : '500'} ${fs}px "Inter Tight", Inter, sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width;
      const lx = Math.max(tw / 2 + 10, Math.min(W - tw / 2 - 10, p.x));
      const labelAbove = n.y <= 0.14 || (compact && (n.id === 'mech' || n.id === 'ai'));
      const ly = labelAbove ? p.y - 14 : p.y + 19;
      ctx.fillStyle = on || hov ? '#f4f6fb' : 'rgba(158, 167, 184, 0.72)';
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }
  }

  let running = false;
  let lastT = performance.now();
  function kick() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    lastT = performance.now();
    const tick = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      const dt = Math.min((now - lastT) / 1000, 0.08);
      lastT = now;
      drawFrame(now, dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  syncCanvasSize();
  renderTabs();
  renderReadout();
  document.addEventListener('langchange', () => { renderTabs(); renderReadout(); });
  document.addEventListener('visibilitychange', kick);

  new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting;
    kick();
  })).observe(host);

  if (!reduce) {
    setInterval(() => {
      if (!visible || document.hidden || userPinned || host.matches(':hover') || host.contains(document.activeElement)) return;
      activeIdx = (activeIdx + 1) % THREADS.length;
      renderReadout();
    }, 5200);
    kick();
  }
})();
