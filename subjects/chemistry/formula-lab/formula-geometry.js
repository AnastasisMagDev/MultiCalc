/* formula-geometry.js — 3D scene builder for the Chemical Formula Lab (pure logic, no DOM).
   FormulaGeometry.scene(analysis, FormulaEngine) -> {kind, lat, atoms[{el,x,y,z,r}], bonds[[i,j]], links[[i,j]],
   edges[[x1,y1,z1,x2,y2,z2]], halos[{a,ru,q}], bound}   (lengths in angstrom)
   kind: 'molecule' (VSEPR geometry) | 'lattice' (typical crystal structure, unit cell) | 'ions' (relaxed ion cluster,
   real geometry of polyatomic ions, hydrate waters) | 'blob' (schematic, structure unknown).
   Covalent radii: Cordero et al. 2008 (pm); ionic radii: Shannon, 6-coordinate (pm). Used for illustration only. */
(function (root) {
  'use strict';
  var RC = {}, RI = {};
  'H31 He28 Li128 Be96 B84 C76 N71 O66 F57 Ne58 Na166 Mg141 Al121 Si111 P107 S105 Cl102 Ar106 K203 Ca176 Sc170 Ti160 V153 Cr139 Mn139 Fe132 Co126 Ni124 Cu132 Zn122 Ga122 Ge120 As119 Se120 Br120 Kr116 Rb220 Sr195 Y190 Zr175 Mo154 Ag145 Cd144 In142 Sn139 Sb139 Te138 I139 Xe140 Cs244 Ba215 W162 Pt136 Au136 Hg132 Tl145 Pb146 Bi148'
    .split(' ').forEach(function (t) { var m = /^([A-Z][a-z]?)(\d+)$/.exec(t); RC[m[1]] = +m[2] / 100; });
  'Li1:76 Na1:102 K1:138 Rb1:152 Cs1:167 Cu1:77 Ag1:115 Tl1:150 Be2:45 Mg2:72 Ca2:100 Sr2:118 Ba2:135 Zn2:74 Cd2:95 Hg2:102 Pb2:119 Mn2:83 Fe2:78 Co2:75 Ni2:69 Cu2:73 Al3:54 Fe3:65 Ce4:87 Th4:94 U4:89 F-1:133 Cl-1:181 Br-1:196 I-1:220 O-2:140 S-2:184 Se-2:198 N-3:146'
    .split(' ').forEach(function (t) { var p = t.split(':'); RI[p[0]] = +p[1] / 100; });
  function cov(e) { return RC[e] || 1.5; }
  function dr(e) { return 0.28 + 0.35 * cov(e); }                 // ball radius in a ball-and-stick drawing
  var LV = { H: 1, F: 1, Cl: 1, Br: 1, I: 1, O: 2, S: 2, Se: 2, N: 3, C: 4 };
  var OXO = { Cl: 1, Br: 1, I: 1, S: 1, Se: 1, N: 1, P: 1, As: 1, C: 1, B: 1, Si: 1 };
  var D2R = Math.PI / 180;

  function unit(v) { var n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
  function geom(n, l) {
    var i, o = [], c, s;
    if (n === 1) return [[1, 0, 0]];
    if (n === 2 && (l === 0 || l === 3)) return [[1, 0, 0], [-1, 0, 0]];
    if (n === 2 && (l === 1 || l === 2)) { var th = (l === 1 ? 118 : 104.5) * D2R / 2; return [[Math.cos(th), Math.sin(th), 0], [Math.cos(th), -Math.sin(th), 0]]; }
    if (n === 3 && l === 0) { for (i = 0; i < 3; i++) o.push([Math.cos(i * 2.0944), Math.sin(i * 2.0944), 0]); return o; }
    if (n === 3 && l === 1) {
      c = Math.sqrt((Math.cos(107 * D2R) + 0.5) / 1.5); s = Math.sqrt(1 - c * c);
      for (i = 0; i < 3; i++) o.push([s * Math.cos(i * 2.0944), s * Math.sin(i * 2.0944), -c]); return o;
    }
    if (n === 3 && l === 2) return [[0, 0, 1], [0, 0, -1], [1, 0, 0]];
    if (n === 4 && l === 0) return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(unit);
    if (n === 4 && l === 1) { c = Math.cos(58.5 * D2R); s = Math.sin(58.5 * D2R); return [[0, 0, 1], [0, 0, -1], [c, s, 0], [c, -s, 0]]; }
    if (n === 4 && l === 2) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    if (n === 5 && l === 0) { o = [[0, 0, 1], [0, 0, -1]]; for (i = 0; i < 3; i++) o.push([Math.cos(i * 2.0944), Math.sin(i * 2.0944), 0]); return o; }
    if (n === 5 && l === 1) { s = Math.sin(100 * D2R); c = Math.cos(100 * D2R); o = [[0, 0, 1]]; for (i = 0; i < 4; i++) o.push([s * Math.cos(i * Math.PI / 2), s * Math.sin(i * Math.PI / 2), c]); return o; }
    if (n === 6 && l === 0) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    if (n === 7 && l === 0) { o = [[0, 0, 1], [0, 0, -1]]; for (i = 0; i < 5; i++) o.push([Math.cos(i * 1.2566), Math.sin(i * 1.2566), 0]); return o; }
    return null;
  }
  function expand(comp) { var l = []; Object.keys(comp).forEach(function (e) { for (var i = 0; i < comp[e]; i++) l.push(e); }); return l; }
  function perp(u) { var p = Math.abs(u[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1], c = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]]; return unit(c); }

  /* VSEPR: lone pairs = (valence electrons - charge - sum of ligand valences) / 2; oxo-acids/-anions get their H on O. */
  function vsepr(comp, q, E) {
    var els = Object.keys(comp), n = 0, list = expand(comp);
    els.forEach(function (e) { n += comp[e]; });
    function atom(e, x, y, z) { return { el: e, x: x, y: y, z: z, r: dr(e) }; }
    if (n === 1) return { atoms: [atom(list[0], 0, 0, 0)], bonds: [] };
    if (n === 2) { var d = cov(list[0]) + cov(list[1]); return { atoms: [atom(list[0], -d / 2, 0, 0), atom(list[1], d / 2, 0, 0)], bonds: [[0, 1]] }; }
    var cand = els.filter(function (e) { var i = E.info(e); return comp[e] === 1 && e !== 'H' && i && i.g >= 3; });
    if (!cand.length) return null;
    cand.sort(function (a, b) { return (E.info(a).eg || 9) - (E.info(b).eg || 9); });
    var X = cand[0], g = E.info(X).g, lig = [], sum = 0, i;
    if (g < 13) {   // d-block oxoanion, e.g. MnO4-, CrO4 2-: tetrahedral
      if (els.length === 2 && comp.O === 4) { var gm = geom(4, 0), A = [atom(X, 0, 0, 0)], B = []; gm.forEach(function (v, k) { var L = cov(X) + cov('O'); A.push(atom('O', v[0] * L, v[1] * L, v[2] * L)); B.push([0, k + 1]); }); return { atoms: A, bonds: B }; }
      return null;
    }
    var V = g - 10;
    var oxo = OXO[X] && els.every(function (e) { return e === X || e === 'O' || e === 'H'; }) && comp.H > 0 && comp.O > 0 && comp.H <= comp.O && (comp.O - comp.H >= 1 || X === 'Cl' || X === 'Br' || X === 'I');
    if (oxo) { for (i = 0; i < comp.O - comp.H; i++) { lig.push({ el: 'O', oh: false }); sum += 2; } for (i = 0; i < comp.H; i++) { lig.push({ el: 'O', oh: true }); sum += 1; } }
    else {
      list.splice(list.indexOf(X), 1);
      list.forEach(function (e) { lig.push({ el: e, oh: false }); sum += LV[e] || 99; });
      if (lig.some(function (L) { return !LV[L.el]; })) return null;
    }
    var lp = (V - q - sum) / 2;
    if (lp < 0 || lp !== Math.floor(lp)) return null;
    var vec = geom(lig.length, lp);
    if (!vec) return null;
    var atoms = [atom(X, 0, 0, 0)], bonds = [];
    lig.forEach(function (L, k) {
      var len = cov(X) + cov(L.el), v = vec[k], idx = atoms.length;
      atoms.push(atom(L.el, v[0] * len, v[1] * len, v[2] * len)); bonds.push([0, idx]);
      if (L.oh) {
        var w = [-v[0], -v[1], -v[2]], p = perp(v), t = 104.5 * D2R, L2 = cov('O') + cov('H');
        atoms.push(atom('H', atoms[idx].x + L2 * (Math.cos(t) * w[0] + Math.sin(t) * p[0]), atoms[idx].y + L2 * (Math.cos(t) * w[1] + Math.sin(t) * p[1]), atoms[idx].z + L2 * (Math.cos(t) * w[2] + Math.sin(t) * p[2])));
        bonds.push([idx, atoms.length - 1]);
      }
    });
    return { atoms: atoms, bonds: bonds };
  }

  /* schematic fallback: central atom + Fibonacci shells (structure unknown) */
  function blob(comp, E) {
    var CAP = 44, tot = 0, c2 = {}, f;
    Object.keys(comp).forEach(function (e) { tot += comp[e]; });
    f = Math.min(1, CAP / tot);
    Object.keys(comp).forEach(function (e) { c2[e] = Math.max(1, Math.round(comp[e] * f)); });
    var list = expand(c2), ci = 0, best = 1e9;
    list.forEach(function (e, i) { var s = c2[e] * 10 + (e === 'H' ? 100 : 0) + ((E.info(e) && E.info(e).eg) || 9); if (s < best) { best = s; ci = i; } });
    var c = list.splice(ci, 1)[0], atoms = [{ el: c, x: 0, y: 0, z: 0, r: dr(c) }], bonds = [], k = 0, ring = 0, i;
    while (k < list.length) {
      ring++; var cap = ring === 1 ? 6 : 6 + ring * 6, m = Math.min(cap, list.length - k), R = ring * 1.55;
      for (i = 0; i < m; i++, k++) {
        var h = -1 + 2 * (i + 0.5) / m, a = Math.acos(h), b = i * 2.39996 + ring, e = list[k];
        atoms.push({ el: e, x: R * Math.sin(a) * Math.cos(b), y: R * Math.cos(a), z: R * Math.sin(a) * Math.sin(b), r: dr(e) });
        bonds.push([ring === 1 ? 0 : 1 + (k % 6), atoms.length - 1]);
      }
    }
    return { atoms: atoms, bonds: bonds };
  }

  var LAT = { rs: 'LiF LiCl LiBr LiI NaF NaCl NaBr NaI KF KCl KBr KI RbF RbCl RbBr RbI CsF AgF AgCl AgBr MgO CaO SrO BaO MnO FeO CoO NiO MgS CaS SrS BaS PbS',
              cs: 'CsCl CsBr CsI TlCl TlBr', zb: 'ZnS CuCl CuBr CuI AgI BeS', fl: 'CaF2 SrF2 BaF2 CdF2 PbF2 HgF2 CeO2 ThO2 UO2', af: 'Li2O Na2O K2O Rb2O Li2S Na2S K2S' };
  function sig(c) { return Object.keys(c).sort().map(function (k) { return k + c[k]; }).join(''); }
  var latMap = null;
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function latType(counts, E) {
    var g = Object.keys(counts).reduce(function (x, k) { return gcd(x, counts[k]); }, 0), red = {};
    Object.keys(counts).forEach(function (k) { red[k] = counts[k] / g; }); counts = red;
    if (!latMap) { latMap = {}; Object.keys(LAT).forEach(function (t) { LAT[t].split(' ').forEach(function (f) { latMap[sig(E.analyze(f).partCounts[0])] = t; }); }); }
    return latMap[sig(counts)] || null;
  }
  function lattice(type, cat, an) {
    var rc = RI[cat.el + cat.q], ra = RI[an.el + an.q];
    if (!rc || !ra) return null;
    var d = rc + ra, h = [0, 0.5, 1], pts = [], i, j, a, S3 = Math.sqrt(3), P = [], N = [];
    function fcc() { var o = []; h.forEach(function (x) { h.forEach(function (y) { h.forEach(function (z) { o.push([x, y, z, (x === 0.5) + (y === 0.5) + (z === 0.5)]); }); }); }); return o; }
    var tet = []; [0.25, 0.75].forEach(function (x) { [0.25, 0.75].forEach(function (y) { [0.25, 0.75].forEach(function (z) { tet.push([x, y, z]); }); }); });
    if (type === 'rs') { a = 2 * d; fcc().forEach(function (p) { (p[3] % 2 === 0 ? P : N).push(p); }); }
    else if (type === 'cs') { a = 2 * d / S3; fcc().forEach(function (p) { if (p[3] === 0) P.push(p); }); N.push([0.5, 0.5, 0.5]); }
    else if (type === 'zb') { a = 4 * d / S3; fcc().forEach(function (p) { if (p[3] % 2 === 0) P.push(p); }); N = [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]]; }
    else if (type === 'fl') { a = 4 * d / S3; fcc().forEach(function (p) { if (p[3] % 2 === 0) P.push(p); }); N = tet; }
    else { a = 4 * d / S3; fcc().forEach(function (p) { if (p[3] % 2 === 0) N.push(p); }); P = tet; }
    var atoms = [];
    P.forEach(function (p) { atoms.push({ el: cat.el, x: (p[0] - 0.5) * a, y: (p[1] - 0.5) * a, z: (p[2] - 0.5) * a, r: 0.55 * rc, q: cat.q }); });
    N.forEach(function (p) { atoms.push({ el: an.el, x: (p[0] - 0.5) * a, y: (p[1] - 0.5) * a, z: (p[2] - 0.5) * a, r: 0.55 * ra, q: an.q }); });
    var bonds = [];
    for (i = 0; i < atoms.length; i++) for (j = i + 1; j < atoms.length; j++) {
      if ((atoms[i].q > 0) === (atoms[j].q > 0)) continue;
      if (Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y, atoms[i].z - atoms[j].z) <= d * 1.03) bonds.push([i, j]);
    }
    var e = [], s = [-a / 2, a / 2];
    s.forEach(function (u) { s.forEach(function (v) { e.push([-a / 2, u, v, a / 2, u, v], [u, -a / 2, v, u, a / 2, v], [u, v, -a / 2, u, v, a / 2]); }); });
    return { atoms: atoms, bonds: bonds, edges: e, lat: type };
  }

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function align(a, b) {
    var c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], s2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if (s2 < 1e-12) return c > 0 ? function (p) { return p; } : function (p) { return [-p[0], -p[1], -p[2]]; };
    var k = (1 - c) / s2;
    return function (p) {
      var cr = [v[1] * p[2] - v[2] * p[1], v[2] * p[0] - v[0] * p[2], v[0] * p[1] - v[1] * p[0]];
      return [p[0] + cr[0] + k * (v[1] * cr[2] - v[2] * cr[1]), p[1] + cr[1] + k * (v[2] * cr[0] - v[0] * cr[2]), p[2] + cr[2] + k * (v[0] * cr[1] - v[1] * cr[0])];
    };
  }

  /* ion cluster: units (ions / hydrate waters) relaxed under Coulomb attraction + atom-level excluded volume (deterministic) */
  function cluster(units, seed) {
    var rnd = mulberry(seed), N = units.length, i, j, it, k, P = [], F;
    var R0 = Math.cbrt(units.reduce(function (s, u) { return s + Math.pow(u.ru, 3); }, 0)) * 1.2;
    units.forEach(function (u, n) {
      var h = N === 1 ? 0 : -1 + 2 * (n + 0.5) / N, a = Math.acos(h), b = n * 2.39996;
      P.push([R0 * Math.sin(a) * Math.cos(b), R0 * Math.cos(a), R0 * Math.sin(a) * Math.sin(b)]);
      u.qe = u.q !== 0 ? u.q : -0.6;
      var rz = align([0, 0, 1], unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]));
      u.ra = u.atoms.map(function (a2) { return rz([a2.x, a2.y, a2.z]); });
    });
    function orient(u, n) {   // water-like units: point the O toward the nearest cation
      var best = -1, bd = 1e9, oi = 0, hm = [0, 0, 0], nh = 0;
      units.forEach(function (v, m) { if (v.q > 0) { var d = Math.hypot(P[m][0] - P[n][0], P[m][1] - P[n][1], P[m][2] - P[n][2]); if (d < bd) { bd = d; best = m; } } });
      if (best < 0) return;
      u.atoms.forEach(function (a2, t) { if (a2.el === 'O') oi = t; if (a2.el === 'H') { hm[0] += a2.x; hm[1] += a2.y; hm[2] += a2.z; nh++; } });
      var from = unit([u.atoms[oi].x - hm[0] / (nh || 1), u.atoms[oi].y - hm[1] / (nh || 1), u.atoms[oi].z - hm[2] / (nh || 1)]);
      var rot = align(from, unit([P[best][0] - P[n][0], P[best][1] - P[n][1], P[best][2] - P[n][2]]));
      u.ra = u.atoms.map(function (a2) { return rot([a2.x, a2.y, a2.z]); });
    }
    for (it = 0; it < 360; it++) {
      if (it % 40 === 0) units.forEach(function (u, n) { if (u.q === 0) orient(u, n); });
      F = P.map(function () { return [0, 0, 0]; });
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
        var dx = [P[j][0] - P[i][0], P[j][1] - P[i][1], P[j][2] - P[i][2]], d = Math.hypot(dx[0], dx[1], dx[2]) || 1e-3, f = 0, qq = units[i].qe * units[j].qe;
        if (units[i].q === 0 && units[j].q === 0) qq = 0.1;
        if ((units[i].q === 0 && units[j].q < 0) || (units[j].q === 0 && units[i].q < 0)) qq = 0.2;
        f += 1.0 * qq / (d * d + 2);                                  // positive = repulsion (like charges), negative = attraction
        var m = (units[i].ru + units[j].ru) * 0.9; if (units[i].q * units[j].q > 0) m = Math.max(m, 2.4); if (d < m) f += (m - d) * 3;
        for (var c = 0; c < 3; c++) { F[i][c] -= f * dx[c] / d; F[j][c] += f * dx[c] / d; }
        for (var a1 = 0; a1 < units[i].atoms.length; a1++) for (var a2 = 0; a2 < units[j].atoms.length; a2++) {
          var A = units[i].ra[a1], B = units[j].ra[a2], v = [P[j][0] + B[0] - P[i][0] - A[0], P[j][1] + B[1] - P[i][1] - A[1], P[j][2] + B[2] - P[i][2] - A[2]];
          var dd = Math.hypot(v[0], v[1], v[2]) || 1e-3, mn = units[i].atoms[a1].r + units[j].atoms[a2].r + 0.15;
          if (dd < mn) { var g = (mn - dd) * 30; for (var c2 = 0; c2 < 3; c2++) { F[i][c2] -= g * v[c2] / dd; F[j][c2] += g * v[c2] / dd; } }
        }
      }
      for (i = 0; i < N; i++) for (k = 0; k < 3; k++) { F[i][k] -= 0.04 * P[i][k]; P[i][k] += Math.max(-0.25, Math.min(0.25, F[i][k] * 0.15)); }
    }
    for (it = 0; it < 300; it++) {   // position-based projection: remove any residual atom overlap between different units
      var moved = false;
      for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
        if (units[i].q * units[j].q > 0) {   // like charges never sit closer than 2.4 angstrom
          var cv = [P[j][0] - P[i][0], P[j][1] - P[i][1], P[j][2] - P[i][2]], cd = Math.hypot(cv[0], cv[1], cv[2]) || 1e-3;
          if (cd < 2.4) { var cs = (2.4 - cd) / 2 + 1e-3; moved = true; for (var cc = 0; cc < 3; cc++) { P[i][cc] -= cs * cv[cc] / cd; P[j][cc] += cs * cv[cc] / cd; } }
        }
        for (var a1 = 0; a1 < units[i].atoms.length; a1++) for (var a2 = 0; a2 < units[j].atoms.length; a2++) {
          var A = units[i].ra[a1], B = units[j].ra[a2], v = [P[j][0] + B[0] - P[i][0] - A[0], P[j][1] + B[1] - P[i][1] - A[1], P[j][2] + B[2] - P[i][2] - A[2]];
          var dd = Math.hypot(v[0], v[1], v[2]) || 1e-3, mn = units[i].atoms[a1].r + units[j].atoms[a2].r + 0.1;
          if (dd < mn) { var sh = (mn - dd) / 2 + 1e-3; moved = true; for (var c = 0; c < 3; c++) { P[i][c] -= sh * v[c] / dd; P[j][c] += sh * v[c] / dd; } }
        }
      }
      if (!moved) break;
    }
    var atoms = [], bonds = [], halos = [], idx = [];
    units.forEach(function (u, n) {
      var base = atoms.length;
      u.atoms.forEach(function (a2, t) { atoms.push({ el: a2.el, x: P[n][0] + u.ra[t][0], y: P[n][1] + u.ra[t][1], z: P[n][2] + u.ra[t][2], r: a2.r, q: u.q }); });
      u.bonds.forEach(function (b2) { bonds.push([base + b2[0], base + b2[1]]); });
      idx.push(base);
      if (u.q !== 0) halos.push({ a: base, ru: u.ru * 1.15, q: u.q });
    });
    var links = [], seen = {};
    units.forEach(function (u, i2) {
      if (u.q === 0) return;
      var near = [];
      units.forEach(function (v, j2) { if (j2 !== i2 && (u.q > 0 ? v.q < 0 : v.q > 0)) near.push([Math.hypot(P[i2][0] - P[j2][0], P[i2][1] - P[j2][1], P[i2][2] - P[j2][2]), j2]); });
      near.sort(function (x, y) { return x[0] - y[0]; }).slice(0, 3).forEach(function (n2) {
        var lo = Math.min(idx[i2], idx[n2[1]]), hi = Math.max(idx[i2], idx[n2[1]]), key = lo + '-' + hi;
        if (!seen[key]) { seen[key] = 1; links.push([lo, hi]); }
      });
    });
    return { atoms: atoms, bonds: bonds, links: links, halos: halos };
  }

  /* ============ extended crystals (large numbers): exact-stoichiometry crystallites, close-packed ion arrays ============ */
  var METAL = {};
  function defM(type, list) { list.split(' ').forEach(function (t) { var m = /^([A-Z][a-z]?)(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(t); METAL[m[1]] = [type, +m[2], m[3] ? +m[3] : 0]; }); }
  defM('bcc', 'Li3.51 Na4.23 K5.23 Rb5.59 Cs6.05 Ba5.02 V3.03 Cr2.88 Fe2.87 Nb3.30 Mo3.15 Ta3.30 W3.16');
  defM('fcc', 'Al4.05 Ca5.58 Sr6.08 Ni3.52 Cu3.61 Rh3.80 Pd3.89 Ag4.09 Ir3.84 Pt3.92 Au4.08 Pb4.95 Th5.08');
  defM('hcp', 'Be2.29/3.58 Mg3.21/5.21 Sc3.31/5.27 Ti2.95/4.68 Co2.51/4.07 Zn2.66/4.95 Y3.65/5.73 Zr3.23/5.15 Ru2.71/4.28 Cd2.98/5.62 Hf3.19/5.05 Re2.76/4.46 Os2.74/4.32 Tl3.46/5.52');
  var DIAM = { C: 3.567, Si: 5.431, Ge: 5.658 };
  var FCC = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], OCT = [[0.5, 0.5, 0.5], [0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]], TET = [];
  [0.25, 0.75].forEach(function (x) { [0.25, 0.75].forEach(function (y) { [0.25, 0.75].forEach(function (z) { TET.push([x, y, z]); }); }); });
  function shifted(b, s) { return b.map(function (p) { return [(p[0] + s[0]) % 1, (p[1] + s[1]) % 1, (p[2] + s[2]) % 1]; }); }
  function cub(a) { return [[a, 0, 0], [0, a, 0], [0, 0, a]]; }
  function sp(n, list) { return list.map(function (p) { return [n, p[0], p[1], p[2]]; }); }
  function spec(type, a, c) {
    if (type === 'fcc') return { vec: cub(a), sites: sp(0, FCC), cheb: true, d: a / Math.SQRT2 };
    if (type === 'bcc') return { vec: cub(a), sites: sp(0, [[0, 0, 0], [0.5, 0.5, 0.5]]), cheb: true, d: a * Math.sqrt(3) / 2 };
    if (type === 'hcp') return { vec: [[a, 0, 0], [a / 2, a * Math.sqrt(3) / 2, 0], [0, 0, c]], sites: sp(0, [[0, 0, 0], [1 / 3, 1 / 3, 0.5]]), cheb: false, d: a };
    if (type === 'di') return { vec: cub(a), sites: sp(0, FCC.concat(shifted(FCC, [0.25, 0.25, 0.25]))), cheb: true, d: a * Math.sqrt(3) / 4 };
    if (type === 'rs') return { vec: cub(a), sites: sp(0, FCC).concat(sp(1, shifted(FCC, [0.5, 0, 0]))), cheb: true, d: a / 2 };
    if (type === 'cs') return { vec: cub(a), sites: sp(0, [[0, 0, 0]]).concat(sp(1, [[0.5, 0.5, 0.5]])), cheb: true, d: a * Math.sqrt(3) / 2 };
    if (type === 'zb') return { vec: cub(a), sites: sp(0, FCC).concat(sp(1, shifted(FCC, [0.25, 0.25, 0.25]))), cheb: true, d: a * Math.sqrt(3) / 4 };
    if (type === 'fl') return { vec: cub(a), sites: sp(0, FCC).concat(sp(1, TET)), cheb: true, d: a * Math.sqrt(3) / 4 };
    return { vec: cub(a), sites: sp(1, FCC).concat(sp(0, TET)), cheb: true, d: a * Math.sqrt(3) / 4 };   // 'af'
  }
  /* pick the atoms nearest the centre (cube-like for cubic crystals) with exact counts per species */
  function grow(sp0, counts) {
    var tot = counts.reduce(function (s, c) { return s + c; }, 0), nb = sp0.sites.length, v = sp0.vec, R = Math.ceil(Math.cbrt(tot / nb * 1.6) / 2) + 2, out;
    var c0 = [0, 1, 2].map(function (k) { return (v[0][k] + v[1][k] + v[2][k]) / 2; });
    for (var tries = 0; tries < 6; tries++, R += 2) {
      var cand = [], i, j, k, q;
      for (i = -R; i <= R; i++) for (j = -R; j <= R; j++) for (k = -R; k <= R; k++) for (q = 0; q < nb; q++) {
        var st = sp0.sites[q], f0 = i + st[1], f1 = j + st[2], f2 = k + st[3];
        var x = v[0][0] * f0 + v[1][0] * f1 + v[2][0] * f2 - c0[0], y = v[0][1] * f0 + v[1][1] * f1 + v[2][1] * f2 - c0[1], z = v[0][2] * f0 + v[1][2] * f1 + v[2][2] * f2 - c0[2];
        cand.push({ sp: st[0], x: x, y: y, z: z, m: (sp0.cheb ? Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) : Math.hypot(x, y, z)) + 1e-4 * Math.hypot(x, y, z) });
      }
      cand.sort(function (a, b) { return a.m - b.m; });
      var left = counts.slice(), need = tot; out = [];
      for (i = 0; i < cand.length && need > 0; i++) if (left[cand[i].sp] > 0) { left[cand[i].sp]--; need--; out.push(cand[i]); }
      if (need === 0) break;
    }
    return out;
  }
  function crystal(lat, sp0, counts, els, radii, qs, cap) {
    var tot = counts.reduce(function (s, c) { return s + c; }, 0), shown = counts, f = 1;
    if (tot > cap) { f = cap / tot; shown = counts.map(function (c) { return Math.max(1, Math.round(c * f)); }); }
    var sel = grow(sp0, shown), maxm = 0, atoms;
    sel.forEach(function (p) { if (p.m > maxm) maxm = p.m; });
    atoms = sel.map(function (p) { return { el: els[p.sp], x: p.x, y: p.y, z: p.z, r: radii[p.sp], q: qs ? qs[p.sp] : 0, surf: p.m >= maxm - 1.6 * sp0.d }; });
    return { kind: 'crystal', lat: lat, atoms: atoms, bonds: [], sample: f < 1 ? [atoms.length, tot] : null, nn: sp0.d };
  }
  function nnBonds(sc, opposite) {   // brute force, only for small structures
    var A = sc.atoms, b = [], d2 = Math.pow(sc.nn * 1.06, 2), i, j;
    if (A.length > 1500) return;
    for (i = 0; i < A.length; i++) for (j = i + 1; j < A.length; j++) {
      if (opposite && (A[i].q > 0) === (A[j].q > 0)) continue;
      var dx = A[i].x - A[j].x, dy = A[i].y - A[j].y, dz = A[i].z - A[j].z;
      if (dx * dx + dy * dy + dz * dz <= d2) b.push([i, j]);
    }
    sc.bonds = b;
  }
  function c60() {
    var ph = (1 + Math.sqrt(5)) / 2, base = [[0, 1, 3 * ph], [1, 2 + ph, 2 * ph], [ph, 2, 2 * ph + 1]], seen = {}, pts = [], s = 0.71;
    base.forEach(function (t) {
      [[0, 1, 2], [1, 2, 0], [2, 0, 1]].forEach(function (o) {
        [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) {
          var p = [t[o[0]] * a, t[o[1]] * b, t[o[2]] * c], key = p.map(function (v) { return v.toFixed(4); }).join();
          if (!seen[key]) { seen[key] = 1; pts.push(p); }
        }); }); });
      });
    });
    var atoms = pts.map(function (p) { return { el: 'C', x: p[0] * s, y: p[1] * s, z: p[2] * s, r: dr('C'), q: 0 }; }), bonds = [], i, j;
    for (i = 0; i < atoms.length; i++) for (j = i + 1; j < atoms.length; j++) if (Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y, atoms[i].z - atoms[j].z) < 2 * s * 1.05) bonds.push([i, j]);
    return { kind: 'crystal', lat: 'c60', atoms: atoms, bonds: bonds };
  }
  function ion1(el, q) {
    var r0 = cov(el) * 0.85, ri = RI[el + q], r1 = (ri || (q > 0 ? cov(el) * Math.max(0.3, 1 - 0.18 * q) : cov(el) * (1 + 0.12 * Math.abs(q)))) * 0.85;
    return { kind: 'ion1', atoms: [{ el: el, x: 0, y: 0, z: 0, r: r1, q: q }], bonds: [], ion: { q: q, r0: r0, r1: r1 }, halos: [{ a: 0, ru: Math.max(r0, r1) * 1.5, q: q > 0 ? 1 : -1 }], bb: Math.max(r0, r1) * 2.8 };
  }
  function unitOf(comp, q, E) {
    var g = vsepr(comp, q, E) || blob(comp, E), cx = 0, cy = 0, cz = 0, ru = 0;
    g.atoms.forEach(function (a) { cx += a.x; cy += a.y; cz += a.z; }); cx /= g.atoms.length; cy /= g.atoms.length; cz /= g.atoms.length;
    var atoms = g.atoms.map(function (a) { return { el: a.el, x: a.x - cx, y: a.y - cy, z: a.z - cz, r: a.r }; });
    atoms.forEach(function (a) { ru = Math.max(ru, Math.hypot(a.x, a.y, a.z) + a.r); });
    return { atoms: atoms, bonds: g.bonds, q: q, ru: ru };
  }
  /* any other ionic compound with many units: the biggest ion forms a close-packed (fcc) array, the others sit in its holes */
  function pack(io, E, seed, totalAtoms) {
    var types = io.ions.map(function (p) {
      var rr = 0.55 * (RI[p.f + p.q] || 1.2), comp = p.mono ? null : E.analyze(p.f).partCounts[0];
      return { u: p.mono ? { atoms: [{ el: p.f, x: 0, y: 0, z: 0, r: rr }], bonds: [], q: p.q, ru: rr } : unitOf(comp, p.q, E), n: p.n, q: p.q };
    });
    var tot = types.reduce(function (s, t) { return s + t.n; }, 0), f = Math.min(1, 700 / tot);
    types.forEach(function (t) { t.n = Math.max(1, Math.round(t.n * f)); });
    var host = types.slice().sort(function (a, b) { return b.u.ru - a.u.ru || a.q - b.q; })[0], guests = types.filter(function (t) { return t !== host; });
    var G = guests.reduce(function (s, t) { return s + t.n; }, 0), cap = 2 * host.n;
    if (G > cap) { guests.forEach(function (t) { t.n = Math.max(1, Math.floor(t.n * cap / G)); }); G = guests.reduce(function (s, t) { return s + t.n; }, 0); }
    var dh = 2 * host.u.ru * 1.12, a = dh * Math.SQRT2, oct = G <= host.n;
    var sel = grow({ vec: cub(a), sites: sp(0, FCC).concat(sp(1, OCT), sp(2, TET)), cheb: true }, [host.n, oct ? G : 0, oct ? 0 : G]);
    var maxm = 0; sel.forEach(function (p) { if (p.m > maxm) maxm = p.m; });
    var queue = [], idx = guests.map(function () { return 0; });
    for (var k = 0; k < G; k++) { var bt = 0, bv = 1e9; guests.forEach(function (t, i) { var fr = idx[i] / t.n; if (idx[i] < t.n && fr < bv) { bv = fr; bt = i; } }); idx[bt]++; queue.push(guests[bt]); }
    var rnd = mulberry(seed), gi = 0, atoms = [], bonds = [];
    sel.forEach(function (p) {
      var t = p.sp === 0 ? host : queue[gi++], rot = align([0, 0, 1], unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5])), base = atoms.length;
      t.u.atoms.forEach(function (at) { var v = rot([at.x, at.y, at.z]); atoms.push({ el: at.el, x: p.x + v[0], y: p.y + v[1], z: p.z + v[2], r: at.r, q: t.q, surf: p.m >= maxm - 1.5 * dh }); });
      t.u.bonds.forEach(function (b) { bonds.push([base + b[0], base + b[1]]); });
    });
    return { kind: 'crystal', lat: 'pk', atoms: atoms, bonds: bonds, sample: f < 1 || G < guests.reduce(function (s, t) { return s + t.n; }, 0) ? [atoms.length, totalAtoms] : null, approx: f < 1 };
  }
  function bigScene(r, E, io, seed) {
    var A = r.atoms, sc, el, n;
    if (r.charge) return (A.length === 1 && r.total === 1) ? ion1(A[0].el, r.charge) : null;
    if (r.parts > 1) return null;
    if (A.length === 1) {
      el = A[0].el; n = A[0].count;
      if (el === 'C' && n === 60) return c60();
      if (METAL[el] && n >= 2) {
        var m = METAL[el], s0 = spec(m[0], m[1], m[2]);
        sc = crystal(m[0], s0, [n], [el], [0.46 * s0.d], null, 6000); return sc;
      }
      if (DIAM[el] && n >= 8) {
        var s1 = spec('di', DIAM[el]);
        sc = crystal('di', s1, [n], [el], [0.28 * s1.d], null, 3000); nnBonds(sc, false); return sc;
      }
      return null;
    }
    if (!io || io.status !== 'ok' || io.extra.length) return null;
    var lt = io.ions.length === 2 && io.ions[0].mono && io.ions[1].mono ? latType(r.partCounts[0], E) : null;
    if (lt && r.total > 12) {
      var c = io.ions[0], an = io.ions[1], rc = RI[c.f + c.q], ra = RI[an.f + an.q];
      if (rc && ra) {
        var d = rc + ra, a = lt === 'rs' ? 2 * d : lt === 'cs' ? 2 * d / Math.sqrt(3) : 4 * d / Math.sqrt(3), s2 = spec(lt, a);
        sc = crystal(lt, s2, [c.n, an.n], [c.f, an.f], [0.55 * rc, 0.55 * ra], [c.q, an.q], 6000); nnBonds(sc, true); return sc;
      }
    }
    var units = io.ions.reduce(function (s, p) { return s + p.n; }, 0);
    return units > 14 ? pack(io, E, seed, r.total) : null;
  }

  function scene(r, E) {
    if (!r || !r.ok) return null;
    var io = E.ionic(r), sc = null, h = 2166136261, k;
    for (k = 0; k < r.norm.length; k++) h = Math.imul(h ^ r.norm.charCodeAt(k), 16777619);
    sc = bigScene(r, E, io, h >>> 0);
    function asUnit(comp, q) {
      var g = vsepr(comp, q, E) || blob(comp, E), ru = 0;
      var cx = 0, cy = 0, cz = 0; g.atoms.forEach(function (a) { cx += a.x; cy += a.y; cz += a.z; }); cx /= g.atoms.length; cy /= g.atoms.length; cz /= g.atoms.length;
      var atoms = g.atoms.map(function (a) { return { el: a.el, x: a.x - cx, y: a.y - cy, z: a.z - cz, r: a.r }; });
      atoms.forEach(function (a) { ru = Math.max(ru, Math.hypot(a.x, a.y, a.z) + a.r); });
      return { atoms: atoms, bonds: g.bonds, q: q, ru: ru };
    }
    if (sc) { /* extended structure built above */ }
    else if (r.charge || !io || io.status !== 'ok') {
      var v = r.partCounts.length === 1 ? vsepr(r.partCounts[0], r.charge || 0, E) : null;
      sc = v ? { kind: 'molecule', atoms: v.atoms, bonds: v.bonds } : (function () { var tot = {}; r.partCounts.forEach(function (c) { Object.keys(c).forEach(function (e) { tot[e] = (tot[e] || 0) + c[e]; }); }); var b = blob(tot, E); return { kind: 'blob', atoms: b.atoms, bonds: b.bonds }; })();
    } else {
      var lt = io.extra.length === 0 && io.ions.length === 2 && io.ions[0].mono && io.ions[1].mono ? latType(r.partCounts[0], E) : null;
      var L = lt ? lattice(lt, { el: io.ions[0].f, q: io.ions[0].q }, { el: io.ions[1].f, q: io.ions[1].q }) : null;
      if (L) sc = { kind: 'lattice', lat: lt, atoms: L.atoms, bonds: L.bonds, edges: L.edges };
      else {
        var units = [], tot = io.ions.reduce(function (s, p) { return s + p.n; }, 0), extra = [];
        io.extra.forEach(function (src) { var m = /^(\d+)?(.*)$/.exec(src); extra.push({ n: m[1] ? +m[1] : 1, comp: E.analyze(m[2]).partCounts[0] }); });
        tot += extra.reduce(function (s, x) { return s + x.n; }, 0);
        var f = Math.min(1, 14 / tot);
        io.ions.forEach(function (p) {
          var comp = p.mono ? (function () { var o = {}; o[p.f] = 1; return o; })() : E.analyze(p.f).partCounts[0];
          if (p.mono) { var rr = RI[p.f + p.q] || 1.2; units.push.apply(units, Array.apply(null, Array(Math.max(1, Math.round(p.n * f)))).map(function () { return { atoms: [{ el: p.f, x: 0, y: 0, z: 0, r: 0.55 * rr }], bonds: [], q: p.q, ru: 0.55 * rr }; })); }
          else for (var i = 0; i < Math.max(1, Math.round(p.n * f)); i++) units.push(asUnit(comp, p.q));
        });
        extra.forEach(function (x) { for (var i = 0; i < Math.max(1, Math.round(x.n * f)); i++) units.push(asUnit(x.comp, 0)); });
        var C = cluster(units, h >>> 0);
        sc = { kind: 'ions', atoms: C.atoms, bonds: C.bonds, links: C.links, halos: C.halos };
      }
    }
    if (sc.kind !== 'lattice') {
      var c = [0, 0, 0]; sc.atoms.forEach(function (a) { c[0] += a.x; c[1] += a.y; c[2] += a.z; });
      c = c.map(function (x) { return x / sc.atoms.length; });
      sc.atoms.forEach(function (a) { a.x -= c[0]; a.y -= c[1]; a.z -= c[2]; });
    }
    sc.links = sc.links || []; sc.edges = sc.edges || []; sc.halos = sc.halos || [];
    sc.bound = Math.max(1, sc.bb || 1, Math.max.apply(null, sc.atoms.map(function (a) { return Math.hypot(a.x, a.y, a.z) + a.r; })));
    if (r.charge && sc.kind === 'molecule') sc.halos = [{ a: 0, ru: sc.bound * 1.1, q: r.charge > 0 ? 1 : -1 }];
    return sc;
  }

  root.FormulaGeometry = { scene: scene, vsepr: vsepr, lattice: lattice, latType: latType, covalentRadius: cov, ionicRadius: function (el, q) { return RI[el + q]; } };
})(typeof window !== 'undefined' ? window : this);
