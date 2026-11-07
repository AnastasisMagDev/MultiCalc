/* MODULE-18 · bs-wave.js — real orbital wavefunctions for the 3D viewer.
   Hydrogen-like radial functions (1s, 2s, 2p, 3d) × real spherical harmonics, combined linearly (LCAO / hybrids).
   Each orbital is sampled once on a 3D grid; the viewer ray-marches the 90 %-probability surface ψ = ±iso, so nodal planes and
   radial nodes appear exactly where the maths puts them. Phase: blue = ψ > 0, red = ψ < 0. */
(function (root) {
  'use strict';
  var D = root.BSData, SQ = Math.sqrt, PI = Math.PI, exp = Math.exp, CS = 0.5 / SQ(PI), CP = SQ(3 / (4 * PI)), CD0 = SQ(5 / (16 * PI)), CD1 = SQ(15 / (16 * PI)), CD2 = SQ(15 / (4 * PI)), cache = {};
  function R1(r) { return 2 * exp(-r); }
  function R2s(r) { return (2 - r) * exp(-r / 2) / (2 * SQ(2)); }
  function R2p(r) { return r * exp(-r / 2) / (2 * SQ(6)); }
  function R3d(r) { return 4 / (81 * SQ(30)) * r * r * exp(-r / 3); }
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  /* ---- atomic orbitals, length scale lam (Å per radial unit), centred at the origin ---- */
  function aoFn(kind, lam) {
    var ln = Math.pow(lam, -1.5), il = 1 / lam;
    function rr(x, y, z) { return SQ(x * x + y * y + z * z) + 1e-12; }
    switch (kind) {
      case '1s': return function (x, y, z) { return ln * R1(rr(x, y, z) * il) * CS; };
      case '2s': return function (x, y, z) { return ln * R2s(rr(x, y, z) * il) * CS; };           // textbook 2s (has a radial node)
      case 's2': return function (x, y, z) { return ln * R2p(rr(x, y, z) * il) * CS; };           // valence 2s without the node (Slater-type): used for hybrids and bonds, so they come out as clean teardrops
      case 'px': return function (x, y, z) { var r = rr(x, y, z); return ln * R2p(r * il) * CP * x / r; };
      case 'py': return function (x, y, z) { var r = rr(x, y, z); return ln * R2p(r * il) * CP * y / r; };
      case 'pz': return function (x, y, z) { var r = rr(x, y, z); return ln * R2p(r * il) * CP * z / r; };
      case 'dz2': return function (x, y, z) { var r = rr(x, y, z); return ln * R3d(r * il) * CD0 * (3 * z * z - r * r) / (r * r); };
      case 'dx2y2': return function (x, y, z) { var r = rr(x, y, z); return ln * R3d(r * il) * CD1 * (x * x - y * y) / (r * r); };
      case 'dxy': return function (x, y, z) { var r = rr(x, y, z); return ln * R3d(r * il) * CD2 * x * y / (r * r); };
      case 'dxz': return function (x, y, z) { var r = rr(x, y, z); return ln * R3d(r * il) * CD2 * x * z / (r * r); };
      case 'dyz': return function (x, y, z) { var r = rr(x, y, z); return ln * R3d(r * il) * CD2 * y * z / (r * r); };
    }
    return function () { return 0; };
  }
  /* a hybrid pointing along +z:  cs·s + cp·p(z) + cd·d(z²)  (the d part uses a tighter scale so its lobes stay comparable) */
  function hybFn(sp, dz) {
    var s = sp.one ? aoFn('1s', sp.lam) : aoFn('s2', sp.lam), p = aoFn('pz', sp.lam), d = sp.cd ? aoFn('dz2', sp.lam * 0.5) : null, g = dz || 1;
    return function (x, y, z) { z *= g; var v = sp.cs * s(x, y, z) + (sp.cp ? sp.cp * g * p(x, y, z) : 0); if (d) v += sp.cd * d(x, y, z); return v; };
  }

  /* ---- sampling + the 90 % surface ---- */
  var FR = { ao: 0.9, set: 0.55, mol: 0.62, mo: 0.8 };       // fraction of the electron probability enclosed by the drawn surface
  function grid(fn, h, N, fr) {
    var data = new Float32Array(N * N * N), st = 2 * h / (N - 1), i, j, k, q = 0, tot = 0, v;
    for (k = 0; k < N; k++) for (j = 0; j < N; j++) for (i = 0; i < N; i++) { v = fn(-h + i * st, -h + j * st, -h + k * st); data[q++] = v; tot += v * v; }
    var sq = new Float32Array(data.length); for (q = 0; q < sq.length; q++) sq[q] = data[q] * data[q]; sq.sort();
    var acc = 0, thr = 0; for (q = sq.length - 1; q >= 0; q--) { acc += sq[q]; if (acc >= (fr || 0.9) * tot) { thr = sq[q]; break; } }
    var iso = SQ(thr), ext = 0; q = 0;
    for (k = 0; k < N; k++) for (j = 0; j < N; j++) for (i = 0; i < N; i++) { if (Math.abs(data[q++]) > iso) { var x = -h + i * st, y = -h + j * st, z = -h + k * st, r = SQ(x * x + y * y + z * z); if (r > ext) ext = r; } }
    return { n: N, h: h, data: data, iso: iso, ext: ext || h * 0.5 };
  }
  function adaptive(fn, h0, fr) {                       // coarse pass finds the size, fine pass samples it
    var c = grid(fn, h0, 24, fr), h = Math.min(h0, c.ext * 1.12 + 2 * h0 / 23);
    return grid(fn, h, 42, fr);
  }
  function memo(key, mk) { return cache[key] || (cache[key] = mk()); }

  /* hybrids are shown the textbook way: the boundary surface r = |Y(θ,φ)|·K of the angular part (teardrop + small back lobe) */
  function polar(Y, ex) {
    var mx = 0, i, j, k, a, b, y; for (i = 0; i <= 24; i++) for (j = 0; j < 48; j++) { a = PI * i / 24; b = 2 * PI * j / 48; y = Math.abs(Y(Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a))); if (y > mx) mx = y; }
    var K = 1 / (mx || 1), h = 1.12, N = 64, data = new Float32Array(N * N * N), st = 2 * h / (N - 1), q = 0, x, yy, z, r, v;
    for (k = 0; k < N; k++) for (j = 0; j < N; j++) for (i = 0; i < N; i++) { x = -h + i * st; yy = -h + j * st; z = -h + k * st; r = Math.sqrt(x * x + yy * yy + z * z) + 1e-9; v = Y(x / r, yy / r, z / r); data[q++] = (v >= 0 ? 1 : -1) * Math.max(0, Math.pow(Math.abs(v) * K, ex || 1.75) - r); }   // exponent > 1 draws the lobes slimmer, as in textbook sketches
    return { n: N, h: h, data: data, iso: 0.012, ext: 1.08 };
  }
  function lobeLen(lam) { return Math.min(1.55, Math.max(0.85, 6.8 * lam)); }
  /* ---- ready-made orbitals ---- */
  var TARGET = { '1s': 1.5, '2s': 2.3 };
  function ao(kind) {                                  // unit-scale field + the scale that makes it ~2.2 Å wide on screen
    var f = memo('ao:' + kind, function () { return adaptive(aoFn(kind, 1), 30); });
    return { f: f, s: (TARGET[kind] || (kind.charAt(0) === 'd' ? 2.3 : 2.1)) / f.ext };
  }
  function s1() { return memo('s1:' + FR.mol, function () { return adaptive(aoFn('1s', 1), 14, FR.mol); }); }      // compact 1s for bond pictures (≈62 % surface)
  function hyb(cs, cp, cd) {                           // canonical hybrid along +z: teardrop of unit length (scale it to the length you want)
    var key = 'hy:' + cs.toFixed(3) + ':' + cp.toFixed(3) + ':' + (cd || 0).toFixed(3);
    return memo(key, function () { return polar(function (ux, uy, uz) { return cs * CS + cp * CP * uz + (cd ? cd * CD0 * (3 * uz * uz - 1) : 0); }); });
  }
  /* a lone pair is drawn as the polar plot of the angular probability density |Y(θ,φ)|² of its hybrid (exponent 2): a teardrop whose size is set by the atom, not by taste */
  function hybSlim(cs, cp, cd) {
    var key = 'hs:' + cs.toFixed(3) + ':' + cp.toFixed(3) + ':' + (cd || 0).toFixed(3);
    return memo(key, function () { return polar(function (ux, uy, uz) { return cs * CS + cp * CP * uz + (cd ? cd * CD0 * (3 * uz * uz - 1) : 0); }, 2); });
  }
  function mixOf(SN, one) {                            // s : p : d weights of each equivalent hybrid of a steric-number-SN atom
    if (one) return { cs: 1, cp: 0, cd: 0 };
    var ws = 1 / SN, wp = Math.min(3, SN - 1) / SN, wd = Math.max(0, SN - 4) / SN, t = ws + wp + wd; return { cs: SQ(ws / t), cp: SQ(wp / t), cd: SQ(wd / t) };
  }
  function lamOf(sym, E) { if (sym === 'H') return 0.42; var n = E.el(sym).n, cr = (D.COV[n - 1] || 76) / 100; return 0.225 * cr; }
  function spec(sym, SN, E) { var m = mixOf(SN, sym === 'H'); return { lam: lamOf(sym, E), cs: m.cs, cp: m.cp, cd: m.cd, one: sym === 'H' }; }

  /* two centres on the z axis (A at −L/2, B at +L/2); fn gets the position relative to each centre */
  function twoCentre(key, L, mk) {
    key += ':' + (mk.fr || FR.mol); return memo(key, function () {
      var fa = mk.a, fb = mk.b, ca = mk.ca === undefined ? 1 : mk.ca, cb = mk.cb === undefined ? 1 : mk.cb, h0 = L / 2 + 14 * Math.max(mk.lam || 0.2, 0.15);
      return adaptive(function (x, y, z) { return ca * fa(x, y, z + L / 2) + cb * fb(x, y, z - L / 2); }, h0, mk.fr || FR.mol);
    });
  }
  function sigmaBond(A, B, L, ca, cb) {               // σ: hybrid/s of A pointing at B  +  hybrid/s of B pointing at A (in phase); ca, cb = polarisation
    ca = ca === undefined ? 1 : ca; cb = cb === undefined ? 1 : cb;
    var key = 'sg:' + [A.lam, A.cs, A.cp, A.cd, B.lam, B.cs, B.cp, B.cd, L, ca, cb].map(function (v) { return v.toFixed(2); }).join(',');
    return twoCentre(key, L, { a: hybFn(A, 1), b: hybFn(B, -1), ca: ca, cb: cb, lam: Math.max(A.lam, B.lam) });
  }
  function piBond(la, lb, L, anti) {                   // π: p(x) + p(x) side by side (anti: opposite sign)
    return twoCentre('pi:' + [la, lb, L, anti ? 1 : 0].map(function (v) { return (+v).toFixed(2); }).join(','), L, { a: aoFn('px', la), b: aoFn('px', lb), cb: anti ? -1 : 1, lam: Math.max(la, lb) });
  }
  function ring(coords, lam, sign) {                   // benzene-type π cloud: Σ p(z) over the ring atoms (all in phase)
    var key = 'ring:' + coords.length + ':' + lam.toFixed(3) + ':' + coords.map(function (c) { return c[0].toFixed(2) + c[1].toFixed(2); }).join('');
    return memo(key, function () { var p = aoFn('pz', lam); return adaptive(function (x, y, z) { var v = 0, i; for (i = 0; i < coords.length; i++) v += p(x - coords[i][0], y - coords[i][1], z); return v; }, 4.2, FR.mol); });
  }
  /* rotation (row-major, canonical → world) taking canonical z to zAxis and canonical x as close as possible to xHint */
  function frame(z, xh) {
    var l = Math.hypot(z[0], z[1], z[2]) || 1, zz = [z[0] / l, z[1] / l, z[2] / l], x = xh || (Math.abs(zz[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]), d = x[0] * zz[0] + x[1] * zz[1] + x[2] * zz[2];
    x = [x[0] - d * zz[0], x[1] - d * zz[1], x[2] - d * zz[2]]; var lx = Math.hypot(x[0], x[1], x[2]) || 1; x = [x[0] / lx, x[1] / lx, x[2] / lx];
    var y = [zz[1] * x[2] - zz[2] * x[1], zz[2] * x[0] - zz[0] * x[2], zz[0] * x[1] - zz[1] * x[0]];
    return [x[0], y[0], zz[0], x[1], y[1], zz[1], x[2], y[2], zz[2]];
  }
  /* octahedral / bipyramidal d-mixing sets drawn from exact textbook coefficients */
  function exactSet(type) {
    var s6 = SQ(1 / 6), r2 = SQ(0.5), r3 = SQ(1 / 3), r12 = SQ(1 / 12), key = 'set:' + type;
    function Ys() { return CS; } function Px(a, b, c) { return CP * a; } function Py(a, b, c) { return CP * b; } function Pz(a, b, c) { return CP * c; } function Dz(a, b, c) { return CD0 * (3 * c * c - 1); } function Dx(a, b, c) { return CD1 * (a * a - b * b); }
    return memo(key, function () {
      var out = [];
      function add(d, Y) { out.push({ d: d, f: polar(Y) }); }
      if (type === 'sp3d2') {
        add([0, 0, 1], function (a, b, c) { return s6 * Ys() + r2 * Pz(a, b, c) + r3 * Dz(a, b, c); }); add([0, 0, -1], function (a, b, c) { return s6 * Ys() - r2 * Pz(a, b, c) + r3 * Dz(a, b, c); });
        [[1, 0, 1], [-1, 0, 1], [0, 1, -1], [0, -1, -1]].forEach(function (q) { add([q[0], q[1], 0], function (a, b, c) { var p = q[0] ? q[0] * Px(a, b, c) : q[1] * Py(a, b, c); return s6 * Ys() + r2 * p - r12 * Dz(a, b, c) + q[2] * 0.5 * Dx(a, b, c); }); });
      } else if (type === 'sp3d') {
        add([0, 0, 1], function (a, b, c) { return r2 * (Pz(a, b, c) + Dz(a, b, c)); }); add([0, 0, -1], function (a, b, c) { return r2 * (-Pz(a, b, c) + Dz(a, b, c)); });
        [0, 1, 2].forEach(function (k) { var an = 2 * PI * k / 3, ca = Math.cos(an), sa = Math.sin(an); add([ca, sa, 0], function (a, b, c) { return r3 * Ys() + SQ(2 / 3) * (ca * Px(a, b, c) + sa * Py(a, b, c)); }); });
      }
      return out;
    });
  }
  /* lone pairs (yellow teardrops) and a radical's unpaired orbital of atom i, centred at c */
  function lpItems(mol, i, c, alpha, E, len, slim) {
    var a = mol.atoms[i], out = []; if (a.s === 'H' || !a.lpDirs) return out;
    var sp = spec(a.s, a.nbr.length + a.lp + (a.unp ? 1 : 0), E), f = slim ? hybSlim(sp.cs, sp.cp, sp.cd) : hyb(sp.cs, sp.cp, sp.cd), sc = (len || lobeLen(sp.lam)) / f.ext;
    a.lpDirs.slice(0, a.lp).forEach(function (d) { out.push({ t: 'w', f: f, s: sc, x: c[0], y: c[1], z: c[2], M: frame(d), cp: [255, 214, 10], cn: [255, 150, 40], a: 0.78 * alpha }); });
    if (a.unp && a.lpDirs[a.lp]) out.push({ t: 'w', f: f, s: sc, x: c[0], y: c[1], z: c[2], M: frame(a.lpDirs[a.lp]), cp: [255, 176, 32], cn: [255, 150, 40], a: 0.78 * alpha });
    return out;
  }
  root.BSWave = { hybSlim: hybSlim, s1: s1, lpItems: lpItems, FR: FR, lobeLen: lobeLen, polar: polar, I3: I3, ao: ao, hyb: hyb, mixOf: mixOf, spec: spec, lamOf: lamOf, sigmaBond: sigmaBond, piBond: piBond, ring: ring, frame: frame, exactSet: exactSet, aoFn: aoFn, hybFn: hybFn, adaptive: adaptive, twoCentre: twoCentre, memo: memo, grid: grid };
})(typeof window !== 'undefined' ? window : globalThis);
