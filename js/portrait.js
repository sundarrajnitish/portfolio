/* Line-art portrait of Nitish, traced from his reference drawing in a 400 x 400 space.
 * Layers are separate so the same figure can wear different gear (hard hat, glasses, headset, grad cap...). */
(function () {
  'use strict';
  const P = {
    // filled silhouette drawn first so props behind the figure are hidden
    silhouette: 'M104 132C100 96 102 60 116 36C136 14 170 8 204 10C246 10 276 22 290 52C296 80 294 110 290 134C296 150 294 182 278 196L262 236C258 252 260 262 262 266L300 300L400 356V400H0V350L92 300L138 262C140 248 140 238 136 220L118 196C106 182 102 160 104 132Z',
    hair: [
      // outer silhouette: tall quiff swept up and to the right
      'M108 130C102 108 100 84 104 64C106 46 116 34 130 26C146 16 166 12 186 12C210 10 236 12 254 18C270 24 282 34 290 48C296 60 296 72 292 84C290 100 290 116 290 132',
      // strands
      'M118 60C126 44 140 32 158 26', 'M130 70C140 52 156 40 176 34', 'M150 66C160 50 176 40 196 36', 'M172 64C182 48 198 38 218 34',
      'M196 64C206 48 222 38 242 36', 'M222 64C232 50 246 42 262 42', 'M246 66C256 56 266 52 278 54', 'M176 22C192 16 210 14 228 16',
      'M262 30C272 34 280 40 286 50',
      // hairline over the forehead and temples
      'M132 114C130 98 132 84 140 77C156 71 172 72 188 74C210 70 238 66 258 72C266 84 266 96 262 108',
      'M112 128L116 104', 'M286 128L282 104',
    ],
    brows: [
      'M160 110C170 102 184 101 198 106', 'M164 106L168 102M172 104L176 100M180 104L184 100M188 104L192 101',
      'M214 106C228 100 244 101 258 108', 'M220 104L224 100M228 103L232 99M236 103L240 99M244 104L248 101',
    ],
    face: [
      // jaw and chin
      'M128 134C128 168 130 196 136 214C142 230 152 244 168 254C182 262 194 264 204 264C216 262 228 256 240 246C254 232 262 214 268 196C274 176 278 156 280 134',
      // ears
      'M128 140C118 132 106 136 104 150C102 166 108 182 120 190C124 192 128 192 132 190', 'M114 152C118 158 118 166 116 172',
      'M280 140C290 132 300 136 300 150C302 166 296 180 286 188C282 190 278 190 274 188', 'M290 152C286 158 286 166 288 172',
      // nose
      'M194 172C182 174 178 186 186 192C192 196 200 196 204 194C210 196 218 196 222 190C228 184 224 174 212 172',
      'M190 186C192 190 196 190 198 188', 'M210 188C212 190 216 190 218 186',
      // mouth: open smile with teeth
      'M166 204C184 199 222 199 242 204', 'M166 204C176 220 230 220 242 204', 'M172 208C190 212 218 212 236 208',
      'M184 208V214M194 209V216M204 209V216M214 209V216M224 208V214',
      'M182 224C194 230 214 230 226 224',
      // neck
      'M140 236C142 252 142 270 140 300', 'M258 236C258 252 258 270 260 300',
    ],
    beard: [
      'M168 198C176 190 188 190 198 194C206 190 222 188 238 196',            // moustache
      'M174 196L176 192M182 194L184 190M190 194L192 190M214 192L216 188M222 192L224 188M230 194L232 190',
      'M196 230V236M202 231V238M208 230V236',                                   // chin tuft
      'M166 248C178 260 192 264 204 264C218 262 230 256 238 248',               // beard edge
      'M172 250V256M182 254V260M192 256V262M216 256V262M226 252V258',
    ],
    stubble: 'M140 222C150 238 164 250 180 256M268 206C260 226 248 242 232 252',
    eyes: [
      'M156 142C164 134 180 134 188 142C180 148 164 148 156 142Z', 'M222 142C230 134 246 134 254 142C246 148 230 148 222 142Z',
    ],
    pupils: [[172, 141], [238, 141]],
    sunglasses: [
      'M118 124H290',
      'M140 124V150C140 166 148 174 164 174H180C188 174 192 168 192 160V124',
      'M222 124V160C222 168 228 174 236 174H256C272 174 282 164 282 150V124',
      'M192 132C200 128 214 128 222 132',
      'M152 160L166 136M160 164L172 144', 'M236 160L250 136M244 164L256 144',
    ],
    glasses: [
      'M138 126H192V152C192 162 186 166 178 166H152C144 166 138 160 138 152Z',
      'M220 126H284V152C284 160 278 166 270 166H234C226 166 220 162 220 152Z',
      'M192 136C200 130 212 130 220 136', 'M138 132L112 136', 'M284 132L296 136',
    ],
    hardhat: [
      'M104 98C102 50 144 6 200 6C256 6 298 50 296 98Z', 'M86 98C130 90 270 90 314 98C316 104 312 108 306 108H94C88 108 84 104 86 98Z',
      'M200 6V92', 'M164 12C154 36 152 64 154 92', 'M236 12C246 36 248 64 246 92',
    ],
    headset: [
      'M106 150C96 60 150 4 200 4C250 4 304 60 294 150', 'M92 140h22v54h-22z', 'M286 140h22v54h-22z', 'M100 194C104 226 140 236 166 224',
    ],
    gradcap: [
      'M84 46L200 8L316 46L200 84Z',                                  // board
      'M130 62V96C160 110 240 110 270 96V62',                          // skull cap, sits on the head
      'M200 46L300 50L304 104', 'M298 104h12v18h-12z',                 // tassel
    ],
    goggles: [
      'M136 82C136 66 168 62 196 70C224 62 266 66 266 82C266 98 242 100 224 94C212 90 190 90 178 94C160 100 136 98 136 82Z',
      'M134 78C118 80 112 92 112 104', 'M268 78C284 80 290 92 290 104',
    ],
    body: [
      // polo collar flaps, crew-neck tee underneath, placket, shoulders
      'M140 262L92 300V340C112 336 130 330 148 324', 'M260 262L306 300V342C286 338 270 332 252 326',
      'M140 300C160 316 180 322 200 322C220 322 242 316 260 300', 'M146 312C164 328 182 334 200 334C218 334 238 328 254 312',
      'M148 336C166 352 182 366 196 380', 'M164 344C178 356 188 366 196 374', 'M248 338C232 352 216 366 198 380',
      'M196 380V400', 'M92 300C60 318 28 334 0 348', 'M306 300C340 318 372 336 400 354',
    ],
    button: [157, 346],
  };

  const NS = 'http://www.w3.org/2000/svg';
  function group(cls, paths, extra = '') {
    return `<g class="${cls}" ${extra}>${paths.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}</g>`;
  }

  /** Figure layers as SVG markup (in 400x400 space).
   * gear: sunglasses | glasses | eyes | safety | hardhat | headset | gradcap | goggles. body: draw collar and shoulders. */
  function head(opts = {}) {
    const g = new Set(opts.gear || ['sunglasses']);
    const eyesOn = !g.has('sunglasses');
    const covered = g.has('hardhat') || g.has('gradcap');
    let s = opts.fill ? `<path class="p-sil" d="${P.silhouette}"/>` : '';
    s += group('p-hair', covered ? P.hair.slice(-3) : P.hair);  // a hat hides the quiff, not the temples
    if (!g.has('hardhat')) s += group('p-brows', P.brows);
    s += group('p-face', P.face);
    s += group('p-beard', P.beard);
    if (opts.body) s += group('p-body', P.body) + `<circle class="p-btn" cx="${P.button[0]}" cy="${P.button[1]}" r="3"/>`;
    s += `<path class="p-stubble" d="${P.stubble}" pathLength="1"/>`;
    if (eyesOn) s += group('p-eyes', P.eyes) + P.pupils.map(([x, y]) => `<circle class="p-pupil" cx="${x}" cy="${y}" r="4.5"/>`).join('');
    if (g.has('sunglasses')) s += `<g class="p-lens"><path d="${P.sunglasses[1]}Z"/><path d="${P.sunglasses[2]}Z"/></g>` + group('p-sun', P.sunglasses);
    if (g.has('glasses') || g.has('safety')) s += group('p-glasses' + (g.has('safety') ? ' safety' : ''), P.glasses);
    if (g.has('hardhat')) s += group('p-hat', P.hardhat);
    if (g.has('headset')) s += group('p-headset', P.headset);
    if (g.has('gradcap')) s += group('p-cap', P.gradcap);
    if (g.has('goggles')) s += group('p-goggles', P.goggles);
    return s;
  }

  window.Portrait = { P, head, NS };
})();
