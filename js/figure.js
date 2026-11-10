/* Nitish as a filled-vector character, built once and then animated in place.
 * A Figure is a rig: head (turns toward the cursor, blinks), torso (breathes) and two arms solved with
 * two-bone IK toward hand targets, so a pose is just "where the hands are". Gear (sunglasses, hard hat,
 * grad cap...) and scene props are pre-built layers that cross-fade, so nothing is redrawn on a scene change.
 *
 *   const f = new Figure(host, { scene: 'hello' });  f.set({ gear, pose, props });  f.wave();
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  // ---------- palette ----------
  const C = {
    skin: '#a96f51', skinDk: '#86533b', skinLt: '#bf8766', mouth: '#4a1915', teeth: '#f6f1ea',
    hair: '#15100e', hairHi: '#3a2b25', shirt: '#151518', shirtHi: '#2b2b31', tee: '#ecebe6',
  };

  // ---------- geometry (viewBox space; the figure is centred on x = 200) ----------
  const SH_L = [96, 338], SH_R = [304, 338];   // shoulders
  const UPPER = 74, FORE = 66;                  // bone lengths

  // hand targets for each pose, in viewBox coords; t = seconds, for procedural motion
  const POSES = {
    type: (t) => [[146 + Math.sin(t * 13) * 3, 418 + Math.max(0, Math.sin(t * 13)) * -5], [254 + Math.sin(t * 13 + 2.2) * 3, 418 + Math.max(0, Math.sin(t * 13 + 2.2)) * -5]],
    rest: () => [[150, 424], [250, 424]],
    wave: (t) => [[146 + Math.sin(t * 13) * 3, 418], [356 + Math.sin(t * 9) * 16, 236 + Math.cos(t * 9) * 4]],
    think: (t) => [[150, 424], [218, 270 + Math.sin(t * 1.5) * 2]],
    hold: (t) => [[164, 382 + Math.sin(t * 2) * 2], [236, 382 + Math.sin(t * 2) * 2]],
    pad: (t) => [[176 + Math.sin(t * 6) * 2, 392], [224 + Math.cos(t * 7) * 2, 392]],
    point: (t) => [[146, 418], [372 + Math.sin(t * 3) * 3, 290]],
    cheer: (t) => [[60 + Math.sin(t * 6) * 6, 220 + Math.cos(t * 6) * 6], [340 - Math.sin(t * 6) * 6, 220 + Math.cos(t * 6) * 6]],
  };
  // hand angle offsets (deg) per pose: an open palm faces the viewer when waving
  const HAND_OPEN = { wave: [false, true], cheer: [true, true], point: [false, true] };

  function ik(S, T, outward) {
    let dx = T[0] - S[0], dy = T[1] - S[1];
    let d = Math.hypot(dx, dy);
    const maxR = UPPER + FORE - 0.5, minR = Math.abs(UPPER - FORE) + 8;
    if (d > maxR) { dx *= maxR / d; dy *= maxR / d; d = maxR; }
    if (d < minR) { dx *= minR / d; dy *= minR / d; d = minR; }
    const base = Math.atan2(dy, dx);
    const a = Math.acos(Math.min(1, Math.max(-1, (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d))));
    // two elbow solutions; keep the one whose elbow sits further out (left arm: smaller x)
    const e1 = [S[0] + Math.cos(base + a) * UPPER, S[1] + Math.sin(base + a) * UPPER];
    const e2 = [S[0] + Math.cos(base - a) * UPPER, S[1] + Math.sin(base - a) * UPPER];
    const E = (outward < 0 ? e1[0] < e2[0] : e1[0] > e2[0]) ? e1 : e2;
    const H = [S[0] + dx, S[1] + dy];
    const deg = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI - 90;   // rotate() that points +y along v
    return { E, H, up: deg([E[0] - S[0], E[1] - S[1]]), fore: deg([H[0] - E[0], H[1] - E[1]]) };
  }

  // ---------- SVG parts ----------
  const mirror = (d) => `<g transform="translate(400 0) scale(-1 1)">${d}</g>`;


  // Head traced from Nitish's photo: MediaPipe face landmarks give the jaw, brows, eyes, nose and smile, and the
  // hair segmenter gives the hair silhouette, mapped 1:1 into this viewBox (eye midpoint -> 200,153).
  const HEAD = {
    face: 'M200 59C192.7 59 184.7 62.8 178 66C171.3 69.2 165 73 160 78C155 83 151.2 89.3 148 96C144.8 102.7 142.8 110.3 141 118C139.2 125.7 138.2 134.3 137.5 142C136.8 149.7 136.5 157 136.5 164C136.5 171 137 177.5 137.5 184C138 190.5 138.7 197 139.5 203C140.3 209 141.2 214.6 142.5 220C143.8 225.4 145.1 230.7 147 235.5C148.9 240.3 151.3 245 154 249C156.7 253 159.6 256.6 163 259.5C166.4 262.4 170.4 264.8 174.5 266.5C178.6 268.2 183.2 269.2 187.5 270C191.8 270.8 195.8 271 200 271C204.2 271 208.2 270.8 212.5 270C216.8 269.2 221.4 268.2 225.5 266.5C229.6 264.8 233.6 262.4 237 259.5C240.4 256.6 243.3 253 246 249C248.7 245 251.1 240.3 253 235.5C254.9 230.7 256.2 225.4 257.5 220C258.8 214.6 259.7 209 260.5 203C261.3 197 262 190.5 262.5 184C263 177.5 263.5 171 263.5 164C263.5 157 263.2 149.7 262.5 142C261.8 134.3 260.8 125.7 259 118C257.2 110.3 255.2 102.7 252 96C248.8 89.3 245 83 240 78C235 73 228.7 69.2 222 66C215.3 62.8 207.3 59 200 59Z',
    hair: 'M201 39.7C205.7 39.7 208 42.2 211 42.7C214 43.2 213.8 41 219 42.7C224.2 44.4 236.8 51 242 52.7C247.2 54.4 247.8 52 250 52.7C252.2 53.4 254.2 55.4 255 56.7C255.8 58 254.5 59.5 255 60.7C255.5 61.9 255.5 62 258 63.7C260.5 65.4 267.8 66.4 270 70.7C272.2 75 269.8 85.7 271 89.7C272.2 93.7 275.7 92.5 277 94.7C278.3 96.9 278.5 96 279 102.7C279.5 109.4 280.2 126.7 280 134.7C279.8 142.7 279 149 278 150.7C277 152.4 275.7 145.9 274 144.7C272.3 143.5 270 145.4 268 143.7C266 142 264.3 141.9 262 134.7C259.7 127.5 256.7 107.5 254 100.7C251.3 93.9 249.3 95.9 246 93.7C242.7 91.5 240.8 88.2 234 87.7C227.2 87.2 212.2 89 205 90.7C197.8 92.4 195 96 191 97.7C187 99.4 183.2 100.2 181 100.7C178.8 101.2 178.8 101 178 100.7C177.2 100.4 175.5 99.7 176 98.7C176.5 97.7 180.2 95.7 181 94.7C181.8 93.7 181.5 93.4 181 92.7C180.5 92 179.8 90 178 90.7C176.2 91.4 172.8 96.4 170 96.7C167.2 97 163.3 93.4 161 92.7C158.7 92 157.5 92.4 156 92.7C154.5 93 153.3 93.7 152 94.7C150.7 95.7 149.7 95.5 148 98.7C146.3 101.9 143 109.2 142 113.7C141 118.2 144.2 119.9 142 125.7C139.8 131.5 131.7 144.9 129 148.7C126.3 152.5 127 151.9 126 148.7C125 145.5 123.5 135 123 129.7C122.5 124.4 123.5 120.9 123 116.7C122.5 112.5 120.3 108.9 120 104.7C119.7 100.5 121.5 95.2 121 91.7C120.5 88.2 117.7 86 117 83.7C116.3 81.4 116 79.7 117 77.7C118 75.7 121.7 73.7 123 71.7C124.3 69.7 123.7 67.5 125 65.7C126.3 63.9 129.5 62.4 131 60.7C132.5 59 132.5 57 134 55.7C135.5 54.4 137 53.9 140 52.7C143 51.5 149 49.2 152 48.7C155 48.2 154.3 50.9 158 49.7C161.7 48.5 169.8 42.9 174 41.7C178.2 40.5 178.5 43 183 42.7C187.5 42.4 196.3 39.7 201 39.7Z',
    strands: '<path d="M130.7 146.1L131.7 137.5L132.2 128.7L132.1 119.7L131.6 110.6L130.5 101.3L128.9 91.9L126.8 82.4L124.1 72.7L124.1 72.7L125.8 82.6L127.1 92.2L128 101.6L128.4 110.8L128.4 119.7L127.8 128.4L126.8 136.9L125.3 145.3Z" fill="#3b302d"/><path d="M135.8 94.7L136.9 91.5L137.4 88.1L137.3 84.5L136.5 80.9L135.1 77.1L133.2 73.3L130.7 69.3L127.5 65.3L127.5 65.3L130 69.7L132 73.9L133.4 77.8L134.3 81.4L134.5 84.7L134.3 87.7L133.5 90.5L132.2 93.2Z" fill="#090707"/><path d="M142.7 118.2L143.6 112L143.8 105.5L143.2 98.9L142 92.2L140 85.4L137.3 78.5L133.9 71.4L129.7 64.3L129.7 64.3L132.9 71.9L135.6 79.1L137.6 86.1L138.9 92.8L139.5 99.3L139.4 105.4L138.7 111.4L137.3 117.2Z" fill="#3b302d"/><path d="M147.7 76.7L148.8 74.6L149.1 72L148.5 69.5L147.2 67.1L145.1 64.7L142.3 62.2L138.9 59.6L134.7 56.9L134.7 56.9L138.4 60.2L141.4 63.2L143.7 65.9L145.2 68.3L145.9 70.4L146 72L145.5 73.2L144.3 74.4Z" fill="#090707"/><path d="M154.6 87.6L155.5 84L155.6 80.1L154.8 76.1L153.1 72.2L150.7 68.2L147.5 64.2L143.5 60.1L138.6 55.9L138.6 55.9L142.7 60.8L146 65.3L148.5 69.5L150.2 73.4L151.1 77L151.2 80.2L150.7 83L149.4 85.8Z" fill="#3b302d"/><path d="M159.1 70.7L160.5 69.4L160.9 67.1L159.9 65.4L158.1 64L155.7 62.6L152.5 61.1L148.5 59.4L143.7 57.7L143.7 57.7L148.2 60.1L151.9 62.2L154.7 64.1L156.7 65.8L157.7 67L157.8 67.6L157.7 67.2L156.9 67.4Z" fill="#090707"/><path d="M166.7 91.4L167.5 86.9L167.5 82.1L166.5 77.3L164.6 72.4L161.8 67.5L158.3 62.5L153.8 57.4L148.5 52.3L148.5 52.3L153 58.1L156.8 63.5L159.7 68.7L161.7 73.6L162.8 78.1L163.1 82.3L162.6 86.2L161.3 90Z" fill="#3b302d"/><path d="M171.6 69.3L172.7 67.3L172.9 64.7L171.9 62.3L170.1 60.1L167.5 57.9L164.1 55.6L159.9 53.2L154.8 50.7L154.8 50.7L159.5 53.9L163.3 56.7L166.3 59.3L168.3 61.7L169.5 63.6L169.7 65.1L169.4 65.9L168.4 66.9Z" fill="#090707"/><path d="M178.6 87.4L179.5 83.3L179.5 78.8L178.5 74.2L176.7 69.7L174 65.1L170.5 60.4L166.1 55.7L160.9 50.9L160.9 50.9L165.3 56.4L169 61.5L171.8 66.4L173.8 70.9L174.9 75.1L175.1 79L174.6 82.5L173.4 86Z" fill="#3b302d"/><path d="M183.7 69.3L184.8 66.9L185 64.1L184.2 61.4L182.5 58.7L180.1 56L177 53.2L173.1 50.3L168.3 47.3L168.3 47.3L172.6 50.9L176.1 54.2L178.8 57.2L180.6 60L181.6 62.3L181.8 64.3L181.4 65.8L180.3 67.4Z" fill="#090707"/><path d="M190.7 91.3L191.5 86.3L191.2 80.9L189.9 75.5L187.7 70.1L184.4 64.6L180.2 59L175.1 53.4L168.9 47.7L168.9 47.7L174.3 54.1L178.8 60.1L182.3 65.9L184.8 71.3L186.3 76.5L186.9 81.3L186.6 85.7L185.3 90.1Z" fill="#3b302d"/><path d="M195.6 66.6L196.7 64.7L196.9 62.2L195.8 59.9L194 57.8L191.3 55.7L187.9 53.5L183.6 51.1L178.5 48.7L178.5 48.7L183.3 51.8L187.2 54.6L190.2 57.1L192.3 59.4L193.4 61.3L193.7 62.6L193.4 63.3L192.4 64.3Z" fill="#090707"/><path d="M202.7 89.3L203.5 84.1L203.3 78.7L202.1 73.1L199.9 67.6L196.7 62L192.7 56.3L187.7 50.5L181.7 44.7L181.7 44.7L186.9 51.2L191.2 57.4L194.6 63.2L197 68.8L198.4 74.1L198.9 79L198.6 83.6L197.3 88.1Z" fill="#3b302d"/><path d="M207.6 64.4L208.7 62.5L208.9 60L207.9 57.8L206.1 55.7L203.5 53.6L200.2 51.4L196 49.1L191 46.7L191 46.7L195.6 49.7L199.4 52.5L202.4 55L204.4 57.2L205.5 59.1L205.7 60.4L205.4 61.1L204.4 62Z" fill="#090707"/><path d="M214.6 78.7L215.5 75.5L215.3 71.8L214.1 68.3L211.9 64.8L208.9 61.4L205 57.9L200.2 54.3L194.5 50.7L194.5 50.7L199.6 55.1L203.8 59.2L207 63.1L209.3 66.6L210.6 69.7L211 72.3L210.6 74.5L209.4 76.7Z" fill="#3b302d"/><path d="M219.6 64.6L220.7 62.7L220.9 60.2L220 57.9L218.2 55.8L215.7 53.7L212.4 51.5L208.3 49.1L203.4 46.7L203.4 46.7L207.9 49.8L211.7 52.5L214.5 55.1L216.5 57.3L217.5 59.2L217.8 60.5L217.4 61.2L216.4 62.2Z" fill="#090707"/><path d="M226.6 82.6L227.5 79.1L227.4 75.1L226.2 71.2L224.1 67.4L221.1 63.6L217.3 59.7L212.6 55.7L207 51.7L207 51.7L211.9 56.5L216 61L219.2 65.1L221.4 69L222.6 72.5L223 75.5L222.6 78.2L221.4 80.8Z" fill="#3b302d"/><path d="M231.1 67.3L232.5 66.1L232.9 63.8L231.9 62.1L230.1 60.7L227.7 59.4L224.6 58L220.6 56.4L215.8 54.7L215.8 54.7L220.3 57.1L224 59.1L226.8 61L228.8 62.6L229.8 63.8L229.8 64.2L229.7 63.7L228.9 63.9Z" fill="#090707"/><path d="M238.6 85.6L239.5 82.1L239.4 78.2L238.4 74.3L236.4 70.5L233.5 66.6L229.9 62.7L225.4 58.7L219.9 54.7L219.9 54.7L224.6 59.5L228.5 63.9L231.5 68.1L233.6 71.9L234.8 75.4L235.1 78.5L234.6 81.1L233.4 83.8Z" fill="#3b302d"/><path d="M243.2 71.9L244.5 70.6L245 68.3L244 66.5L242.3 65.1L239.9 63.7L236.7 62.1L232.8 60.5L228.1 58.7L228.1 58.7L232.5 61.1L236.1 63.3L238.9 65.2L240.8 66.9L241.8 68.1L241.8 68.7L241.7 68.4L240.8 68.6Z" fill="#090707"/><path d="M250.5 84.9L251.4 82.1L251.4 78.8L250.2 75.7L248.1 72.8L245.1 69.9L241.3 66.9L236.7 63.8L231.1 60.7L231.1 60.7L236.1 64.7L240.2 68.3L243.3 71.6L245.5 74.6L246.7 77.3L247 79.3L246.7 80.9L245.5 82.5Z" fill="#3b302d"/><path d="M255.6 78.4L256.7 76.4L256.9 73.9L256 71.5L254.2 69.3L251.6 67L248.3 64.7L244.2 62.2L239.2 59.7L239.2 59.7L243.8 62.9L247.5 65.8L250.4 68.4L252.4 70.7L253.5 72.7L253.7 74.2L253.4 75.1L252.4 76.2Z" fill="#090707"/><path d="M262.7 120.2L263.5 114.5L263.2 108.4L261.8 102.3L259.4 96.1L256.1 89.9L251.7 83.6L246.3 77.1L239.9 70.7L239.9 70.7L245.5 77.8L250.2 84.6L253.9 91.1L256.5 97.3L258.2 103.2L258.8 108.8L258.5 114L257.3 119.2Z" fill="#3b302d"/><path d="M267.8 99.7L268.8 97.2L268.8 94.2L267.7 91.4L265.7 88.6L262.9 85.8L259.3 82.8L254.7 79.8L249.3 76.7L249.3 76.7L254.3 80.4L258.4 83.9L261.6 87.1L263.9 90L265.2 92.5L265.6 94.6L265.3 96.3L264.2 98Z" fill="#090707"/><path d="M274.7 132.4L275.5 128.1L275.4 123.4L274.2 118.7L272.1 114L269.2 109.3L265.3 104.5L260.5 99.6L254.8 94.7L254.8 94.7L259.8 100.3L263.9 105.6L267 110.7L269.3 115.4L270.6 119.7L271 123.7L270.6 127.4L269.3 131Z" fill="#3b302d"/>',
    brow: 'M144.8 137.5C145.3 135.8 148.2 132.8 150.7 130.9C153.2 129.1 156.1 127.3 159.6 126.3C163.1 125.4 167.2 125.1 171.6 125C175.9 124.9 183.2 124.1 185.8 125.8C188.4 127.6 189.6 134.8 187.4 135.8C185.2 136.7 176.8 131.9 172.5 131.3C168.2 130.7 164.8 131.4 161.6 132.1C158.5 132.9 156 134.3 153.8 135.8C151.5 137.4 149.6 140.9 148.1 141.2C146.7 141.5 144.4 139.3 144.8 137.5Z',
    eye: 'M155.2 153.5C155 152.8 156.1 152.4 156.7 151.8C157.3 151.2 157.9 150.6 158.9 149.9C159.8 149.1 161 148.2 162.5 147.5C163.9 146.9 165.8 146.3 167.5 146.1C169.2 145.9 170.9 146.1 172.6 146.5C174.3 146.9 176.4 147.6 177.8 148.5C179.3 149.4 180.6 150.8 181.5 151.7C182.4 152.6 183.2 153.4 183.4 153.9C183.5 154.4 182.9 154.2 182.3 154.5C181.6 154.8 180.8 155.2 179.6 155.6C178.4 155.9 176.7 156.5 175.1 156.8C173.5 157.2 171.8 157.5 170.1 157.6C168.3 157.7 166.3 157.5 164.7 157.4C163.2 157.2 162 156.9 160.9 156.6C159.8 156.3 158.9 156 157.9 155.5C157 155 155.4 154.1 155.2 153.5Z',
    lash: 'M155.2 153.5C155.4 153.2 156.1 152.4 156.7 151.8C157.3 151.2 157.9 150.6 158.9 149.9C159.8 149.1 161 148.2 162.5 147.5C163.9 146.9 165.8 146.3 167.5 146.1C169.2 145.9 170.9 146.1 172.6 146.5C174.3 146.9 176.4 147.6 177.8 148.5C179.3 149.4 180.6 150.8 181.5 151.7C182.4 152.6 183 153.5 183.4 153.9',
    mouthOut: 'M170.1 215.2C170 214.1 171.5 213.9 172.6 213.3C173.7 212.7 175 212.2 176.5 211.7C178 211.2 179.5 210.6 181.8 210.2C184.1 209.8 187.4 209 190.4 209C193.4 209 196.8 210.4 199.9 210.4C203 210.4 206.2 209 209.2 209C212.1 209 215.2 209.8 217.6 210.3C219.9 210.8 221.7 211.3 223.3 211.9C224.9 212.5 226.2 213.1 227.3 213.7C228.4 214.3 229.9 214.5 229.9 215.7C229.8 216.9 228.2 219.2 227 220.8C225.8 222.4 224.4 224 222.7 225.5C220.9 227 218.8 228.6 216.5 229.7C214.2 230.8 211.5 231.7 208.7 232.2C205.9 232.7 202.7 232.8 199.7 232.7C196.7 232.6 193.5 232.4 190.7 231.7C187.9 231 185.2 229.9 183 228.7C180.8 227.4 178.9 225.6 177.3 224.2C175.7 222.8 174.5 221.5 173.3 220C172.1 218.5 170.2 216.3 170.1 215.2Z',
    mouthIn: 'M172.7 215.4C172.5 214.7 174.5 214.8 175.7 214.5C176.8 214.2 178.1 213.9 179.6 213.7C181.1 213.4 182.6 213.1 184.6 213C186.6 212.9 189 213.2 191.5 213.3C194 213.4 197.1 213.8 199.8 213.8C202.6 213.8 205.5 213.5 208 213.4C210.5 213.3 212.9 213 214.9 213.1C216.9 213.1 218.6 213.4 220.1 213.7C221.6 214 223 214.4 224.2 214.8C225.4 215.2 227.6 215.2 227.4 216C227.2 216.8 224.5 218.5 223.2 219.4C221.8 220.3 220.8 220.9 219.3 221.5C217.8 222.1 216.1 222.7 214.1 223.2C212.1 223.7 209.8 224.2 207.4 224.4C205 224.6 202.3 224.7 199.7 224.6C197.1 224.5 194.3 224.2 191.9 223.8C189.5 223.5 187.4 223 185.5 222.5C183.6 222 181.8 221.2 180.4 220.6C179 219.9 178.1 219.5 176.8 218.6C175.5 217.7 172.9 216.1 172.7 215.4Z',
    ear: 'M140 158C129 151 119 157 119 173C120 192 127 208 144 212Z',
    earIn: 'M134 168C127 168 125 185 131 199',
  };

  function headSVG(id) {
    const eye = `
      <g class="f-eye" data-cx="169.2" data-cy="152.7">
        <path d="${HEAD.eye}" fill="#fbf8f4"/>
        <circle cx="170.0" cy="152.7" r="6.3" fill="#3a2418"/><circle cx="170.0" cy="152.7" r="3.1" fill="#0c0807"/>
        <circle cx="172.1" cy="150.6" r="1.6" fill="#fff"/>
        <path class="f-lid" d="${HEAD.lash}" stroke="${C.hair}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      </g>`;
    return `
    <g class="f-head">
      <defs><clipPath id="fFaceClip${id}"><path d="${HEAD.face}"/></clipPath>
        <linearGradient id="fShade${id}" x1="0" x2="1"><stop offset=".25" stop-color="${C.skinDk}" stop-opacity="0"/><stop offset=".8" stop-color="${C.skinDk}" stop-opacity=".75"/></linearGradient>
        <clipPath id="fTeeth${id}"><path d="${HEAD.mouthIn}"/></clipPath>
        <clipPath id="fBelowBrim${id}"><rect x="0" y="116" width="400" height="200"/></clipPath></defs>
      <g class="f-ears">
        <path d="${HEAD.ear}" fill="${C.skin}"/><path d="${HEAD.earIn}" stroke="${C.skinDk}" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${mirror(`<path d="${HEAD.ear}" fill="${C.skinDk}"/><path d="${HEAD.earIn}" stroke="#6e3f2b" stroke-width="3" fill="none" stroke-linecap="round"/>`)}
      </g>
      <path class="f-face" d="${HEAD.face}" fill="url(#fSkin${id})"/>
      <g clip-path="url(#fFaceClip${id})">
        <rect x="200" y="90" width="90" height="200" fill="url(#fShade${id})"/>
        <ellipse cx="200" cy="292" rx="70" ry="28" fill="${C.skinDk}" opacity=".35"/>
      </g>
      <g class="f-feat">
        <g class="f-cheeks" fill="${C.skinLt}" opacity=".5"><ellipse cx="160" cy="194" rx="12" ry="7"/><ellipse cx="240" cy="194" rx="10" ry="6" opacity=".5"/></g>
        <g class="f-eyes">${eye}${mirror(eye.replace('data-cx="169.2"', 'data-cx="230.8"'))}</g>
        <g class="f-brows" fill="${C.hair}"><path d="${HEAD.brow}"/>${mirror(`<path d="${HEAD.brow}"/>`)}</g>
        <g class="f-nose" fill="none" stroke="${C.skinDk}" stroke-linecap="round">
          <path d="M207 160C209 170 211 179 212 186" stroke-width="2" opacity=".45"/>
          <path d="M188 183C183 186 183 193 189 195M212 183C217 186 217 193 211 195" stroke-width="2.2" opacity=".75"/>
          <path d="M192 195C195 198.5 205 198.5 208 195" stroke-width="2.4" opacity=".9"/>
        </g>
        <ellipse cx="200" cy="189" rx="5" ry="3" fill="${C.skinLt}" opacity=".45"/>
        <path d="M181 199C171 205 167 212 168 219M219 199C229 205 233 212 232 219" stroke="${C.skinDk}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
        <g class="f-mouth">
          <path d="${HEAD.mouthOut}" fill="#874637"/>
          <path d="${HEAD.mouthIn}" fill="${C.mouth}"/>
          <g clip-path="url(#fTeeth${id})"><rect x="160" y="200" width="80" height="20.2" fill="${C.teeth}"/>
            <path d="M188 213V220.2M200 213V220.2M212 213V220.2" stroke="#d9d2c8" stroke-width="1"/></g>
        </g>
        <path d="M192 252C197 255 203 255 208 252" stroke="${C.skinLt}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
      </g>
      <g class="f-hair">
        <g class="f-hair-sides" clip-path="url(#fBelowBrim${id})"><path d="${HEAD.hair}" fill="${C.hair}"/></g>
        <g class="f-quiff">
          <path d="${HEAD.hair}" fill="${C.hair}"/>
          ${HEAD.strands}
        </g>
      </g>
      <g class="f-gear-head"></g>
    </g>`;
  }

  // gear layers (the head group is translated for parallax, gear goes with the face)
  const GEAR = {
    sunglasses: `
      <path d="M134 144H195V164C195 180 187 189 174 189H152C141 189 135 181 134 170Z" fill="url(#fLens{id})" stroke="#0b0b0d" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M266 144H205V164C205 180 213 189 226 189H248C259 189 265 181 266 170Z" fill="url(#fLens{id})" stroke="#0b0b0d" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M131 144H269" stroke="#0b0b0d" stroke-width="7" stroke-linecap="round"/>
      <path d="M194 152C198 149 202 149 206 152" stroke="#0b0b0d" stroke-width="3.4" fill="none"/>
      <path d="M133 146L121 152M267 146L279 152" stroke="#0b0b0d" stroke-width="4" stroke-linecap="round"/>
      <path d="M146 178L162 152M156 182L170 160M214 178L230 152M224 182L238 160" stroke="#fff" stroke-opacity=".32" stroke-width="2.2" stroke-linecap="round"/>`,
    glasses: `
      <rect x="149" y="139" width="46" height="31" rx="9" fill="rgba(160,210,255,.08)" stroke="#1d1d22" stroke-width="3.4"/>
      <rect x="205" y="139" width="46" height="31" rx="9" fill="rgba(160,210,255,.08)" stroke="#1d1d22" stroke-width="3.4"/>
      <path d="M195 150C198 146 202 146 205 150M149 148L138 151M251 148L262 151" stroke="#1d1d22" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M156 164L166 146M212 164L222 146" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>`,
    safety: `
      <path d="M142 140C170 134 230 134 258 140L256 166C254 176 240 180 226 178C214 176 208 168 200 168C192 168 186 176 174 178C160 180 146 176 144 166Z" fill="rgba(255,175,70,.2)" stroke="#ff9f0a" stroke-width="3.2"/>
      <path d="M154 166L166 146M214 166L226 146" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`,
    goggles: `
      <path d="M134 104C150 98 250 98 266 104" stroke="#2a2a30" stroke-width="7" fill="none"/>
      <rect x="148" y="90" width="48" height="26" rx="12" fill="rgba(120,210,255,.25)" stroke="#5ac8fa" stroke-width="3.4"/>
      <rect x="204" y="90" width="48" height="26" rx="12" fill="rgba(120,210,255,.25)" stroke="#5ac8fa" stroke-width="3.4"/>
      <path d="M158 110L168 96M214 110L224 96" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`,
    hardhat: `
      <path d="M124 112C124 58 158 24 200 24C242 24 276 58 276 112Z" fill="#ffc21a"/>
      <path d="M200 24C222 24 240 34 252 50C240 44 226 42 214 44C210 36 206 30 200 24Z" fill="#ffe27a" opacity=".8"/>
      <path d="M188 26H212V108H188Z" fill="#f2a900"/>
      <path d="M104 110C150 100 250 100 296 110C300 118 294 124 286 124H114C106 124 100 118 104 110Z" fill="#f2a900"/>
      <path d="M140 108C176 102 224 102 260 108" stroke="#ffe27a" stroke-width="3" fill="none" opacity=".7"/>`,
    gradcap: `
      <path d="M140 78V112C170 126 230 126 260 112V78Z" fill="#101013"/>
      <path d="M96 70L200 34L304 70L200 106Z" fill="#1b1b20" stroke="#3a3a42" stroke-width="2"/>
      <path d="M200 34L304 70L200 106Z" fill="#000" opacity=".25"/>
      <circle cx="200" cy="70" r="5" fill="#ffc21a"/>
      <path class="f-tassel" d="M200 70C240 74 280 80 292 90V128" stroke="#ffc21a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path class="f-tassel" d="M286 126h12l-2 18h-8z" fill="#ffc21a"/>`,
  };

  // torso-level gear (over the shirt, under the arms)
  const VEST = `
    <path d="M128 296C104 306 82 322 76 346L70 452H170L168 360L150 304Z" fill="#ff8a1f"/>
    <path d="M272 296C296 306 318 322 324 346L330 452H230L232 360L250 304Z" fill="#ff8a1f"/>
    <path d="M74 392H168M72 420H168M232 392H326M232 420H328" stroke="#e9eef2" stroke-width="9"/>
    <path d="M74 392H168M232 392H326" stroke="#fff" stroke-width="2" opacity=".8"/>
    <path d="M150 304L168 360L170 452" stroke="#c96300" stroke-width="2" fill="none"/>
    <path d="M250 304L232 360L230 452" stroke="#c96300" stroke-width="2" fill="none"/>`;

  const BADGE = `
    <path d="M181 292L196 312M219 292L204 312" stroke="var(--accent, #ff8a3d)" stroke-width="4" stroke-linecap="round"/>
    <rect x="195" y="308" width="10" height="6" rx="1.5" fill="#8e8e93"/>
    <rect x="186" y="313" width="28" height="36" rx="4" fill="#f5f5f7"/>
    <path d="M186 321V317C186 314.8 187.8 313 190 313H210C212.2 313 214 314.8 214 317V321Z" fill="var(--accent, #ff8a3d)"/>
    <rect x="191" y="325" width="10" height="11" rx="2" fill="#c7c7cc"/>
    <path d="M191 341H209M204 328H209M204 333H208" stroke="#8e8e93" stroke-width="2" stroke-linecap="round"/>`;

  function torsoSVG() {
    return `
    <g class="f-torso">
      <path d="M173 222V300C185 311 215 311 227 300V222Z" fill="${C.skinDk}"/>
      <path d="M173 268C186 284 214 284 227 268V252C214 270 186 270 173 252Z" fill="#6e3f2b" opacity=".55"/>
      <path class="f-shirt" d="M176 288C148 294 112 304 90 318C72 330 64 350 62 382L58 456H342L338 382C336 350 328 330 310 318C288 304 252 294 224 288C214 302 186 302 176 288Z" fill="${C.shirt}"/>
      <path d="M90 318C72 330 64 350 62 382M310 318C328 330 336 350 338 382" stroke="${C.shirtHi}" stroke-width="2" fill="none" opacity=".9"/>
      <path d="M175 287C185 304 215 304 225 287" stroke="${C.shirtHi}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M182 300C192 306 208 306 218 300" stroke="#0c0c0e" stroke-width="1.5" fill="none" opacity=".7"/>
      <g class="f-vest">${VEST}</g>
      <g class="f-badge">${BADGE}</g>
    </g>`;
  }

  function armSVG(side) {
    // drawn pointing down (+y) from the joint; rotated by the IK each frame
    return `
    <g class="f-arm f-arm-${side}">
      <g class="f-upper">
        <path d="M-21 -4C-22 14 -20 32 -18 42H18C20 32 22 14 21 -4C14 -14 -14 -14 -21 -4Z" fill="${C.shirt}" stroke="${C.shirtHi}" stroke-width="2"/>
        <path d="M-19 40H19" stroke="${C.shirtHi}" stroke-width="3" stroke-linecap="round"/>
        <path class="f-upper-skin" d="M0 40V${UPPER}" stroke="${C.skin}" stroke-width="22" stroke-linecap="round"/>
      </g>
      <g class="f-fore"><path d="M0 0V${FORE}" stroke="${C.skin}" stroke-width="20" stroke-linecap="round"/><path d="M5 6V${FORE - 6}" stroke="${C.skinDk}" stroke-width="6" stroke-linecap="round" opacity=".45"/></g>
      <g class="f-hand">
        <g class="f-fist"><path d="M-11 -2C-14 8 -13 20 -6 26C-2 29 5 29 9 25C13 18 13 8 11 -2Z" fill="${C.skin}"/><path d="M-6 14H6M-6 20H5" stroke="${C.skinDk}" stroke-width="2" stroke-linecap="round"/></g>
        <g class="f-palm">
          <path d="M-12 -2C-14 8 -12 18 -10 22H10C12 18 14 8 12 -2Z" fill="${C.skin}"/>
          <g stroke="${C.skin}" stroke-width="6.6" stroke-linecap="round"><path d="M-8.5 18L-10 33"/><path d="M-3 20L-3.5 37"/><path d="M2.6 20L3.2 36"/><path d="M8 18L10 30"/></g>
          <g stroke="${C.skinDk}" stroke-width="1.2" stroke-linecap="round" opacity=".7"><path d="M-5.8 24V31"/><path d="M-0.2 24V33"/><path d="M5.4 24V31"/></g>
          <path d="M12 6C18 8 22 14 22 20" stroke="${C.skin}" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path d="M-5 10C-1 12 3 12 7 10" stroke="${C.skinDk}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        </g>
      </g>
    </g>`;
  }

  // seen from the front: the back of the lid (leaning toward the viewer), with the keyboard half hidden behind it
  const LAPTOP = `
    <g class="f-laptop">
      <path d="M112 350H288C292.5 350 295.4 353 295 357.5L288 446H112L105 357.5C104.6 353 107.5 350 112 350Z" fill="#202025" stroke="#3b3b43" stroke-width="2"/>
      <path d="M114 354.5H286" stroke="#55555f" stroke-width="2" stroke-linecap="round"/>
      <circle cx="200" cy="396" r="11" fill="none" stroke="var(--accent, #ff8a3d)" stroke-width="2.4"/>
      <path d="M195 400V392L205 400V392" stroke="var(--accent, #ff8a3d)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M124 445H276V450H124Z" fill="#2c2c33"/>
    </g>`;

  // ---------- scene props (outside the figure, x -110..0 and 400..510) ----------
  const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  const PROPS = {
    hello: `
      <g transform="translate(-22 0)"><path d="M432 450V404H476V450Z" fill="#26262c"/><path d="M476 414C488 414 488 434 476 434" stroke="#26262c" stroke-width="6" fill="none"/>
      <path class="p-steam" d="M444 396C438 386 450 382 444 370M462 396C456 386 468 382 462 370" stroke="#8e8e93" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <g transform="translate(46 0)"><path d="M-84 450L-78 410H-34L-28 450Z" fill="#3a2a22"/>
      <g class="p-sway"><path d="M-56 410C-62 380 -86 366 -98 360C-90 382 -76 398 -58 410Z" fill="#2f9e5b"/><path d="M-56 410C-52 376 -36 356 -18 348C-22 374 -36 396 -54 410Z" fill="#38b86b"/><path d="M-56 410C-58 386 -56 360 -50 340C-44 364 -46 390 -54 410Z" fill="#2a8a50"/></g></g>`,
    site: `
      ${range(3, (k) => `<rect x="${-104 + k * 34}" y="214" width="32" height="236" rx="3" fill="#25252b" stroke="#3a3a42" stroke-width="2"/>
        <rect x="${-98 + k * 34}" y="246" width="20" height="14" rx="2" fill="#0e1a12" stroke="#30d158" stroke-width="1.4"/>
        <circle class="p-led ${k === 1 ? 'g' : 'r'}" cx="${-88 + k * 34}" cy="230" r="4"/>
        <path d="M${-98 + k * 34} 300h20M${-98 + k * 34} 360h20" stroke="#4a4a52" stroke-width="2"/>`)}
      <path d="M454 244L496 316H412Z" fill="#ffc21a" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"/>
      <path d="M458 262L446 286H460L450 304" stroke="#1a1a1a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="454" y="342" text-anchor="middle" class="p-txt">600 V</text>`,
    launch: `
      <g class="p-sign"><rect x="-108" y="214" width="104" height="58" rx="12" fill="#16161a" stroke="#3a3a42" stroke-width="2"/><text x="-56" y="239" text-anchor="middle" class="p-big">M.Eng ✓</text><text x="-56" y="259" text-anchor="middle" class="p-txt">Jun 2025</text></g>
      <path class="p-trace" d="M-56 276V312" stroke="#a1a1a6" stroke-width="2" fill="none"/><path d="M-62 306L-56 314L-50 306" stroke="#a1a1a6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="p-sign"><rect x="-108" y="318" width="104" height="58" rx="12" fill="#16161a" stroke="var(--accent, #ff8a3d)" stroke-width="2.5"/><text x="-56" y="343" text-anchor="middle" class="p-big">Engineer</text><text x="-56" y="363" text-anchor="middle" class="p-txt">Aug 2025</text></g>
      <g transform="rotate(-8 -56 436)"><rect x="-96" y="426" width="80" height="18" rx="9" fill="#efe6d2"/><circle cx="-24" cy="435" r="9" fill="#e4d6b8"/><circle cx="-24" cy="435" r="4" fill="#cdb98f"/><rect x="-62" y="426" width="9" height="18" fill="#ff453a"/></g>
      <rect x="406" y="232" width="108" height="86" rx="8" fill="#16161a" stroke="#3a3a42" stroke-width="2"/>
      <text x="414" y="250" class="p-txt">F1 · side lab</text>
      <polyline class="p-trace" points="${range(40, (i) => `${412 + i * 2.5},${304 - Math.abs(Math.sin(i / 5)) * 38} `)}" fill="none" stroke="#5ac8fa" stroke-width="2.4"/>
      <path d="M460 318v34M440 352h40" stroke="#3a3a42" stroke-width="4"/>
      <g class="p-car"><path d="M408 440H482L492 428H464L454 418H428L420 428H404Z" fill="#ff453a"/><circle cx="422" cy="444" r="8" fill="#0b0b0d" stroke="#555" stroke-width="2"/><circle cx="472" cy="444" r="8" fill="#0b0b0d" stroke="#555" stroke-width="2"/></g>`,
    desk: `
      <path d="M-104 252L-4 264V372L-104 384Z" fill="#16161a" stroke="#3a3a42" stroke-width="2"/>
      <polyline class="p-trace" points="${range(20, (i) => `${-96 + i * 4.6},${(i % 4 < 2 ? 300 : 324) + i * 0.6} `)}" fill="none" stroke="#5ac8fa" stroke-width="2.2"/>
      <path d="M-54 378v72M-76 450h44" stroke="#3a3a42" stroke-width="4"/>
      <path d="M504 252L404 264V372L504 384Z" fill="#16161a" stroke="#3a3a42" stroke-width="2"/>
      <g class="p-code">${range(6, (k) => `<path d="M${414 + (k % 3) * 8} ${284 + k * 14}h${40 + ((k * 17) % 32)}" stroke="${['#ff8a3d', '#5ac8fa', '#f5f5f7'][k % 3]}" stroke-width="3" stroke-linecap="round"/>`)}</g>
      <path d="M454 378v72M432 450h44" stroke="#3a3a42" stroke-width="4"/>`,
    study: `
      <rect x="-100" y="426" width="86" height="24" rx="3" fill="#ff8a3d"/><rect x="-92" y="402" width="78" height="24" rx="3" fill="#5ac8fa"/><rect x="-104" y="378" width="80" height="24" rx="3" fill="#f5f5f7"/>
      <path d="M-94 438h50M-84 414h40M-96 390h44" stroke="#000" stroke-opacity=".35" stroke-width="3"/>
      <path d="M470 450V330L430 300" stroke="#3a3a42" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M404 296L446 278L452 310Z" fill="#26262c"/>
      <path class="p-glow" d="M426 304L380 420H470Z" fill="url(#fLamp{id})"/>
      <text class="p-txt p-float" x="-60" y="330" text-anchor="middle">∫ ∇ Σ</text>`,
    grad: `
      <g class="p-sign"><rect x="-108" y="240" width="104" height="66" rx="12" fill="#16161a" stroke="#3a3a42" stroke-width="2"/><text x="-56" y="268" text-anchor="middle" class="p-big">B.Tech</text><text x="-56" y="290" text-anchor="middle" class="p-txt">SRMIST · 2022 ✓</text></g>
      <g class="p-sign"><rect x="404" y="240" width="104" height="66" rx="12" fill="#16161a" stroke="#ff8a3d" stroke-width="2.5"/><text x="456" y="268" text-anchor="middle" class="p-big">M.Eng</text><text x="456" y="290" text-anchor="middle" class="p-txt">Concordia</text></g>
      <path d="M-4 274C80 190 320 190 404 274" stroke="#f5f5f7" stroke-opacity=".3" stroke-width="2.4" stroke-dasharray="4 7" fill="none"/>
      <g class="p-plane"><path d="M-9 -5L11 0L-9 5L-5 0Z" fill="#f5f5f7"/></g>
      <g class="p-confetti">${range(16, (i) => `<rect x="${-100 + ((i * 53) % 600)}" y="${-20 - ((i * 37) % 160)}" width="6" height="11" rx="1" fill="${['#ffc21a', '#5ac8fa', '#ff453a', '#30d158'][i % 4]}" style="animation-delay:-${(i * 0.41).toFixed(2)}s"/>`)}</g>`,
    hand: `
      <g class="p-robot">
        <rect x="414" y="398" width="72" height="44" rx="12" fill="#26262c" stroke="#45454d" stroke-width="2"/>
        <rect x="436" y="442" width="28" height="10" fill="#45454d"/>
        ${range(4, (k) => `<rect class="p-finger" style="animation-delay:-${k * 0.22}s" x="${418 + k * 17}" y="344" width="13" height="54" rx="6.5" fill="#d1d1d6"/>`)}
        <rect class="p-finger" x="474" y="380" width="12" height="34" rx="6" fill="#d1d1d6" transform="rotate(28 480 400)"/>
      </g>
      <rect x="-90" y="352" width="56" height="34" rx="8" fill="#26262c" stroke="#45454d" stroke-width="2"/><circle cx="-62" cy="369" r="10" fill="#0b0b0d" stroke="#5ac8fa" stroke-width="2.5"/>
      <circle class="p-led r" cx="-42" cy="360" r="3"/><path d="M-62 386V450M-80 450h36" stroke="#3a3a42" stroke-width="4"/>`,
    bench: `
      <rect x="-104" y="424" width="92" height="20" rx="6" fill="#30d158" opacity=".85"/><rect x="-92" y="400" width="60" height="24" rx="4" fill="#1c1c20" stroke="#45454d" stroke-width="2"/>
      <circle cx="-94" cy="446" r="8" fill="#0b0b0d" stroke="#555" stroke-width="2"/><circle cx="-22" cy="446" r="8" fill="#0b0b0d" stroke="#555" stroke-width="2"/>
      <rect x="-80" y="406" width="14" height="10" fill="#ff9f0a"/>
      <path d="M418 450V412H496V450" fill="#1c1c20" stroke="#45454d" stroke-width="2"/>
      <path d="M430 412L456 384H486" stroke="#8e8e93" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M486 384L506 352" stroke="#ff9f0a" stroke-width="4" stroke-linecap="round"/>
      <path class="p-steam" d="M508 344C502 334 514 330 508 318M518 346C512 336 524 332 518 320" stroke="#8e8e93" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    chair: `
      <circle cx="456" cy="424" r="26" fill="none" stroke="#d1d1d6" stroke-width="5"/><circle cx="456" cy="424" r="4" fill="#d1d1d6"/><circle cx="418" cy="444" r="8" fill="none" stroke="#d1d1d6" stroke-width="4"/>
      <path d="M432 428V374H452M432 392H478L490 424M478 392V374" stroke="#d1d1d6" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="484" y="398" width="20" height="10" rx="3" fill="#5ac8fa"/>
      <g class="p-ping" stroke="#5ac8fa" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M508 396C516 400 516 408 508 412"/><path d="M514 388C528 396 528 412 514 420"/></g>
      <path d="M-100 450V418H-36V450" fill="#1c1c20" stroke="#45454d" stroke-width="2"/><rect x="-82" y="402" width="28" height="16" rx="4" fill="#ff9f0a"/>`,
  };

  class Figure {
    constructor(host, opts = {}) {
      this.host = host;
      this.id = ++uid;
      this.opts = Object.assign({ props: true, laptop: true, track: true }, opts);
      this.pose = 'type';
      this.blend = 1;            // 0..1 cross-fade from previous hand targets to the new pose
      this.prevHands = null;
      this.look = [0, 0]; this.lookGoal = [0, 0];
      this.blinkAt = 1.5; this.blinkT = -1;
      this.waveUntil = 0;
      this.t = 0; this.visible = true; this.running = false;
      this.build();
      this.set(opts.scene ? Figure.SCENES[opts.scene] : {});
      this.bind();
      this.frame(0);
    }

    build() {
      const id = this.id;
      const props = this.opts.props ? Object.entries(PROPS).map(([k, v]) => `<g class="f-prop" data-prop="${k}">${v.replaceAll('{id}', id)}</g>`).join('') : '';
      const gear = Object.entries(GEAR).map(([k, v]) => `<g class="f-gear" data-gear="${k}">${v.replaceAll('{id}', id)}</g>`).join('');
      this.host.innerHTML = `
<svg class="fig" viewBox="${this.opts.viewBox || '-112 0 624 460'}" aria-hidden="true">
  <defs>
    <radialGradient id="fSpot${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--accent, #ff8a3d)" stop-opacity=".26"/><stop offset=".6" stop-color="var(--accent, #ff8a3d)" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="fSkin${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.skinLt}"/><stop offset=".45" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skin}"/></linearGradient>
    <linearGradient id="fFade${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.hair}"/><stop offset=".55" stop-color="${C.hair}" stop-opacity=".8"/><stop offset="1" stop-color="${C.hair}" stop-opacity=".25"/></linearGradient>
    <linearGradient id="fLens${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3a4c"/><stop offset=".45" stop-color="#0a0e14"/><stop offset="1" stop-color="#1e2c3c"/></linearGradient>
    <linearGradient id="fLamp${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd60a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd60a" stop-opacity="0"/></linearGradient>
  </defs>
  <ellipse class="f-spot" cx="200" cy="250" rx="250" ry="230" fill="url(#fSpot${id})"/>
  <g class="f-props">${props}</g>
  <g class="f-body">
    <g class="f-breathe">
      ${torsoSVG()}
      ${headSVG(id)}
    </g>
    ${armSVG('l')}${armSVG('r')}
    ${this.opts.laptop ? LAPTOP : ''}
  </g>
  <path class="f-desk" d="M-112 450H512" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
</svg>`;
      const $ = (s) => this.host.querySelector(s);
      this.svg = $('svg');
      this.el = {
        head: $('.f-head'), feat: $('.f-feat'), hair: $('.f-hair'), ears: $('.f-ears'), breathe: $('.f-breathe'),
        gearHead: $('.f-gear-head'), eyes: [...this.host.querySelectorAll('.f-eye')], laptop: $('.f-laptop'),
        arms: ['l', 'r'].map((s) => {
          const a = $(`.f-arm-${s}`);
          return { root: a, upper: a.querySelector('.f-upper'), fore: a.querySelector('.f-fore'), hand: a.querySelector('.f-hand'), fist: a.querySelector('.f-fist'), palm: a.querySelector('.f-palm') };
        }),
      };
      // gear lives inside the head so it turns with it
      this.el.gearHead.innerHTML = gear;
    }

    /** scene = { gear: [], pose, prop, vest, laptop } ; missing keys keep their value */
    set(sc = {}) {
      if (sc.gear) {
        const g = new Set(sc.gear);
        this.gear = g;
        this.host.querySelectorAll('.f-gear').forEach((n) => n.classList.toggle('on', g.has(n.dataset.gear)));
        const hat = g.has('hardhat') || g.has('gradcap');
        this.host.querySelector('.f-quiff').classList.toggle('off', hat);
        this.host.querySelector('.f-eyes').classList.toggle('off', g.has('sunglasses'));
      }
      if ('vest' in sc) this.host.querySelector('.f-vest').classList.toggle('on', !!sc.vest);
      if ('badge' in sc) this.host.querySelector('.f-badge').classList.toggle('on', !!sc.badge);
      if ('laptop' in sc && this.el.laptop) this.el.laptop.classList.toggle('off', !sc.laptop);
      if (sc.prop !== undefined) this.host.querySelectorAll('.f-prop').forEach((n) => n.classList.toggle('on', n.dataset.prop === sc.prop));
      if (sc.pose && sc.pose !== this.pose) this.setPose(sc.pose);
      if (!this.running) this.frame(0);
    }

    setPose(p) {
      if (!POSES[p] || p === this.pose) return;
      this.prevHands = this.hands || null;
      this.pose = p; this.blend = 0;
    }

    /** wave for a few seconds, then go back to the current pose */
    wave(secs = 2.6) {
      if (reduce) return;
      if (this.pose !== 'wave') { this.afterWave = this.pose; this.setPose('wave'); }
      this.waveUntil = this.t + secs;
    }

    bind() {
      if (this.opts.track && !reduce) {
        addEventListener('pointermove', (e) => {
          const r = this.svg.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
          const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth * 0.5)));
          const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight * 0.6)));
          this.lookGoal = [nx, ny];
        }, { passive: true });
      }
      new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; this.kick(); }).observe(this.host);
      document.addEventListener('visibilitychange', () => this.kick());
      this.kick();
    }

    kick() {
      if (reduce || this.running || !this.visible || document.hidden) return;
      this.running = true;
      let last = performance.now();
      const step = (now) => {
        if (!this.visible || document.hidden) { this.running = false; return; }
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        this.frame(dt);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    frame(dt) {
      this.t += dt;
      const t = this.t, E = this.el;
      if (this.waveUntil && t > this.waveUntil) { this.waveUntil = 0; this.setPose(this.afterWave || 'type'); }

      // look: ease toward the cursor, with a slow idle drift when the cursor is still
      const k = 1 - Math.pow(0.004, dt);
      const idle = reduce ? [0, 0] : [Math.sin(t * 0.37) * 0.15, Math.sin(t * 0.23) * 0.1];
      this.look[0] += (this.lookGoal[0] + idle[0] - this.look[0]) * k;
      this.look[1] += (this.lookGoal[1] + idle[1] - this.look[1]) * k;
      const [lx, ly] = this.look;
      const breath = reduce ? 0 : Math.sin(t * 1.6);
      E.breathe.setAttribute('transform', `translate(0 ${(breath * 1.2).toFixed(2)})`);
      E.head.setAttribute('transform', `rotate(${(lx * 4).toFixed(2)} 200 290) translate(${(lx * 3).toFixed(2)} ${(ly * 2 + breath * 0.6).toFixed(2)})`);
      E.feat.setAttribute('transform', `translate(${(lx * 5).toFixed(2)} ${(ly * 4).toFixed(2)})`);
      E.gearHead.setAttribute('transform', `translate(${(lx * 4.5).toFixed(2)} ${(ly * 3.2).toFixed(2)})`);
      E.hair.setAttribute('transform', `translate(${(lx * 1.5).toFixed(2)} ${(ly * 1).toFixed(2)})`);
      E.ears.setAttribute('transform', `translate(${(-lx * 2).toFixed(2)} 0)`);

      // blink every few seconds (double blink now and then)
      if (!reduce && t > this.blinkAt) { this.blinkT = 0; this.blinkAt = t + 2.4 + Math.random() * 3.2 - (Math.random() < 0.2 ? 2.2 : 0); }
      let lid = 1;
      if (this.blinkT >= 0) { this.blinkT += dt; const b = this.blinkT / 0.16; lid = b < 1 ? Math.abs(1 - 2 * b) * 0.9 + 0.1 : 1; if (b >= 1) this.blinkT = -1; }
      E.eyes.forEach((e) => { const cx = +e.dataset.cx, cy = +e.dataset.cy; e.setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${lid.toFixed(3)}) translate(${-cx} ${-cy})`); });

      // arms: blend from the previous hand targets into the pose's targets
      const goal = POSES[this.pose](reduce ? 0 : t);
      if (this.blend < 1) this.blend = reduce ? 1 : Math.min(1, this.blend + dt / 0.55);
      const s = this.blend * this.blend * (3 - 2 * this.blend);
      const hands = this.prevHands && this.blend < 1 ? goal.map((g, i) => [this.prevHands[i][0] + (g[0] - this.prevHands[i][0]) * s, this.prevHands[i][1] + (g[1] - this.prevHands[i][1]) * s]) : goal;
      this.hands = hands;
      const open = HAND_OPEN[this.pose] || [false, false];
      const bob = breath * 1.2;
      [[SH_L, -1], [SH_R, 1]].forEach(([S, out], i) => {
        const sh = [S[0], S[1] + bob];
        const r = ik(sh, hands[i], out), A = E.arms[i];
        A.upper.setAttribute('transform', `translate(${sh[0]} ${sh[1].toFixed(2)}) rotate(${r.up.toFixed(2)})`);
        A.fore.setAttribute('transform', `translate(${r.E[0].toFixed(2)} ${r.E[1].toFixed(2)}) rotate(${r.fore.toFixed(2)})`);
        const wob = open[i] && this.pose === 'wave' ? Math.sin(t * 9) * 14 : 0;
        A.hand.setAttribute('transform', `translate(${r.H[0].toFixed(2)} ${r.H[1].toFixed(2)}) rotate(${(r.fore + wob).toFixed(2)})`);
        A.fist.style.display = open[i] ? 'none' : '';
        A.palm.style.display = open[i] ? '' : 'none';
      });
    }
  }

  // ---------- scenes: gear + pose + prop for each chapter ----------
  Figure.SCENES = {
    hello: { gear: ['sunglasses'], pose: 'type', prop: 'hello', cap: ['Building something', 'En pleine construction'] },
    site: { gear: ['hardhat', 'safety'], vest: true, pose: 'type', prop: 'site', cap: ['On site · power systems', 'Sur le chantier · réseaux électriques'] },
    launch: { gear: ['gradcap'], badge: true, pose: 'type', prop: 'launch', cap: ['M.Eng done → engineering role · F1 lab on the side', 'M.Eng terminée → poste d’ingénieur · labo F1 à côté'] },
    desk: { gear: ['glasses'], pose: 'type', prop: 'desk', cap: ['Master’s · Concordia', 'Maîtrise · Concordia'] },
    study: { gear: ['glasses'], pose: 'think', prop: 'study', cap: ['68 courses, every layer', '68 cours, toutes les couches'] },
    grad: { gear: ['gradcap'], pose: 'cheer', prop: 'grad', laptop: false, cap: ['B.Tech done → M.Eng from Sep 2022', 'B.Tech terminé → M.Eng dès sept. 2022'] },
    hand: { gear: [], pose: 'point', prop: 'hand', cap: ['Telerobotics · gestures', 'Télérobotique · gestes'] },
    bench: { gear: ['goggles'], pose: 'type', prop: 'bench', cap: ['Workbench · first robots', 'Établi · premiers robots'] },
    chair: { gear: [], pose: 'pad', prop: 'chair', laptop: false, cap: ['First prototype · Bluetooth wheelchair', 'Premier prototype · fauteuil Bluetooth'] },
    contact: { gear: ['sunglasses'], pose: 'wave', prop: 'hello', cap: ['Say hello', 'Dites bonjour'] },
  };
  // fill in defaults so every scene fully specifies the rig
  Object.values(Figure.SCENES).forEach((s) => { s.vest = !!s.vest; s.badge = !!s.badge; if (s.laptop === undefined) s.laptop = true; });

  window.Figure = Figure;
})();
