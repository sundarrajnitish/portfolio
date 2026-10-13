/* mini-MIPS pipeline on the real cycle-accurate core (js/vendor/mips-core.js, checked against the VHDL
 * trace over 98,669 cycles). Programs are the lab's own test programs. */
Demos.register('mips', (el, { T, h, onLang, loop }) => {
  const MM = window.MiniMIPS;
  const PROGRAMS = {
    tour: ['Guided tour', 'Visite guidée', `# 00 - Guided tour: every pipeline event in 14 instructions.
        li   $1, 7
        li   $2, 3
        add  $3, $1, $2      # A <- MEM/WB ($1), B <- EX/MEM ($2)      = 10
        sb   $3, 0($0)       # store data forwarded from EX/MEM
        lw   $4, 0($0)       # $4 = 10
        xor  $5, $4, $1      # load-use: 1 stall, then MEM/WB -> EX    = 13
        beq  $5, $0, skip    # operand still in EX: 1 stall, not taken
        beq  $3, $4, skip    # 10 == 10: taken, wrong-path slot flushed
        li   $6, 99          # (squashed)
skip:   la   $7, sub
        jr   $7              # JR target in EX: 1 stall, then flush
        li   $6, 1           # (squashed)
sub:    sll  $8, $5, 2       # 52
        halt`],
    fwd: ['Forwarding', 'Anticipation', `# 01 - Data forwarding: every RAW dependence on an ALU result is resolved
#      without stalling (EX/MEM -> EX and MEM/WB -> EX paths).
        li   $1, 12          # producer
        li   $2, 30
        add  $3, $1, $2      # $1 from MEM/WB, $2 from EX/MEM       -> 42
        xor  $4, $3, $1      # $3 from EX/MEM                       -> 38
        nor  $5, $4, $3      # $4 EX/MEM, $3 MEM/WB                 -> ~(38|42)
        sll  $6, $5, 3       # rt forwarded into the shifter
        add  $6, $6, $6      # same reg as src & dest
        add  $6, $6, $6      # chain through EX/MEM again
        add  $7, $6, $0      # $0 is never forwarded
        andi $8, $7, 0xfff0  # I-type: rt is a destination, not an operand
        subui $9, $8, -100   # immediate is NOT overwritten by forwarding
        halt`],
    load: ['Load-use', 'Load-use', `# 02 - Load-use hazard: 1 stall + MEM/WB forwarding, and store-byte merging.
        .data
vals:   .word 100, 200, 0xAABBCCDD, 0
        .text
        lw   $1, 0($0)       # 100
        add  $2, $1, $1      # load-use -> 1 bubble, then MEM/WB -> EX
        lw   $3, 4($0)       # 200
        nop
        add  $4, $3, $2      # distance 2: no stall, MEM/WB forwarding
        lw   $5, 8($0)
        sb   $5, 12($0)      # store data depends on load -> stall, fwd to store data
        sb   $4, 13($0)      # byte lane 1
        li   $6, 0x7F
        sb   $6, 14($0)      # byte lane 2
        lw   $7, 12($0)      # read back merged word 0x007F90DD
        lw   $8, 8($7)       # address depends on load -> stall, fwd into address
        halt`],
    fib: ['Fibonacci', 'Fibonacci', `# 04 - Fibonacci: F(0..15) stored as bytes, then read back as packed words
        li   $1, 0           # F(n-2)
        li   $2, 1           # F(n-1)
        li   $3, 0           # address / index
        li   $4, 16          # count
        sb   $1, 0($3)       # F(0)
        sb   $2, 1($3)       # F(1)
        li   $3, 2
loop:   add  $5, $1, $2      # F(n)
        sb   $5, 0($3)
        move $1, $2
        move $2, $5
        subui $3, $3, -1     # $3 += 1
        beq  $3, $4, done
        j    loop
done:   lw   $10, 0($0)      # F0..F3
        lw   $11, 4($0)
        lw   $12, 8($0)
        lw   $13, 12($0)     # F12..F15
        halt`],
  };
  const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
  let src = PROGRAMS.tour[2], cpu, snaps, rows, rowOrder, prevRegs, running = false, speed = 3, acc = 0, err = null;

  function load(text) {
    try {
      cpu = new MM.Pipeline(MM.assemble(text)); err = null;
    } catch (e) { err = `${e.message}${e.line ? ` (line ${e.line})` : ''}`; return false; }
    snaps = []; rows = new Map(); rowOrder = []; prevRegs = new Array(32).fill(0); running = false;
    return true;
  }
  const dis = (pc) => MM.disasm(cpu.imem[(pc >>> 2) & 255], pc);
  function stageUids(s) {
    return {
      IF: { uid: s.ifUid, pc: s.pc },
      ID: s.ifid.valid ? { uid: s.ifid.uid, pc: s.ifid.pc } : null,
      EX: s.idex.valid ? { uid: s.idex.uid, pc: s.idex.pc } : s.idex.uid < -1 ? { bubble: true } : null,
      MEM: s.exmem.valid ? { uid: s.exmem.uid, pc: s.exmem.pc } : s.exmem.uid < -1 ? { bubble: true } : null,
      WB: s.memwb.valid ? { uid: s.memwb.uid, pc: s.memwb.pc } : s.memwb.uid < -1 ? { bubble: true } : null,
    };
  }
  function step() {
    if (!cpu || cpu.done) { running = false; return; }
    prevRegs = Array.from(cpu.regs);
    const s = cpu.step();
    if (!s) { running = false; return; }
    s.st = stageUids(s);
    snaps.push(s);
    STAGES.forEach((stg) => {
      const x = s.st[stg];
      if (!x || x.bubble) return;
      if (!rows.has(x.uid)) { rows.set(x.uid, { pc: x.pc, cells: {}, squashed: false }); rowOrder.push(x.uid); }
      rows.get(x.uid).cells[s.cycle] = stg + (s.stall && (stg === 'IF' || stg === 'ID') ? '*' : '');
    });
    if (s.squashedUid !== undefined && rows.has(s.squashedUid)) rows.get(s.squashedUid).squashed = true;
    if (cpu.done) running = false;
  }

  /* ---------- UI ---------- */
  const presetRow = h('div', { class: 'd-row' });
  const ctl = h('div', { class: 'd-row' });
  const pipe = h('div', { class: 'mp-pipe' });
  const events = h('div', { class: 'mp-events' });
  const diagram = h('div', { class: 'mp-diag' });
  const side = h('div', { class: 'd-col' });
  const editor = h('textarea', { class: 'd-code', rows: 14, spellcheck: 'false' });
  const errBox = h('div', { class: 'd-label bad' });
  const details = h('details', { class: 'mp-edit' }, h('summary', {}), editor, h('div', { class: 'd-row', style: 'margin-top:8px' },
    h('button', { class: 'd-btn primary', onclick: () => { src = editor.value; if (load(src)) draw(); else draw(); } }, ''), errBox));
  el.append(h('style', { text: `
      .mp-pipe{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
      .mp-st{border-radius:14px;padding:10px;background:rgba(0,0,0,.35);border:1px solid var(--hair-2);min-height:86px;position:relative;transition:all .25s}
      .mp-st h5{font:700 11px var(--mono);color:var(--ink-3);letter-spacing:.08em}
      .mp-st .ins{font:600 12.5px var(--mono);margin-top:6px;color:var(--ink);word-break:break-word}
      .mp-st.stall{border-color:var(--orange)} .mp-st.flush{border-color:var(--red)} .mp-st.fwd{border-color:var(--blue)}
      .mp-st .b{display:inline-block;margin-top:6px;font:700 10px var(--mono);padding:2px 6px;border-radius:5px;margin-right:4px}
      .b.o{background:rgba(255,159,10,.2);color:var(--orange)} .b.r{background:rgba(255,69,58,.2);color:var(--red)} .b.bl{background:rgba(41,151,255,.2);color:var(--blue)}
      .mp-events{font-size:13px;color:var(--ink-2);min-height:44px;margin:10px 2px}
      .mp-diag{overflow:auto;max-height:260px;border-radius:12px;border:1px solid var(--hair-2);background:rgba(0,0,0,.3)}
      .mp-diag table{border-collapse:collapse;font:11.5px var(--mono)}
      .mp-diag td,.mp-diag th{padding:3px 5px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.04)}
      .mp-diag th{color:var(--ink-3);font-weight:600;position:sticky;top:0;background:#111}
      .mp-diag td.i{text-align:left;color:var(--ink-2);position:sticky;left:0;background:#0b0b0c}
      .mp-diag tr.sq td.i{text-decoration:line-through;color:var(--ink-3)}
      .c-IF{color:#64d2ff}.c-ID{color:#2997ff}.c-EX{color:#f5f5f7;font-weight:700}.c-MEM{color:#bf5af2}.c-WB{color:#30d158}.c-st{color:var(--orange)}
      .mp-regs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font:11.5px var(--mono)}
      .mp-regs div{padding:4px 6px;border-radius:6px;background:rgba(0,0,0,.35);display:flex;justify-content:space-between;gap:4px}
      .mp-regs .ch{background:rgba(48,209,88,.22)}
      .mp-edit summary{cursor:pointer;color:var(--blue);font-size:13px;margin:12px 0 8px}
      .mp-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-top:12px}
      @media(max-width:760px){.mp-pipe{grid-template-columns:repeat(5,minmax(90px,1fr));overflow:auto}.mp-grid{grid-template-columns:1fr}}
    ` }),
  presetRow, h('div', { style: 'margin:10px 0' }, ctl), pipe, events, h('div', { class: 'mp-grid' }, diagram, side), details);

  function draw() {
    // presets + controls
    presetRow.replaceChildren(...Object.entries(PROGRAMS).map(([k, [en, fr, text]]) =>
      h('button', { class: 'chip' + (src === text ? ' on' : ''), onclick: () => { src = text; editor.value = text; load(src); draw(); } }, T(en, fr))));
    ctl.replaceChildren(
      h('button', { class: 'd-btn primary', onclick: () => { step(); draw(); } }, T('Step ▸ one clock', 'Pas ▸ un cycle')),
      h('button', { class: 'd-btn', onclick: () => { running = !running; draw(); } }, running ? T('Pause', 'Pause') : T('Run', 'Exécuter')),
      h('button', { class: 'd-btn', onclick: () => { load(src); draw(); } }, T('Reset', 'Réinitialiser')),
      h('span', { class: 'd-label' }, T('speed', 'vitesse')),
      h('input', { type: 'range', min: 1, max: 12, value: speed, style: 'width:110px', oninput: (e) => { speed = +e.target.value; } }),
    );
    details.querySelector('summary').textContent = T('Edit the program (MIPS assembly)', 'Modifier le programme (assembleur MIPS)');
    details.querySelector('.d-btn').textContent = T('Assemble & load', 'Assembler et charger');
    errBox.textContent = err || '';
    if (!cpu) return;
    const s = snaps[snaps.length - 1];
    // stage cards
    pipe.replaceChildren(...STAGES.map((stg) => {
      const x = s && s.st[stg];
      const badges = [], cls = [];
      if (s) {
        if ((stg === 'ID' || stg === 'IF') && s.stall) { badges.push(['o', 'STALL']); cls.push('stall'); }
        if (stg === 'IF' && s.flush) { badges.push(['r', 'FLUSH']); cls.push('flush'); }
        if (stg === 'EX' && s.idex.valid) {
          if (s.ex.fwdA && s.idex.ctrl.usesRs) { badges.push(['bl', `rs ← ${s.ex.fwdA === 2 ? 'EX/MEM' : 'MEM/WB'}`]); cls.push('fwd'); }
          if (s.ex.fwdB && s.idex.ctrl.usesRt) { badges.push(['bl', `rt ← ${s.ex.fwdB === 2 ? 'EX/MEM' : 'MEM/WB'}`]); cls.push('fwd'); }
        }
        if (stg === 'ID' && s.ifid.valid && !s.stall && (s.id.fwdE || s.id.fwdF) && (s.id.ctrl.branch || s.id.ctrl.jumpReg)) { badges.push(['bl', 'EX/MEM → ID']); cls.push('fwd'); }
        if (stg === 'ID' && s.ifid.valid && (s.id.rfBypass1 || s.id.rfBypass2)) badges.push(['bl', T('RF bypass', 'contournement RF')]);
        if (stg === 'MEM' && s.mem.we) badges.push(['bl', `SB @${s.mem.addr}`]);
        if (stg === 'WB' && s.wb.we) badges.push(['bl', `$${s.wb.dest} ← ${s.wb.data | 0}`]);
      }
      const text = !x ? '—' : x.bubble ? T('bubble', 'bulle') : dis(x.pc);
      return h('div', { class: 'mp-st ' + cls.join(' ') }, h('h5', {}, stg), h('div', { class: 'ins', style: x && x.bubble ? 'color:var(--orange)' : '' }, text),
        ...badges.map(([c, t]) => h('span', { class: 'b ' + c }, t)));
    }));
    // plain-language events
    const ev = [];
    if (s) {
      if (s.id.loadUse && s.stall) ev.push(T('Load-use hazard: the instruction in ID needs a value the LW in EX hasn’t loaded yet. Hold IF/ID, insert a bubble.', 'Aléa load-use : l’instruction en ID a besoin d’une valeur que le LW en EX n’a pas encore chargée. On gèle IF/ID et on insère une bulle.'));
      else if (s.id.branchHazEx && s.stall) ev.push(T('Branch/JR operand is still being computed in EX: stall one cycle, then forward EX/MEM → ID.', 'L’opérande du branchement/JR est encore calculé en EX : suspension d’un cycle, puis anticipation EX/MEM → ID.'));
      else if (s.id.branchHazMem && s.stall) ev.push(T('Branch/JR operand comes from a load in MEM: stall again until the register file can bypass it.', 'L’opérande du branchement/JR vient d’un chargement en MEM : nouvelle suspension jusqu’au contournement par le banc de registres.'));
      if (s.flush) ev.push(T(`${['', 'Taken branch', 'Jump', 'JR'][s.pcSel]} resolved in ID: the wrong-path instruction just fetched is flushed (1 slot).`, `${['', 'Branchement pris', 'Saut', 'JR'][s.pcSel]} résolu en ID : l’instruction chargée sur le mauvais chemin est vidée (1 cycle).`));
      if (!ev.length) ev.push(T('No hazard this cycle: every stage advanced.', 'Aucun aléa à ce cycle : tous les étages ont avancé.'));
    } else ev.push(T('Press Step to clock the pipeline.', 'Appuyez sur Pas pour cadencer le pipeline.'));
    events.replaceChildren(h('b', { style: 'color:var(--ink)' }, s ? `${T('Cycle', 'Cycle')} ${s.cycle} · ` : ''), ev.join(' '));
    // timing diagram (last 16 cycles)
    const last = s ? s.cycle : 0, first = Math.max(1, last - 15);
    const cyc = Array.from({ length: last - first + 1 }, (_, i) => first + i);
    diagram.replaceChildren(h('table', {},
      h('tr', {}, h('th', {}, T('instruction', 'instruction')), ...cyc.map((c) => h('th', {}, c))),
      ...rowOrder.filter((u) => cyc.some((c) => rows.get(u).cells[c])).slice(-14).map((u) => {
        const r = rows.get(u);
        return h('tr', { class: r.squashed ? 'sq' : '' }, h('td', { class: 'i' }, dis(r.pc)),
          ...cyc.map((c) => { const v = r.cells[c] || ''; return h('td', { class: v.endsWith('*') ? 'c-st' : 'c-' + v }, v.replace('*', '')); }));
      })));
    // registers + stats
    const regs = Array.from(cpu.regs);
    const fmt = (v) => { const sv = v | 0; return Math.abs(sv) < 100000 ? String(sv) : '0x' + (v >>> 0).toString(16); };
    const st = cpu.stats;
    side.replaceChildren(...[
      h('div', { class: 'd-kpis' },
        h('div', { class: 'd-kpi' }, h('b', {}, String(cpu.cycle)), h('span', {}, T('cycles', 'cycles'))),
        h('div', { class: 'd-kpi' }, h('b', {}, String(cpu.retired)), h('span', {}, T('retired', 'terminées'))),
        h('div', { class: 'd-kpi' }, h('b', {}, cpu.retired ? (cpu.cycle / cpu.retired).toFixed(2) : '—'), h('span', {}, 'CPI')),
        h('div', { class: 'd-kpi' }, h('b', { class: 'warn' }, `${st.stalls} · ${st.flushes}`), h('span', {}, T('stalls · flushes', 'suspensions · vidages')))),
      h('span', { class: 'd-label' }, T('Registers ($1–$15)', 'Registres ($1–$15)')),
      h('div', { class: 'mp-regs' }, ...regs.slice(1, 16).map((v, i) => h('div', { class: v !== prevRegs[i + 1] ? 'ch' : '' }, h('span', { class: 'muted' }, `$${i + 1}`), fmt(v)))),
      cpu.done ? h('div', { class: 'ok', style: 'font-weight:600;font-size:14px' }, T('Halted. Program complete.', 'Arrêté. Programme terminé.')) : null,
    ].filter(Boolean));
  }

  editor.value = src;
  load(src); draw(); onLang(draw);
  loop((dt) => {
    if (!running) return;
    acc += dt * speed;
    if (acc >= 1) { acc = 0; step(); draw(); }
  });
});
