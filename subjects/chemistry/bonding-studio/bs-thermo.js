/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-thermo.js     Born–Haber cycle (Hess’s law for an ionic solid)
   ΔH°f(MₙXₘ) = n·ΔH°sub(M) + m·ΔH°atom(X) + n·ΣIEₖ(M) − m·ΣEA(X) + U
   Data that elements.js does not have are here: successive ionisation energies (2nd, 3rd), metal atomisation enthalpies, non-metal
   atomisation enthalpies, second electron affinity of O, experimental ΔH°f of ionic solids.  IE₁ and EA₁ are read from elements.js.
   Sources: CRC Handbook of Chemistry and Physics (ionisation energies, ΔH°atom), NBS/CODATA tables (ΔH°f), Atkins (EA₂ of O).  All kJ/mol.
   When an experimental ΔH°f exists the lattice enthalpy is obtained FROM the cycle (the experimental “Born–Haber” value); otherwise
   ΔH°f is PREDICTED from the Kapustinskii lattice energy and flagged as an estimate.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, ST = root.BSSteps;
  /* ΔH of atomisation of the solid metal  M(s) → M(g) */
  var SUB = { Li: 159.3, Na: 107.5, K: 89.0, Rb: 80.9, Cs: 76.5, Be: 324.0, Mg: 147.1, Ca: 177.8, Sr: 164.4, Ba: 180.0, Al: 330.0, Ga: 272.0, Sc: 377.8, Ti: 473.0, Cr: 396.6, Mn: 283.3, Fe: 416.3, Co: 424.7, Ni: 429.7, Cu: 337.4, Zn: 130.4, Ag: 284.9, Cd: 111.8, Hg: 61.4, Sn: 301.2, Pb: 195.2 };
  /* 2nd and 3rd ionisation energies (IE₁ comes from elements.js) */
  var IEX = { Li: [7298.1], Na: [4562], K: [3052], Rb: [2633], Cs: [2234], Be: [1757.1], Mg: [1450.7], Ca: [1145.4], Sr: [1064.2], Ba: [965.2], Al: [1816.7, 2744.8], Ga: [1979.3, 2963], Sc: [1235, 2388.6], Ti: [1309.8, 2652.5],
    Cr: [1590.6, 2987], Mn: [1509.0, 3248], Fe: [1561.9, 2957], Co: [1648, 3232], Ni: [1753.0, 3395], Cu: [1957.9, 3555], Zn: [1733.3], Ag: [2070], Cd: [1631.4], Hg: [1810], Sn: [1411.8], Pb: [1450.5] };
  /* ΔH of atomisation of the non-metal from its standard state:  ½X₂ → X(g) */
  var ATOM = { F: 79.4, Cl: 121.3, Br: 111.9, I: 106.8, O: 249.2, H: 218.0 };
  var EA2 = { O: -744 };                             /* O⁻(g) + e⁻ → O²⁻(g) absorbs 744 kJ/mol (same sign convention as elements.js: positive = released) */
  var HF = { LiF: -616.0, LiCl: -408.6, LiBr: -351.2, LiI: -270.4, NaF: -573.6, NaCl: -411.2, NaBr: -361.1, NaI: -287.8, KF: -567.3, KCl: -436.5, KBr: -393.8, KI: -327.9, RbF: -557.7, RbCl: -435.4, RbBr: -394.6, RbI: -333.8,
    CsF: -553.5, CsCl: -443.0, CsBr: -405.8, CsI: -346.6, MgO: -601.6, CaO: -634.9, SrO: -592.0, BaO: -548.0, MgF2: -1124.2, CaF2: -1228.0, SrF2: -1217.1, BaF2: -1207.1, MgCl2: -641.3, CaCl2: -795.4, SrCl2: -828.9, BaCl2: -858.6,
    MgBr2: -524.3, CaBr2: -682.8, Li2O: -597.9, Na2O: -414.2, K2O: -361.5, Al2O3: -1675.7, AlF3: -1510.4, ZnO: -350.5, ZnCl2: -415.1, AgCl: -127.0, AgBr: -100.4, AgI: -61.8, LiH: -90.5, NaH: -56.3, KH: -57.7, CaH2: -186.2,
    FeO: -272.0, Fe2O3: -824.2, CuO: -157.3, CuCl: -137.2 };

  function half(n) { var h = n / 2, w = Math.floor(h); return (w ? w : '') + (h - w ? '½' : '') || '0'; }
  function coef(n) { return n > 1 ? n + ' ' : ''; }
  function sub(n) { return n > 1 ? E.sub(n) : ''; }

  function bornHaber(ic) {
    if (!ic || ic.poly) return null;
    var M = ic.cat.s, X = ic.an.s, q = ic.cat.q, aq = -ic.an.q, nc = ic.nc, na = ic.na, eM = E.el(M), eX = E.el(X);
    if (SUB[M] === undefined || ATOM[X] === undefined) return null;
    var ies = [eM.ie].concat(IEX[M] || []); if (ies.length < q || ies.slice(0, q).some(function (v) { return v === null || v === undefined; })) return null;
    ies = ies.slice(0, q);
    var eas = [eX.ea]; if (aq === 2) { if (EA2[X] === undefined) return null; eas.push(EA2[X]); } else if (aq !== 1) return null;
    if (eas.some(function (v) { return v === null || v === undefined; })) return null;
    var sIE = ies.reduce(function (a, b) { return a + b; }, 0), sEA = eas.reduce(function (a, b) { return a + b; }, 0);
    var st = [
      { k: 'sub', v: nc * SUB[M], per: SUB[M], n: nc },
      { k: 'atom', v: na * ATOM[X], per: ATOM[X], n: na },
      { k: 'ie', v: nc * sIE, per: sIE, n: nc, parts: ies },
      { k: 'ea', v: -na * sEA, per: -sEA, n: na, parts: eas }
    ];
    var up = st.reduce(function (a, s) { return a + s.v; }, 0), plain = E.plain(ic.formula), hfExp = HF[plain], haveExp = hfExp !== undefined;
    var uKap = -ic.kapustinskii, uBL = ic.bornLande ? -ic.bornLande : null, U = haveExp ? hfExp - up : uKap, hf = haveExp ? hfExp : up + uKap;
    st.push({ k: 'lat', v: U, per: U, n: 1 });
    /* species at each level */
    var X2 = half(na) + ' ' + X + '₂(g)', Mq = (q > 1 ? q : '') + '+';
    var lv = [
      { sp: coef(nc) + M + '(s) + ' + X2, v: 0 },
      { sp: coef(nc) + M + '(g) + ' + X2 },
      { sp: coef(nc) + M + '(g) + ' + coef(na) + X + '(g)' },
      { sp: coef(nc) + M + E.supCharge(q) + '(g) + ' + coef(na) + X + '(g) + ' + coef(nc * q) + 'e⁻' },
      { sp: coef(nc) + M + E.supCharge(q) + '(g) + ' + coef(na) + X + E.supCharge(-aq) + '(g)' },
      { sp: ic.formula + '(s)' }
    ];
    var cum = 0; for (var i = 0; i < 4; i++) { cum += st[i].v; lv[i + 1].v = cum; } lv[5].v = hf; lv[0].v = 0;
    var res = { cat: M, an: X, q: q, aq: aq, nc: nc, na: na, formula: ic.formula, steps: st, levels: lv, up: up, hf: hf, hfExp: haveExp ? hfExp : null, haveExp: haveExp, U: U, uKap: uKap, uBL: uBL, ies: ies, eas: eas,
      errKap: haveExp ? (uKap - U) / Math.abs(U) * 100 : null, errBL: haveExp && uBL !== null ? (uBL - U) / Math.abs(U) * 100 : null };
    /* the cycle must close: the sum of the steps equals ΔH°f */
    res.closure = st.reduce(function (a, s) { return a + s.v; }, 0) - hf;
    return res;
  }

  /* ---------- SVG energy-level diagram (steps appear one after the other; CSS animation, replay by re-inserting) ---------- */
  function svg(bh, T, opt) {
    opt = opt || {}; var W = 640, H = 360, L = 74, Rr = 596, top = 26, bot = 316, lv = bh.levels, vmin = Math.min.apply(null, lv.map(function (l) { return l.v; })), vmax = Math.max.apply(null, lv.map(function (l) { return l.v; }));
    var span = (vmax - vmin) || 1; vmin -= span * 0.06; vmax += span * 0.1; function Y(v) { return bot - (v - vmin) / (vmax - vmin) * (bot - top); }
    var n = lv.length, colW = (Rr - L - 90) / (n - 1), xs = lv.map(function (l, i) { return L + 20 + i * colW; }), out = [], seg = colW * 0.62;
    var cols = { sub: '#ffb020', atom: '#ff8a5c', ie: '#ff6b6b', ea: '#4da3ff', lat: '#2fd0b5' }, kinds = ['sub', 'atom', 'ie', 'ea', 'lat'];
    out.push('<style>.bsbh-a{opacity:0;animation:bsbhIn .7s ease forwards}@keyframes bsbhIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.bsbh-a{animation:none;opacity:1}}</style>');
    out.push('<line x1="' + L + '" y1="' + Y(0).toFixed(1) + '" x2="' + Rr + '" y2="' + Y(0).toFixed(1) + '" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 5"/>');
    out.push('<text x="' + (L - 8) + '" y="' + (Y(0) + 4).toFixed(1) + '" text-anchor="end" font-size="12" fill="currentColor" opacity=".8">0</text><text x="' + (L - 8) + '" y="14" text-anchor="end" font-size="11.5" font-weight="700" fill="currentColor" opacity=".85">kJ/mol</text>');
    var i;
    for (i = 0; i < n; i++) {
      var y = Y(lv[i].v), x0 = xs[i] - seg / 2, x1 = xs[i] + seg / 2, last = i === n - 1, below = last || i === 0 || lv[i].v < lv[i - 1].v;   /* a level reached by a falling arrow is labelled underneath, so it never meets that arrow's own label */
      out.push('<g class="bsbh-a" style="animation-delay:' + (i * 0.55).toFixed(2) + 's"><line x1="' + x0.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + (last ? '#62d684' : 'currentColor') + '" stroke-width="3" stroke-linecap="round"/>' +
        '<text x="' + xs[i].toFixed(1) + '" y="' + (y + (below ? 17 : -8)).toFixed(1) + '" text-anchor="middle" font-size="11.5" fill="currentColor">' + lv[i].sp + '</text>' +
        '<text x="' + xs[i].toFixed(1) + '" y="' + (y + (below ? 32 : -23)).toFixed(1) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' + (last ? '#62d684' : 'currentColor') + '">' + (lv[i].v >= 0 && i ? '+' : '') + ST.f1(lv[i].v) + '</text></g>');
      if (i < n - 1) {
        var k = kinds[i], a = Y(lv[i].v), b = Y(lv[i + 1].v), xm = (xs[i] + xs[i + 1]) / 2, col = cols[k];
        out.push('<g class="bsbh-a" style="animation-delay:' + (i * 0.55 + 0.3).toFixed(2) + 's"><line x1="' + (xs[i] + seg / 2).toFixed(1) + '" y1="' + a.toFixed(1) + '" x2="' + xm.toFixed(1) + '" y2="' + a.toFixed(1) + '" stroke="' + col + '" stroke-opacity=".5" stroke-dasharray="2 3"/>' +
          '<line x1="' + xm.toFixed(1) + '" y1="' + a.toFixed(1) + '" x2="' + xm.toFixed(1) + '" y2="' + (b + (b < a ? 6 : -6)).toFixed(1) + '" stroke="' + col + '" stroke-width="3"/>' +
          '<path d="M' + xm.toFixed(1) + ' ' + b.toFixed(1) + ' l-5 ' + (b < a ? 9 : -9) + ' h10z" fill="' + col + '"/>' +
          '<line x1="' + xm.toFixed(1) + '" y1="' + b.toFixed(1) + '" x2="' + (xs[i + 1] - seg / 2).toFixed(1) + '" y2="' + b.toFixed(1) + '" stroke="' + col + '" stroke-opacity=".5" stroke-dasharray="2 3"/>' +
          '<text x="' + (xm + 7).toFixed(1) + '" y="' + ((a + b) / 2 + 3).toFixed(1) + '" font-size="12.5" font-weight="700" fill="' + col + '">' + (bh.steps[i].v >= 0 ? '+' : '') + ST.f1(bh.steps[i].v) + '</text>' +
          '<text x="' + (xm + 7).toFixed(1) + '" y="' + ((a + b) / 2 + 18).toFixed(1) + '" font-size="10.8" fill="currentColor" opacity=".8">' + T('bh_' + k + 'S') + '</text></g>');
      }
    }
    /* Hess’s law: the direct route 0 → ΔH°f */
    var xd = Rr + 18, yf = Y(bh.hf), y0 = Y(0);
    out.push('<g class="bsbh-a" style="animation-delay:' + (n * 0.55).toFixed(2) + 's"><line x1="' + (xs[n - 1] + seg / 2).toFixed(1) + '" y1="' + yf.toFixed(1) + '" x2="' + xd + '" y2="' + yf.toFixed(1) + '" stroke="#62d684" stroke-opacity=".5" stroke-dasharray="2 3"/>' +
      '<line x1="' + (xs[0] + seg / 2).toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + xd + '" y2="' + y0.toFixed(1) + '" stroke="#62d684" stroke-opacity=".5" stroke-dasharray="2 3"/>' +
      '<line x1="' + xd + '" y1="' + y0.toFixed(1) + '" x2="' + xd + '" y2="' + (yf - 6).toFixed(1) + '" stroke="#62d684" stroke-width="3.5"/><path d="M' + xd + ' ' + yf.toFixed(1) + ' l-5 -9 h10z" fill="#62d684"/>' +
      '<text x="' + (xd - 6) + '" y="' + ((y0 + yf) / 2).toFixed(1) + '" text-anchor="end" font-size="13" font-weight="800" fill="#62d684">ΔH°f</text></g>');
    return '<svg viewBox="0 0 ' + (W + 16) + ' ' + H + '" style="width:100%;min-width:600px;height:auto;color:inherit;overflow:visible" role="img">' + out.join('') + '</svg>';
  }

  /* ---------- the panel: diagram + comparison + worked solution ---------- */
  function row(label, val, extra) { return '<tr><td>' + label + '</td><td><b>' + val + '</b></td><td>' + (extra || '') + '</td></tr>'; }
  function panel(ic, T, level) {
    var bh = bornHaber(ic); if (!bh) return '<div class="bs-note">' + T('bh_none') + '</div>';
    var f1 = ST.f1, det = level === 'detailed', S = bh.steps, html = '<div class="bsbh-wrap" data-bh="1">' + svg(bh, T) + '</div><div class="bs-cap">' + T('bh_cap') + '</div>';
    html += '<div class="bs-tbl"><table><thead><tr><th>' + T('bh_step') + '</th><th>kJ/mol</th><th>' + T('bh_detail') + '</th></tr></thead><tbody>' +
      row(T('bh_subL', { m: bh.cat }), (S[0].v >= 0 ? '+' : '') + f1(S[0].v), bh.nc + ' × ' + f1(S[0].per)) +
      row(T('bh_atomL', { x: bh.an }), '+' + f1(S[1].v), bh.na + ' × ' + f1(S[1].per)) +
      row(T('bh_ieL', { m: bh.cat, q: E.supCharge(bh.q) }), '+' + f1(S[2].v), bh.nc + ' × (' + bh.ies.map(f1).join(' + ') + ')') +
      row(T('bh_eaL', { x: bh.an, aq: E.supCharge(-bh.aq) }), (S[3].v >= 0 ? '+' : '') + f1(S[3].v), bh.na + ' × (−(' + bh.eas.map(f1).join(' + ') + '))') +
      row(T('bh_latL'), f1(S[4].v), bh.haveExp ? T('bh_fromCycle') : T('bh_fromKap')) +
      row('ΔH°f', f1(bh.hf), bh.haveExp ? T('bh_expHf') : T('bh_predHf')) + '</tbody></table></div>';
    var cmp = '<div class="bs-kv"><div><small>U ' + (bh.haveExp ? T('bh_cycleShort') : '—') + '</small><b>' + (bh.haveExp ? f1(bh.U) : '—') + '</b></div><div><small>U Kapustinskii</small><b>' + f1(bh.uKap) + '</b>' + (bh.errKap !== null ? '<small>' + (bh.errKap >= 0 ? '+' : '') + f1(bh.errKap) + ' %</small>' : '') + '</div>' +
      '<div><small>U Born–Landé</small><b>' + (bh.uBL !== null ? f1(bh.uBL) : '—') + '</b>' + (bh.errBL !== null ? '<small>' + (bh.errBL >= 0 ? '+' : '') + f1(bh.errBL) + ' %</small>' : '') + '</div></div>';
    html += cmp + '<div class="bs-note">' + T(bh.haveExp ? 'bh_noteExp' : 'bh_notePred') + '</div>';
    /* worked solution */
    var steps = [];
    steps.push({ h: T('bh_s1h'), b: T('bh_s1', { f: bh.formula }) + (det ? '<div class="bs-why">' + T('bh_s1why') + '</div>' : '') });
    steps.push({ h: T('bh_s2h'), b: T('bh_s2', { sub: f1(S[0].v), atom: f1(S[1].v) }) + (det ? '<div class="bs-why">' + T('bh_s2why', { m: bh.cat, x: bh.an }) + '</div>' : '') });
    steps.push({ h: T('bh_s3h'), b: T('bh_s3', { ie: f1(S[2].v), ea: f1(S[3].v) }) + (det ? '<div class="bs-why">' + T('bh_s3why', { m: bh.cat, x: bh.an, ie1: f1(bh.ies[0]), ea1: f1(bh.eas[0]) }) + (bh.aq === 2 ? ' ' + T('bh_ea2') : '') + '</div>' : '') });
    steps.push({ h: T('bh_s4h'), b: bh.haveExp ? T('bh_s4a', { hf: f1(bh.hf), up: f1(bh.up), u: f1(bh.U) }) + (det ? '<div class="bs-why">' + ST.esc('U = ΔH°f − (ΔHsub + ΔHatom + ΣIE − ΣEA) = ' + f1(bh.hf) + ' − ' + f1(bh.up) + ' = ' + f1(bh.U)) + '</div>' : '') : T('bh_s4b', { up: f1(bh.up), u: f1(bh.U), hf: f1(bh.hf) }) });
    steps.push({ h: T('bh_s5h'), b: T('bh_s5', { uk: f1(bh.uKap), ubl: bh.uBL !== null ? f1(bh.uBL) : '—', u: f1(bh.U) }) + (det ? '<div class="bs-why">' + T('bh_s5why') + '</div>' : '') });
    steps.push({ h: T('bh_s6h'), b: (bh.hf < 0 ? T('bh_s6neg', { hf: f1(bh.hf) }) : T('bh_s6pos', { hf: f1(bh.hf) })) + (det ? '<div class="bs-why">' + T('bh_s6why') + '</div>' : '') });
    html += '<ol class="bs-steps">' + steps.map(function (s, i) { return '<li><div class="bs-step-h"><span class="bs-sn">' + (i + 1) + '</span>' + s.h + '</div><div class="bs-step-b">' + s.b + '</div></li>'; }).join('') + '</ol>';
    return html;
  }

  root.BSThermo = { bornHaber: bornHaber, svg: svg, panel: panel, data: { SUB: SUB, IEX: IEX, ATOM: ATOM, EA2: EA2, HF: HF } };
})(typeof window !== 'undefined' ? window : globalThis);
