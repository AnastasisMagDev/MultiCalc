/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-imf.js        Intermolecular forces
   · analyse(mol)  which forces a species can exert, and why (polarity, N/O/F–H donors, lone-pair acceptors, polarisability, charge)
   · four 3D scenes:  London dispersion (live: fluctuating dipoles) · dipole–dipole · hydrogen bonds (built from real donor/acceptor geometry)
     · ion–dipole (hydration shell with the real orientation of the waters)
   · data: normal boiling points, polarisabilities, hydration enthalpies, typical interaction energies
   Sources: CRC Handbook of Chemistry and Physics (boiling points, polarisability volumes α′), Atkins (hydration enthalpies, energy ranges).
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, SC = root.BSScenes, U = E.util;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  var TEAL = [47, 208, 181], ORANGE = [255, 176, 32], POS = [90, 169, 255], NEG = [255, 107, 107];

  /* normal boiling point, K (sublimation point for CO₂, C₂H₂, SF₆) */
  var BP = { H2: 20.3, N2: 77.4, O2: 90.2, F2: 85.0, Cl2: 239.1, Br2: 332.0, I2: 457.6, HF: 292.7, HCl: 188.1, HBr: 206.4, HI: 237.8, CO: 81.6, NO: 121.4, H2O: 373.15, H2S: 212.8, NH3: 239.8, PH3: 185.4, CH4: 111.7, SiH4: 161.4,
    CO2: 194.7, CS2: 319.4, SO2: 263.1, O3: 161.3, N2O: 184.7, NO2: 294.3, BF3: 172.4, BCl3: 285.7, CCl4: 349.9, CHCl3: 334.3, CH2Cl2: 312.9, CH3Cl: 249.1, HCN: 299.0, CH2O: 254.0, CH3OH: 337.7, C2H5OH: 351.5, CH3COOH: 391.1,
    CH32CO: 329.4, C6H6: 353.2, C2H6: 184.6, C2H4: 169.4, C2H2: 189.2, CH3NH2: 266.8, HCOOH: 373.8, SF6: 209.2, PCl3: 349.0, NF3: 144.1, OF2: 128.4, HNO3: 356.2 };
  /* polarisability volume α′, Å³ */
  var ALPHA = { He: 0.205, Ne: 0.396, Ar: 1.64, Kr: 2.48, Xe: 4.04, H2: 0.80, N2: 1.74, O2: 1.58, F2: 1.38, Cl2: 4.61, Br2: 6.43, I2: 10.2, CH4: 2.59, C2H6: 4.47, C2H4: 4.25, C2H2: 3.33, C6H6: 10.4, CO2: 2.91, CO: 1.95, CCl4: 10.5,
    CHCl3: 8.2, CH2Cl2: 6.5, CH3Cl: 4.5, HF: 0.80, HCl: 2.63, HBr: 3.61, HI: 5.45, H2O: 1.45, H2S: 3.78, NH3: 2.26, PH3: 4.84, SO2: 3.89, CS2: 8.74, CH3OH: 3.29, C2H5OH: 5.11, CH32CO: 6.4, SF6: 6.54, CH2O: 2.45, HCN: 2.59, NO: 1.7, N2O: 3.0 };
  var BP_ATOMS = { He: 4.2, Ne: 27.1, Ar: 87.3, Kr: 119.9, Xe: 165.1 };
  /* boiling points of the hydrides of groups 14–17, K — the classic plot */
  var HYDRIDES = [
    { g: 14, pts: [['C', 111.7, 'CH₄'], ['Si', 161.4, 'SiH₄'], ['Ge', 184.8, 'GeH₄'], ['Sn', 221.0, 'SnH₄']] },
    { g: 15, pts: [['N', 239.8, 'NH₃'], ['P', 185.4, 'PH₃'], ['As', 210.7, 'AsH₃'], ['Sb', 254.6, 'SbH₃']] },
    { g: 16, pts: [['O', 373.15, 'H₂O'], ['S', 212.8, 'H₂S'], ['Se', 231.9, 'H₂Se'], ['Te', 271.7, 'H₂Te']] },
    { g: 17, pts: [['F', 292.7, 'HF'], ['Cl', 188.1, 'HCl'], ['Br', 206.4, 'HBr'], ['I', 237.8, 'HI']] }];
  /* enthalpies of hydration of gaseous ions, kJ/mol */
  var HYD = { 'Li+': -519, 'Na+': -406, 'K+': -322, 'Rb+': -301, 'Cs+': -277, 'Mg2+': -1926, 'Ca2+': -1579, 'Al3+': -4665, 'F-': -515, 'Cl-': -381, 'Br-': -347, 'I-': -305 };
  /* typical interaction energies, kJ/mol (min, max) */
  var ENERGY = [['london', 0.05, 40], ['dipole', 5, 25], ['hbond', 10, 40], ['iondipole', 40, 600], ['ionic', 400, 4000], ['covalent', 150, 1100]];

  function molarMass(mol) { return mol.atoms.reduce(function (s, a) { return s + (a.el.m || 0); }, 0); }
  function keyOf(mol) { return mol.id || E.plain(mol.formula).replace(/[()]/g, ''); }
  function alphaOf(mol) { var k = keyOf(mol); if (ALPHA[k] !== undefined) return ALPHA[k]; if (mol.atoms.length === 1) return ALPHA[mol.atoms[0].s]; return null; }

  /* ---------------------------------------------------------------- analysis */
  function analyze(mol) {
    var atoms = mol.atoms, don = [], acc = [], res = { forces: [], M: molarMass(mol), alpha: alphaOf(mol), bp: BP[keyOf(mol)] !== undefined ? BP[keyOf(mol)] : (mol.atoms.length === 1 ? BP_ATOMS[mol.atoms[0].s] : undefined), electrons: atoms.reduce(function (s, a) { return s + a.el.n; }, 0) - mol.charge };
    atoms.forEach(function (a, i) {
      if (a.s === 'H') a.nbr.forEach(function (j) { if (/^(N|O|F)$/.test(atoms[j].s)) don.push({ h: i, d: j }); });
      if (/^(N|O|F)$/.test(a.s) && a.lp > 0 && a.q <= 0 && a.nbr.every(function (j) { return atoms[j].s === 'H' || atoms[j].s === 'C'; })) acc.push(i);   // basic N/O/F: bonded only to H or C (not S=O, N–F, O–F …)
    });
    res.donors = don; res.acceptors = acc; res.mu = mol.muExp !== null && mol.muExp !== undefined ? mol.muExp : mol.dipole.mag; res.muSrc = mol.muExp !== null && mol.muExp !== undefined ? 'exp' : 'model';
    res.polar = mol.polar; res.ion = mol.charged;
    res.forces.push({ k: 'london', rank: 1 });
    if (mol.charged) res.forces.push({ k: 'iondipole', rank: 4 });
    else if (mol.polar) res.forces.push({ k: 'dipole', rank: 2 });
    if (!mol.charged && don.length && acc.length) { res.hb = 'both'; res.forces.push({ k: 'hbond', rank: 3 }); }
    else if (!mol.charged && acc.length && mol.polar) { res.hb = 'acceptor'; res.forces.push({ k: 'hbond', rank: 3, partial: true }); }
    else if (mol.charged && (don.length || acc.length)) res.hb = 'ion';
    res.forces.sort(function (a, b) { return b.rank - a.rank; }); res.dominant = res.forces[0].k;
    return res;
  }

  /* ---------------------------------------------------------------- placing molecules */
  function placed(mol, fn, t) {
    var c = Object.assign({}, mol); c.pos = mol.pos.map(function (p) { return U.vadd(fn(p), t); });
    c.atoms = mol.atoms.map(function (a) { return Object.assign({}, a, { lpDirs: (a.lpDirs || []).map(fn) }); });
    c.dipole = Object.assign({}, mol.dipole, { vec: fn(mol.dipole.vec) }); return c;
  }
  function ident(v) { return v; }
  function twist(axis, ang) { return function (v) { return U.rot(v, axis, ang); }; }
  function compose(f, g) { return function (v) { return g(f(v)); }; }
  function minDist(posA, list) { var m = 1e9; list.forEach(function (P) { P.forEach(function (q) { posA.forEach(function (p) { m = Math.min(m, U.vlen(U.vsub(p, q))); }); }); }); return m; }
  function merge(scenes, extra, radius) { var items = []; scenes.forEach(function (s) { items = items.concat(s.items); }); return { radius: radius, items: items.concat(extra || []), fog: false }; }
  function molItems(m, o) { return SC.molScene(m, Object.assign({ style: 'ball', lp: true, dip: false, chg: false, lab: true, dipLabel: false }, o || {})).items; }


  /* put a cluster in a friendly pose: centred, its longest axis along screen-x, its second axis along screen-y */
  function pose(items, pts) {
    var c = [0, 0, 0]; pts.forEach(function (p) { c = U.vadd(c, p); }); c = U.vmul(c, 1 / pts.length);
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; pts.forEach(function (p) { var d = U.vsub(p, c), i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; });
    function mul(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
    var v1 = U.vnorm([1, 0.7, 0.4]), k; for (k = 0; k < 40; k++) v1 = U.vnorm(mul(C, v1));
    var C2 = C.map(function (r, i) { return r.map(function (x, j) { return x - U.vlen(mul(C, v1)) * v1[i] * v1[j]; }); }), v2 = U.vnorm([0.3, 1, 0.5]); for (k = 0; k < 40; k++) v2 = U.vnorm(mul(C2, v2));
    v2 = U.vnorm(U.vsub(v2, U.vmul(v1, U.vdot(v2, v1)))); var v3 = U.vcross(v1, v2);
    function T(v) { var d = U.vsub(v, c); return [U.vdot(d, v1), U.vdot(d, v2), U.vdot(d, v3)]; }
    function R(v) { return [U.vdot(v, v1), U.vdot(v, v2), U.vdot(v, v3)]; }
    items.forEach(function (it) { if (it.t === 's' || it.t === 'k' || it.t === 't' || it.t === 'o') { var q = T([it.x, it.y, it.z]); it.x = q[0]; it.y = q[1]; it.z = q[2]; if (it.d) it.d = R(it.d); } if (it.p) { it.p = T(it.p); it.q = T(it.q); } });
    var rad = 0; pts.forEach(function (p) { rad = Math.max(rad, U.vlen(U.vsub(p, c))); }); return rad;
  }

  /* ---- hydrogen bonds ---- */
  function hbondScene(mol, o) {
    o = o || {}; var an = analyze(mol), n = o.n || 4, items = [], extra = [], water = E.fromLibrary('H2O');
    if (!an.donors.length && !an.acceptors.length) return null;
    var cluster = [], poss = [];
    function addMol(m, fn, t) { var p = placed(m, fn, t); cluster.push(p); poss.push(p.pos); return p; }
    function link(donorM, dIdx, accM, aIdx, accSrc) {          // dashed H···A line with the distance
      var H = donorM.pos[dIdx.h], A = accM.pos[aIdx], d = U.vlen(U.vsub(H, A)), mid = U.vmul(U.vadd(H, A), 0.5);
      extra.push({ t: 'l', p: H, q: A, c: ORANGE, a: 0.95, w: 2.2, dash: true }); extra.push({ t: 't', x: mid[0], y: mid[1], z: mid[2], text: (Math.round(d * 100) / 100).toFixed(2).replace('.', ',') + ' Å', c: ORANGE, size: 12, dy: -10 });
    }
    function attach(donorM, d, accMol, fnBase) {               // place accMol (untransformed) so that one of its lone pairs points at the donor H
      var H = donorM.pos[d.h], D = donorM.pos[d.d], u = U.vnorm(U.vsub(H, D)), accIdx = null, lpv = null, best = null;
      var accs = analyze(accMol).acceptors; if (!accs.length) return null;
      var i, ang;
      for (i = 0; i < accs.length; i++) {
        var a = accMol.atoms[accs[i]]; if (!a.lpDirs || !a.lpDirs.length) continue; lpv = a.lpDirs[0]; accIdx = accs[i];
        var al = E.aligner(U.vnorm(lpv), U.vmul(u, -1));
        for (ang = 0; ang < 360; ang += 30) {
          var fn = compose(compose(function (v) { return v; }, al), twist(u, ang * Math.PI / 180)), tmp = placed(accMol, fn, [0, 0, 0]), dist = 1.88, target = U.vadd(H, U.vmul(u, dist)), t = U.vsub(target, tmp.pos[accIdx]), P = placed(accMol, fn, t);
          var md = minDist(P.pos.filter(function (p, k) { return k !== accIdx; }), poss.concat([donorM.pos].map(function (x) { return x; })).filter(function (q) { return q !== donorM.pos; }).concat([donorM.pos.filter(function (p, k) { return k !== d.h && k !== d.d; })]));
          var far = poss.length ? U.vlen(U.vsub(P.pos[accIdx], poss[0][0])) : 0, score = md + 0.3 * far;      // clear of the others, and stretched out
          if (!best || score > best.score) best = { md: md, score: score, fn: fn, t: t, accIdx: accIdx };
        }
      }
      return best;
    }
    var first = addMol(mol, ident, [0, 0, 0]), cur = first, used = {}, count = 1, guard = 0;
    if (!an.donors.length) {                                   // acceptor-only (e.g. acetone, formaldehyde): two waters donate to it
      cluster = []; poss = []; var host = addMol(mol, ident, [0, 0, 0]), accs = an.acceptors.slice(0, 2);
      accs.slice(0, 1).forEach(function (ai) {
        var a = host.atoms[ai]; (a.lpDirs || []).slice(0, a.lp).slice(0, 2).forEach(function (lp) {
          var u = U.vnorm(lp), Hpos = U.vadd(host.pos[ai], U.vmul(u, 1.88)), wd = water.pos, hIdx = water.atoms.findIndex(function (x) { return x.s === 'H'; }), OIdx = water.atoms.findIndex(function (x) { return x.s === 'O'; });
          var dirO = U.vnorm(U.vsub(water.pos[hIdx], water.pos[OIdx])), fn = E.aligner(dirO, U.vmul(u, -1)), tmp = placed(water, fn, [0, 0, 0]), t = U.vsub(Hpos, tmp.pos[hIdx]), W = addMol(water, fn, t);
          link(W, { h: hIdx, d: OIdx }, host, ai);
        });
      });
      items = [];
      var all = []; cluster.forEach(function (m) { items = items.concat(molItems(m)); m.pos.forEach(function (p) { all.push(p); }); }); items = items.concat(extra); var rr = pose(items, all); return { radius: rr + 1.6, items: items, fog: false };
    }
    while (count < n && guard++ < 30) {
      var freeD = cur.atoms.length ? an.donors.filter(function (d) { return !used[cluster.indexOf(cur) + ':' + d.h]; }) : [];
      if (!freeD.length) break;
      /* choose the donor H that points away from everything already placed */
      freeD.sort(function (a, b) { return minDist([cur.pos[b.h]], poss.filter(function (q) { return q !== cur.pos; })) - minDist([cur.pos[a.h]], poss.filter(function (q) { return q !== cur.pos; })); });
      var d = freeD[0], b = attach(cur, d, mol); used[cluster.indexOf(cur) + ':' + d.h] = 1; if (!b) break;
      var nm = addMol(mol, b.fn, b.t); link(cur, d, nm, b.accIdx); cur = nm; count++;
    }
    var allp = []; cluster.forEach(function (m) { items = items.concat(molItems(m)); m.pos.forEach(function (p) { allp.push(p); }); }); items = items.concat(extra);
    var rad = pose(items, allp); return { radius: rad + 1.5, items: items, fog: false };
  }

  /* ---- dipole–dipole ---- */
  function dipoleScene(mol) {
    if (!mol.polar && mol.dipole.mag < 0.05) return null; var items = [], extra = [], u = U.vnorm(mol.dipole.vec), toX = E.aligner(u, [1, 0, 0]), toXm = E.aligner(u, [-1, 0, 0]);
    function ext(m) { var lo = 1e9, hi = -1e9; m.pos.forEach(function (p) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); }); return [lo, hi]; }
    var base = placed(mol, toX, [0, 0, 0]), e0 = ext(base), gap = 1.0, w = e0[1] - e0[0] + gap + 0.8, row1 = [], k;
    for (k = 0; k < 3; k++) row1.push(placed(mol, toX, [(k - 1) * w - (e0[0] + e0[1]) / 2, 1.9, 0]));
    var yb = -1.9, A = placed(mol, toX, [-w / 2 - (e0[0] + e0[1]) / 2, yb, 0]), B = placed(mol, toXm, [w / 2 - ((-e0[1]) + (-e0[0])) / 2 + 0.0, yb, 0]);
    row1.concat([A, B]).forEach(function (m) { items = items.concat(molItems(m, { dip: true, chg: true, lp: false })); });
    function ends(m) { var neg = 0, pos = 0; m.partial.forEach(function (q, i) { if (q < m.partial[neg]) neg = i; if (q > m.partial[pos]) pos = i; }); return [m.pos[neg], m.pos[pos]]; }
    for (k = 0; k < 2; k++) { var a = ends(row1[k])[0], b = ends(row1[k + 1])[1]; extra.push({ t: 'l', p: a, q: b, c: ORANGE, a: 0.95, w: 2, dash: true }); }
    var ea = ends(A), eb = ends(B); extra.push({ t: 'l', p: ea[0], q: eb[1], c: ORANGE, a: 0.95, w: 2, dash: true }); extra.push({ t: 'l', p: ea[1], q: eb[0], c: ORANGE, a: 0.95, w: 2, dash: true });
    var rr = 0; row1.concat([A, B]).forEach(function (m) { m.pos.forEach(function (p) { rr = Math.max(rr, Math.hypot(p[0], p[1], p[2])); }); }); return { radius: rr + 1.2, items: items.concat(extra), fog: false };
  }

  /* ---- London dispersion: two molecules whose electron clouds fluctuate in step (live) ---- */
  function londonScene(mol) {
    var m = mol, ext = 0; m.pos.forEach(function (p) { ext = Math.max(ext, U.vlen(p)); }); var rc = ext + 1.0 + (mol.atoms.length === 1 ? E.vdwR(mol.atoms[0].el) * 0.55 : 0.45), sep = 2 * rc + 0.9;
    var A = placed(m, ident, [-sep / 2, 0, 0]), B = placed(m, ident, [sep / 2, 0, 0]), sc = { radius: sep / 2 + rc + 0.4, items: [], fog: false };
    var base = molItems(A, { lab: true, lp: false, chg: false }).concat(molItems(B, { lab: true, lp: false, chg: false }));
    sc.live = function (t) {
      var a = 0.42 * Math.sin(t * 2.3), b = 0.36 * Math.sin(t * 2.3 - 0.45), items = base.slice();
      items.push({ t: 'k', x: -sep / 2 + a, y: 0, z: 0, r: rc, c: TEAL, a: 0.34 }, { t: 'k', x: sep / 2 + b, y: 0, z: 0, r: rc, c: TEAL, a: 0.34 });
      var s = Math.sin(t * 2.3), lab = function (x, sign) { return { t: 't', x: x, y: 0, z: 0, text: sign > 0 ? 'δ+' : 'δ−', c: sign > 0 ? POS : NEG, size: 14, dy: -22 }; };
      if (Math.abs(s) > 0.25) { items.push(lab(-sep / 2 + rc * 0.9, s > 0 ? -1 : 1), lab(-sep / 2 - rc * 0.9, s > 0 ? 1 : -1), lab(sep / 2 + rc * 0.9, s > 0 ? -1 : 1), lab(sep / 2 - rc * 0.9, s > 0 ? 1 : -1)); }
      items.push({ t: 'l', p: [-sep / 2 + rc, 0, 0], q: [sep / 2 - rc, 0, 0], c: ORANGE, a: 0.25 + 0.7 * Math.abs(s), w: 1 + 2.4 * Math.abs(s), dash: true });
      sc.items = items;
    };
    sc.live(0); return sc;
  }

  /* ---- ion–dipole: hydration shell ---- */
  function ionScene(sym, q, nWater) {
    var ion = E.atomMol(sym, q), water = E.fromLibrary('H2O'), cat = q > 0, n = nWater || (Math.abs(q) > 1 || sym === 'Na' || sym === 'K' || sym === 'Cl' || sym === 'Br' || sym === 'I' ? 6 : 4), dirs = E.slots(n, 0).b, items = [], extra = [];
    var rI = E.ionRadius(sym, q).r / 100, OIdx = water.atoms.findIndex(function (x) { return x.s === 'O'; }), du = U.vnorm(water.dipole.vec), dist = cat ? rI + 1.38 : rI + 0.45;
    items = items.concat(SC.molScene(Object.assign({}, ion), { style: 'ball', lab: true, lp: false }).items.map(function (it) { if (it.t === 's') it.r = Math.max(0.3, rI * 0.62); return it; }));
    items.push({ t: 't', x: 0, y: 0, z: 0, text: (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '−'), c: q > 0 ? POS : NEG, size: 17, dy: -34 });
    dirs.forEach(function (d) {
      var dd = U.vnorm(d), fn = E.aligner(du, cat ? U.vmul(dd, -1) : dd), tmp = placed(water, fn, [0, 0, 0]), ref = cat ? OIdx : tmp.pos.reduce(function (bi, p, i) { return water.atoms[i].s === 'H' && (bi < 0 || U.vdot(p, dd) < U.vdot(tmp.pos[bi], dd)) ? i : bi; }, -1);
      var t = U.vsub(U.vmul(dd, dist), tmp.pos[ref]), W = placed(water, fn, t); items = items.concat(molItems(W, { lp: false, chg: false, lab: true }));
      extra.push({ t: 'l', p: [0, 0, 0], q: W.pos[ref], c: TEAL, a: 0.8, w: 1.8, dash: true });
    });
    return { radius: dist + 1.9, items: items.concat(extra), fog: false };
  }

  root.BSIMF = { analyze: analyze, hbondScene: hbondScene, dipoleScene: dipoleScene, londonScene: londonScene, ionScene: ionScene, molarMass: molarMass, keyOf: keyOf, alphaOf: alphaOf,
    data: { BP: BP, ALPHA: ALPHA, BP_ATOMS: BP_ATOMS, HYDRIDES: HYDRIDES, HYD: HYD, ENERGY: ENERGY } };
})(typeof window !== 'undefined' ? window : globalThis);
