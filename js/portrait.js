/* Line-art portrait of Nitish, traced in a 400 x 400 space. Layers are separate so the same head can
 * wear different gear in the background character (hard hat, glasses, headset, grad cap...). */
(function () {
  'use strict';
  const P = {
    hair: [
      // outer silhouette: voluminous, tufted on top
      'M128 175C123 158 124 140 130 126C127 116 131 106 140 100C143 92 152 87 160 88C166 80 178 78 186 82C192 76 204 75 212 80C220 76 233 78 240 85C249 84 258 92 262 101C270 106 274 118 272 128C276 140 275 158 271 175',
      // strands swept up and back
      'M150 104C160 96 172 95 180 98', 'M176 90C190 86 202 88 210 94', 'M214 88C228 88 240 94 248 104',
      'M160 118C172 108 186 106 196 110', 'M202 104C216 100 232 104 244 116', 'M246 112C254 120 260 132 262 144', 'M140 126C146 118 152 114 160 112',
      // front hairline with tufts falling on the forehead
      'M138 158C146 146 156 140 166 140C170 134 178 132 186 135C192 128 202 127 210 131C218 127 230 129 238 135C248 136 258 144 266 158',
      'M188 136C186 144 182 150 176 152', 'M214 132C218 140 222 146 228 148',
      // faded sides
      'M131 170L134 152', 'M269 170L267 152',
    ],
    face: [
      // jaw and chin (face turned slightly to its left, so the right side is wider)
      'M140 170C140 197 143 224 152 247C161 268 180 285 203 289C226 286 244 270 254 249C263 228 268 200 268 172',
      // ears
      'M140 188C131 183 125 192 127 205C129 218 134 228 145 231', 'M268 188C277 183 283 192 281 205C279 218 273 228 262 231',
      'M133 198C136 205 136 213 139 219', 'M275 198C272 205 272 213 269 219',
      // nose
      'M202 199C200 211 197 220 193 228C197 233 202 234 207 232', 'M190 229C192 234 196 236 199 234', 'M207 234C211 236 215 234 217 230',
      // smile lines
      'M182 229C177 236 176 243 178 249', 'M224 229C229 236 230 243 228 249',
      // mouth: open smile with teeth
      'M181 243C193 240 217 240 230 243', 'M181 243C189 258 221 258 230 243', 'M186 246C198 248 213 248 225 246',
      // neck
      'M162 282L160 312', 'M244 280L248 312',
    ],
    body: [
      'M160 300L128 322L170 342L192 322', 'M248 300L280 322L236 344L214 324',
      'M170 342C190 352 216 352 236 344', 'M203 352L203 400',
      'M128 322C96 330 60 346 18 380L6 400', 'M280 322C312 330 348 346 388 380L396 400',
    ],
    beard: [
      'M189 236C196 233 201 235 204 235C207 235 212 233 219 236',            // moustache
      'M181 262C188 273 213 273 221 262', 'M188 268L190 279', 'M200 271L200 284', 'M212 268L210 279',  // goatee
    ],
    stubble: 'M156 250C168 271 185 281 201 284C217 281 233 271 245 250',
    eyes: [
      'M150 192C157 184 172 183 182 191C172 198 158 198 150 192Z', 'M220 191C230 183 245 184 252 192C244 198 230 198 220 191Z',
      'M147 176C158 168 174 168 186 174', 'M216 174C228 168 244 168 255 176',
    ],
    pupils: [[166, 191], [236, 191]],
    sunglasses: [
      'M136 176L268 174',
      'M140 176C140 197 146 211 166 212C186 213 194 203 196 186L196 177',
      'M206 177L206 186C208 203 216 212 236 211C256 210 262 196 262 176',
      'M196 181C199 178 203 178 206 181', 'M138 178L128 185', 'M264 176L274 183',
    ],
    glasses: [
      'M142 180C142 199 148 206 166 206C186 206 194 200 194 182C194 178 190 176 182 176L150 176C145 176 142 177 142 180Z',
      'M208 182C208 200 216 206 236 206C254 206 260 199 260 180C260 177 257 176 252 176L220 176C212 176 208 178 208 182Z',
      'M194 184C198 180 204 180 208 184', 'M142 182L129 187', 'M260 182L273 187',
    ],
    hardhat: [
      'M120 150C118 108 152 66 202 66C252 66 286 108 284 150Z', 'M102 150C140 142 264 142 302 150C304 156 300 160 294 160L108 160C102 160 100 156 102 150Z',
      'M202 66L202 144', 'M170 72C162 94 160 120 162 144', 'M234 72C242 94 244 120 242 144',
    ],
    headset: [
      'M128 186C118 120 160 76 202 76C244 76 286 120 276 186', 'M118 180h18v48h-18z', 'M266 180h18v48h-18z', 'M127 226C130 262 160 268 182 262',
    ],
    gradcap: [
      'M120 104L202 72L284 104L202 136Z', 'M156 118L156 146C176 158 228 158 248 146L248 118', 'M284 104L284 150', 'M280 150h8v14h-8z',
    ],
    goggles: [
      'M140 120C140 104 168 100 196 108C224 100 262 104 262 120C262 134 240 138 222 132C210 128 192 128 180 132C162 138 140 134 140 120Z',
      'M138 116C126 116 124 128 130 140', 'M264 116C276 116 278 128 272 140',
    ],
  };

  const NS = 'http://www.w3.org/2000/svg';
  function group(cls, paths, extra = '') {
    return `<g class="${cls}" ${extra}>${paths.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}</g>`;
  }

  /** Head layers as SVG markup (in 400x400 space). gear: sunglasses | glasses | eyes | safety | hardhat | headset | gradcap | goggles */
  function head(opts = {}) {
    const g = new Set(opts.gear || ['sunglasses']);
    const eyesOn = !g.has('sunglasses');
    let s = '';
    if (g.has('hardhat')) s += group('p-hair', P.hair.slice(-5));      // only the fringe and sides show under a hard hat
    else s += group('p-hair', P.hair);
    s += group('p-face', P.face);
    s += group('p-beard', P.beard);
    if (opts.body) s += group('p-body', P.body) + `<g class="p-print"><text x="52" y="372" transform="rotate(-14 52 372)">BUILD</text><text x="286" y="372" transform="rotate(12 286 372)">ANYTHING</text></g>`;
    s += `<path class="p-stubble" d="${P.stubble}" pathLength="1"/>`;
    if (eyesOn) s += group('p-eyes', P.eyes) + P.pupils.map(([x, y]) => `<circle class="p-pupil" cx="${x}" cy="${y}" r="4.5"/>`).join('');
    if (g.has('sunglasses')) s += `<g class="p-lens"><path d="${P.sunglasses[1]}Z"/><path d="${P.sunglasses[2]}Z"/></g>` + group('p-sun', P.sunglasses);
    if (g.has('glasses') || g.has('safety')) s += group('p-glasses' + (g.has('safety') ? ' safety' : ''), P.glasses);
    if (g.has('hardhat')) s += group('p-hat', P.hardhat);
    if (g.has('headset')) s += group('p-headset', P.headset);
    if (g.has('gradcap')) s += group('p-cap', P.gradcap, 'transform="translate(0 14)"');
    if (g.has('goggles')) s += group('p-goggles', P.goggles);
    return s;
  }

  window.Portrait = { P, head, NS };
})();
