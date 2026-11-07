/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-engine.js
   Pure computation, no DOM. Needs MC_ELEMENTS (elements.js) and BSData (bs-data.js). Exposes window.BSEngine.

   What it does
     · element helpers (metal/non-metal, valence electrons, radii, typical ions) — all read from elements.js
     · bond classification from the Pauling electronegativity difference + element class (metallic / ionic / polar / non-polar),
       ionic character by Pauling 1−exp(−Δχ²/4) and by Hannay–Smyth 0.16Δχ + 0.035Δχ²
     · a SMILES-lite reader → molecular graph → Lewis analysis (lone pairs, formal charges, octet state, resonance forms)
     · an automatic Lewis generator for A·Xn molecules (minimises formal charges, then expanded-octet use)
     · VSEPR (AXₙEₘ → electron geometry, shape, hybridisation) and a real 3D layout (bond lengths from averaged tables,
       Pauling's bond-order relation d(n) = d(1) − 71 pm·log n, angles from experiment where known, otherwise VSEPR)
     · bond-dipole model → net dipole, partial charges, polarity
     · ionic compounds: criss-cross formula, Shannon radii, Kapustinskii and Born–Landé lattice energy, radius-ratio structure
     · which compounds a set of 1–3 chosen elements can form
   ========================================================================== */
(function (root) {
  'use strict';
  var D = root.BSData, EL = root.MC_ELEMENTS || [];
  var bySym = {}, byZ = {};
  EL.forEach(function (e) { bySym[e.s] = e; byZ[e.n] = e; });
  var METALS = { alkali: 1, alkaline: 1, transition: 1, post: 1, lanthanide: 1, actinide: 1 };
  var K_COUL = 138935.46;            // e²·N_A/(4πε₀) in kJ·pm/mol
  var DEBYE = 4.80320;               // D per (e·Å)
  var LP_MOMENT = 0.5;               // D, empirical moment of one lone pair on a central atom (fits H₂O, NH₃, H₂S)

  function el(x) { return typeof x === 'number' ? byZ[x] : (typeof x === 'string' ? bySym[x] : x); }
  function isMetal(e) { return !!METALS[e.c]; }
  function valence(e) { if (e.b === 's' || e.b === 'p') return e.sh[e.sh.length - 1]; if (e.b === 'd') return e.g; return 3; }
  function covR(e) { return (D.COV[e.n - 1] || 170) / 100; }                       // Å
  function vdwR(e) { return (D.VDW[e.s] || (D.COV[e.n - 1] || 170) + 70) / 100; }   // Å
  function en(e) { return e.eg === null || e.eg === undefined ? null : e.eg; }
  function log10(x) { return Math.log(x) / Math.LN10; }
  function round(x, d) { var k = Math.pow(10, d || 0); return Math.round(x * k) / k; }
  function sub(n) { return String(n).replace(/\d/g, function (d) { return '₀₁₂₃₄₅₆₇₈₉'.charAt(+d); }); }
  function supCharge(q) { var s = Math.abs(q) === 1 ? '' : String(Math.abs(q)).replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(+d); }); return s + (q > 0 ? '⁺' : '⁻'); }

  /* ---------------------------------------------------------------- bond classification */
  function ionicPauling(d) { return 1 - Math.exp(-d * d / 4); }
  function ionicHS(d) { return 0.16 * d + 0.035 * d * d; }
  function classify(A, B) {
    A = el(A); B = el(B);
    var ea = en(A), eb = en(B), mA = isMetal(A), mB = isMetal(B);
    var r = { a: A.s, b: B.s, chiA: ea, chiB: eb, known: ea !== null && eb !== null };
    if (!r.known) { r.type = 'unknown'; return r; }
    var d = Math.abs(ea - eb);
    r.dChi = d; r.avg = (ea + eb) / 2; r.pauling = ionicPauling(d); r.hs = ionicHS(d);
    r.more = ea >= eb ? A.s : B.s; r.less = ea >= eb ? B.s : A.s;
    r.metals = (mA ? 1 : 0) + (mB ? 1 : 0);
    if (mA && mB) r.type = 'metallic';
    else if (d < 0.4) r.type = 'nonpolar';
    else if (d >= 1.7) r.type = 'ionic';
    else r.type = 'polar';
    r.borderline = (r.type === 'polar' && r.metals === 1 && d >= 1.2) || (r.type === 'ionic' && d < 2.0);
    return r;
  }

  /* ---------------------------------------------------------------- typical ions */
  function cationCharges(e) {
    e = el(e); if (D.CATIONS[e.s]) return D.CATIONS[e.s];
    if (e.c === 'alkali') return [1]; if (e.c === 'alkaline') return [2];
    if (e.c === 'post') return e.g >= 13 ? [e.g - 10] : [2];
    if (e.c === 'lanthanide') return [3]; if (e.c === 'actinide') return [3, 4];
    if (e.c === 'transition') return [2, 3];
    return [];
  }
  function anionCharge(e) {
    e = el(e); if (e.s === 'H') return -1;
    if (e.c !== 'nonmetal') return null;
    if (e.g === 17) return -1; if (e.g === 16) return -2; if (e.g === 15) return -3;
    return null;
  }
  function ionRadius(sym, q) {
    var k = sym + (q > 0 ? '+' : '-') + Math.abs(q); if (D.IONR[k]) return { r: D.IONR[k], est: false };
    var c = D.COV[el(sym).n - 1] || 170; return { r: q > 0 ? Math.max(40, c * 0.62) : c * 1.45, est: true };
  }
  function bornExp(sym) { var e = el(sym), n = e.n, q = ionQ(sym); var core = n - q;   // isoelectronic noble-gas core
    return core <= 2 ? 5 : core <= 10 ? 7 : core <= 18 ? 9 : core <= 36 ? 10 : 12; }
  function ionQ(sym) { var e = el(sym); var a = anionCharge(e); return isMetal(e) ? cationCharges(e)[0] : (a || 0); }

  /* ---------------------------------------------------------------- bonds: energies and lengths */
  function bkey(a, b, o) { var p = a < b ? [a, b] : [b, a]; return p[0] + (o === 2 ? '=' : o === 3 ? '#' : '-') + p[1]; }
  function bondEnergy(a, b, o) {
    var oi = Math.round(o), k = bkey(a, b, oi);
    if (Math.abs(o - oi) < 1e-6 && D.BOND[k]) return { v: D.BOND[k][0], src: 'table' };
    var s1 = D.BOND[bkey(a, b, 1)], f = oi >= 3 ? 2.3 : oi === 2 ? 1.75 : 1;
    if (s1) return { v: s1[0] * f * (o > 1 && Math.abs(o - oi) > 1e-6 ? (1 + (o - 1) * 0.75) / f : 1), src: 'est' };
    var da = D.BOND[bkey(a, a, 1)], db = D.BOND[bkey(b, b, 1)];
    if (da && db) { var d = Math.abs((en(el(a)) || 0) - (en(el(b)) || 0)); return { v: ((da[0] + db[0]) / 2 + 96.5 * d * d) * f, src: 'pauling' }; }
    return { v: 150 * f, src: 'rough' };
  }
  function bondLength(a, b, o) {            // Å
    var oi = Math.round(o), t = D.BOND[bkey(a, b, oi)], base;
    if (t && Math.abs(o - oi) < 1e-6) return t[1] / 100;
    var t1 = D.BOND[bkey(a, b, 1)]; base = t1 ? t1[1] / 100 : covR(el(a)) + covR(el(b));
    return o > 1 ? base - 0.71 * log10(o) : base;
  }

  /* ---------------------------------------------------------------- SMILES-lite reader */
  function parseSMILES(str) {
    var atoms = [], bonds = [], stack = [], prev = -1, order = 1, ring = {}, i = 0, m;
    while (i < str.length) {
      var c = str.charAt(i);
      if (c === '(') { stack.push(prev); i++; continue; }
      if (c === ')') { prev = stack.pop(); i++; continue; }
      if (c === '-') { order = 1; i++; continue; } if (c === '=') { order = 2; i++; continue; } if (c === '#') { order = 3; i++; continue; }
      if (/\d/.test(c)) {
        if (ring[c]) { bonds.push({ a: ring[c].at, b: prev, o: order > 1 ? order : ring[c].o }); delete ring[c]; } else ring[c] = { at: prev, o: order };
        order = 1; i++; continue;
      }
      var at;
      if (c === '[') {
        var j = str.indexOf(']', i); var inner = str.slice(i + 1, j);
        m = /^([A-Z][a-z]?)(?:H(\d*))?([+-]+\d*|\d*[+-]+)?$/.exec(inner); if (!m) throw new Error('SMILES: bad atom [' + inner + ']');
        var q = 0; if (m[3]) { var sg = m[3].indexOf('+') >= 0 ? 1 : -1, dg = /\d+/.exec(m[3]); q = sg * (dg ? +dg[0] : (m[3].match(/[+-]/g) || []).length); }
        at = { s: m[1], q: q, brk: true, h: m[2] === undefined ? (/H/.test(inner.slice(m[1].length, m[1].length + 1)) ? 1 : 0) : (m[2] === '' ? 1 : +m[2]) };
        i = j + 1;
      } else {
        var two = str.substr(i, 2);
        if (two === 'Cl' || two === 'Br') { at = { s: two, q: 0, brk: false }; i += 2; }
        else if ('BCNOPSFI'.indexOf(c) >= 0) { at = { s: c, q: 0, brk: false }; i++; }
        else throw new Error('SMILES: unexpected "' + c + '"');
      }
      atoms.push(at); var idx = atoms.length - 1;
      if (prev >= 0) bonds.push({ a: prev, b: idx, o: order });
      prev = idx; order = 1;
    }
    var heavy = atoms.length;
    for (var k = 0; k < heavy; k++) {
      var a = atoms[k], B = 0, nh;
      bonds.forEach(function (b) { if (b.a === k || b.b === k) B += b.o; });
      if (a.brk) nh = a.h || 0; else { var allowed = D.VAL[a.s] || [B], v = allowed.filter(function (x) { return x >= B; })[0]; nh = v === undefined ? 0 : v - B; }
      for (var h = 0; h < nh; h++) { atoms.push({ s: 'H', q: 0 }); bonds.push({ a: k, b: atoms.length - 1, o: 1 }); }
    }
    return { atoms: atoms, bonds: bonds };
  }

  /* ---------------------------------------------------------------- Lewis analysis */
  function analyze(mol) {
    var atoms = mol.atoms;
    atoms.forEach(function (a, i) { a.i = i; a.nbr = []; a.B = 0; a.el = el(a.s); });
    mol.bonds.forEach(function (b, k) { b.k = k; atoms[b.a].nbr.push(b.b); atoms[b.b].nbr.push(b.a); atoms[b.a].B += b.o; atoms[b.b].B += b.o; });
    var charge = 0, valTotal = 0, lonePairs = 0;
    atoms.forEach(function (a) {
      a.V = valence(a.el); a.L = a.V - a.q - a.B; a.lp = Math.floor(a.L / 2); a.unp = a.L % 2; a.E = a.lp + (a.unp ? 1 : 0);
      a.X = a.nbr.length; a.sn = a.X + a.E; a.period = a.el.p; a.around = a.L + 2 * a.B;
      var cap = a.s === 'H' || a.s === 'He' ? 2 : 8;
      a.state = a.L < 0 ? 'invalid' : a.unp ? 'radical' : a.around === cap ? (cap === 2 ? 'duet' : 'octet') : a.around > cap ? (a.period >= 3 ? 'expanded' : 'invalid') : 'deficient';
      charge += a.q; valTotal += a.V; lonePairs += a.lp;
    });
    mol.charge = charge; mol.valenceTotal = valTotal - charge; mol.bondPairs = mol.bonds.reduce(function (s, b) { return s + b.o; }, 0); mol.lonePairs = lonePairs;
    mol.radical = atoms.some(function (a) { return a.unp; });
    mol.formalSum = atoms.reduce(function (s, a) { return s + Math.abs(a.q); }, 0);
    return mol;
  }
  function clone(mol) { return { atoms: mol.atoms.map(function (a) { return { s: a.s, q: a.q, brk: a.brk }; }), bonds: mol.bonds.map(function (b) { return { a: b.a, b: b.b, o: b.o }; }) }; }

  function uniquePerms(arr) {                // distinct permutations of states (array of [o,q])
    var seen = {}, out = [];
    (function rec(cur, rest) {
      if (!rest.length) { var k = JSON.stringify(cur); if (!seen[k]) { seen[k] = 1; out.push(cur.slice()); } return; }
      var used = {};
      rest.forEach(function (x, i) { var kx = JSON.stringify(x); if (used[kx]) return; used[kx] = 1; cur.push(x); rec(cur, rest.slice(0, i).concat(rest.slice(i + 1))); cur.pop(); });
    })([], arr);
    return out;
  }
  function resonance(mol, arom) {
    var atoms = mol.atoms, groups = [];
    atoms.forEach(function (c) {
      var bySymbol = {};
      c.nbr.forEach(function (j) { if (atoms[j].nbr.length === 1 && atoms[j].s !== 'H') (bySymbol[atoms[j].s] = bySymbol[atoms[j].s] || []).push(j); });
      Object.keys(bySymbol).forEach(function (s) {
        var idx = bySymbol[s]; if (idx.length < 2) return;
        var st = idx.map(function (j) { return [bondOf(mol, c.i, j).o, atoms[j].q]; });
        if (st.some(function (x) { return x[0] !== st[0][0] || x[1] !== st[0][1]; })) groups.push({ c: c.i, idx: idx, st: st });
      });
    });
    function bondOf(m, a, b) { return m.bonds.filter(function (x) { return (x.a === a && x.b === b) || (x.a === b && x.b === a); })[0]; }
    var forms = [];
    if (arom) {
      var ring = mol.bonds.filter(function (b) { return atoms[b.a].s === 'C' && atoms[b.b].s === 'C'; });
      var f2 = clone(mol); f2.bonds.forEach(function (b, k) { if (atoms[b.a].s === 'C' && atoms[b.b].s === 'C') b.o = mol.bonds[k].o === 2 ? 1 : 2; });
      forms = [mol, f2]; mol.avgOrder = {}; ring.forEach(function (b) { mol.avgOrder[b.k] = 1.5; });
    } else if (groups.length) {
      var combos = [mol.bonds.map(function () { return null; })], lists = groups.map(function (g) { return uniquePerms(g.st); });
      var prod = [[]]; lists.forEach(function (L) { var nx = []; prod.forEach(function (p) { L.forEach(function (x) { if (nx.length < 12) nx.push(p.concat([x])); }); }); prod = nx; });
      prod.slice(0, 8).forEach(function (p) {
        var f = clone(mol);
        p.forEach(function (perm, gi) { groups[gi].idx.forEach(function (j, t) { var b = bondOf(f, groups[gi].c, j); b.o = perm[t][0]; f.atoms[j].q = perm[t][1]; }); });
        forms.push(f);
      });
      mol.avgOrder = {}; mol.avgCharge = {};
      groups.forEach(function (g) {
        var so = 0, sq = 0; g.st.forEach(function (x) { so += x[0]; sq += x[1]; });
        g.idx.forEach(function (j) { mol.avgOrder[bondOf(mol, g.c, j).k] = so / g.st.length; mol.avgCharge[j] = sq / g.st.length; });
      });
    }
    mol.forms = forms.map(function (f) { return f === mol ? mol : analyze(f); });
    mol.resonant = forms.length > 1;
    return mol;
  }
  function effOrder(mol, b) { return mol.avgOrder && mol.avgOrder[b.k] !== undefined ? mol.avgOrder[b.k] : b.o; }

  /* ---------------------------------------------------------------- automatic Lewis for A·Xn */
  function autoAXn(cs, ls, n) {
    var c = el(cs), l = el(ls); if (!c || !l || n < 1 || n > 7 || en(c) === null && c.s !== 'He') return null;
    if (c.s === 'H' && n > 1) return null;
    var HAL = { H: 1, F: 1, Cl: 1, Br: 1, I: 1 }, HYP = { F: 1, O: 1, Cl: 1, Br: 1 };
    if (isMetal(l)) return null;                                              // ligands are never metals
    if (isMetal(c) && !((c.s === 'Be' || c.s === 'Al') && l.g === 17)) return null;
    if (l.s !== 'H' && en(c) !== null && en(l) !== null && en(c) > en(l) + 0.3) return null;   // the central atom is the less electronegative one
    if (n === 1 && !(HAL[c.s] && HAL[l.s])) return null;                      // closed-shell diatomics are only meaningful for H/halogens
    if (n > ({ 2: 4, 3: 6, 4: 6 }[c.p] || 7)) return null;                   // coordination limit by period
    var Vc = valence(c), Vl = valence(l), T = Vc + n * Vl; if (T % 2) return null;
    var capL = l.s === 'H' ? 2 : 8, capC = c.s === 'H' ? 2 : 8, best = null, orders = [];
    var ligMax = l.s === 'H' || l.g === 17 ? 1 : l.g === 16 ? 2 : 3;
    (function rec(k, max) {
      if (k === n) { evalO(orders.slice()); return; }
      var top = Math.min(max, ligMax); for (var o = 1; o <= top; o++) { orders.push(o); rec(k + 1, o); orders.pop(); }
    })(0, 3);
    function evalO(o) {
      var sum = o.reduce(function (s, x) { return s + x; }, 0), Lt = 0, ok = true, fc = [];
      o.forEach(function (x) { var L = capL - 2 * x; if (L < 0) ok = false; Lt += L; fc.push(Vl - L - x); });
      if (!ok) return; var Lc = T - 2 * sum - Lt; if (Lc < 0 || Lc % 2) return;
      var around = Lc + 2 * sum;
      if (c.p === 2 || c.s === 'H') { if (around > capC) return; if (around < capC && !(c.g === 2 || c.g === 13)) return; if (around < capC && c.s === 'H') return; }
      else { if (around > (c.p >= 5 ? 16 : 14) || around < 8 && !(c.g === 2 || c.g === 13)) return; if (around > 8 && !HYP[l.s]) return; }
      var fcc = Vc - Lc - sum, all = fc.concat([fcc]), s1 = 0, mx = 0; all.forEach(function (x) { s1 += Math.abs(x); mx = Math.max(mx, Math.abs(x)); });
      var score = [s1, mx, Math.max(0, around - 8), around < capC ? 1 : 0];
      if (!best || cmp(score, best.score) < 0) best = { score: score, o: o, fc: fc, fcc: fcc };
    }
    function cmp(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
    if (!best || best.score[0] > 4) return null;
    var atoms = [{ s: cs, q: best.fcc }], bonds = [];
    best.o.forEach(function (o, i) { atoms.push({ s: ls, q: best.fc[i] }); bonds.push({ a: 0, b: i + 1, o: o }); });
    return { atoms: atoms, bonds: bonds, auto: true };
  }

  /* ---------------------------------------------------------------- vectors */
  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vlen(a) { return Math.sqrt(vdot(a, a)); }
  function vnorm(a) { var l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function rot(v, ax, ang) { var c = Math.cos(ang), s = Math.sin(ang); return vadd(vadd(vmul(v, c), vmul(vcross(ax, v), s)), vmul(ax, vdot(ax, v) * (1 - c))); }
  function perp(u) { var t = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; return vnorm(vcross(u, t)); }
  function aligner(a, b) {                   // rotation taking unit a onto unit b
    var d = vdot(a, b); if (d > 1 - 1e-9) return function (v) { return v; };
    if (d < -1 + 1e-9) { var ax = perp(a); return function (v) { return rot(v, ax, Math.PI); }; }
    var axis = vnorm(vcross(a, b)), ang = Math.acos(Math.max(-1, Math.min(1, d)));
    return function (v) { return rot(v, axis, ang); };
  }
  function deg(r) { return r * 180 / Math.PI; } function rad(d) { return d * Math.PI / 180; }

  /* canonical direction sets (unit vectors) for AXₙEₘ; theta = bond angle where it is variable */
  function slots(X, E, th) {
    var b = [], l = [], t, s, c, k;
    function ring(z, polar, n, off) { var out = []; for (k = 0; k < n; k++) { var f = rad(off || 0) + 2 * Math.PI * k / n; out.push([Math.sin(polar) * Math.cos(f), Math.sin(polar) * Math.sin(f), z === null ? Math.cos(polar) : z]); } return out; }
    if (X === 1) { b = [[0, 0, 1]]; if (E === 1) l = [[0, 0, -1]]; else if (E === 2) l = [[Math.sin(rad(60)), 0, -0.5], [-Math.sin(rad(60)), 0, -0.5]]; else if (E === 3) l = ring(null, rad(109.47 - 0), 3).map(function (v) { return [v[0], v[1], -Math.cos(rad(70.53))]; }).map(vnorm); return { b: b, l: l }; }
    var key = X + ',' + E;
    switch (key) {
      case '2,0': b = [[0, 0, 1], [0, 0, -1]]; break;
      case '3,0': b = ring(null, rad(120), 3).map(function (v) { return [v[0], v[1], v[2]]; }); b = [[0, 0, 1], [Math.sin(rad(120)), 0, Math.cos(rad(120))], [-Math.sin(rad(120)), 0, Math.cos(rad(120))]]; break;
      case '2,1': t = rad(th || 117); b = [[0, 0, 1], [Math.sin(t), 0, Math.cos(t)]]; l = [vnorm(vmul(vadd(b[0], b[1]), -1))]; break;
      case '2,2': t = rad(th || 104.5); b = [[0, 0, 1], [Math.sin(t), 0, Math.cos(t)]]; var m = vnorm(vmul(vadd(b[0], b[1]), -1)); c = Math.cos(rad(54.75)); s = Math.sin(rad(54.75)); l = [vnorm(vadd(vmul(m, c), [0, s, 0])), vnorm(vadd(vmul(m, c), [0, -s, 0]))]; break;
      case '2,3': b = [[0, 0, 1], [0, 0, -1]]; l = ring(0, rad(90), 3); break;
      case '4,0': b = [[0, 0, 1]].concat(ring(null, rad(109.4712), 3)); break;
      case '3,1': t = rad(th || 107); var al = Math.asin(Math.min(1, 2 / Math.sqrt(3) * Math.sin(t / 2))); b = ring(Math.cos(al), al, 3); b = [b[0], b[1], b[2]]; l = [[0, 0, -1]]; break;
      case '3,2': t = rad(87.5); b = [[Math.cos(t), 0, Math.sin(t)], [Math.cos(t), 0, -Math.sin(t)], [1, 0, 0]]; b = [b[0], b[1], b[2]].map(vnorm); l = [[Math.cos(rad(120)), Math.sin(rad(120)), 0], [Math.cos(rad(120)), -Math.sin(rad(120)), 0]]; break;
      case '5,0': b = [[0, 0, 1], [0, 0, -1]].concat(ring(0, rad(90), 3)); break;
      case '4,1': b = [[-Math.sin(rad(3.5)), 0, Math.cos(rad(3.5))], [-Math.sin(rad(3.5)), 0, -Math.cos(rad(3.5))], [Math.cos(rad(129)), Math.sin(rad(129)), 0], [Math.cos(rad(129)), -Math.sin(rad(129)), 0]]; l = [[1, 0, 0]]; break;
      case '6,1': b = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]; l = [vnorm([1, 1, 1])]; break;
      case '6,0': b = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]; break;
      case '5,1': t = rad(85); b = [[0, 0, 1]].concat(ring(Math.cos(t), t, 4)); l = [[0, 0, -1]]; break;
      case '4,2': b = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]; l = [[0, 0, 1], [0, 0, -1]]; break;
      case '7,0': b = [[0, 0, 1], [0, 0, -1]].concat(ring(0, rad(90), 5)); break;
      default: { var base = X + E <= 2 ? [[0, 0, 1], [0, 0, -1]] : X + E === 3 ? slots(3, 0).b : X + E === 4 ? slots(4, 0).b : X + E === 5 ? slots(5, 0).b : slots(6, 0).b; b = base.slice(0, X); l = base.slice(X, X + E); }
    }
    return { b: b, l: l };
  }
  function vseprKey(a) { return 'AX' + a.X + 'E' + a.E; }
  function vsepr(a) { var k = vseprKey(a), t = D.VSEPR[k]; return t ? { key: k, electron: t[0], shape: t[1], angles: t[2], hyb: t[3] } : { key: k, electron: 'oct', shape: 'oct', angles: '—', hyb: 'sp3d2' }; }
  function ligandsAreH(mol, a) { return a.nbr.every(function (j) { return mol.atoms[j].s === 'H'; }); }
  function angleFor(mol, a) {
    if (mol.ang && mol.centre === a.i) return mol.ang;
    var p3 = a.period >= 3, H = ligandsAreH(mol, a), F = a.nbr.some(function (j) { return mol.atoms[j].s === 'F'; });
    if (a.X === 2 && a.E === 1) return 117;
    if (a.X === 3 && a.E === 1) return p3 ? (H ? 93.5 : 100) : (F ? 102.5 : 107);
    if (a.X === 2 && a.E === 2) return p3 ? (H ? 92 : 103) : (H ? 104.5 : F ? 103 : 111);
    return null;
  }

  /* ---------------------------------------------------------------- 3D layout */
  function layout(mol) {
    var atoms = mol.atoms, pos = new Array(atoms.length), done = {};
    if (mol.arom) return layoutBenzene(mol);
    var root0 = 0, bestD = -1;
    atoms.forEach(function (a, i) { if (a.s !== 'H' && a.X > bestD) { bestD = a.X; root0 = i; } });
    if (bestD < 0) root0 = 0;
    var heavyMulti = atoms.filter(function (a) { return a.s !== 'H' && a.X >= 2; });
    mol.centre = heavyMulti.length === 1 ? heavyMulti[0].i : -1;
    function bondOrderBetween(i, j) { var b = mol.bonds.filter(function (x) { return (x.a === i && x.b === j) || (x.a === j && x.b === i); })[0]; return b; }
    function len(i, j) { var b = bondOrderBetween(i, j); return bondLength(atoms[i].s, atoms[j].s, effOrder(mol, b)); }
    function place(i, parent, u, ref) {
      var a = atoms[i], kids = a.nbr.filter(function (j) { return j !== parent; }), S = slots(a.X, a.E, angleFor(mol, a)), vecs = S.b.slice(), lps = S.l.slice();
      if (parent === null) kids.sort(function (p, q) { return bondOrderBetween(i, q).o - bondOrderBetween(i, p).o; });
      var order = (parent === null ? kids : [parent].concat(kids));
      if (parent !== null) {
        var R = aligner(vecs[0], u); vecs = vecs.map(R); lps = lps.map(R);
        if (vecs.length > 1) {                                            // torsion: first kid anti to the reference direction
          var p1 = vsub(vecs[1], vmul(u, vdot(vecs[1], u))), r1 = ref ? vsub(ref, vmul(u, vdot(ref, u))) : null;
          if (r1 && vlen(r1) > 1e-6 && vlen(p1) > 1e-6) {
            var ang = Math.atan2(vdot(vcross(p1, r1), u), vdot(p1, r1)) + Math.PI;      // rotate p1 so that it points away from r1
            vecs = vecs.map(function (v) { return rot(v, u, ang); }); lps = lps.map(function (v) { return rot(v, u, ang); });
          }
        }
      }
      a.lpDirs = lps; a.dirs = {};
      order.forEach(function (j, s) { a.dirs[j] = vecs[s]; });
      kids.forEach(function (j) {
        pos[j] = vadd(pos[i], vmul(a.dirs[j], len(i, j))); done[j] = 1;
      });
      kids.forEach(function (j) {
        var other = a.nbr.filter(function (x) { return x !== j; })[0]; var refv = other !== undefined ? a.dirs[other] : null;
        place(j, i, vmul(a.dirs[j], -1), refv);
      });
    }
    pos[root0] = [0, 0, 0]; done[root0] = 1; place(root0, null, null, null);
    atoms.forEach(function (a, i) { if (!pos[i]) pos[i] = [0, 0, 0]; });
    var cen = [0, 0, 0]; pos.forEach(function (p) { cen = vadd(cen, p); }); cen = vmul(cen, 1 / pos.length); mol.pos = pos.map(function (p) { return vsub(p, cen); });
    return mol;
  }
  function layoutBenzene(mol) {
    var ring = [], i, pos = new Array(mol.atoms.length), cc = 1.397, ch = 1.087;
    mol.atoms.forEach(function (a, k) { if (a.s === 'C') ring.push(k); });
    // walk the ring so that neighbours are adjacent
    var order = [ring[0]], seen = {}; seen[ring[0]] = 1;
    while (order.length < ring.length) { var last = order[order.length - 1], nx = mol.atoms[last].nbr.filter(function (j) { return mol.atoms[j].s === 'C' && !seen[j]; })[0]; if (nx === undefined) break; seen[nx] = 1; order.push(nx); }
    order.forEach(function (k, t) { var f = 2 * Math.PI * t / 6; pos[k] = [cc * Math.cos(f), cc * Math.sin(f), 0]; mol.atoms[k].nbr.forEach(function (j) { if (mol.atoms[j].s === 'H') pos[j] = [(cc + ch) * Math.cos(f), (cc + ch) * Math.sin(f), 0]; }); });
    mol.atoms.forEach(function (a) { a.lpDirs = []; a.dirs = {}; }); mol.pos = pos; mol.centre = -1; return mol;
  }

  /* ---------------------------------------------------------------- bond table, dipole, partial charges */
  function props(mol) {
    var atoms = mol.atoms;
    mol.bondInfo = mol.bonds.map(function (b) {
      var A = atoms[b.a], B = atoms[b.b], c = classify(A.s, B.s), o = effOrder(mol, b), e = bondEnergy(A.s, B.s, o);
      var len = mol.pos ? vlen(vsub(mol.pos[b.a], mol.pos[b.b])) * 100 : bondLength(A.s, B.s, o) * 100;
      return { k: b.k, a: b.a, b: b.b, order: o, cls: c, len: len, energy: e.v, src: e.src };
    });
    var q = atoms.map(function () { return 0; }), dip = [0, 0, 0];
    mol.bondInfo.forEach(function (bi) {
      if (!bi.cls.known) return; var f = bi.cls.hs * Math.max(1, bi.order > 1.01 ? bi.order : 1);
      var moreIdx = bi.cls.chiA >= bi.cls.chiB ? bi.a : bi.b, lessIdx = moreIdx === bi.a ? bi.b : bi.a;
      bi.moreIdx = moreIdx; bi.lessIdx = lessIdx; bi.delta = f;
      q[moreIdx] -= f; q[lessIdx] += f;
      if (mol.pos) { var d = vsub(mol.pos[moreIdx], mol.pos[lessIdx]); dip = vadd(dip, vmul(vnorm(d), f * vlen(d) * DEBYE)); }
    });
    var bondOnly = vlen(dip);
    if (mol.pos) atoms.forEach(function (a) { if (a.X >= 2 && a.lpDirs) a.lpDirs.forEach(function (d) { dip = vadd(dip, vmul(d, LP_MOMENT)); }); });   // empirical lone-pair term
    mol.partial = q; mol.dipole = { vec: dip, mag: vlen(dip), bondOnly: bondOnly, ionic: mol.charge !== 0 };
    if (mol.dipole.ionic || !mol.bonds.length) { mol.polar = false; mol.polarSource = 'ion'; }
    else if (mol.muExp !== null && mol.muExp !== undefined) { mol.polar = mol.muExp > 0.05; mol.polarSource = 'exp'; }
    else { mol.polar = mol.dipole.mag > 0.1; mol.polarSource = 'model'; }
    return mol;
  }

  /* ---------------------------------------------------------------- build a full molecule from graph / library */
  function sigOf(mol) { var c = {}; mol.atoms.forEach(function (a) { c[a.s] = (c[a.s] || 0) + 1; }); return Object.keys(c).sort().map(function (k) { return k + c[k]; }).join(''); }
  function plain(s) { return String(s).replace(/[₀-₉]/g, function (d) { return String(d.charCodeAt(0) - 8320); }).replace(/[⁺]/g, '+').replace(/[⁻]/g, '-').replace(/[²]/g, '2').replace(/[³]/g, '3'); }
  function buildGraph(g, meta) {
    var mol = analyze(g); meta = meta || {};
    mol.arom = !!meta.arom; mol.ang = meta.ang || null; mol.muExp = meta.mu === undefined ? null : meta.mu;
    resonance(mol, mol.arom); layout(mol); props(mol); mol.sig = sigOf(mol);
    mol.charged = mol.charge !== 0; mol.formula = meta.f || formulaOf(mol); mol.names = meta.n || null; mol.cat = meta.cat || (mol.auto ? 'generated' : 'other');
    mol.vsepr = mol.atoms.filter(function (a) { return a.s !== 'H' && a.X >= 2 || (a.X >= 1 && a.s !== 'H' && mol.atoms.length === 2 && false); }).map(function (a) { var v = vsepr(a); v.atom = a.i; v.s = a.s; return v; });
    return mol;
  }
  function formulaOf(mol) {
    var cnt = {}, order = [];
    mol.atoms.forEach(function (a) { if (!cnt[a.s]) { cnt[a.s] = 0; order.push(a.s); } cnt[a.s]++; });
    var heavy = mol.atoms.filter(function (a) { return a.s !== 'H'; }), cen = heavy.reduce(function (m, a) { return !m || a.X > m.X ? a : m; }, null);
    var first = cen && cen.s; order.sort(function (a, b) { return a === first ? -1 : b === first ? 1 : a === 'H' ? -1 * 0 + 1 : b === 'H' ? -1 : 0; });
    if (cen && cen.el.g >= 16 && cnt.H && order.length === 2) order = ['H', cen.s];
    var s = order.map(function (k) { return k + (cnt[k] > 1 ? sub(cnt[k]) : ''); }).join('');
    return mol.charge ? s + supCharge(mol.charge) : s;
  }

  function atomMol(sym, q) { var m = buildGraph({ atoms: [{ s: sym, q: q || 0 }], bonds: [] }, { f: sym + (q ? supCharge(q) : ''), cat: 'atom' }); m.pos = [[0, 0, 0]]; m.atoms[0].lpDirs = []; m.atoms[0].dirs = {}; return m; }
  var libCache = {}, LIBRARY = D.LIB.map(function (r, i) { var id = plain(r[0]).replace(/[()]/g, ''); return { id: id, i: i, f: r[0], smi: r[1], n: { en: r[2][0], el: r[2][1], es: r[2][2] }, cat: r[3], x: r[4] || {}, plain: plain(r[0]) }; });
  function fromLibrary(id) {
    if (libCache[id]) return libCache[id];
    var r = LIBRARY.filter(function (x) { return x.id === id; })[0]; if (!r) return null;
    var m = buildGraph(parseSMILES(r.smi), { f: r.f, n: r.n, cat: r.cat, ang: r.x.ang, mu: r.x.mu, arom: r.x.arom }); m.id = r.id; libCache[id] = m; return m;
  }
  function libSig(r) { var m = fromLibrary(r.id); return m.sig; }

  /* ---------------------------------------------------------------- search */
  function norm(s) { return plain(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s()·\-]/g, ''); }
  function search(q) {
    q = norm(q); if (!q) return LIBRARY.slice();
    return LIBRARY.filter(function (r) { return norm(r.plain).indexOf(q) >= 0 || norm(r.n.en).indexOf(q) >= 0 || norm(r.n.el).indexOf(q) >= 0 || norm(r.n.es).indexOf(q) >= 0; });
  }

  /* ---------------------------------------------------------------- ionic compounds */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function ionicCompound(cs, cq, as, aq) {
    var g = gcd(cq, -aq), nc = (-aq) / g, na = cq / g, C = el(cs), A = el(as);
    var rc = ionRadius(cs, cq), ra = ionRadius(as, aq), r0 = rc.r + ra.r, nu = nc + na;
    var kap = 120250 * nu * cq * (-aq) / r0 * (1 - 34.5 / r0), ratio = rc.r / ra.r, struct, M = null, proto = null;
    if (nc === 1 && na === 1) { struct = ratio >= 0.732 ? 'cscl' : ratio >= 0.414 ? 'nacl' : ratio >= 0.225 ? 'zns' : 'zns'; M = struct === 'cscl' ? 1.7627 : struct === 'nacl' ? 1.7476 : 1.6381; proto = struct; }
    else if (nc === 1 && na === 2 && ratio >= 0.65) { struct = 'fluorite'; M = 2.5194; proto = 'fluorite'; }
    else if (nc === 2 && na === 1 && 1 / ratio >= 0.65 || nc === 2 && na === 1) { struct = 'antifluorite'; M = 2.5194; proto = 'antifluorite'; }
    else struct = 'cluster';
    var n = (bornExp(cs) + bornExp(as)) / 2, bl = M ? K_COUL * M * cq * (-aq) / r0 * (1 - 1 / n) : null;
    return { cat: { s: cs, q: cq }, an: { s: as, q: aq }, nc: nc, na: na, formula: cs + (nc > 1 ? sub(nc) : '') + as + (na > 1 ? sub(na) : ''), r: { cat: rc.r, an: ra.r, est: rc.est || ra.est, sum: r0 }, ratio: ratio, structure: struct, madelung: M,
      kapustinskii: kap, bornLande: bl, bornN: n, cls: classify(cs, as), multi: !!D.MULTI[cs] };
  }
  function ionicNames(ic) {
    var C = el(ic.cat.s), A = el(ic.an.s), q = ic.cat.q, rom = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][q], multi = ic.multi;
    var anEn = { Cl: 'chloride', Br: 'bromide', I: 'iodide', F: 'fluoride', O: 'oxide', S: 'sulfide', N: 'nitride', H: 'hydride', P: 'phosphide', Se: 'selenide' }[A.s];
    var anEs = { Cl: 'cloruro', Br: 'bromuro', I: 'yoduro', F: 'fluoruro', O: 'óxido', S: 'sulfuro', N: 'nitruro', H: 'hidruro', P: 'fosfuro', Se: 'seleniuro' }[A.s];
    var anEl = { Cl: 'χλωριούχο', Br: 'βρωμιούχο', I: 'ιωδιούχο', F: 'φθοριούχο', S: 'θειούχο', Se: 'σεληνιούχο' }[A.s], anElId = { O: 'οξείδιο', N: 'νιτρίδιο', H: 'υδρίδιο', P: 'φωσφίδιο' }[A.s];
    function lc(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
    function plainGr(s) { return s.replace(/ά/g, 'α').replace(/έ/g, 'ε').replace(/ή/g, 'η').replace(/ί/g, 'ι').replace(/ό/g, 'ο').replace(/ύ/g, 'υ').replace(/ώ/g, 'ω'); }
    var gen = D.EL_GEN[C.el] || (/ιο$/.test(C.el) ? plainGr(lc(C.el)).replace(/ιο$/, 'ίου') : null);
    var masc = /ος$/.test(plainGr(C.el)), romStr = multi ? ' (' + rom + ')' : '';
    var en = anEn ? lc(C.en) + (multi ? '(' + rom + ')' : '') + ' ' + anEn : null;
    var es = anEs ? anEs + ' de ' + lc(C.es) + (multi ? '(' + rom + ')' : '') : null;
    var gr = null;
    if (anEl) { var adj = masc ? anEl.replace(/ο$/, 'ος') : anEl; gr = adj + ' ' + lc(C.el) + romStr; }
    else if (anElId && gen) gr = anElId + ' του ' + gen + romStr;
    return { en: en, el: gr, es: es };
  }
  function ionicCandidates(sa, sb) {
    var A = el(sa), B = el(sb), out = [], M, N;
    if (isMetal(A) && !isMetal(B)) { M = A; N = B; } else if (isMetal(B) && !isMetal(A)) { M = B; N = A; } else return out;
    var aq = anionCharge(N); if (!aq) return out;
    cationCharges(M).forEach(function (q) { var ic = ionicCompound(M.s, q, N.s, aq); ic.names = ionicNames(ic); out.push(ic); });
    return out;
  }
  var POLYN = { 'NH4': ['ammonium', 'αμμώνιο', 'amonio'], 'OH': ['hydroxide', 'υδροξείδιο', 'hidróxido'], 'NO3': ['nitrate', 'νιτρικ', 'nitrato'], 'NO2': ['nitrite', 'νιτρώδ', 'nitrito'], 'SO4': ['sulfate', 'θειικ', 'sulfato'],
    'SO3': ['sulfite', 'θειώδ', 'sulfito'], 'CO3': ['carbonate', 'ανθρακικ', 'carbonato'], 'PO4': ['phosphate', 'φωσφορικ', 'fosfato'], 'ClO4': ['perchlorate', 'υπερχλωρικ', 'perclorato'], 'CN': ['cyanide', 'κυανιούχ', 'cianuro'] };
  function polyNames(cs, cq, key) {
    var C = el(cs), t = POLYN[key], rom = ['', 'I', 'II', 'III', 'IV', 'V'][cq], multi = !!D.MULTI[cs];
    function lc(x) { return x.charAt(0).toLowerCase() + x.slice(1); } function plainGr(x) { return x.replace(/ά/g, 'α').replace(/έ/g, 'ε').replace(/ή/g, 'η').replace(/ί/g, 'ι').replace(/ό/g, 'ο').replace(/ύ/g, 'υ').replace(/ώ/g, 'ω'); }
    var gen = D.EL_GEN[C.el] || (/ιο$/.test(C.el) ? plainGr(lc(C.el)).replace(/ιο$/, 'ίου') : null), masc = /ος$/.test(plainGr(C.el)), rs = multi ? ' (' + rom + ')' : '';
    var en = lc(C.en) + (multi ? '(' + rom + ')' : '') + ' ' + t[0], es = t[2] + ' de ' + lc(C.es) + (multi ? '(' + rom + ')' : ''), gr = null;
    if (key === 'OH') gr = gen ? 'υδροξείδιο του ' + gen + rs : null;
    else { var stem = t[1], adj = /ώδ$/.test(stem) ? stem + (masc ? 'ης' : 'ες') : stem + (masc ? 'ός' : 'ό'); if (/ούχ$/.test(stem)) adj = stem + (masc ? 'ος' : 'ο'); gr = adj + ' ' + lc(C.el) + rs; }
    return { en: en, el: gr, es: es };
  }
  function polySalts(syms) {
    var out = [], set = {}; syms.forEach(function (s) { set[s] = 1; });
    syms.forEach(function (ms) {
      var M = el(ms); if (!isMetal(M) && ms !== 'H' && ms !== 'N') return;
      var rest = syms.filter(function (s) { return s !== ms; });
      D.POLY.forEach(function (p) {
        if (rest.length !== p.e.length || !p.e.every(function (x) { return rest.indexOf(x) >= 0; })) return;
        var cq = p.q > 0 ? null : cationCharges(M)[0]; if (!isMetal(M) || p.q > 0) return;
        var g = gcd(cq, -p.q), nc = (-p.q) / g, na = cq / g, pf = na > 1 ? '(' + p.f + ')' + sub(na) : p.f;
        out.push({ poly: true, cat: { s: ms, q: cq }, an: { f: p.f, q: p.q, id: p.id }, nc: nc, na: na, formula: ms + (nc > 1 ? sub(nc) : '') + pf, names: polyNames(ms, cq, plain(p.f)) });
      });
    });
    if (set.N && set.H && syms.length === 3) {                                  // ammonium salts with a monatomic anion
      var X = syms.filter(function (x) { return x !== 'N' && x !== 'H'; })[0], aq = X && anionCharge(X);
      if (aq && X !== 'O' && X !== 'H') {
        var g2 = gcd(1, -aq), nc2 = -aq / g2, na2 = 1 / g2, an = ionicNames({ cat: { s: 'Na', q: 1 }, an: { s: X }, multi: false });
        var nm = { en: 'ammonium ' + (an.en || '').split(' ')[1], es: (an.es || '').split(' ')[0] + ' de amonio', el: null };
        var adjEl = { Cl: 'χλωριούχο', Br: 'βρωμιούχο', I: 'ιωδιούχο', F: 'φθοριούχο', S: 'θειούχο', Se: 'σεληνιούχο' }[X]; if (adjEl) nm.el = adjEl + ' αμμώνιο';
        out.push({ poly: true, cat: { f: 'NH₄', q: 1, id: 'NH4+' }, an: { s: X, q: aq }, nc: nc2, na: na2, formula: (nc2 > 1 ? '(NH₄)' + sub(nc2) : 'NH₄') + X + (na2 > 1 ? sub(na2) : ''), names: nm });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- what can chosen elements form? */
  function compoundsFor(syms) {
    var res = { ionic: [], molecular: [], poly: [], metallic: null }, seen = {};
    var set = {}; syms.forEach(function (s) { set[s] = 1; });
    LIBRARY.forEach(function (r) {
      var m = fromLibrary(r.id), els = {}; m.atoms.forEach(function (a) { els[a.s] = 1; });
      var keys = Object.keys(els), inside = keys.every(function (k) { return set[k]; }), all = syms.every(function (s) { return els[s]; });
      if (!inside || !all) return;
      res.molecular.push({ id: r.id, mol: m, known: true }); seen[m.sig] = 1;
    });
    if (syms.length === 2) {
      var s1 = syms[0], s2 = syms[1];
      [[s1, s2], [s2, s1]].forEach(function (p) {
        var c = el(p[0]), l = el(p[1]);
        for (var n = 1; n <= 7; n++) {
          var g = autoAXn(p[0], p[1], n); if (!g) continue;
          var m = buildGraph(g, { cat: 'generated' }), key = m.sig; if (seen[key]) continue; seen[key] = 1;
          res.molecular.push({ mol: m, known: false });
        }
      });
      ionicCandidates(s1, s2).forEach(function (ic) { res.ionic.push(ic); });
      if (isMetal(el(s1)) && isMetal(el(s2))) res.metallic = classify(s1, s2);
    } else if (syms.length === 3) { polySalts(syms).forEach(function (x) { res.poly.push(x); }); }
    else if (syms.length === 1) { var e = el(syms[0]); if (isMetal(e)) res.metallic = classify(syms[0], syms[0]); }
    res.molecular.sort(function (a, b) { return (b.known ? 1 : 0) - (a.known ? 1 : 0) || a.mol.atoms.length - b.mol.atoms.length; });
    return res;
  }

  /* ---------------------------------------------------------------- energy curves for the bond lab */
  function ionPairCurve(cs, as) {
    var C = el(cs), A = el(as), cq = ionQ(cs), aq = anionCharge(A); if (cq !== 1 || aq !== -1) return null;
    var dE = C.ie - (A.ea || 0), r0 = ionRadius(cs, 1).r + ionRadius(as, -1).r, rho = 34.5, pts = [], ref = [], r;
    function E(rp) { return dE - K_COUL / rp + K_COUL * rho / (r0 * r0) * Math.exp(-(rp - r0) / rho); }
    for (r = 150; r <= 1000; r += 5) { pts.push([r, E(r)]); ref.push([r, 0]); }
    return { pts: pts, ref: ref, dE: dE, r0: r0, rStar: dE > 0 ? K_COUL / dE : null, Emin: E(r0), ie: C.ie, ea: A.ea || 0 };
  }
  function morseCurve(sa, sb, o) {
    var A = el(sa), B = el(sb), De = bondEnergy(sa, sb, o).v, re = bondLength(sa, sb, o) * 100, a = 0.0200, pts = [], r;
    for (r = re * 0.6; r <= re * 3.2; r += re / 80) { var x = 1 - Math.exp(-a * (r - re)); pts.push([r, De * x * x - De]); }
    return { pts: pts, De: De, re: re, a: a };
  }
  function typicalOrder(sa, sb) { if (sa !== sb) return 1; return { N: 3, O: 2 }[sa] || 1; }

  root.BSEngine = {
    el: el, isMetal: isMetal, valence: valence, covR: covR, vdwR: vdwR, en: en, classify: classify, ionicPauling: ionicPauling, ionicHS: ionicHS,
    cationCharges: cationCharges, anionCharge: anionCharge, ionRadius: ionRadius, bondEnergy: bondEnergy, bondLength: bondLength,
    parseSMILES: parseSMILES, analyze: analyze, buildGraph: buildGraph, autoAXn: autoAXn, vsepr: vsepr, library: LIBRARY, fromLibrary: fromLibrary, search: search,
    ionicCompound: ionicCompound, ionicNames: ionicNames, ionicCandidates: ionicCandidates, polySalts: polySalts, compoundsFor: compoundsFor,
    ionPairCurve: ionPairCurve, morseCurve: morseCurve, typicalOrder: typicalOrder, effOrder: effOrder, plain: plain, sub: sub, supCharge: supCharge, deg: deg,
    slots: slots, aligner: aligner, perp: perp, atomMol: atomMol,
    util: { aligner: aligner, perp: perp, rot: rot, vadd: vadd, vsub: vsub, vmul: vmul, vdot: vdot, vcross: vcross, vlen: vlen, vnorm: vnorm, rot: rot, round: round, K_COUL: K_COUL, DEBYE: DEBYE }
  };
})(typeof window !== 'undefined' ? window : globalThis);
