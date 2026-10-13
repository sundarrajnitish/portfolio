/* RTMC-HG: gesture -> five tendon servos -> "G,seq,a1..a5*CRC" serial frame (CRC-8, poly 0x07),
 * parsed by the same rules as the Arduino's LineParser. Click a frame character to corrupt it. */
Demos.register('rtmc', (el, { T, h, onLang, loop }) => {
  const FINGERS = [['thumb', 'Thumb', 'Pouce'], ['index', 'Index', 'Index'], ['middle', 'Middle', 'Majeur'], ['ring', 'Ring', 'Annulaire'], ['little', 'Little', 'Auriculaire']];
  const CLOSED = [160, 150, 180, 150, 150];
  const DEF = [['Hand_Open', 'thumb+index+middle+ring+little'], ['Hand_Closed', ''], ['Index', 'index'], ['Index_Middle', 'index+middle'],
    ['Thumb', 'thumb'], ['Thumb_Index', 'thumb+index'], ['Index_Little', 'index+little'], ['Thumb_Index_Little', 'thumb+index+little'],
    ['Index_Middle_Ring', 'index+middle+ring'], ['Middle', 'middle'], ['Ring_Little', 'ring+little'], ['Thumb_Little', 'thumb+little'],
    ['Middle_Ring', 'middle+ring'], ['Ring', 'ring'], ['Little', 'little'], ['Middle_Ring_Little', 'middle+ring+little'],
    ['Thumb_Index_Middle', 'thumb+index+middle'], ['Index_Middle_Ring_Little', 'index+middle+ring+little'], ['Thumb_Index_Middle_Ring', 'thumb+index+middle+ring']]
    .map(([name, f]) => ({ name, ext: FINGERS.map(([k]) => f.split('+').includes(k)) }));
  function crc8(bytes) { let c = 0; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; } return c; }
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
  const frame = (seq, a) => { const body = `G,${seq & 255},${a.join(',')}`; return `${body}*${crc8(ascii(body)).toString(16).toUpperCase().padStart(2, '0')}`; };
  function parse(line) {   // mirrors hand_core.h LineParser
    if (line[0] !== 'G') return { ok: false, why: ['does not start with G', 'ne commence pas par G'] };
    const star = line.indexOf('*');
    if (star < 3 || star + 3 !== line.length) return { ok: false, why: ['no "*HH" checksum at the end', 'pas de somme « *HH » à la fin'] };
    const hex = line.slice(star + 1), body = line.slice(0, star), want = crc8(ascii(body));
    if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return { ok: false, why: ['checksum is not two hex digits', 'la somme n’est pas deux chiffres hexa'] };
    if (parseInt(hex, 16) !== want) { const w = want.toString(16).toUpperCase().padStart(2, '0'); return { ok: false, why: [`CRC mismatch: frame says ${hex}, bytes give ${w}`, `CRC incorrect : la trame dit ${hex}, les octets donnent ${w}`] }; }
    const parts = body.split(',');
    if (parts.length !== 7 || parts.slice(1).some((x) => !/^\d{1,3}$/.test(x))) return { ok: false, why: ['fields are not six numbers', 'les champs ne sont pas six nombres'] };
    const v = parts.slice(1).map(Number);
    if (v.slice(1).some((a) => a > 180)) return { ok: false, why: ['value out of range', 'valeur hors plage'] };
    return { ok: true, angles: v.slice(1) };
  }

  let ext = DEF[0].ext.slice(), seq = 1, wire = '', held = CLOSED.map(() => 0), servo = [0, 0, 0, 0, 0], verdict = null;
  const angles = () => ext.map((e, i) => (e ? 0 : CLOSED[i]));
  function send() { seq = (seq + 1) & 255; wire = frame(seq, angles()); receive(); }
  function receive() { verdict = parse(wire); if (verdict.ok) held = verdict.angles; draw(); }

  const svg = h('svg', { class: 'd-svg', viewBox: '0 0 260 250', style: 'max-width:280px;margin:auto' });
  const right = h('div', { class: 'd-col' });
  const chips = h('div', { class: 'd-row', style: 'gap:6px' });
  el.append(h('style', { text: `
      .rt-frame{font:600 15px var(--mono);display:flex;flex-wrap:wrap;gap:1px}
      .rt-frame button{background:rgba(255,255,255,.06);border:0;border-radius:4px;color:var(--ink);font:inherit;padding:4px 3px;cursor:pointer;min-width:15px}
      .rt-frame button:hover{background:rgba(255,255,255,.2)}
      .rt-frame button.mut{background:rgba(255,69,58,.35)}
      .rt-servos{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;text-align:center;font:600 12px var(--mono)}
      .rt-servos div{padding:6px 2px;border-radius:8px;background:rgba(0,0,0,.35)}
      #rtChips .chip{font-size:12px;padding:4px 10px}
      .rt-hand path{transition:d .3s}
    ` }), h('div', { class: 'd-grid2' }, h('div', {}, svg), right), h('div', { id: 'rtChips', style: 'margin-top:14px' }, chips));
  let mutated = new Set();

  function fingerPath(i, curl) {
    // base positions on the palm, segment lengths; curl 0..1 bends each joint up to ~95 degrees
    const base = [[62, 150], [92, 92], [124, 84], [156, 90], [186, 104]][i];
    const lens = i === 0 ? [30, 26, 22] : [32, 26, 22];
    const start = i === 0 ? -2.3 : -1.62 + (i - 2) * 0.09;
    let [x, y] = base, a = start, d = `M${x} ${y}`;
    lens.forEach((L) => { x += Math.cos(a) * L; y += Math.sin(a) * L; d += `L${x.toFixed(1)} ${y.toFixed(1)}`; a += curl * (i === 0 ? 1.0 : 1.55); });
    return d;
  }
  function draw() {
    const g = DEF.find((d) => d.ext.every((e, i) => e === ext[i]));
    svg.replaceChildren(
      h('rect', { x: 52, y: 92, width: 150, height: 110, rx: 34, fill: '#d1d1d6' }),
      h('rect', { x: 92, y: 196, width: 70, height: 50, rx: 8, fill: '#d1d1d6' }),
      ...servo.map((deg, i) => {
        const p = h('path', { d: fingerPath(i, deg / CLOSED[i]), stroke: '#d1d1d6', 'stroke-width': i === 0 ? 24 : 21, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', style: 'cursor:pointer' });
        p.addEventListener('click', () => { ext[i] = !ext[i]; mutated.clear(); send(); });
        return p;
      }),
      ...servo.map((deg, i) => h('circle', { cx: [62, 92, 124, 156, 186][i], cy: [150, 92, 84, 90, 104][i], r: 4, fill: '#6e6e73' })),
    );
    const k = (v, l, c = '') => h('div', { class: 'd-kpi' }, h('b', { class: c }, v), h('span', {}, l));
    right.replaceChildren(
      h('div', { class: 'd-kpis' }, k(g ? g.name.replace(/_/g, ' ') : 'Partial', T('gesture (1 of 20)', 'geste (1 sur 20)')), k(`#${seq}`, T('sequence', 'séquence'))),
      h('span', { class: 'd-label' }, T('Serial frame to the Arduino, 115200 Bd. Click any character to corrupt it:', 'Trame série vers l’Arduino, 115200 Bd. Cliquez sur un caractère pour le corrompre :')),
      h('div', { class: 'rt-frame d-panel' }, ...[...wire].map((ch, i) => h('button', {
        class: mutated.has(i) ? 'mut' : '', onclick: () => {
          const c = wire[i];
          const nc = /\d/.test(c) ? String((+c + 1) % 10) : /[A-F]/.test(c) ? 'ABCDEF0'['ABCDEF'.indexOf(c) + 1] : c === ',' ? '.' : c;
          wire = wire.slice(0, i) + nc + wire.slice(i + 1); mutated.add(i); receive();
        },
      }, ch))),
      h('div', { style: `font-weight:600;padding:10px 14px;border-radius:12px;background:${verdict.ok ? 'rgba(48,209,88,.12)' : 'rgba(255,69,58,.12)'}` },
        verdict.ok ? T('Frame accepted → servos move', 'Trame acceptée → les servos bougent') : `${T('Rejected', 'Rejetée')}: ${T(...verdict.why)}. ${T('Servos hold the last good pose.', 'Les servos gardent la dernière pose valide.')}`),
      h('div', { class: 'rt-servos' }, ...FINGERS.map(([, en, fr], i) => h('div', {}, h('div', { class: 'muted', style: 'font-size:10px' }, T(en, fr)), `${Math.round(servo[i])}°`))),
      h('button', { class: 'd-btn', onclick: () => { mutated.clear(); send(); } }, T('Resend a clean frame', 'Renvoyer une trame propre')),
    );
    chips.replaceChildren(...DEF.map((d) => h('button', { class: 'chip' + (g === d ? ' on' : ''), onclick: () => { ext = d.ext.slice(); mutated.clear(); send(); } }, d.name.replace(/_/g, ' '))));
  }
  send(); onLang(draw);
  // non-blocking slew toward the held pose, like the firmware
  loop((dt) => {
    let moved = false;
    servo = servo.map((v, i) => { const t = held[i], s = 360 * dt; if (Math.abs(t - v) < 0.5) return t; moved = true; return v + Math.sign(t - v) * Math.min(s, Math.abs(t - v)); });
    if (moved) svg.querySelectorAll('path').forEach((p, i) => p.setAttribute('d', fingerPath(i, servo[i] / CLOSED[i])));
  });
});
