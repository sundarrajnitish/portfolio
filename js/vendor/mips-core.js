/* mini-MIPS — assembler + cycle-accurate pipeline model.
 *
 * This file mirrors rtl/ signal-for-signal: every clock cycle it evaluates the
 * same combinational logic as mips_cpu.vhd (WB -> MEM -> EX -> ID -> IF) and
 * then commits the same register updates on the rising edge. Its per-cycle
 * trace is compared line-by-line with the GHDL testbench trace
 * (sw/check_js_model.js), so what the website animates is exactly what
 * the RTL does.
 *
 * Works in the browser (window.MiniMIPS) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  const IMEM_WORDS = 256, DMEM_WORDS = 1024;
  const OPC = { rtype: 0, j: 2, beq: 4, andi: 12, subui: 25, lw: 35, sb: 40 };
  const FUN = { sll: 0, jr: 8, add: 32, xor: 38, nor: 39 };
  const ABI = ['zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3', 't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
    's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra'];
  const ALU = { ADD: 0, AND: 1, XOR: 2, NOR: 3, SLL: 4, SUB: 6 };
  const ALU_NAME = { 0: 'ADD', 1: 'AND', 2: 'XOR', 3: 'NOR', 4: 'SLL', 6: 'SUB' };

  const u32 = (x) => x >>> 0;
  const hex8 = (x) => u32(x).toString(16).toUpperCase().padStart(8, '0');
  const sext16 = (x) => (x & 0x8000) ? (x | 0xFFFF0000) : (x & 0xFFFF);

  /* ------------------------------------------------------------------ */
  /* Assembler (same syntax as sw/mips_asm.py)                           */
  /* ------------------------------------------------------------------ */
  class AsmError extends Error {
    constructor(msg, line) { super(msg); this.line = line; }
  }

  function reg(tok) {
    let t = String(tok).trim().toLowerCase(), n;
    if (t.startsWith('$')) {
      t = t.slice(1);
      if (/^\d+$/.test(t)) n = parseInt(t, 10);
      else if (ABI.includes(t)) n = ABI.indexOf(t);
      else throw new AsmError(`bad register '${tok}'`);
    } else if (/^r\d+$/.test(t)) n = parseInt(t.slice(1), 10);
    else throw new AsmError(`bad register '${tok}'`);
    if (n < 0 || n > 31) throw new AsmError(`register out of range '${tok}'`);
    return n;
  }

  function num(tok) {
    const t = String(tok).trim().toLowerCase().replace(/_/g, '');
    let v;
    if (/^-?0x[0-9a-f]+$/.test(t)) v = t.startsWith('-') ? -parseInt(t.slice(3), 16) : parseInt(t.slice(2), 16);
    else if (/^-?0b[01]+$/.test(t)) v = t.startsWith('-') ? -parseInt(t.slice(3), 2) : parseInt(t.slice(2), 2);
    else if (/^[-+]?\d+$/.test(t)) v = parseInt(t, 10);
    else throw new AsmError(`bad number '${tok}'`);
    return v;
  }

  function stripComment(line) {
    for (const c of ['#', ';', '//']) {
      const i = line.indexOf(c);
      if (i >= 0) line = line.slice(0, i);
    }
    return line.trim();
  }

  function expand(mn, ops) {
    if (mn === 'nop') return [['sll', ['$0', '$0', '0']]];
    if (mn === 'move') return [['add', [ops[0], ops[1], '$0']]];
    if (mn === 'b') return [['beq', ['$0', '$0', ops[0]]]];
    if (mn === 'halt') return [['j', ['.']]];
    return [[mn, ops]];
  }

  function assemble(src) {
    const lines = src.split(/\r?\n/);
    const labels = {};
    const items = [];
    let section = 'text';
    const pc = { text: 0, data: 0 };
    lines.forEach((raw, idx) => {
      const no = idx + 1;
      let line = stripComment(raw);
      for (;;) {
        const m = line.match(/^([A-Za-z_.][\w.]*)\s*:\s*(.*)$/);
        if (!m) break;
        if (m[1] in labels) throw new AsmError(`duplicate label '${m[1]}'`, no);
        labels[m[1]] = pc[section];
        line = m[2].trim();
      }
      if (!line) return;
      const sp = line.search(/\s/);
      const mn = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
      const rest = sp < 0 ? '' : line.slice(sp + 1);
      const ops = rest.trim() ? rest.split(',').map((s) => s.trim()) : [];
      if (mn === '.text') { section = 'text'; return; }
      if (mn === '.data') { section = 'data'; return; }
      if (mn === '.word') {
        if (section !== 'data') throw new AsmError('.word only allowed in .data', no);
        for (const o of ops) { items.push({ sec: 'data', addr: pc.data, mn, ops: [o], no, raw: raw.trim() }); pc.data += 4; }
        return;
      }
      if (mn === '.space') {
        const n = num(ops[0]);
        if (n % 4) throw new AsmError('.space must be a multiple of 4', no);
        pc[section] += n; return;
      }
      if (section !== 'text') throw new AsmError('instruction in .data section', no);
      for (const [m2, o2] of expand(mn, ops)) {
        items.push({ sec: 'text', addr: pc.text, mn: m2, ops: o2, no, raw: raw.trim() });
        pc.text += 4;
      }
    });
    const text = [], data = {};
    for (const it of items) {
      try {
        if (it.sec === 'data') {
          const t = it.ops[0].trim();
          data[it.addr >> 2] = u32(t in labels ? labels[t] : num(t));
        } else {
          text.push({ addr: it.addr, word: encode(it.mn, it.ops, it.addr, labels), line: it.no, src: it.raw });
        }
      } catch (e) {
        if (e instanceof AsmError) { e.line = e.line || it.no; e.message = `line ${it.no}: ${e.message}`; }
        throw e;
      }
    }
    if (text.length > IMEM_WORDS) throw new AsmError('program larger than instruction memory (256 words)');
    const keys = Object.keys(data).map(Number);
    const dwords = new Array(keys.length ? Math.max(...keys) + 1 : 0).fill(0);
    for (const k of keys) dwords[k] = data[k];
    return { text, data: dwords, labels };
  }

  function encode(mn, ops, addr, labels) {
    const val = (t) => { t = String(t).trim(); if (t === '.') return addr; if (t in labels) return labels[t]; return num(t); };
    const need = (n) => { if (ops.length !== n) throw new AsmError(`'${mn}' expects ${n} operands`); };
    switch (mn) {
      case 'add': case 'nor': case 'xor': {
        need(3); const rd = reg(ops[0]), rs = reg(ops[1]), rt = reg(ops[2]);
        return u32((rs << 21) | (rt << 16) | (rd << 11) | FUN[mn]);
      }
      case 'sll': {
        need(3); const rd = reg(ops[0]), rt = reg(ops[1]), sh = val(ops[2]);
        if (sh < 0 || sh > 31) throw new AsmError('shamt must be 0..31');
        return u32((rt << 16) | (rd << 11) | (sh << 6) | FUN.sll);
      }
      case 'jr': need(1); return u32((reg(ops[0]) << 21) | FUN.jr);
      case 'andi': case 'subui': {
        need(3); const rt = reg(ops[0]), rs = reg(ops[1]), imm = val(ops[2]);
        if (mn === 'andi' && (imm < 0 || imm > 0xFFFF)) throw new AsmError('andi immediate must be 0..65535 (zero-extended)');
        if (mn === 'subui' && (imm < -32768 || imm > 32767)) throw new AsmError('subui immediate must be -32768..32767');
        return u32((OPC[mn] << 26) | (rs << 21) | (rt << 16) | (imm & 0xFFFF));
      }
      case 'li': case 'la': {
        need(2); const rt = reg(ops[0]), imm = val(ops[1]);
        if (imm < -32767 || imm > 32768) throw new AsmError('li immediate must be -32767..32768');
        return u32((OPC.subui << 26) | (rt << 16) | ((-imm) & 0xFFFF));
      }
      case 'lw': case 'sb': {
        need(2); const rt = reg(ops[0]);
        const m = ops[1].trim().match(/^(.*)\((.*)\)$/);
        if (!m) throw new AsmError('expected offset(base)');
        const off = m[1].trim() ? val(m[1]) : 0, rs = reg(m[2]);
        if (off < -32768 || off > 32767) throw new AsmError('offset out of range');
        return u32((OPC[mn] << 26) | (rs << 21) | (rt << 16) | (off & 0xFFFF));
      }
      case 'beq': {
        need(3); const rs = reg(ops[0]), rt = reg(ops[1]); const t = ops[2].trim();
        const off = (t in labels || t === '.') ? ((val(t) - (addr + 4)) >> 2) : num(t);
        if (off < -32768 || off > 32767) throw new AsmError('branch out of range');
        return u32((OPC.beq << 26) | (rs << 21) | (rt << 16) | (off & 0xFFFF));
      }
      case 'j': {
        need(1); const tgt = val(ops[0]);
        if (tgt & 3) throw new AsmError('jump target not word aligned');
        return u32((OPC.j << 26) | ((tgt >>> 2) & 0x3FFFFFF));
      }
      default: throw new AsmError(`unknown instruction '${mn}'`);
    }
  }

  function decodeFields(w) {
    return {
      op: (w >>> 26) & 63, rs: (w >>> 21) & 31, rt: (w >>> 16) & 31, rd: (w >>> 11) & 31,
      shamt: (w >>> 6) & 31, funct: w & 63, imm: w & 0xFFFF, target: w & 0x3FFFFFF,
    };
  }

  function mnemonic(w) {
    const f = decodeFields(w);
    if (f.op === 0) {
      if (f.funct === FUN.sll) return w === 0 ? 'nop' : 'sll';
      if (f.funct === FUN.jr) return 'jr';
      if (f.funct === FUN.add) return 'add';
      if (f.funct === FUN.xor) return 'xor';
      if (f.funct === FUN.nor) return 'nor';
      return '???';
    }
    for (const k of ['j', 'beq', 'andi', 'subui', 'lw', 'sb']) if (OPC[k] === f.op) return k;
    return '???';
  }

  function disasm(w, addr) {
    const f = decodeFields(w), mn = mnemonic(w);
    switch (mn) {
      case 'nop': return 'nop';
      case 'sll': return `sll $${f.rd}, $${f.rt}, ${f.shamt}`;
      case 'jr': return `jr $${f.rs}`;
      case 'add': case 'xor': case 'nor': return `${mn} $${f.rd}, $${f.rs}, $${f.rt}`;
      case 'andi': return `andi $${f.rt}, $${f.rs}, ${f.imm}`;
      case 'subui': return f.rs === 0 ? `li $${f.rt}, ${-(sext16(f.imm) | 0)}` : `subui $${f.rt}, $${f.rs}, ${sext16(f.imm) | 0}`;
      case 'lw': case 'sb': return `${mn} $${f.rt}, ${sext16(f.imm) | 0}($${f.rs})`;
      case 'beq': return `beq $${f.rs}, $${f.rt}, 0x${u32((addr || 0) + 4 + ((sext16(f.imm) | 0) << 2)).toString(16)}`;
      case 'j': {
        const t = u32((((addr || 0) + 4) & 0xF0000000) | (f.target << 2));
        return t === addr ? 'halt  (j .)' : `j 0x${t.toString(16)}`;
      }
      default: return `.word 0x${hex8(w)}`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Control unit — identical truth table to control_unit.vhd            */
  /* ------------------------------------------------------------------ */
  const CTRL_NOP = Object.freeze({
    regWrite: 0, memToReg: 0, memRead: 0, memWrite: 0, regDst: 0, aluSrc: 0, aluOp: ALU.ADD,
    branch: 0, jump: 0, jumpReg: 0, extZero: 0, usesRs: 0, usesRt: 0,
  });

  function control(op, funct) {
    const c = Object.assign({}, CTRL_NOP);
    switch (op) {
      case OPC.rtype:
        if ([FUN.add, FUN.nor, FUN.xor, FUN.sll].includes(funct)) {
          c.regWrite = 1; c.regDst = 1; c.usesRs = 1; c.usesRt = 1;
          if (funct === FUN.add) c.aluOp = ALU.ADD;
          else if (funct === FUN.nor) c.aluOp = ALU.NOR;
          else if (funct === FUN.xor) c.aluOp = ALU.XOR;
          else { c.aluOp = ALU.SLL; c.usesRs = 0; }
        } else if (funct === FUN.jr) { c.jumpReg = 1; c.usesRs = 1; }
        break;
      case OPC.andi: c.regWrite = 1; c.aluSrc = 1; c.aluOp = ALU.AND; c.extZero = 1; c.usesRs = 1; break;
      case OPC.subui: c.regWrite = 1; c.aluSrc = 1; c.aluOp = ALU.SUB; c.usesRs = 1; break;
      case OPC.lw: c.regWrite = 1; c.memToReg = 1; c.memRead = 1; c.aluSrc = 1; c.aluOp = ALU.ADD; c.usesRs = 1; break;
      case OPC.sb: c.memWrite = 1; c.aluSrc = 1; c.aluOp = ALU.ADD; c.usesRs = 1; c.usesRt = 1; break;
      case OPC.beq: c.branch = 1; c.aluOp = ALU.SUB; c.usesRs = 1; c.usesRt = 1; break;
      case OPC.j: c.jump = 1; break;
      default: break;
    }
    return c;
  }

  function aluCompute(op, a, b, shamt) {
    switch (op) {
      case ALU.ADD: return u32(a + b);
      case ALU.AND: return u32(a & b);
      case ALU.XOR: return u32(a ^ b);
      case ALU.NOR: return u32(~(a | b));
      case ALU.SLL: return u32(b << shamt);   // JS masks shift count to 5 bits, shamt is 0..31
      case ALU.SUB: return u32(a - b);
      default: return 0;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pipeline model                                                     */
  /* ------------------------------------------------------------------ */
  const IFID0 = () => ({ valid: 0, pc: 0, pc4: 0, instr: 0, uid: -1 });
  const IDEX0 = () => ({ valid: 0, pc: 0, ctrl: Object.assign({}, CTRL_NOP), rsVal: 0, rtVal: 0, imm: 0, shamt: 0, rs: 0, rt: 0, rd: 0, uid: -1 });
  const EXMEM0 = () => ({ valid: 0, pc: 0, regWrite: 0, memToReg: 0, memRead: 0, memWrite: 0, alu: 0, storeData: 0, dest: 0, uid: -1 });
  const MEMWB0 = () => ({ valid: 0, pc: 0, regWrite: 0, memToReg: 0, alu: 0, readData: 0, dest: 0, uid: -1 });

  class Pipeline {
    constructor(program) {
      this.program = program;
      this.imem = new Uint32Array(IMEM_WORDS);
      program.text.forEach((t) => { this.imem[(t.addr >>> 2) % IMEM_WORDS] = t.word; });
      this.dmemInit = new Uint32Array(DMEM_WORDS);
      program.data.forEach((w, i) => { if (i < DMEM_WORDS) this.dmemInit[i] = w; });
      this.reset();
    }

    reset() {
      this.pc = 0;
      this.ifid = IFID0(); this.idex = IDEX0(); this.exmem = EXMEM0(); this.memwb = MEMWB0();
      this.regs = new Uint32Array(32);
      this.mem = new Uint32Array(this.dmemInit);
      this.cycle = 0;
      this.nextUid = 1;
      this.bubbleSeq = 0;
      this.ifUid = 0;               // dynamic id of the instruction being fetched
      this.uids = [{ uid: 0, pc: 0 }];
      this.haltCycle = -1;
      this.done = false;
      this.retired = 0;
      this.stats = { stalls: 0, flushes: 0, fwdEx: 0, fwdId: 0, loadUse: 0, branchStall: 0 };
    }

    /** Evaluate one clock cycle. Returns a snapshot of every combinational
     *  value *during* the cycle (what a logic analyser would show just before
     *  the rising edge), then commits the edge. */
    step() {
      if (this.done) return null;
      this.cycle++;
      const { ifid, idex, exmem, memwb, regs, mem } = this;

      /* ---- WB ---- */
      const wbData = memwb.memToReg ? memwb.readData : memwb.alu;
      const wbWe = memwb.regWrite;

      /* ---- MEM ---- */
      const dIdx = (exmem.alu >>> 2) & (DMEM_WORDS - 1);
      const dmemRead = mem[dIdx];

      /* ---- EX : forwarding unit + muxes + ALU ---- */
      const exSel = (src) => {
        if (exmem.regWrite && exmem.dest !== 0 && exmem.dest === src) return 2;
        if (memwb.regWrite && memwb.dest !== 0 && memwb.dest === src) return 1;
        return 0;
      };
      const fwdA = exSel(idex.rs), fwdB = exSel(idex.rt);
      const pick = (sel, v) => (sel === 2 ? exmem.alu : sel === 1 ? wbData : v);
      const aluA = pick(fwdA, idex.rsVal);
      const rtFwd = pick(fwdB, idex.rtVal);
      const aluB = idex.ctrl.aluSrc ? idex.imm : rtFwd;
      const exDest = idex.ctrl.regDst ? idex.rd : idex.rt;
      const aluOut = aluCompute(idex.ctrl.aluOp, aluA, aluB, idex.shamt);

      /* ---- ID : decode, register read, forwarding E/F, branch unit, hazards ---- */
      const f = decodeFields(ifid.instr);
      const ctrl = control(f.op, f.funct);
      const rfRead = (ra) => (ra === 0 ? 0 : (wbWe && memwb.dest === ra ? wbData : regs[ra]));
      const rfBypass1 = f.rs !== 0 && wbWe && memwb.dest === f.rs;
      const rfBypass2 = f.rt !== 0 && wbWe && memwb.dest === f.rt;
      const rd1 = rfRead(f.rs), rd2 = rfRead(f.rt);
      const idSel = (src) => (exmem.regWrite && !exmem.memRead && exmem.dest !== 0 && exmem.dest === src) ? 1 : 0;
      const fwdE = idSel(f.rs), fwdF = idSel(f.rt);
      const rsVal = fwdE ? exmem.alu : rd1;
      const rtVal = fwdF ? exmem.alu : rd2;
      const imm = ctrl.extZero ? f.imm : u32(sext16(f.imm));
      const equal = rsVal === rtVal ? 1 : 0;
      const branchTarget = u32(ifid.pc4 + ((sext16(f.imm) | 0) << 2));
      const jumpTarget = u32((ifid.pc4 & 0xF0000000) | (f.target << 2));

      const reads = (r) => r !== 0 && ((ctrl.usesRs && f.rs === r) || (ctrl.usesRt && f.rt === r));
      const loadUse = !!(idex.ctrl.memRead && reads(exDest));
      const branchHazEx = !!((ctrl.branch || ctrl.jumpReg) && idex.ctrl.regWrite && reads(exDest));
      const branchHazMem = !!((ctrl.branch || ctrl.jumpReg) && exmem.memRead && reads(exmem.dest));
      const stall = ifid.valid && (loadUse || branchHazEx || branchHazMem) ? 1 : 0;
      let flush = 0, pcSel = 0;
      if (!stall && ifid.valid) {
        if (ctrl.branch && equal) { pcSel = 1; flush = 1; }
        else if (ctrl.jump) { pcSel = 2; flush = 1; }
        else if (ctrl.jumpReg) { pcSel = 3; flush = 1; }
      }
      const halted = ifid.valid && ctrl.jump && jumpTarget === ifid.pc;

      /* ---- IF ---- */
      const instr = this.imem[(this.pc >>> 2) & (IMEM_WORDS - 1)];
      const pc4 = u32(this.pc + 4);
      const branchMux = pcSel === 1 ? branchTarget : pc4;
      const nextPc = pcSel === 2 ? jumpTarget : pcSel === 3 ? rsVal : branchMux;

      /* ---- snapshot (combinational values of this cycle) ---- */
      const snap = {
        cycle: this.cycle,
        pc: this.pc, instr, pc4, nextPc, pcSel, branchTarget, jumpTarget,
        ifUid: this.ifUid,
        ifid: Object.assign({}, ifid), idex: Object.assign({}, idex, { ctrl: Object.assign({}, idex.ctrl) }),
        exmem: Object.assign({}, exmem), memwb: Object.assign({}, memwb),
        id: { f, ctrl, rd1, rd2, rsVal, rtVal, imm, equal, fwdE, fwdF, rfBypass1, rfBypass2, loadUse, branchHazEx, branchHazMem },
        ex: { fwdA, fwdB, aluA, aluB, rtFwd, exDest, aluOut },
        mem: { addr: exmem.alu, idx: dIdx, readData: dmemRead, we: exmem.memWrite, wdata: exmem.storeData },
        wb: { data: wbData, we: wbWe && memwb.dest !== 0 ? 1 : 0, dest: memwb.dest },
        stall, flush, halted,
        regsBefore: Array.from(regs),
      };

      /* ---- rising edge ---- */
      if (wbWe && memwb.dest !== 0) regs[memwb.dest] = wbData;
      if (exmem.memWrite) {
        const lane = exmem.alu & 3;
        mem[dIdx] = u32((mem[dIdx] & ~(0xFF << (8 * lane))) | ((exmem.storeData & 0xFF) << (8 * lane)));
      }
      if (memwb.valid) this.retired++;
      this.memwb = { valid: exmem.valid, pc: exmem.pc, regWrite: exmem.regWrite, memToReg: exmem.memToReg,
        alu: exmem.alu, readData: dmemRead, dest: exmem.dest, uid: exmem.uid };
      this.exmem = { valid: idex.valid, pc: idex.pc, regWrite: idex.ctrl.regWrite, memToReg: idex.ctrl.memToReg,
        memRead: idex.ctrl.memRead, memWrite: idex.ctrl.memWrite, alu: aluOut, storeData: rtFwd, dest: exDest, uid: idex.uid };
      if (stall) {
        this.idex = IDEX0();
        this.idex.uid = -(++this.bubbleSeq) - 1;     // tracked bubble (for the timing diagram)
        snap.bubbleUid = this.idex.uid;
      } else {
        this.idex = { valid: ifid.valid, pc: ifid.pc, ctrl, rsVal, rtVal, imm, shamt: f.shamt, rs: f.rs, rt: f.rt, rd: f.rd, uid: ifid.uid };
      }
      if (!stall) {
        if (flush) {
          snap.squashedUid = this.ifUid;
          this.ifid = IFID0();
        } else {
          this.ifid = { valid: 1, pc: this.pc, pc4, instr, uid: this.ifUid };
        }
        this.pc = nextPc;
        this.ifUid = this.nextUid++;
        this.uids.push({ uid: this.ifUid, pc: this.pc });
      }

      /* ---- statistics ---- */
      if (!this.done && this.haltCycle < 0) {
        if (stall) { this.stats.stalls++; if (loadUse) this.stats.loadUse++; else this.stats.branchStall++; }
        if (flush) this.stats.flushes++;
        const exUses = idex.valid && (idex.ctrl.regWrite || idex.ctrl.memWrite);   // ALU result actually consumed
        if (exUses) this.stats.fwdEx += (fwdA && idex.ctrl.usesRs ? 1 : 0) + (fwdB && idex.ctrl.usesRt ? 1 : 0);
        if (ifid.valid && !stall) this.stats.fwdId += (fwdE && ctrl.usesRs ? 1 : 0) + (fwdF && ctrl.usesRt ? 1 : 0);
      }
      if (halted && this.haltCycle < 0) this.haltCycle = this.cycle;
      if (this.haltCycle >= 0 && this.cycle >= this.haltCycle + 3) this.done = true;
      snap.done = this.done;
      return snap;
    }

    /** Same CSV columns as tb_mips.vhd */
    static traceLine(s) {
      const h = hex8, b = (x) => (x ? '1' : '0');
      return [s.cycle, h(s.pc), b(s.ifid.valid), h(s.ifid.pc), h(s.ifid.instr), b(s.idex.valid), h(s.idex.pc),
        b(s.exmem.valid), h(s.exmem.pc), b(s.memwb.valid), h(s.memwb.pc), b(s.stall), b(s.flush),
        String(s.pcSel), h(s.nextPc), String(s.ex.fwdA), String(s.ex.fwdB), b(s.id.fwdE), b(s.id.fwdF),
        h(s.ex.aluOut), b(s.wb.we), String(s.memwb.dest), h(s.wb.data), b(s.mem.we), h(s.mem.addr), h(s.mem.wdata)].join(',');
    }
  }

  const api = { assemble, disasm, mnemonic, decodeFields, control, Pipeline, AsmError, hex8, sext16, ALU, ALU_NAME, OPC, FUN, ABI, IMEM_WORDS, DMEM_WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MiniMIPS = api;
})(typeof window !== 'undefined' ? window : globalThis);
