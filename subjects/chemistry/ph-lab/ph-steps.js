/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-steps.js  (v2)
   Tutor mode with TWO levels, for a dissolved compound, a buffer and a titration point:
     general  — the short worked solution (what to write in an exam)
     detailed — the full analysis: what the substance is, which species exist, the constants, the
                unknowns/equations (mass balance, charge balance, proton condition), how the
                polynomial is derived and solved, which shortcuts hold and by how much they miss,
                all concentrations, a substitution check, what the number means, and the real-
                solution (activity) correction.
   Equations/numbers are language-neutral HTML; titles and notes come from T(key, params).
   Nothing here is typed in by hand: every number is read back from the exact engine.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.PHLabEngine;
  var HO = 'H<sub>3</sub>O<sup>+</sup>', OHm = 'OH<sup>\u2212</sup>', ARR = '\u21cc', MN = '\u2212';

  function f(x, s) { return E.fmt(x, s || 3); }
  function sci(x, s) { return E.sciHTML(x, s || 3); }
  function pH2(p) { return E.fmtPH(p); }
  function pH3(p) { return E.fmtPH3(p); }
  function sub(n) { return '<sub>' + n + '</sub>'; }
  function br(s) { return '[' + s + ']'; }
  function lg(x) { return E.log10(x); }
  function quad(K, C) { return (-K + Math.sqrt(K * K + 4 * K * C)) / 2; }
  function pct(x) { return x < 0.01 ? '&lt;0.01' : x < 10 ? x.toFixed(2) : x.toFixed(1); }
  function sgn(x) { return (x >= 0 ? '+' : '') + E.minus(x.toFixed(3)); }
  function st(title, lines, note, table, sec) { return { title: title, lines: lines || [], note: note || null, table: table || null, sec: sec || null }; }
  function ok(rel, tol) { return rel < (tol || 1e-6) ? '\u2713' : '\u2717'; }

  function prep(ctx) {
    var c = ctx.comp, fam = ctx.fam, C = ctx.C, sys = E.systemFor(c, fam, C);
    if (fam) sys.pKaList = fam.pKa;
    var solI = E.solve(sys), solR = E.solve(sys, { act: true });
    return { c: c, fam: fam, C: C, T: ctx.T, name: ctx.name || '', model: ctx.model === 'real' ? 'real' : 'ideal', sys: sys, solI: solI, solR: solR,
             sol: ctx.model === 'real' ? solR : solI, forms: fam ? fam.forms : [], n: fam ? fam.pKa.length : 0 };
  }

  /* spectator ions (labels, concentrations, charges) of the dissolved compound — read from the engine's declared REAL ions
     (sys.spec + the counter-ions of the dissolved forms). Nothing is invented here: for H₂SO₄ the list is empty, because the
     proton of the complete first dissociation is free H⁺ inside [H₃O⁺]. */
  function specItems(P) {
    var out = [];
    (P.sys.spec || []).forEach(function (q) { out.push({ label: q.label, c: q.c, z: q.z }); });
    E.counterIons(P.sys).forEach(function (q) { out.push({ label: q.label, c: q.c, z: q.z }); });
    return out;
  }
  function chargeStrings(P) {
    var pos = [HO], neg = [OHm], fam = P.fam, j, q;
    if (fam) for (j = 0; j < P.forms.length; j++) {
      q = fam.z0 - j; var term = (Math.abs(q) > 1 ? Math.abs(q) : '') + br(P.forms[j]);
      if (q > 0) pos.push(term); else if (q < 0) neg.push(term);
    }
    specItems(P).forEach(function (s) { var t = (Math.abs(s.z) > 1 ? Math.abs(s.z) : '') + br(s.label); if (s.z > 0) pos.push(t); else neg.push(t); });
    return { lhs: pos.join(' + '), rhs: neg.join(' + ') };
  }
  function j0Of(c) { return c.type === 'wa' ? 0 : (c.type === 'wb' || c.type === 'salt') ? c.j : null; }
  function role(P) {                    // 'sa' | 'sb' | 'wa' | 'wb' | 'neutral' | 'cation' | 'anion' | 'amph'
    var c = P.c;
    if (c.type === 'salt') { var j = c.j, n = P.n; return (j === 0 && P.fam.z0 > 0) ? 'cation' : (j === n) ? 'anion' : (j === 0) ? 'wa' : 'amph'; }
    return c.type;
  }

  /* generic weak equilibrium: acid HA + H2O ⇌ H3O⁺ + A⁻ · base B + H2O ⇌ BH⁺ + OH⁻  (x-method with its checks) */
  function weakBranch(o) {
    var T = o.T, C = o.C, K = o.K, isAcid = o.kind === 'acid', Kn = o.Kname;
    var xa = Math.sqrt(K * C), ratio = xa / C * 100, x = quad(K, C), steps = [];
    var pHx = isAcid ? -lg(x) : 14 + lg(x);
    var eq = isAcid ? o.reactant + ' + H' + sub(2) + 'O ' + ARR + ' ' + HO + ' + ' + o.product
                    : o.reactant + ' + H' + sub(2) + 'O ' + ARR + ' ' + o.product + ' + ' + OHm;
    steps.push(st(T('stEq'), [eq, Kn + ' = ' + sci(K) + '  (p' + Kn + ' = ' + o.pK.toFixed(2) + ')', 'C = ' + E.fmtConc(C)]));
    steps.push(st(T('stIce'), [], null, {
      head: ['', o.reactant, isAcid ? HO : o.product, isAcid ? o.product : OHm],
      rows: [[T('iceI'), 'C', isAcid ? '\u2248 0' : '0', isAcid ? '0' : '\u2248 0'], [T('iceC'), MN + 'x', '+x', '+x'], [T('iceE'), 'C ' + MN + ' x', 'x', 'x']]
    }));
    steps.push(st(T('stExpr'), [Kn + ' = x\u00b2 / (C ' + MN + ' x) = ' + sci(K)]));
    steps.push(st(T('stApprox'), ['x \u2248 \u221a(' + Kn + ' \u00b7 C) = \u221a(' + sci(K) + ' \u00d7 ' + f(C) + ') = ' + sci(xa) + ' M', 'x / C = ' + pct(ratio) + ' %'],
      ratio < 5 ? T('nApproxOk', { r: pct(ratio) }) : T('nApproxBad', { r: pct(ratio) })));
    steps.push(st(T('stQuad'), ['x\u00b2 + ' + Kn + '\u00b7x ' + MN + ' ' + Kn + '\u00b7C = 0', 'x = [' + MN + Kn + ' + \u221a(' + Kn + '\u00b2 + 4\u00b7' + Kn + '\u00b7C)] / 2 = ' + sci(x) + ' M']));
    if (isAcid) steps.push(st(T('stPH'), ['pH = ' + MN + 'log x = ' + MN + 'log(' + sci(x) + ') = ' + pH2(pHx), 'pOH = 14 ' + MN + ' pH = ' + pH2(14 - pHx)]));
    else steps.push(st(T('stPHbase'), ['pOH = ' + MN + 'log x = ' + MN + 'log(' + sci(x) + ') = ' + pH2(-lg(x)), 'pH = 14 ' + MN + ' pOH = ' + pH2(pHx)]));
    return { steps: steps, pHx: pHx, x: x, xa: xa };
  }
  function exactStep(P, pHx) {
    var T = P.T, d = Math.abs(pHx - P.solI.pH);
    return st(T('stExact'), [], d < 0.005 ? T('nExactSame', { p: pH2(P.solI.pH) }) : T('nExactDiff', { p: pH2(P.solI.pH), d: d.toFixed(2) }));
  }
  function realStep(P) {
    var T = P.T, a = P.solI, b = P.solR;
    return st(T('stRealResult'), ['I = ' + f(b.I, 3) + ' M     \u03b3(z=\u00b11) = ' + f(b.gH, 3), 'pH(' + T('lblIdeal') + ') = ' + pH2(a.pH) + '    pH(' + T('lblReal') + ') = ' + pH2(b.pH) + '    \u0394pH = ' + sgn(b.pH - a.pH)],
      b.I > 0.5 ? T('nDaviesLimit') : null);
  }

  /* ======================= GENERAL (short) ======================= */
  function general(P) {
    var c = P.c, fam = P.fam, C = P.C, T = P.T, sol = P.solI, steps = [], r, n = P.n, forms = P.forms;
    if (c.type === 'sa') {
      steps.push(st(T('stSaDiss'), [c.f + ' + H' + sub(2) + 'O \u2192 ' + HO + ' + ' + c.anion]));
      if (C >= 1e-6) {
        steps.push(st(T('stConcH'), [br(HO) + ' = C = ' + E.fmtConc(C)]));
        steps.push(st(T('stPH'), ['pH = ' + MN + 'log' + br(HO) + ' = ' + MN + 'log(' + sci(C) + ') = ' + pH2(sol.pH), 'pOH = 14 ' + MN + ' pH = ' + pH2(sol.pOH)]));
      } else {
        steps.push(st(T('stWater'), [br(HO) + ' = [C + \u221a(C\u00b2 + 4\u00b7K' + sub('w') + ')] / 2 = ' + sci(sol.h) + ' M'], T('nWaterDil', { bad: pH2(-lg(C)) })));
        steps.push(st(T('stPH'), ['pH = ' + MN + 'log(' + sci(sol.h) + ') = ' + pH2(sol.pH), 'pOH = 14 ' + MN + ' pH = ' + pH2(sol.pOH)]));
      }
    } else if (c.type === 'sb') {
      steps.push(st(T('stSbDiss'), [c.f + ' \u2192 ' + c.cation + ' + ' + (c.n > 1 ? c.n + ' ' : '') + OHm]));
      if (C * c.n >= 1e-6) {
        steps.push(st(T('stConcOH'), [br(OHm) + ' = ' + (c.n > 1 ? c.n + '\u00b7' : '') + 'C = ' + sci(c.n * C) + ' M']));
        steps.push(st(T('stPHbase'), ['pOH = ' + MN + 'log' + br(OHm) + ' = ' + pH2(sol.pOH), 'pH = 14 ' + MN + ' pOH = ' + pH2(sol.pH)]));
      } else {
        steps.push(st(T('stWater'), [br(OHm) + ' = [c + \u221a(c\u00b2 + 4\u00b7K' + sub('w') + ')] / 2 = ' + sci(sol.oh) + ' M  (c = ' + sci(c.n * C) + ')'], T('nWaterDil', { bad: pH2(14 + lg(c.n * C)) })));
        steps.push(st(T('stPHbase'), ['pOH = ' + pH2(sol.pOH), 'pH = 14 ' + MN + ' pOH = ' + pH2(sol.pH)]));
      }
    } else if (c.type === 'neutral') {
      steps.push(st(T('stSaltIons'), [c.diss]));
      steps.push(st(T('stSaltBehave'), [], T('nSpectCat') + ' ' + T('nSpectAn')));
      steps.push(st(T('stNeutral'), [br(HO) + ' = ' + br(OHm) + ' = \u221aK' + sub('w') + ' = ' + sci(1e-7) + ' M', 'pH = 7.00'], T('nNeutralSalt')));
    } else if (c.type === 'wa' && c.strongH) {
      var K2 = Math.pow(10, -fam.pKa[0]), y = (-(C + K2) + Math.sqrt((C + K2) * (C + K2) + 4 * K2 * C)) / 2, pHy = -lg(C + y);
      steps.push(st(T('stFirstH'), [c.f + ' + H' + sub(2) + 'O \u2192 ' + HO + ' + ' + forms[0], br(HO) + sub(1) + ' = C = ' + E.fmtConc(C)]));
      steps.push(st(T('stSecondH'), [forms[0] + ' + H' + sub(2) + 'O ' + ARR + ' ' + HO + ' + ' + forms[1], 'Ka' + sub(2) + ' = ' + sci(K2) + '  (pKa' + sub(2) + ' = ' + fam.pKa[0].toFixed(2) + ')', 'Ka' + sub(2) + ' = (C + y)\u00b7y / (C ' + MN + ' y)']));
      steps.push(st(T('stQuad'), ['y\u00b2 + (C + Ka' + sub(2) + ')\u00b7y ' + MN + ' Ka' + sub(2) + '\u00b7C = 0', 'y = ' + sci(y) + ' M', br(HO) + ' = C + y = ' + sci(C + y) + ' M']));
      steps.push(st(T('stPH'), ['pH = ' + MN + 'log(' + sci(C + y) + ') = ' + pH2(pHy)]));
      steps.push(exactStep(P, pHy));
    } else if (c.type === 'wa') {
      var K1 = Math.pow(10, -fam.pKa[0]);
      if (n === 1) { r = weakBranch({ T: T, C: C, K: K1, pK: fam.pKa[0], kind: 'acid', Kname: 'Ka', reactant: forms[0], product: forms[1] }); steps = r.steps; steps.push(exactStep(P, r.pHx)); }
      else {
        var eqL = [], i;
        for (i = 0; i < n; i++) eqL.push(forms[i] + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[i + 1] + ' + ' + HO + '   pKa' + sub(i + 1) + ' = ' + fam.pKa[i].toFixed(2));
        steps.push(st(T('stEq'), eqL));
        r = weakBranch({ T: T, C: C, K: K1, pK: fam.pKa[0], kind: 'acid', Kname: 'Ka' + sub(1), reactant: forms[0], product: forms[1] });
        var s1 = r.steps.slice(1); s1[0].title = T('stStage1') + ' \u2014 ' + s1[0].title; steps = steps.concat(s1);
        var K2p = Math.pow(10, -fam.pKa[1]), rk = K1 / K2p, rel = K2p / r.x;
        steps.push(st(T('stStage2'), ['Ka' + sub(1) + ' / Ka' + sub(2) + ' = ' + sci(rk), br(forms[2]) + ' \u2248 Ka' + sub(2) + ' = ' + sci(K2p) + ' M', 'Ka' + sub(2) + ' / ' + br(HO) + ' = ' + (rel < 0.01 ? sci(rel) : rel.toFixed(2))],
          (rk >= 1e3 ? T('nStageDom', { r: sci(rk) }) : T('nStageOverlap', { r: sci(rk) })) + ' ' + (rel < 0.05 ? T('nStage2Small', { y: sci(K2p) }) : T('nStage2Big', { y: sci(K2p) }))));
        steps.push(exactStep(P, r.pHx));
      }
    } else if (c.type === 'wb') {
      var pKa = fam.pKa[0], pKb = 14 - pKa, Kb = Math.pow(10, -pKb);
      steps.push(st(T('stKconv'), ['pKb = 14 ' + MN + ' pKa(' + forms[0] + ') = 14 ' + MN + ' ' + pKa.toFixed(2) + ' = ' + pKb.toFixed(2), 'Kb = 10<sup>' + MN + pKb.toFixed(2) + '</sup> = ' + sci(Kb)], T('nKconv')));
      r = weakBranch({ T: T, C: C, K: Kb, pK: pKb, kind: 'base', Kname: 'Kb', reactant: forms[1], product: forms[0] });
      steps = steps.concat(r.steps); steps.push(exactStep(P, r.pHx));
    } else if (c.type === 'salt') {
      var j = c.j, ion = forms[j], rl = role(P);
      steps.push(st(T('stSaltIons'), [c.diss]));
      if (rl === 'cation' || rl === 'wa') {
        steps.push(st(T('stSaltBehave'), [], (fam.z0 > 0 ? T('nSpectAn') : T('nSpectCat')) + ' ' + T('nIonAcid', { ion: ion })));
        r = weakBranch({ T: T, C: C, K: Math.pow(10, -fam.pKa[0]), pK: fam.pKa[0], kind: 'acid', Kname: 'Ka', reactant: forms[0], product: forms[1] });
        steps = steps.concat(r.steps); steps.push(exactStep(P, r.pHx));
      } else if (rl === 'anion') {
        var pKaN = fam.pKa[n - 1], pKbN = 14 - pKaN, KbN = Math.pow(10, -pKbN);
        steps.push(st(T('stSaltBehave'), [], T('nSpectCat') + ' ' + T('nIonBase', { ion: ion })));
        steps.push(st(T('stKconv'), ['Kb = Kw / Ka = 10<sup>' + MN + '14</sup> / ' + sci(Math.pow(10, -pKaN)) + ' = ' + sci(KbN) + '   (pKb = ' + pKbN.toFixed(2) + ')'], T('nKconv')));
        r = weakBranch({ T: T, C: C, K: KbN, pK: pKbN, kind: 'base', Kname: 'Kb', reactant: ion, product: forms[n - 1] });
        steps = steps.concat(r.steps); steps.push(exactStep(P, r.pHx));
      } else {
        var pa = fam.pKa[j - 1], pb = fam.pKa[j], avg = (pa + pb) / 2;
        steps.push(st(T('stSaltBehave'), [], T('nSpectCat') + ' ' + T('nIonAmph', { ion: ion })));
        steps.push(st(T('stAmph'), [ion + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[j + 1] + ' + ' + HO + '   pKa = ' + pb.toFixed(2),
          ion + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[j - 1] + ' + ' + OHm + '   (pKa ' + forms[j - 1] + '/' + ion + ' = ' + pa.toFixed(2) + ')',
          'pH \u2248 \u00bd(' + pa.toFixed(2) + ' + ' + pb.toFixed(2) + ') = ' + pH2(avg)], T('nAmphFormula')));
        steps.push(exactStep(P, avg));
      }
    }
    steps.push(realStep(P));
    return steps;
  }

  /* ======================= DETAILED ======================= */
  function pbeStrings(P) {
    var c = P.c, forms = P.forms, rl = role(P), j, lhs = [], rhs = [];
    if (rl === 'sa') { lhs = [HO]; rhs = [OHm, br(c.anion)]; }
    else if (rl === 'sb') { lhs = [OHm]; rhs = [HO, (c.zS > 1 ? c.zS : '') + br(c.cation)]; }
    else if (rl === 'neutral') { lhs = [HO]; rhs = [OHm]; }
    else {
      var j0 = j0Of(c), shift = c.strongH || 0; lhs = [HO]; rhs = [OHm];
      for (j = 0; j < forms.length; j++) {
        if (j < j0) lhs.push((j0 - j > 1 ? j0 - j : '') + br(forms[j]));
        else if (j > j0 || shift) { var w = j - j0 + shift; if (w > 0) rhs.push((w > 1 ? w : '') + br(forms[j])); }
      }
    }
    return { lhs: lhs.join(' + '), rhs: rhs.join(' + ') };
  }

  function dIdentify(P) {
    var c = P.c, T = P.T, fam = P.fam, rl = role(P), forms = P.forms, n = P.n, out = [], sol = P.sol, i;
    var lines = [c.f + (P.name ? ' \u2014 ' + P.name : '')], note = null;
    if (c.strongH) { lines.push('pKa' + sub(1) + ' \u2248 ' + c.pKaS + ' < \u22121.74   \u2192 ' + T('lblStrong'), 'pKa' + sub(2) + ' = ' + fam.pKa[0].toFixed(2) + '   \u2192 ' + T('lblWeak')); note = T('nSulfuric'); }
    else if (rl === 'sa') { lines.push('pKa(' + c.f + ') \u2248 ' + c.pKaS + '  <  pKa(' + HO + ') = \u22121.74   \u2192 ' + T('lblStrong')); note = T('nLevel'); }
    else if (rl === 'sb') { lines.push(c.f + ' \u2192 ' + c.cation + ' + ' + (c.n > 1 ? c.n + ' ' : '') + OHm + '   \u2192 ' + T('lblStrong')); note = T('nStrongBase') + (c.sol ? ' ' + T('warnSol', { c: c.sol, f: c.f.replace(/<[^>]+>/g, '') }) : ''); }
    else if (rl === 'wa') { lines.push('\u22121.74  <  pKa = ' + fam.pKa[0].toFixed(2) + '  <  15.74   \u2192 ' + T('lblWeak')); note = T('nWeakAcid'); }
    else if (rl === 'wb') { lines.push('pKa(' + forms[0] + ') = ' + fam.pKa[0].toFixed(2) + '   \u2192   pKb = 14 ' + MN + ' ' + fam.pKa[0].toFixed(2) + ' = ' + (14 - fam.pKa[0]).toFixed(2) + '   \u2192 ' + T('lblWeak')); note = T('nWeakBase'); }
    else if (rl === 'neutral') { lines.push(c.diss, 'Na<sup>+</sup>: ' + T('lblSpecCat'), 'Cl<sup>\u2212</sup>: ' + T('lblSpecAn')); note = T('nNeutralIons'); }
    else {
      lines.push(c.diss);
      if (rl === 'cation' || rl === 'wa') { lines.push(forms[0] + ': pKa = ' + fam.pKa[0].toFixed(2) + '  \u2192 ' + T('nIonAcid', { ion: forms[0] })); }
      else if (rl === 'anion') { lines.push(forms[n] + ': ' + T('lblConjOf') + ' ' + forms[n - 1] + ' (pKa = ' + fam.pKa[n - 1].toFixed(2) + ')  \u2192  pKb = ' + (14 - fam.pKa[n - 1]).toFixed(2)); }
      else { lines.push(forms[c.j] + ': pKa = ' + fam.pKa[c.j].toFixed(2) + ' (' + T('lblAcidSide') + ') \u00b7 pKa = ' + fam.pKa[c.j - 1].toFixed(2) + ' (' + T('lblBaseSide') + ')'); }
      note = (rl === 'cation' || rl === 'wa') ? (fam.z0 > 0 ? T('nSpectAn') : T('nSpectCat')) + ' ' + T('nIonAcid', { ion: forms[c.j] }) : rl === 'anion' ? T('nSpectCat') + ' ' + T('nIonBase', { ion: forms[c.j] }) : T('nSpectCat') + ' ' + T('nIonAmph', { ion: forms[c.j] });
    }
    out.push(st(T('stIdent'), lines, note, null, 'secIdent'));

    // species
    var present = [], sp = specItems(P), dom = -1, best = 0;
    if (fam) for (i = 0; i < forms.length; i++) { present.push(forms[i]); if (sol.conc[i] > best) { best = sol.conc[i]; dom = i; } }
    if (rl === 'sa') present.push(c.anion);
    if (rl === 'sb') present.push(c.cation);
    sp.forEach(function (s) { if (present.indexOf(s.label) < 0) present.push(s.label); });
    present.push(HO, OHm, 'H' + sub(2) + 'O');
    var l2 = [T('lblPresent') + ': ' + present.join(',  ')];
    if (dom >= 0) l2.push(T('lblDominant') + ': ' + forms[dom] + ' (' + pct(sol.alpha[dom] * 100) + ' %)');
    if (rl === 'sa') l2.push(T('lblAbsent') + ': ' + c.f + ' (' + T('lblUndiss') + ')');
    out.push(st(T('stSpecies'), l2, null));

    // reactions with water
    var rx = ['2 H' + sub(2) + 'O ' + ARR + ' ' + HO + ' + ' + OHm + '    Kw = ' + sci(1e-14) + '  (pKw = 14.00)'];
    if (rl === 'sa') rx.unshift(c.f + ' + H' + sub(2) + 'O \u2192 ' + HO + ' + ' + c.anion);
    else if (rl === 'sb') rx.unshift(c.f + ' \u2192 ' + c.cation + ' + ' + (c.n > 1 ? c.n + ' ' : '') + OHm);
    else if (rl === 'neutral') { rx.unshift(c.diss); }
    else {
      if (c.strongH) rx.unshift(c.f + ' + H' + sub(2) + 'O \u2192 ' + HO + ' + ' + forms[0]);
      if (c.type === 'salt' && c.diss) rx.unshift(c.diss);
      for (i = 0; i < n; i++) rx.splice(rx.length - 1, 0, forms[i] + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[i + 1] + ' + ' + HO + '    Ka' + (n > 1 ? sub(i + 1) : '') + ' = ' + sci(Math.pow(10, -fam.pKa[i])));
    }
    out.push(st(T('stReactions'), rx, null));
    return out;
  }

  function dConstants(P) {
    var T = P.T, fam = P.fam, n = P.n, lines = ['Kw = ' + sci(1e-14) + '   (pKw = 14.00, 25 \u00b0C)'], i;
    if (fam) {
      for (i = 0; i < n; i++) lines.push('Ka' + (n > 1 ? sub(i + 1) : '') + ' = ' + sci(Math.pow(10, -fam.pKa[i])) + '    pKa' + (n > 1 ? sub(i + 1) : '') + ' = ' + fam.pKa[i].toFixed(2));
      var rl = role(P);
      if (rl === 'wb' || rl === 'anion') { var pk = rl === 'wb' ? fam.pKa[0] : fam.pKa[n - 1]; lines.push('Kb = Kw / Ka = ' + sci(Math.pow(10, -(14 - pk))) + '    pKb = 14 ' + MN + ' pKa = ' + (14 - pk).toFixed(2)); }
      if (n > 1) lines.push('Ka' + sub(1) + ' / Ka' + sub(2) + ' = ' + sci(Math.pow(10, fam.pKa[1] - fam.pKa[0])));
    } else lines.push(T('lblNoK'));
    return [st(T('stConsts'), lines, T('nConstsBasis'), null, 'secConst')];
  }

  function dSystem(P) {
    var T = P.T, c = P.c, fam = P.fam, forms = P.forms, n = P.n, sol = P.sol, out = [], i, rl = role(P);
    var unk = [HO, OHm], eq = ['Kw: ' + br(HO) + br(OHm) + ' = Kw'];
    if (fam) {
      forms.forEach(function (fl) { unk.push(fl); });
      for (i = 0; i < n; i++) eq.push('Ka' + (n > 1 ? sub(i + 1) : '') + ': ' + br(HO) + br(forms[i + 1]) + ' / ' + br(forms[i]) + ' = Ka' + (n > 1 ? sub(i + 1) : ''));
      eq.push(T('lblMass') + ': C = ' + forms.map(br).join(' + ') + ' = ' + E.fmtConc(P.C));
    } else if (rl === 'sa') { unk.push(c.anion); eq.push(T('lblMass') + ': ' + br(c.anion) + ' = C = ' + E.fmtConc(P.C)); }
    else if (rl === 'sb') { unk.push(c.cation); eq.push(T('lblMass') + ': ' + br(c.cation) + ' = ' + (c.zS > 1 ? 'C' : 'C') + ' = ' + E.fmtConc(P.C)); }
    else { unk.push('Na<sup>+</sup>', 'Cl<sup>\u2212</sup>'); eq.push(T('lblMass') + ': ' + br('Na<sup>+</sup>') + ' = C', br('Cl<sup>\u2212</sup>') + ' = C'); }
    specItems(P).forEach(function (s) { if (fam) { unk.push(s.label); eq.push(T('lblSpec') + ': ' + br(s.label) + ' = ' + f(s.c / P.C, 3) + '\u00b7C'); } });
    var cs = chargeStrings(P); eq.push(T('lblCharge') + ': ' + cs.lhs + ' = ' + cs.rhs);
    out.push(st(T('stUnknowns'), [unk.map(br).join(',   '), T('lblCount') + ': ' + unk.length], T('nUnknowns') + (c.strongH ? ' ' + T('nSulfuricIons') : ''), null, 'secSystem'));
    out.push(st(T('stEquations'), eq, T('nEqCount', { k: eq.length, u: unk.length })));
    var pb = pbeStrings(P);
    out.push(st(T('stPBE'), [pb.lhs + ' = ' + pb.rhs], T('nPBE')));
    return out;
  }

  function methodsTable(P, rows) {
    var T = P.T, ex = P.solI.pH;
    return { head: [T('colMethod'), T('colFormula'), 'pH', '\u0394pH'], rows: rows.map(function (r) { return [r[0], r[1], pH3(r[2]), sgn(r[2] - ex)]; }) };
  }

  function dSolveMono(P, kind, K, pK, Kname, C) {
    var T = P.T, sol = P.solI, out = [], isAcid = kind === 'acid', v = isAcid ? sol.h : sol.oh, X = isAcid ? HO : OHm, y = isAcid ? OHm : HO;
    var Y = isAcid ? 'A<sup>\u2212</sup>' : 'BH<sup>+</sup>', Ho = isAcid ? 'HA' : 'B';
    var x = quad(K, C), xa = Math.sqrt(K * C), pq = isAcid ? -lg(x) : 14 + lg(x), pa = isAcid ? -lg(xa) : 14 + lg(xa);
    out.push(st(T('stCombine'), [
      br(Y) + ' = ' + br(X) + ' ' + MN + ' ' + br(y) + ' = ' + (isAcid ? 'h ' + MN + ' Kw/h' : 'o ' + MN + ' Kw/o') + '       (' + T('lblFromPBE') + ')',
      br(Ho) + ' = C ' + MN + ' ' + br(Y) + ' = C ' + MN + ' ' + (isAcid ? 'h' : 'o') + ' + Kw/' + (isAcid ? 'h' : 'o'),
      Kname + ' = ' + (isAcid ? 'h' : 'o') + '\u00b7(' + (isAcid ? 'h' : 'o') + ' ' + MN + ' Kw/' + (isAcid ? 'h' : 'o') + ') / (C ' + MN + ' ' + (isAcid ? 'h' : 'o') + ' + Kw/' + (isAcid ? 'h' : 'o') + ')',
      (isAcid ? 'h' : 'o') + '\u00b3 + ' + Kname + '\u00b7' + (isAcid ? 'h' : 'o') + '\u00b2 ' + MN + ' (Kw + ' + Kname + '\u00b7C)\u00b7' + (isAcid ? 'h' : 'o') + ' ' + MN + ' ' + Kname + '\u00b7Kw = 0',
      (isAcid ? 'h' : 'o') + '\u00b3 + ' + sci(K) + '\u00b7' + (isAcid ? 'h' : 'o') + '\u00b2 ' + MN + ' ' + sci(1e-14 + K * C) + '\u00b7' + (isAcid ? 'h' : 'o') + ' ' + MN + ' ' + sci(K * 1e-14) + ' = 0'
    ], T('nCubic')));
    out.push(st(T('stSolveNum'), [(isAcid ? 'h' : 'o') + ' = ' + sci(v, 5) + ' M      \u2192      ' + (isAcid ? 'pH = ' + pH3(sol.pH) : 'pOH = ' + pH3(sol.pOH) + ',  pH = ' + pH3(sol.pH))], T('nNumeric')));
    var rows = [[T('mExact'), T('mCubic'), sol.pH], [T('mQuad'), Kname + 'C \u226b Kw \u2192 x\u00b2 + ' + Kname + 'x ' + MN + ' ' + Kname + 'C = 0', pq], [T('mSqrt'), 'x = \u221a(' + Kname + '\u00b7C)', pa]];
    var cond = [Kname + '\u00b7C / Kw = ' + sci(K * C / 1e-14) + '   ' + ok(1e-14 * 10 / (K * C), 1) + '  (\u2265 10)', 'C / ' + Kname + ' = ' + sci(C / K) + '   ' + ok(400 / (C / K), 1) + '  (\u2265 400)'];
    out.push(st(T('stSimplify'), cond, T('nApproxSummary'), methodsTable(P, rows)));
    return out;
  }

  function dSolve(P) {
    var T = P.T, c = P.c, fam = P.fam, C = P.C, sol = P.solI, rl = role(P), out = [], n = P.n, forms = P.forms, j;
    if (rl === 'sa' && !c.strongH) {
      var hx = (C + Math.sqrt(C * C + 4e-14)) / 2;
      out.push(st(T('stCombine'), [br(HO) + ' = ' + br(OHm) + ' + C', br(OHm) + ' = Kw / ' + br(HO), 'h = C + Kw / h', 'h\u00b2 ' + MN + ' C\u00b7h ' + MN + ' Kw = 0', 'h = [C + \u221a(C\u00b2 + 4Kw)] / 2 = ' + sci(hx, 5) + ' M'], T('nStrongQuad'), null, 'secSolve'));
      out.push(st(T('stSimplify'), ['C ' + (C >= 1e-6 ? '\u226b' : '\u2248') + ' \u221aKw = 10<sup>' + MN + '7</sup>   (C = ' + sci(C) + ')'], T('nApproxSummary'),
        methodsTable(P, [[T('mExact'), 'h = [C + \u221a(C\u00b2 + 4Kw)]/2', -lg(hx)], [T('mSimple'), 'h = C', -lg(C)]])));
    } else if (rl === 'sb') {
      var cc = c.n * C, ox = (cc + Math.sqrt(cc * cc + 4e-14)) / 2;
      out.push(st(T('stCombine'), [br(OHm) + ' = ' + br(HO) + ' + ' + (c.zS > 1 ? c.zS + '\u00b7' : '') + 'C', br(HO) + ' = Kw / ' + br(OHm), 'o\u00b2 ' + MN + ' c\u00b7o ' + MN + ' Kw = 0   (c = ' + sci(cc) + ')', 'o = [c + \u221a(c\u00b2 + 4Kw)] / 2 = ' + sci(ox, 5) + ' M'], T('nStrongQuad'), null, 'secSolve'));
      out.push(st(T('stSimplify'), ['c ' + (cc >= 1e-6 ? '\u226b' : '\u2248') + ' \u221aKw = 10<sup>' + MN + '7</sup>'], T('nApproxSummary'),
        methodsTable(P, [[T('mExact'), 'o = [c + \u221a(c\u00b2 + 4Kw)]/2', 14 + lg(ox)], [T('mSimple'), 'o = c', 14 + lg(cc)]])));
    } else if (rl === 'neutral') {
      out.push(st(T('stCombine'), [br(HO) + ' = ' + br(OHm), 'h\u00b2 = Kw', 'h = \u221aKw = ' + sci(1e-7) + ' M', 'pH = 7.000'], T('nNeutralSalt'), null, 'secSolve'));
    } else if (c.strongH) {
      var K2 = Math.pow(10, -fam.pKa[0]), y = (-(C + K2) + Math.sqrt((C + K2) * (C + K2) + 4 * K2 * C)) / 2;
      out.push(st(T('stCombine'), [T('stFirstH') + ':  ' + br(HO) + sub(1) + ' = C = ' + E.fmtConc(C), T('stSecondH') + ':  Ka' + sub(2) + ' = (C + y)\u00b7y / (C ' + MN + ' y)', 'y\u00b2 + (C + Ka' + sub(2) + ')\u00b7y ' + MN + ' Ka' + sub(2) + '\u00b7C = 0', 'y = ' + sci(y, 5) + ' M      ' + br(HO) + ' = C + y = ' + sci(C + y, 5) + ' M'], T('nSulfuricSolve'), null, 'secSolve'));
      out.push(st(T('stSimplify'), [], T('nApproxSummary'), methodsTable(P, [[T('mExact'), T('mFull'), sol.pH], [T('mSimple'), 'h = C (' + T('lblIgnore2') + ')', -lg(C)], [T('mTwoStage'), 'h = C + y', -lg(C + y)]])));
    } else if (rl === 'wa' && n === 1) {
      dSolveMono(P, 'acid', Math.pow(10, -fam.pKa[0]), fam.pKa[0], 'Ka', C).forEach(function (s, i) { if (!i) s.sec = 'secSolve'; out.push(s); });
    } else if (rl === 'wb') {
      var pKb = 14 - fam.pKa[0];
      dSolveMono(P, 'base', Math.pow(10, -pKb), pKb, 'Kb', C).forEach(function (s, i) { if (!i) s.sec = 'secSolve'; out.push(s); });
    } else if (rl === 'cation') {
      dSolveMono(P, 'acid', Math.pow(10, -fam.pKa[0]), fam.pKa[0], 'Ka', C).forEach(function (s, i) { if (!i) s.sec = 'secSolve'; out.push(s); });
    } else if (rl === 'anion') {
      var pKbn = 14 - fam.pKa[n - 1];
      dSolveMono(P, 'base', Math.pow(10, -pKbn), pKbn, 'Kb', C).forEach(function (s, i) { if (!i) s.sec = 'secSolve'; out.push(s); });
    } else if (rl === 'amph') {
      var J = c.j, K1 = Math.pow(10, -fam.pKa[J - 1]), K2a = Math.pow(10, -fam.pKa[J]), hf = Math.sqrt(K1 * (K2a * C + 1e-14) / (K1 + C)), avg = (fam.pKa[J - 1] + fam.pKa[J]) / 2;
      var HA = forms[J], H2A = forms[J - 1], A2 = forms[J + 1];
      out.push(st(T('stCombine'), [br(HO) + ' + ' + br(H2A) + ' = ' + br(A2) + ' + ' + br(OHm) + '      (PBE)',
        br(H2A) + ' = h\u00b7' + br(HA) + ' / K' + sub(1) + ',     ' + br(A2) + ' = K' + sub(2) + '\u00b7' + br(HA) + ' / h,     ' + br(HA) + ' \u2248 C',
        'h\u00b2\u00b7(1 + C/K' + sub(1) + ') = K' + sub(2) + '\u00b7C + Kw',
        'h = \u221a[ K' + sub(1) + '(K' + sub(2) + '\u00b7C + Kw) / (K' + sub(1) + ' + C) ] = ' + sci(hf, 5) + ' M',
        'K' + sub(1) + ' = ' + sci(K1) + ',   K' + sub(2) + ' = ' + sci(K2a)], T('nAmphDerive'), null, 'secSolve'));
      var cond2 = ['C \u226b K' + sub(1) + ':  C / K' + sub(1) + ' = ' + sci(C / K1) + '   ' + ok(10 / (C / K1), 1), 'K' + sub(2) + '\u00b7C \u226b Kw:  K' + sub(2) + 'C / Kw = ' + sci(K2a * C / 1e-14) + '   ' + ok(10 / (K2a * C / 1e-14), 1)];
      out.push(st(T('stSimplify'), cond2, T('nApproxSummary') + (c.cat === 'bio' ? ' ' + T('nIsoelectric') : ''),
        methodsTable(P, [[T('mExact'), T('mFull'), sol.pH], [T('mAmphFull'), 'h = \u221a[K\u2081(K\u2082C + Kw)/(K\u2081 + C)]', -lg(hf)], [T('mAmphSimple'), 'pH = \u00bd(pK' + sub(1) + ' + pK' + sub(2) + ')', avg]])));
    } else {                                                           // polyprotic acid
      var Ks = fam.pKa.map(function (p) { return Math.pow(10, -p); }), K1p = Ks[0], x1 = quad(K1p, C), x1a = Math.sqrt(K1p * C);
      var Dstr = 'h' + '<sup>' + n + '</sup>' + Ks.map(function (k, i) { return ' + K' + sub(1) + (i ? '\u22ef' + 'K' + sub(i + 1) : '') + '\u00b7h' + (n - i - 1 > 1 ? '<sup>' + (n - i - 1) + '</sup>' : n - i - 1 === 1 ? '' : ''); }).join('');
      out.push(st(T('stFractions'), ['\u03b1' + sub('j') + ' = K' + sub(1) + '\u22efK' + sub('j') + '\u00b7h' + '<sup>n\u2212j</sup> / D(h),    D = h<sup>n</sup> + K' + sub(1) + 'h<sup>n\u22121</sup> + \u22ef + K' + sub(1) + '\u22efK' + sub('n'), T('lblN') + ' = ' + n + ',   j = ' + T('lblProtonsLost')], T('nFractions'), null, 'secSolve'));
      out.push(st(T('stCombine'), ['h ' + MN + ' Kw/h = C \u00b7 \u03a3 j\u00b7\u03b1' + sub('j') + '(h)    (PBE)', T('lblDegree') + ' ' + (n + 2) + ' ' + T('lblInH')], T('nPolyNumeric')));
      out.push(st(T('stSolveNum'), ['h = ' + sci(sol.h, 5) + ' M      pH = ' + pH3(sol.pH)], T('nNumeric')));
      var rk = K1p / Ks[1], cond3 = ['Ka' + sub(1) + ' / Ka' + sub(2) + ' = ' + sci(rk) + '   ' + ok(1e3 / rk, 1) + '  (\u2265 10\u00b3)', 'C / Ka' + sub(1) + ' = ' + sci(C / K1p) + '   ' + ok(400 / (C / K1p), 1) + '  (\u2265 400)'];
      out.push(st(T('stSimplify'), cond3, T('nApproxSummary'), methodsTable(P, [[T('mExact'), T('mFull'), sol.pH], [T('mStage1'), 'Ka' + sub(1) + ': x\u00b2 + Ka' + sub(1) + 'x ' + MN + ' Ka' + sub(1) + 'C = 0', -lg(x1)], [T('mSqrt'), 'x = \u221a(Ka' + sub(1) + '\u00b7C)', -lg(x1a)]])));
    }
    return out;
  }

  function speciesTable(P, sol) {
    var T = P.T, fam = P.fam, rows = [], forms = P.forms, j, tot = P.C || 1;
    rows.push([HO, sci(sol.h), '\u2014', pH3(-lg(sol.h))]);
    rows.push([OHm, sci(sol.oh), '\u2014', pH3(-lg(sol.oh))]);
    if (fam) for (j = 0; j < forms.length; j++) rows.push([forms[j], sci(Math.max(sol.conc[j], 1e-300)), pct(sol.alpha[j] * 100) + ' %', pH3(-lg(Math.max(sol.conc[j], 1e-300)))]);
    specItems(P).forEach(function (s) { rows.push([s.label, sci(s.c), '\u2014', pH3(-lg(s.c))]); });
    return { head: [T('colSpecies'), T('colConc'), T('colFrac'), 'pC'], rows: rows };
  }
  function dResult(P) {
    var T = P.T, sol = P.sol, j0 = j0Of(P.c), out = [], lines = ['pH = ' + pH3(sol.pH) + '      pOH = ' + pH3(sol.pOH), br(HO) + ' = ' + sci(sol.h, 4) + ' M      ' + br(OHm) + ' = ' + sci(sol.oh, 4) + ' M', T('lblModel') + ': ' + T(P.model === 'real' ? 'lblReal' : 'lblIdeal')];
    if (P.fam && j0 !== null) lines.push(T(role(P) === 'amph' || role(P) === 'anion' || role(P) === 'cation' ? 'resHydro' : 'resIonize') + ': \u03b1 = ' + pct((1 - sol.alpha[j0]) * 100) + ' %');
    out.push(st(T('stResultAll'), lines, null, speciesTable(P, sol), 'secResult'));
    return out;
  }

  function dVerify(P) {
    var T = P.T, sol = P.sol, r = E.residuals(P.sys, sol), rows = [];
    rows.push([T('lblChargeSum'), sci(r.posTotal, 5) + '  vs  ' + sci(r.negTotal, 5), sci(Math.max(r.chargeRel, r.ledgerChargeRel, 1e-300), 1), ok(Math.max(r.chargeRel, r.ledgerChargeRel), 1e-9)]);
    rows.push([T('lblILedger'), sci(sol.I, 5) + '  vs  \u00bd\u03a3c\u00b7z\u00b2 = ' + sci(E.ionicStrength(sol.ions), 5), sci(Math.max(r.IledgerRel, 1e-300), 1), ok(r.IledgerRel, 1e-12)]);
    if (P.fam) rows.push([T('lblMass'), f(sol.conc.reduce(function (a, b) { return a + b; }, 0), 6) + '  vs  C = ' + f(P.C, 6), sci(Math.max(r.massRel, 1e-300), 1), ok(r.massRel, 1e-12)]);
    r.K.forEach(function (k) { rows.push(['Ka' + (P.n > 1 ? sub(k.j) : ''), sci(k.obs, 5) + '  vs  ' + sci(k.th, 5), sci(Math.max(k.rel, 1e-300), 1), ok(k.rel, 1e-6)]); });
    rows.push(['Kw', sci(r.Kw.obs, 5) + '  vs  ' + sci(1e-14, 5), sci(Math.max(r.Kw.rel, 1e-300), 1), ok(r.Kw.rel, 1e-9)]);
    return [st(T('stVerify'), [], T('nVerify'), { head: [T('colCheck'), T('colObsTh'), T('colRel'), ''], rows: rows }, 'secVerify')];
  }

  function dInterpret(P) {
    var T = P.T, c = P.c, fam = P.fam, C = P.C, sol = P.sol, out = [], rl = role(P), act = P.model === 'real' ? { act: true } : null;
    var fac = Math.pow(10, 7 - sol.pH);
    var l1 = [br(HO) + ' / 10<sup>' + MN + '7</sup> = 10<sup>(7 ' + MN + ' pH)</sup> = ' + sci(fac, 3), T('lblIonsPerL') + ': ' + sci(sol.h * 6.02214076e23, 3) + ' ' + HO + ' / L'];
    out.push(st(T('stMeaning'), l1, T('nMeaning'), null, 'secInterpret'));
    var down = E.solve(E.systemFor(c, fam, C / 10), act), up = E.solve(E.systemFor(c, fam, C * 10), act), j0 = j0Of(c), l2 = [];
    l2.push('C \u2192 C/10:   pH ' + pH3(sol.pH) + ' \u2192 ' + pH3(down.pH) + '   (\u0394pH = ' + sgn(down.pH - sol.pH) + ')');
    l2.push('C \u2192 10\u00b7C:   pH ' + pH3(sol.pH) + ' \u2192 ' + pH3(up.pH) + '   (\u0394pH = ' + sgn(up.pH - sol.pH) + ')');
    if (fam && j0 !== null) l2.push('\u03b1(C) = ' + pct((1 - sol.alpha[j0]) * 100) + ' %  \u2192  \u03b1(C/10) = ' + pct((1 - down.alpha[j0]) * 100) + ' %');
    out.push(st(T('stDilute'), l2, T(rl === 'sa' || rl === 'sb' ? 'nDiluteStrong' : rl === 'amph' || rl === 'neutral' ? 'nDiluteAmph' : 'nDiluteWeak')));
    return out;
  }

  function dReal(P) {
    var T = P.T, a = P.solI, b = P.solR, out = [], z, rows = [];
    // ionic strength breakdown — the rows ARE the engine's ion ledger, so the column sum is exactly the I that was used
    var parts = [], tot = 0;
    b.ions.forEach(function (ion) {
      var label = ion.k === 'H' ? HO : ion.k === 'OH' ? OHm : ion.k === 'sp' ? P.forms[ion.j] : ion.label, t = 0.5 * ion.c * ion.z * ion.z;
      tot += t; parts.push([label, sci(Math.max(ion.c, 1e-300), 3), String(ion.z), sci(Math.max(t, 1e-300), 3)]);
    });
    var iLedger = E.ionicStrength(b.ions), iOk = Math.abs(iLedger - b.I) <= 1e-12 * Math.max(b.I, 1e-300) && Math.abs(tot - b.I) <= 1e-9 * Math.max(b.I, 1e-300);
    out.push(st(T('stRealIons'), ['I = \u00bd \u03a3 c' + sub('i') + '\u00b7z' + sub('i') + '\u00b2 = ' + sci(tot, 4) + ' M', T('lblILedger') + ': ' + sci(b.I, 4) + ' M   ' + (iOk ? '\u2713' : '\u2717') + '    ' + T('lblIUsed') + ': ' + sci(b.Iused, 4) + ' M'], T('nIonic') + ' ' + T('nIonicLedger') + (P.c.strongH ? ' ' + T('nSulfuricIons') : ''), { head: [T('colSpecies'), 'c (M)', 'z', '\u00bd c z\u00b2'], rows: parts }, 'secReal'));
    var A = E.A_DAV, I = b.I, s = Math.sqrt(I);
    var gl = ['log \u03b3 = ' + MN + A + '\u00b7z\u00b2\u00b7(\u221aI/(1+\u221aI) ' + MN + ' 0.3\u00b7I)     (Davies, 25 \u00b0C)', 'I = ' + sci(I, 4) + ' M:   \u221aI/(1+\u221aI) = ' + (I > 0 ? (s / (1 + s)).toFixed(4) : '0')];
    [1, 2, 3].forEach(function (zz) { if (I > 0) gl.push('\u03b3(z = \u00b1' + zz + ') = ' + E.gamma(zz, I).toFixed(4)); });
    out.push(st(T('stGamma'), gl, I > 0.5 ? T('nDaviesLimit') : T('nDavies')));
    var cl = ['Kw\u2032 = Kw / (\u03b3' + sub('H') + '\u00b7\u03b3' + sub('OH') + ') = ' + sci(1e-14 / (b.gH * b.gOH))];
    if (P.fam) for (z = 0; z < P.n; z++) cl.push('Ka' + (P.n > 1 ? sub(z + 1) : '') + '\u2032 = ' + sci(b.Kc[z]) + '   (' + T('lblThermo') + ': ' + sci(Math.pow(10, -P.fam.pKa[z])) + ')');
    out.push(st(T('stCondK'), cl, T('nCondK')));
    out.push(st(T('stRealResult'), ['pH(' + T('lblIdeal') + ') = ' + pH3(a.pH) + '          pH(' + T('lblReal') + ') = ' + pH3(b.pH), '\u0394pH = ' + sgn(b.pH - a.pH) + '          pH = ' + MN + 'log(\u03b3' + sub('H') + '\u00b7' + br(HO) + ') = ' + MN + 'log(' + b.gH.toFixed(4) + ' \u00d7 ' + sci(b.h, 4) + ')'], T('nOperational') + (b.I > 0.5 ? ' ' + T('nDaviesLimit') : '')));
    return out;
  }

  function detailed(P) { return [].concat(dIdentify(P), dConstants(P), dSystem(P), dSolve(P), dResult(P), dVerify(P), dInterpret(P), dReal(P)); }

  function build(ctx) {
    var P = prep(ctx);
    return { general: general(P), detailed: detailed(P) };
  }

  /* ======================= BUFFER ======================= */
  // ctx: { fam, k, ca, cb, vol, kind ('acid'|'base'), amt (mmol), T, model, pairLabel }
  function buildBuffer(ctx) {
    var T = ctx.T, fam = ctx.fam, k = ctx.k, ca = ctx.ca, cb = ctx.cb, vol = ctx.vol, amt = ctx.amt || 0, forms = fam.forms;
    var HA = forms[k], A = forms[k + 1], pK = fam.pKa[k], act = ctx.model === 'real' ? { act: true } : null;
    var sys0 = E.bufferSystem(fam, k, ca, cb, 0); sys0.pKaList = fam.pKa;
    var s0i = E.solve(sys0), s0r = E.solve(sys0, { act: true }), s0 = act ? s0r : s0i;
    var delta = (ctx.kind === 'base' ? 1 : -1) * amt / vol;
    var hh = (ca > 0 && cb > 0) ? pK + lg(cb / ca) : NaN, G = [], D = [];
    var ratio = ca > 0 ? cb / ca : Infinity;

    // ----- general
    G.push(st(T('stBufPair'), [HA + '  /  ' + A, 'pKa = ' + pK.toFixed(2) + '     ' + br(A) + ' / ' + br(HA) + ' = ' + f(cb, 3) + ' / ' + f(ca, 3) + ' = ' + (isFinite(ratio) ? f(ratio, 3) : '\u221e')]));
    G.push(st(T('stHH'), ['pH = pKa + log(' + br(A) + ' / ' + br(HA) + ')', 'pH = ' + pK.toFixed(2) + ' + log(' + f(cb, 3) + ' / ' + f(ca, 3) + ') = ' + (isFinite(hh) ? pH2(hh) : '\u2014')], isFinite(hh) ? null : T('nHHundef')));
    var after = null, nHA = ca * vol, nA = cb * vol, nHA2 = nHA, nA2 = nA, rxn = '';
    if (amt > 0) {
      var base = ctx.kind === 'base';
      nHA2 = base ? nHA - amt : nHA + amt; nA2 = base ? nA + amt : nA - amt;
      rxn = base ? OHm + ' + ' + HA + ' \u2192 ' + A + ' + H' + sub(2) + 'O' : HO + ' + ' + A + ' \u2192 ' + HA + ' + H' + sub(2) + 'O';
      var consumed = base ? nHA : nA;
      var tbl = { head: ['mmol', HA, A, base ? 'OH\u207b' : 'H\u2083O\u207a'], rows: [[T('iceI'), f(nHA, 4), f(nA, 4), f(amt, 4)], [T('iceC'), (base ? MN : '+') + f(Math.min(amt, consumed), 4), (base ? '+' : MN) + f(Math.min(amt, consumed), 4), MN + f(Math.min(amt, consumed), 4)], [T('iceF'), f(Math.max(nHA2, 0), 4), f(Math.max(nA2, 0), 4), amt > consumed ? f(amt - consumed, 4) : '0']] };
      var hh2 = (nHA2 > 0 && nA2 > 0) ? pK + lg(nA2 / nHA2) : NaN;
      after = E.solve(E.bufferSystem(fam, k, ca, cb, delta), act);
      var water = E.pureWater(delta, act).pH;
      G.push(st(T('stBufAdd'), [rxn, 'pH = ' + pK.toFixed(2) + ' + log(' + f(Math.max(nA2, 0), 4) + ' / ' + f(Math.max(nHA2, 0), 4) + ') = ' + (isFinite(hh2) ? pH2(hh2) : '\u2014')], amt > consumed ? T('bufOver') : null, tbl));
      G.push(st(T('lblDelta'), ['\u0394pH(' + T('lblBuffer') + ') = ' + sgn(after.pH - s0.pH), '\u0394pH(' + T('lblWaterShort') + ') = ' + sgn(water - 7)], T('nBufWhy')));
    }
    G.push(st(T('stExact'), [], Math.abs((amt > 0 ? after.pH : s0.pH) - (amt > 0 ? (isFinite(hh) ? hh : 0) : (isFinite(hh) ? hh : 0))) < 0.01 && amt === 0 ? T('nExactSame', { p: pH2(s0.pH) }) : T('nExactDiff', { p: pH2(amt > 0 ? after.pH : s0.pH), d: Math.abs((amt > 0 ? after.pH : s0.pH) - (isFinite(hh) ? hh : 0)).toFixed(2) })));

    // ----- detailed
    D.push(st(T('stBufDerive'), ['Ka = ' + br(HO) + br(A) + ' / ' + br(HA), br(HO) + ' = Ka\u00b7' + br(HA) + ' / ' + br(A), MN + 'log' + br(HO) + ' = ' + MN + 'logKa ' + MN + ' log(' + br(HA) + '/' + br(A) + ')', 'pH = pKa + log(' + br(A) + ' / ' + br(HA) + ')    (Henderson\u2013Hasselbalch)'], T('nHHderive'), null, 'secBufTheory'));
    D.push(st(T('stBufAssume'), [br(HA) + ' \u2248 C' + sub('a') + ',   ' + br(A) + ' \u2248 C' + sub('b'), 'h / C' + sub('a') + ' = ' + sci(s0.h / Math.max(ca, 1e-300), 2) + ',   h / C' + sub('b') + ' = ' + sci(s0.h / Math.max(cb, 1e-300), 2)], T('nBufAssume')));
    var corr = (ca > 0 && cb > 0) ? pK + lg((cb + s0i.h - s0i.oh) / (ca - s0i.h + s0i.oh)) : NaN;
    D.push(st(T('stBufExactEq'), ['pH = pKa + log[(C' + sub('b') + ' + h ' + MN + ' Kw/h) / (C' + sub('a') + ' ' + MN + ' h + Kw/h)]', isFinite(corr) ? 'pH = ' + pH3(corr) : ''], T('nBufCorrection'), {
      head: [T('colMethod'), 'pH', '\u0394pH'], rows: [[T('mExact') + ' (' + T('lblIdeal') + ')', pH3(s0i.pH), '\u2014'], [T('mHH'), isFinite(hh) ? pH3(hh) : '\u2014', isFinite(hh) ? sgn(hh - s0i.pH) : '\u2014'], [T('mHHcorr'), isFinite(corr) ? pH3(corr) : '\u2014', isFinite(corr) ? sgn(corr - s0i.pH) : '\u2014']].concat(act ? [[T('mExact') + ' (' + T('lblReal') + ')', pH3(s0r.pH), sgn(s0r.pH - s0i.pH)]] : []) }));
    // capacity
    var betaI = E.bufferCapacity(s0i), beta = act ? E.bufferCapacityAt(fam, k, ca, cb, 0, act) : betaI, Ct = ca + cb, bmax = Math.LN10 * Ct / 4;
    var capLines = act ? ['\u03b2 = dB/dpH   (' + T('lblBetaNum') + ',  pH = ' + MN + 'log a(H' + '\u207a)' + ')', '\u03b2(' + T('lblReal') + ') = ' + sci(beta, 3) + ' mol/(L\u00b7pH)', '\u03b2(' + T('lblIdeal') + ', ' + T('lblReference') + ') = 2.303\u00b7(h + Kw/h + C\u00b7Var(j)) = ' + sci(betaI, 3) + ' mol/(L\u00b7pH)']
                       : ['\u03b2 = d' + T('lblBaseAdded') + ' / dpH = 2.303\u00b7(h + Kw/h + C\u00b7Var(j))', '\u03b2 = ' + sci(beta, 3) + ' mol/(L\u00b7pH)'];
    D.push(st(T('stBufCapacity'), capLines.concat([T('lblBetaMax') + ' = 2.303\u00b7C / 4 = ' + sci(bmax, 3) + ' mol/(L\u00b7pH)  (pH = pKa, ' + T('lblIdeal') + ')', '\u03b2 / \u03b2' + sub('max') + ' = ' + (beta / bmax * 100).toFixed(1) + ' %']), T('nBufCapacity') + (act ? ' ' + T('nBufCapacityReal') : '')));
    var inRange = Math.abs(s0.pH - pK) <= 1;
    D.push(st(T('stBufRange'), ['pKa \u00b1 1 = ' + (pK - 1).toFixed(2) + ' \u2026 ' + (pK + 1).toFixed(2), 'pH = ' + pH2(s0.pH) + '   ' + (inRange ? '\u2713' : '\u2717'), br(A) + '/' + br(HA) + ' = ' + (isFinite(ratio) ? f(ratio, 3) : '\u221e') + '   (0.1 \u2026 10 ' + (ratio >= 0.1 && ratio <= 10 ? '\u2713' : '\u2717') + ')'], inRange ? T('bufEffective') : T('bufWeak')));
    var dil = [10, 100, 1000].map(function (d) { var s = E.solve(E.bufferSystem(fam, k, ca / d, cb / d, 0), act); return [T('lblDilution') + ' 1:' + d, pH3(s.pH), sgn(s.pH - s0.pH), sci(act ? E.bufferCapacityAt(fam, k, ca / d, cb / d, 0, act) : E.bufferCapacity(s), 2)]; });
    D.push(st(T('stBufDilute'), [], T('nBufDilute'), { head: [T('lblDilution'), 'pH', '\u0394pH', '\u03b2'], rows: dil }));
    if (amt > 0) {
      var s1 = E.solve(E.bufferSystem(fam, k, ca, cb, delta), act), lin = (ctx.kind === 'base' ? 1 : -1) * (amt / vol) / beta, wat = E.pureWater(delta, act).pH;
      D.push(st(T('stBufAddDetail'), [rxn, T('lblConsumed') + ': ' + f(Math.min(amt, ctx.kind === 'base' ? nHA : nA), 4) + ' mmol', br(A) + '/' + br(HA) + ':  ' + f(ratio, 3) + ' \u2192 ' + ((nHA2 > 0 && nA2 > 0) ? f(nA2 / nHA2, 3) : '\u2014')],
        T('nBufAddDetail'), { head: [T('colMethod'), 'pH', '\u0394pH'], rows: [[T('mExact') + ' (' + T(act ? 'lblReal' : 'lblIdeal') + ')', pH3(s1.pH), sgn(s1.pH - s0.pH)], [T('mStoich'), (nHA2 > 0 && nA2 > 0) ? pH3(pK + lg(nA2 / nHA2)) : '\u2014', (nHA2 > 0 && nA2 > 0) ? sgn(pK + lg(nA2 / nHA2) - s0.pH) : '\u2014'], [T('mLinear'), pH3(s0.pH + lin), sgn(lin)], [T('lblWaterShort'), pH3(wat), sgn(wat - 7)]] }));
    }
    var r = E.residuals(sys0, s0);
    D.push(st(T('stVerify'), [T('lblChargeSum') + ': ' + sci(r.posTotal, 5) + ' vs ' + sci(r.negTotal, 5) + '   ' + ok(r.chargeRel, 1e-9), T('lblMass') + ': ' + ok(r.massRel, 1e-12), 'Ka: ' + r.K.map(function (q) { return ok(q.rel, 1e-6); }).join(' ')], T('nVerify')));
    D.push(st(T('stRealResult'), ['I = ' + f(s0r.I, 4) + ' M   \u03b3(z=\u00b11) = ' + f(s0r.gH, 4), 'pH(' + T('lblIdeal') + ') = ' + pH3(s0i.pH) + '    pH(' + T('lblReal') + ') = ' + pH3(s0r.pH) + '    \u0394pH = ' + sgn(s0r.pH - s0i.pH)], s0r.I > 0.5 ? T('nDaviesLimit') : T('nOperational')));
    D[D.length - 1].sec = 'secBufReal';
    return { general: G, detailed: D };
  }

  /* ======================= TITRATION POINT ======================= */
  // ctx: { comp, fam, dir, Ca, Va, Ct, v, curve, T, model, tName }
  function buildTitration(ctx) {
    var T = ctx.T, c = ctx.comp, fam = ctx.fam, dir = ctx.dir, Ca = ctx.Ca, Va = ctx.Va, Ct = ctx.Ct, v = ctx.v, tN = ctx.tName, forms = fam ? fam.forms : [], n = fam ? fam.pKa.length : 0;
    var act = ctx.model === 'real' ? { act: true } : null, G = [], D = [];
    var spec = E.titrationSpec(c, fam)[dir], nA = Ca * Va, nT = Ct * v, V = Va + v, E_tot = spec.escale * nA, veq1 = ctx.curve.veq1;
    var make = function (cc) { return E.systemFor(c, fam, cc); };
    var sol = E.titrationSol(make, Ca, Va, Ct, dir, v, act), solI = E.titrationSol(make, Ca, Va, Ct, dir, v), pHx = sol.pH;
    var strongAnalyte = !fam || !!c.strongH, tol = 1e-9 * Math.max(1, veq1), p = nT / nA;
    var X = dir === 'acid' ? HO : OHm, tt = dir === 'acid' ? 'OH\u207b' : 'H\u2083O\u207a';
    function V2(x) { return f(x, 4); }

    // ---- region
    var region, eqIdx = 0;
    for (var q = 1; q <= ctx.curve.eq.length; q++) if (Math.abs(v - q * veq1) <= tol + 1e-7 * veq1) eqIdx = q;
    if (v <= tol) region = 'initial';
    else if (eqIdx) region = 'equiv';
    else if (nT > (strongAnalyte ? E_tot : spec.neq * nA) + 1e-12) region = 'excess';
    else region = strongAnalyte ? 'strongBefore' : 'buffer';
    var RN = { initial: 'regInitial', equiv: 'regEquiv', excess: 'regExcess', buffer: 'regBuffer', strongBefore: 'regBeforeEq' };
    G.push(st(T('stTitPoint'), ['V(' + tN + ') = ' + V2(v) + ' mL    n(' + tN + ') = ' + V2(nT) + ' mmol    n(' + T('lblAnalyteS') + ') = ' + V2(nA) + ' mmol', T('lblEquivalents') + ': ' + (p / (spec.escale)).toFixed(4) + '   (V' + sub('eq') + ' = ' + V2(veq1) + ' mL)', T('lblRegion') + ': ' + T(RN[region] + (eqIdx > 1 ? '' : ''))], null));
    D.push(st(T('stTitPoint'), G[0].lines, T('nTitRegionExplain'), null, 'secTitPoint'));

    // ---- strong analyte
    if (strongAnalyte) {
      var exc = Math.abs(E_tot - nT), cexc = exc / V;
      if (region === 'initial') G.push(st(T('stInitialPH'), [T('lblSeeSolution')], T('nTitInitial')));
      else if (region === 'strongBefore') G.push(st(T('stExcessAnalyte'), ['n(' + X + ') = ' + V2(E_tot) + ' ' + MN + ' ' + V2(nT) + ' = ' + V2(exc) + ' mmol', br(X) + ' = ' + V2(exc) + ' / ' + V2(V) + ' = ' + sci(cexc) + ' M', dir === 'acid' ? 'pH = ' + MN + 'log' + br(X) + ' = ' + pH2(-lg(cexc)) : 'pOH = ' + pH2(-lg(cexc)) + ',  pH = ' + pH2(14 + lg(cexc))], c.strongH ? T('nTitH2SO4') : null));
      else if (region === 'equiv') G.push(st(T('stEquivStrong'), [br(HO) + ' = ' + br(OHm) + ' = \u221aKw', 'pH = ' + pH2(7)], c.strongH ? T('nTitH2SO4') : T('nTitNeutralEq')));
      else G.push(st(T('stExcessTitrant'), ['n = ' + V2(nT) + ' ' + MN + ' ' + V2(E_tot) + ' = ' + V2(exc) + ' mmol', br(dir === 'acid' ? OHm : HO) + ' = ' + V2(exc) + ' / ' + V2(V) + ' = ' + sci(cexc) + ' M', dir === 'acid' ? 'pOH = ' + pH2(-lg(cexc)) + ',  pH = ' + pH2(14 + lg(cexc)) : 'pH = ' + pH2(-lg(cexc))]));
    } else {
      // ---- weak / polyprotic analyte: stoichiometry in "equivalents"
      var j0 = c.type === 'wa' ? 0 : c.j, m = Math.floor(p + 1e-9), fl = p - m;       // m complete protons transferred
      if (region === 'initial') G.push(st(T('stInitialPH'), [T('lblSeeSolution')], T('nTitInitial')));
      else if (region === 'equiv') {
        var jf = dir === 'acid' ? j0 + eqIdx : j0 - eqIdx, cf = nA / V;
        G.push(st(T('stEquivWeak'), [T('lblOnlySpecies') + ': ' + forms[jf] + ',   C = n / V = ' + V2(nA) + ' / ' + V2(V) + ' = ' + sci(cf) + ' M'], T('nTitEquiv')));
        var ampho = jf > 0 && jf < n, pa = ampho ? fam.pKa[jf - 1] : null, pb = ampho ? fam.pKa[jf] : null;
        if (ampho) G.push(st(T('stAmph'), ['pH \u2248 \u00bd(' + pa.toFixed(2) + ' + ' + pb.toFixed(2) + ') = ' + pH2((pa + pb) / 2)], T('nAmphFormula')));
        else if (jf === n) { var pKb = 14 - fam.pKa[n - 1], Kb = Math.pow(10, -pKb), xq = quad(Kb, cf); G.push(st(T('stHydrolysis'), [forms[jf] + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[jf - 1] + ' + ' + OHm, 'Kb = Kw/Ka = ' + sci(Kb), 'x = [' + MN + 'Kb + \u221a(Kb\u00b2 + 4Kb\u00b7C)]/2 = ' + sci(xq) + ' M', 'pOH = ' + pH2(-lg(xq)) + ',  pH = ' + pH2(14 + lg(xq))])); }
        else { var Ka0 = Math.pow(10, -fam.pKa[0]), xa0 = quad(Ka0, cf); G.push(st(T('stHydrolysis'), [forms[jf] + ' + H' + sub(2) + 'O ' + ARR + ' ' + forms[jf + 1] + ' + ' + HO, 'Ka = ' + sci(Ka0), 'x = ' + sci(xa0) + ' M', 'pH = ' + pH2(-lg(xa0))])); }
      } else if (region === 'excess') {
        var tot = spec.neq * nA, ex = nT - tot, cx = ex / V;
        G.push(st(T('stExcessTitrant'), ['n = ' + V2(nT) + ' ' + MN + ' ' + V2(tot) + ' = ' + V2(ex) + ' mmol', br(dir === 'acid' ? OHm : HO) + ' \u2248 ' + V2(ex) + ' / ' + V2(V) + ' = ' + sci(cx) + ' M', dir === 'acid' ? 'pH = ' + pH2(14 + lg(cx)) : 'pH = ' + pH2(-lg(cx))], T('nTitExcessWeak')));
      } else {                                                           // buffer region between two equivalence points
        var jAcid = dir === 'acid' ? j0 + m : j0 - m - 1, jBase = jAcid + 1, pKr = fam.pKa[jAcid];
        var nAcidForm = dir === 'acid' ? nA * (m + 1 - p) : nA * (p - m), nBaseForm = dir === 'acid' ? nA * (p - m) : nA * (m + 1 - p);
        var hhp = pKr + lg(nBaseForm / nAcidForm);
        var tb = { head: ['mmol', forms[jAcid], forms[jBase]], rows: [[T('lblStoich'), V2(nAcidForm), V2(nBaseForm)], [T('lblConcInVol'), sci(nAcidForm / V), sci(nBaseForm / V)]] };
        G.push(st(T('stBufferRegion'), [T('lblConjPair') + ': ' + forms[jAcid] + ' / ' + forms[jBase] + '   (pKa = ' + pKr.toFixed(2) + ')', 'pH = pKa + log(n' + sub('b') + '/n' + sub('a') + ') = ' + pKr.toFixed(2) + ' + log(' + V2(nBaseForm) + '/' + V2(nAcidForm) + ') = ' + pH2(hhp)], T('nTitBuffer'), tb));
        D.push(st(T('stTitStoich'), [dir === 'acid' ? (forms[jAcid] + ' + OH\u207b \u2192 ' + forms[jBase] + ' + H' + sub(2) + 'O') : (forms[jBase] + ' + H\u2083O\u207a \u2192 ' + forms[jAcid] + ' + H' + sub(2) + 'O'), T('lblProtonsTransferred') + ': ' + p.toFixed(4) + ' = ' + m + ' + ' + fl.toFixed(4)], T('nTitStoich'), tb));
        D.push(st(T('stHH'), ['pH = pKa + log(n' + sub('b') + '/n' + sub('a') + ')', '= ' + pKr.toFixed(2) + ' + log(' + V2(nBaseForm) + '/' + V2(nAcidForm) + ') = ' + pH3(hhp)], T('nTitHHnote'), { head: [T('colMethod'), 'pH', '\u0394pH'], rows: [[T('mExact'), pH3(solI.pH), '\u2014'], [T('mHH'), pH3(hhp), sgn(hhp - solI.pH)]] }));
      }
    }
    G.push(st(T('stExact'), [], T('nExactSame', { p: pH2(sol.pH) })));

    // ---- detailed common blocks
    if (region !== 'buffer') {
      D.push(st(T('stTitSpecies'), [T('lblPresent') + ': ' + (fam ? forms.map(function (fl, j) { return fl + ' (' + pct(solI.alpha[j] * 100) + ' %)'; }).join(', ') : '\u2014') + ',  ' + (dir === 'acid' ? 'Na<sup>+</sup>' : 'Cl<sup>\u2212</sup>')], null));
      D.push(st(T('stTitGeneral'), G.slice(1, G.length - 1).map(function (s) { return s.lines.join('   \u00b7   '); }), T('nTitGeneral')));
    }
    D.push(st(T('stTitDilution'), ['V = V' + sub('a') + ' + V' + sub('t') + ' = ' + V2(Va) + ' + ' + V2(v) + ' = ' + V2(V) + ' mL', 'C(' + T('lblAnalyteS') + ') = ' + V2(nA) + ' / ' + V2(V) + ' = ' + sci(nA / V) + ' M', 'C(' + tN + ') = ' + V2(nT) + ' / ' + V2(V) + ' = ' + sci(nT / V) + ' M'], T('nTitDilution')));
    var r = E.residuals(solI.sys, solI);
    D.push(st(T('stVerify'), [T('lblChargeSum') + ': ' + sci(r.posTotal, 5) + ' vs ' + sci(r.negTotal, 5) + '   ' + ok(r.chargeRel, 1e-9)], T('nTitExactBasis'), null, 'secTitVerify'));
    D.push(st(T('stRealResult'), ['I = ' + f(E.titrationSol(make, Ca, Va, Ct, dir, v, { act: true }).I, 4) + ' M', 'pH(' + T('lblIdeal') + ') = ' + pH3(solI.pH) + '    pH(' + T('lblReal') + ') = ' + pH3(E.titrationPH(make, Ca, Va, Ct, dir, v, { act: true }))], T('nOperational')));
    return { general: G, detailed: D, region: region };
  }

  root.PHLabSteps = { build: build, buildBuffer: buildBuffer, buildTitration: buildTitration };
})(typeof window !== 'undefined' ? window : globalThis);
