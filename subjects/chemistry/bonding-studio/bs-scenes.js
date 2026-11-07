/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-scenes.js
   Turns chemistry (BSEngine) into things to look at:
     · molScene(mol, opts)          3D molecule (ball-and-stick / sticks / space-filling), lone-pair lobes, dipole, δ charges,
                                    and the formation animation (atoms fly in → shared-pair clouds → bonds grow → lone pairs appear)
     · crystalScene(ionic, N, opts) real extended ionic lattices (rock salt, CsCl, zinc blende, fluorite, antifluorite) that grow outwards
     · pairScene(A, B)              the bond-lab animation: ionic = electron transfer, covalent = shared pair (shifted toward the more
                                    electronegative atom for polar bonds), metallic = electron sea (alloy if two different metals)
     · lewisSVG(mol, form)          2D Lewis structure with lone pairs, bonds, formal charges, brackets (ions), resonance
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, V3 = root.BS3D, U = E.util;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function colOf(sym) { return V3.hex(E.el(sym).k); }
  function fracStr(a) { var t = { 0.5: '½', 0.25: '¼', 0.75: '¾' }[Math.round(a * 100) / 100]; if (t) return t; if (Math.abs(a - 1 / 3) < 0.01) return '⅓'; if (Math.abs(a - 2 / 3) < 0.01) return '⅔'; if (Math.abs(a - Math.round(a)) < 1e-6) return String(Math.round(a)); return a.toFixed(2).replace('.', ','); }
  function qLabel(q) { var a = Math.abs(q), sg = q < 0 ? '−' : '+'; return sg + (Math.abs(a - 1) < 1e-6 ? '' : fracStr(a)); }
  var YEL = [255, 214, 10], RED = [255, 107, 107], BLUE = [90, 169, 255];

  /* ---------------------------------------------------------------- molecule */
  function ballR(sym, style) { var v = E.vdwR(E.el(sym)); return style === 'space' ? v : style === 'stick' ? 0.14 : clamp(0.27 * v + 0.02, 0.28, 0.62); }
  function molScene(mol, o) {
    o = o || {}; var p = o.p === undefined ? 1 : o.p, style = o.style || 'ball', items = [], atoms = mol.atoms, pos = mol.pos, i, R = 0;
    atoms.forEach(function (a, k) { R = Math.max(R, U.vlen(pos[k]) + ballR(a.s, style)); });
    var amp = R * 0.9 + 0.7, k1 = ease(p / 0.55), WV = root.BSWave, OB = root.BSOrbitals, rich = !!(WV && OB && OB.formation), g = rich ? smooth((p - 0.74) / 0.22) : smooth((p - 0.55) / 0.25), fade = clamp((p - 0.78) / 0.22, 0, 1), cl = Math.sin(clamp((p - 0.42) / 0.3, 0, 1) * Math.PI);
    var cur = pos.map(function (q, k) {                                              // every atom approaches along its own bond direction, on a slight arc
      if (p >= 1) return q; var ql = U.vlen(q), dir = ql > 0.25 ? U.vmul(q, 1 / ql) : U.vnorm([Math.sin(k * 2.7 + 0.6), 0.85, Math.cos(k * 1.9 + 1.1)]), dist = amp + 0.9 + 0.3 * (k % 3), sw = U.vnorm(U.vcross(dir, [0.3, 1, 0.2])), arc = Math.sin(k1 * Math.PI) * 0.28 * dist * (k % 2 ? 1 : -1);
      return [q[0] + dir[0] * dist * (1 - k1) + sw[0] * arc, q[1] + dir[1] * dist * (1 - k1) + sw[1] * arc, q[2] + dir[2] * dist * (1 - k1) + sw[2] * arc];
    });
    if (rich && p < 1) OB.formation(mol, cur, p).forEach(function (it) { items.push(it); });
    mol.bonds.forEach(function (b) {
      var A = cur[b.a], B = cur[b.b], eo = E.effOrder(mol, b), mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
      if (!rich && cl > 0.01 && p < 1) items.push({ t: 'e', p: A, q: B, r: 0.3, c: U.vadd(colOf(atoms[b.a].s), [0, 0, 0]), a: 0.75 * cl });
      var h = p >= 1 ? 1 : g; if (h <= 0.01) return;
      items.push({ t: 'b', p: [mid[0] + (A[0] - mid[0]) * h, mid[1] + (A[1] - mid[1]) * h, mid[2] + (A[2] - mid[2]) * h], q: [mid[0] + (B[0] - mid[0]) * h, mid[1] + (B[1] - mid[1]) * h, mid[2] + (B[2] - mid[2]) * h],
        r: style === 'stick' ? 0.13 : 0.1, c1: colOf(atoms[b.a].s), c2: colOf(atoms[b.b].s), o: eo });
    });
    atoms.forEach(function (a, k) {
      var r = ballR(a.s, style), c = colOf(a.s);
      var ld = null;
      if (style === 'space' && mol.bonds.length) {                                  // space-filling: the symbol goes on the side of the atom that is not buried in its neighbours
        var sx = 0, sy = 0, sz = 0, nb = 0; mol.bonds.forEach(function (b) { var o2 = b.a === k ? b.b : b.b === k ? b.a : -1; if (o2 >= 0) { sx += cur[o2][0] - cur[k][0]; sy += cur[o2][1] - cur[k][1]; sz += cur[o2][2] - cur[k][2]; nb++; } });
        var sl = Math.hypot(sx, sy, sz); if (nb && sl > 0.05) ld = [-sx / sl, -sy / sl, -sz / sl];
      }
      items.push({ t: 's', x: cur[k][0], y: cur[k][1], z: cur[k][2], r: style === 'stick' ? 0.19 : r, c: c, label: o.lab !== false && (style === 'stick' || r > 0.3) ? a.s : null, labelAlways: style === 'stick', labelDir: ld, labelOff: 0.5 });
      if (o.lp && style !== 'space' && a.lpDirs && fade > 0.01) {
        var spl0 = WV && WV.spec && a.s !== 'H' ? WV.spec(a.s, a.nbr.length + a.lp + (a.unp ? 1 : 0), E) : null, lpLen = style === 'stick' ? 0.62 : spl0 ? Math.min(Math.max(0.62, WV.lobeLen(spl0.lam) * 0.78), Math.max(0.7, r * 2.0)) : 0.8;   // never longer than about twice the atom's own radius
        var lobes = spl0 ? WV.lpItems(mol, k, cur[k], fade * 0.8, E, lpLen, true) : null;
        if (lobes && lobes.length) {                                                  // a lone pair is an orbital: draw its real shape (teardrop of an spⁿ hybrid), never a halo of arbitrary size
          lobes.forEach(function (it) { items.push(it); });
          var ll = lpLen;
          for (i = 0; i < a.lp && i < a.lpDirs.length; i++) {                         // the two electrons of the pair, as two small points inside the lobe
            var d = a.lpDirs[i], base = 0.58 * ll, cx = cur[k][0] + d[0] * base, cy = cur[k][1] + d[1] * base, cz = cur[k][2] + d[2] * base, pp = U.vnorm(U.vcross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
            items.push({ t: 's', x: cx + pp[0] * 0.07, y: cy + pp[1] * 0.07, z: cz + pp[2] * 0.07, r: 0.04, c: YEL, a: fade }); items.push({ t: 's', x: cx - pp[0] * 0.07, y: cy - pp[1] * 0.07, z: cz - pp[2] * 0.07, r: 0.04, c: YEL, a: fade });
          }
          if (a.unp && a.lpDirs[a.lp]) { var du = a.lpDirs[a.lp]; items.push({ t: 's', x: cur[k][0] + du[0] * 0.6 * ll, y: cur[k][1] + du[1] * 0.6 * ll, z: cur[k][2] + du[2] * 0.6 * ll, r: 0.05, c: YEL, a: fade }); }
        } else {
          for (i = 0; i < a.lp && i < a.lpDirs.length; i++) {
            var d2 = a.lpDirs[i], base2 = r + 0.3, cx2 = cur[k][0] + d2[0] * base2, cy2 = cur[k][1] + d2[1] * base2, cz2 = cur[k][2] + d2[2] * base2, pp2 = U.vnorm(U.vcross(d2, Math.abs(d2[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
            items.push({ t: 'k', x: cx2, y: cy2, z: cz2, r: 0.3, c: V3.mix(c, [255, 255, 255], 0.25), a: 0.5 * fade });
            items.push({ t: 's', x: cx2 + pp2[0] * 0.08, y: cy2 + pp2[1] * 0.08, z: cz2 + pp2[2] * 0.08, r: 0.05, c: YEL, a: fade }); items.push({ t: 's', x: cx2 - pp2[0] * 0.08, y: cy2 - pp2[1] * 0.08, z: cz2 - pp2[2] * 0.08, r: 0.05, c: YEL, a: fade });
          }
          if (a.unp && a.lpDirs[a.lp]) { var du2 = a.lpDirs[a.lp], bu = r + 0.3; items.push({ t: 's', x: cur[k][0] + du2[0] * bu, y: cur[k][1] + du2[1] * bu, z: cur[k][2] + du2[2] * bu, r: 0.07, c: YEL, a: fade }); }
        }
      }
      if (fade > 0.5) {
        if (o.chg && !mol.charged && mol.partial && Math.abs(mol.partial[k]) > 0.02) items.push({ t: 't', x: cur[k][0], y: cur[k][1], z: cur[k][2], text: mol.partial[k] < 0 ? 'δ−' : 'δ+', c: mol.partial[k] < 0 ? RED : BLUE, size: 14, dy: -(Math.max(10, r * 36) + 8) });
        var qq = mol.avgCharge && mol.avgCharge[k] !== undefined ? mol.avgCharge[k] : a.q;
        if (o.chg && qq !== 0) items.push({ t: 't', x: cur[k][0], y: cur[k][1], z: cur[k][2], text: qLabel(qq), c: qq < 0 ? RED : BLUE, size: 14, dy: -(Math.max(10, r * 36) + 8) });
      }
    });
    if (o.dip && mol.dipole && !mol.charged && mol.dipole.mag > 0.05 && fade > 0.5) {
      var dir = U.vnorm(mol.dipole.vec), L = clamp(0.6 + 0.55 * mol.dipole.mag, 1.2, 3.4), sh = U.vmul(U.vnorm(U.vcross(dir, [0.3, 1, 0.2])), R * 0.8 + 0.5);
      items.push({ t: 'a', p: U.vadd(U.vmul(dir, -L / 2), sh), q: U.vadd(U.vmul(dir, L / 2), sh), c: [255, 176, 32], w: 3.4 });
      if (o.dipLabel !== false) items.push({ t: 't', x: sh[0] + dir[0] * (L / 2 + 0.3), y: sh[1] + dir[1] * (L / 2 + 0.3), z: sh[2] + dir[2] * (L / 2 + 0.3), text: 'μ ≈ ' + (mol.muExp !== null && mol.muExp !== undefined ? mol.muExp : mol.dipole.mag).toFixed(2) + ' D', c: [255, 176, 32], size: 13 });
    }
    return { radius: R * 0.95 + 0.4, items: items, anim: { dur: 5600, update: function (pp, sc) { sc.items = molScene(mol, Object.assign({}, o, { p: pp })).items; } } };
  }

  /* ---------------------------------------------------------------- crystals */
  var latCache = {};
  function lattice(ic, N) {
    var key = ic.formula + N + ic.structure; if (latCache[key]) return latCache[key];
    var r0 = ic.r.sum / 100, pts = [], i, j, k, a, s = ic.structure;
    function add(x, y, z, c) { pts.push({ x: x, y: y, z: z, c: c }); }
    if (s === 'nacl') { a = r0; for (i = 0; i <= 2 * N; i++) for (j = 0; j <= 2 * N; j++) for (k = 0; k <= 2 * N; k++) add(i * a, j * a, k * a, (i + j + k) % 2 === 0); }
    else if (s === 'cscl') { a = 2 * r0 / Math.sqrt(3); for (i = 0; i <= N; i++) for (j = 0; j <= N; j++) for (k = 0; k <= N; k++) { add(i * a, j * a, k * a, true); if (i < N && j < N && k < N) add((i + .5) * a, (j + .5) * a, (k + .5) * a, false); } }
    else {
      a = 4 * r0 / Math.sqrt(3); var fcc = [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]], tet = [[.25, .25, .25], [.75, .75, .25], [.75, .25, .75], [.25, .75, .75]], tet2 = [[.75, .75, .75], [.25, .25, .75], [.25, .75, .25], [.75, .25, .25]], seen = {};
      function put(x, y, z, c) { var kk = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3); if (!seen[kk]) { seen[kk] = 1; add(x * a, y * a, z * a, c); } }
      var host = s === 'antifluorite' ? false : true;
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) for (k = 0; k < N; k++) {
        fcc.forEach(function (f) { put(i + f[0], j + f[1], k + f[2], host); });
        (s === 'zns' ? tet : tet.concat(tet2)).forEach(function (f) { put(i + f[0], j + f[1], k + f[2], !host); });
      }
      for (i = 0; i <= N; i++) for (j = 0; j <= N; j++) for (k = 0; k <= N; k++) { if (i === N || j === N || k === N) { [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]].forEach(function (f) { var x = i + f[0], y = j + f[1], z = k + f[2]; if (x <= N && y <= N && z <= N) put(x, y, z, host); }); } }
    }
    var cx = 0, cy = 0, cz = 0; pts.forEach(function (q) { cx += q.x; cy += q.y; cz += q.z; }); cx /= pts.length; cy /= pts.length; cz /= pts.length;
    var maxd = 0; pts.forEach(function (q) { q.x -= cx; q.y -= cy; q.z -= cz; q.d = Math.hypot(q.x, q.y, q.z); maxd = Math.max(maxd, q.d); });
    var nn = [], lim = r0 * 1.04; for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) { if (pts[i].c === pts[j].c) continue; var dx = pts[i].x - pts[j].x; if (dx > lim || dx < -lim) continue; var dd = Math.hypot(dx, pts[i].y - pts[j].y, pts[i].z - pts[j].z); if (dd <= lim) nn.push([i, j]); }
    return (latCache[key] = { pts: pts, nn: nn, maxd: maxd, r0: r0 });
  }
  function clusterPts(ic) {
    var r0 = ic.r.sum / 100, pts = [], big = ic.nc >= ic.na ? true : false, centreIsCat = ic.nc === 1, n = centreIsCat ? ic.na : ic.nc, m = ic.nc + ic.na, i;
    if (ic.nc === 1 || ic.na === 1) { pts.push({ x: 0, y: 0, z: 0, c: centreIsCat }); var dirs = n === 1 ? [[1, 0, 0]] : n === 2 ? [[1, 0, 0], [-1, 0, 0]] : n === 3 ? [[1, 0, 0], [-.5, 0, .866], [-.5, 0, -.866]] : n === 4 ? [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] : [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; for (i = 0; i < n; i++) { var d = U.vnorm(dirs[i % dirs.length]); pts.push({ x: d[0] * r0, y: d[1] * r0, z: d[2] * r0, c: !centreIsCat }); } }
    else { var cats = ic.nc, ans = ic.na, seq = [], ci = 0, ai = 0; for (i = 0; i < m; i++) { if ((ci / cats <= ai / ans && ci < cats) || ai >= ans) { seq.push(true); ci++; } else { seq.push(false); ai++; } } seq.forEach(function (c, t) { var f = 2 * Math.PI * t / m, rr = r0 * m / (2 * Math.PI) * 1.25; pts.push({ x: rr * Math.cos(f), y: 0, z: rr * Math.sin(f), c: c }); }); }
    pts.forEach(function (q) { q.d = Math.hypot(q.x, q.y, q.z); }); return pts;
  }
  function crystalScene(ic, N, o) {
    o = o || {}; var p = o.p === undefined ? 1 : o.p, items = [], style = o.style || 'ball', cat = ic.cat.s, an = ic.an.s, ccol = colOf(cat), acol = ic.poly ? [255, 120, 120] : colOf(an);
    var L = ic.structure === 'cluster' ? null : lattice(ic, N), pts = L ? L.pts : clusterPts(ic), maxd = L ? L.maxd : 3, scale = style === 'space' ? 1 : 0.42, rc = ic.r.cat / 100 * scale, ra = ic.r.an / 100 * scale, front = p * (maxd + 1.2);
    var vis = pts.map(function (q) { return clamp((front - q.d) / (maxd * 0.18 + 0.4), 0, 1); });
    pts.forEach(function (q, i) {                                                 // each ion drifts in from outside and flashes when it locks into place
      var s = ease(vis[i]); if (s <= 0.01) return; var ln = Math.hypot(q.x, q.y, q.z) || 1, off = (1 - s) * (1 - s) * (1.7 + 0.15 * maxd), pulse = Math.sin(clamp((s - 0.55) / 0.45, 0, 1) * Math.PI), base = q.c ? ccol : acol;
      items.push({ t: 's', x: q.x + q.x / ln * off, y: q.y + q.y / ln * off, z: q.z + q.z / ln * off, r: (q.c ? rc : ra) * (0.4 + 0.6 * s), c: V3.mix(base, [255, 255, 255], 0.5 * pulse), a: s, label: !L || pts.length < 90 ? (q.c ? cat : an) : null });
    });
    if (L) { L.nn.forEach(function (b) { var s = Math.min(vis[b[0]], vis[b[1]]); if (s < 0.85) return; var A = pts[b[0]], B = pts[b[1]]; items.push({ t: 'l', p: [A.x, A.y, A.z], q: [B.x, B.y, B.z], c: [200, 200, 210], a: 0.3 * clamp((s - 0.85) / 0.15, 0, 1), w: 1.1, batch: true }); }); }
    else for (var i = 1; i < pts.length; i++) items.push({ t: 'l', p: [pts[0].x, pts[0].y, pts[0].z], q: [pts[i].x, pts[i].y, pts[i].z], c: [200, 200, 210], a: 0.4, w: 1.2, dash: true });
    return { radius: maxd + Math.max(rc, ra) / scale * 0.9 + 0.8, items: items, fog: true, anim: { dur: 5600, update: function (pp, sc) { sc.items = crystalScene(ic, N, Object.assign({}, o, { p: pp })).items; } } };
  }

  /* ---------------------------------------------------------------- bond lab: pair animations */
  function orbitPos(c, r, j, t, w) {
    var th = t * (w || 1.7) + j * 2.399 + j * 0.3, pl = j % 3, cs = Math.cos(th) * r, sn = Math.sin(th) * r;
    return pl === 0 ? [c[0] + cs, c[1] + sn, c[2]] : pl === 1 ? [c[0] + cs, c[1], c[2] + sn] : [c[0], c[1] + cs, c[2] + sn];
  }
  function pairScene(A, B, opt) {
    opt = opt || {}; var ea = E.el(A), eb = E.el(B), cls = E.classify(A, B), kind = cls.type, st = { t0: null, p: 0, held: !!opt.still };
    var ca = colOf(A), cb = colOf(B), va = Math.min(8, E.valence(ea)), vb = Math.min(8, E.valence(eb)), DUR = 6.5, dur = DUR;
    var cat = cls.less === A ? A : B, an = cat === A ? B : A, order = E.typicalOrder(A, B), n = 1, rA = Math.max(0.36, E.covR(ea) * 0.98), rB = Math.max(0.36, E.covR(eb) * 0.98), deq, ri = {};
    if (kind === 'ionic') {
      var cq = E.cationCharges(cat)[0] || 1, aq = -(E.anionCharge(an) || -1); n = Math.max(1, Math.min(cq, aq));
      ri.cat = E.ionRadius(cat, n).r / 100; ri.an = E.ionRadius(an, -n).r / 100; deq = ri.cat + ri.an;
    } else deq = kind === 'metallic' ? E.covR(ea) + E.covR(eb) : kind === 'unknown' ? (E.vdwR(ea) + E.vdwR(eb)) * 0.9 : E.bondLength(A, B, order);
    var sc = { radius: 4.4, items: [], fog: false, kind: kind, n: n, cat: cat, an: an, order: order };
    function build(p, t) {
      var items = []; sc.p = p;
      if (kind === 'metallic') return metallic(p, t);
      if (kind === 'unknown') return nonBonded(p, t);
      var d0 = 7, d;
      if (kind === 'ionic') d = p < 0.35 ? d0 + (deq * 1.9 - d0) * ease(p / 0.35) : p < 0.62 ? deq * 1.9 + (deq * 1.25 - deq * 1.9) * smooth((p - 0.35) / 0.27) : (function () { var u = (p - 0.62) / 0.38; return deq * (1 + 0.25 * (1 - smooth(u)) * Math.cos(u * 12)); })();
      else d = p < 0.45 ? d0 + (deq * 1.8 - d0) * ease(p / 0.45) : (function () { var u = (p - 0.45) / 0.55; return deq * (1 + 0.8 * (1 - smooth(u)) * Math.cos(u * 11 * (1 - 0.3 * u))); })();
      var xa = -d / 2, xb = d / 2, PA = [xa, 0, 0], PB = [xb, 0, 0], rAa = rA, rBb = rB, tr = kind === 'ionic' ? smooth((p - 0.38) / 0.24) : 0;
      if (kind === 'ionic') { rAa = A === cat ? rA + (ri.cat - rA) * tr : rA + (ri.an - rA) * tr; rBb = B === cat ? rB + (ri.cat - rB) * tr : rB + (ri.an - rB) * tr; }
      if (kind !== 'ionic') { rAa *= 0.74; rBb *= 0.74; }                                // atoms drawn smaller so the shared region is visible
      var vdA = E.vdwR(ea), vdB = E.vdwR(eb);
      var ghost = root.BSWave && kind !== 'ionic' ? 0.14 : 0.32; items.push({ t: 'k', x: xa, y: 0, z: 0, r: Math.max(rAa * 1.6, vdA * 0.8), c: ca, a: ghost }); items.push({ t: 'k', x: xb, y: 0, z: 0, r: Math.max(rBb * 1.6, vdB * 0.8), c: cb, a: ghost });
      items.push({ t: 's', x: xa, y: 0, z: 0, r: rAa, c: ca, label: A }); items.push({ t: 's', x: xb, y: 0, z: 0, r: rBb, c: cb, label: B });
      var w = 1.7, k;
      if (kind === 'ionic') {
        var catIsA = cat === A, Cc = catIsA ? PA : PB, Ac = catIsA ? PB : PA, rC = catIsA ? rAa : rBb, rAn = catIsA ? rBb : rAa, vC = catIsA ? va : vb, vAn = catIsA ? vb : va, nStay = Math.max(0, vC - n);
        for (k = 0; k < nStay; k++) { var q0 = orbitPos(Cc, rC * 1.45 + 0.12, k, t, w); items.push({ t: 's', x: q0[0], y: q0[1], z: q0[2], r: 0.075, c: YEL }); }
        for (k = 0; k < vAn; k++) { var q1 = orbitPos(Ac, rAn * 1.45 + 0.12, k + 3, t, -w); items.push({ t: 's', x: q1[0], y: q1[1], z: q1[2], r: 0.075, c: YEL }); }
        for (k = 0; k < n; k++) {
          var s0 = orbitPos(Cc, rC * 1.45 + 0.12, nStay + k, t, w), s1 = orbitPos(Ac, rAn * 1.45 + 0.12, vAn + k, t, -w), u = smooth((p - 0.38 - k * 0.04) / 0.22), lift = Math.sin(u * Math.PI) * 0.9;
          var q = [s0[0] + (s1[0] - s0[0]) * u, s0[1] + (s1[1] - s0[1]) * u + lift, s0[2] + (s1[2] - s0[2]) * u]; items.push({ t: 's', x: q[0], y: q[1], z: q[2], r: 0.085, c: [255, 240, 120] });
        }
        if (tr > 0.7 && an !== 'H') {                                                  // closed shell: four electron pairs at the corners of a tetrahedron
          var fo = clamp((tr - 0.7) / 0.3, 0, 1) * clamp((p - 0.6) / 0.25, 0, 1), ro = rAn * 1.22 + 0.1;
          [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].forEach(function (dv) {
            var dl = Math.hypot(dv[0], dv[1], dv[2]), ux = dv[0] / dl, uy = dv[1] / dl, uz = dv[2] / dl, px = -uy * 0.7071, py = ux * 0.7071, pz = 0;
            [-1, 1].forEach(function (sg) { items.push({ t: 's', x: Ac[0] + ux * ro + px * 0.1 * sg, y: uy * ro + py * 0.1 * sg, z: uz * ro + pz * 0.1 * sg, r: 0.075, c: YEL, a: fo }); });
          });
        }
        if (tr > 0.7) { var f = clamp((tr - 0.7) / 0.3, 0, 1) * clamp((p - 0.55) / 0.2, 0, 1); items.push({ t: 'l', p: [xa, 0, 0], q: [xb, 0, 0], c: [255, 214, 10], a: 0.5 * f, w: 1.6, dash: true });
          items.push({ t: 't', x: Cc[0], y: 0, z: 0, text: (n > 1 ? n : '') + '+', c: BLUE, size: 18, dy: -(rC * 62 + 16), halo: 'rgba(0,0,0,.4)' }); items.push({ t: 't', x: Ac[0], y: 0, z: 0, text: (n > 1 ? n : '') + '−', c: RED, size: 18, dy: -(rAn * 62 + 16), halo: 'rgba(0,0,0,.4)' }); }
      } else {
        var cxm = kind === 'polar' ? (cls.more === A ? -1 : 1) * clamp(cls.hs * 1.4, 0, 0.7) * (d / 2) : 0, WV = root.BSWave, OB = root.BSOrbitals;
        var ov = smooth((d0 - d) / (d0 - deq)), cmix = V3.mix(ca, cb, 0.5), pairs = order, lpA = Math.floor(Math.max(0, va - order) / 2), lpB = Math.floor(Math.max(0, vb - order) / 2);
        if (WV) {                                                                    // the bond as orbitals: atomic orbitals → overlap → σ (+π) orbital, lone pairs as teardrops
          var snA = 1 + lpA + ((va - order) % 2 ? 1 : 0), snB = 1 + lpB + ((vb - order) % 2 ? 1 : 0), spA = WV.spec(A, snA, E), spB = WV.spec(B, snB, E), grow = smooth(p / 0.22), xf = smooth((ov - 0.8) / 0.2), lpf = smooth((p - 0.62) / 0.25);
          var pol = kind === 'polar' ? clamp(cls.hs * 1.2, 0, 0.9) : 0, cA = 1 + (cls.more === A ? 1 : -1) * 0.5 * pol, cB = 1 + (cls.more === B ? 1 : -1) * 0.5 * pol;
          [[spA, xa, 1, A], [spB, xb, -1, B]].forEach(function (e) {
            var a1 = 0.78 * grow * (1 - xf), sp = e[0]; if (a1 < 0.02) return;
            if (sp.one) items.push({ t: 'w', f: WV.s1(), s: sp.lam * (0.55 + 0.45 * grow), x: e[1], y: 0, z: 0, M: WV.I3, cp: BLUE, cn: RED, a: a1 });
            else { var hf = WV.hyb(sp.cs, sp.cp, sp.cd); items.push({ t: 'w', f: hf, s: WV.lobeLen(sp.lam) / hf.ext * (0.5 + 0.5 * grow), x: e[1], y: 0, z: 0, M: WV.frame([e[2], 0, 0]), cp: BLUE, cn: RED, a: a1 }); }
          });
          if (xf > 0.02) {
            items.push({ t: 'w', f: WV.sigmaBond(spA, spB, deq, cA, cB), s: d / deq, x: 0, y: 0, z: 0, M: WV.frame([1, 0, 0]), cp: BLUE, cn: RED, a: 0.82 * xf });
            if (order > 1) { var pf = WV.piBond(spA.lam, spB.lam, deq, false); [[0, 1, 0], [0, 0, 1]].slice(0, order > 2 ? 2 : 1).forEach(function (nx) { items.push({ t: 'w', f: pf, s: d / deq, x: 0, y: 0, z: 0, M: WV.frame([1, 0, 0], nx), cp: BLUE, cn: RED, a: 0.78 * xf }); }); }
          }
        } else items.push({ t: 'e', p: [xa + rAa * 0.3, 0, 0], q: [xb - rBb * 0.3, 0, 0], r: 0.8 * Math.min(rA, rB) + 0.22, c: V3.mix(cmix, [255, 232, 130], 0.45), a: 0.25 + 0.6 * ov });
        var lpDim = 1, shared = 0;
        for (k = 0; k < va - order; k++) { var o1 = orbitPos(PA, rAa * 1.45 + 0.14, k, t, w); items.push({ t: 's', x: o1[0], y: o1[1], z: o1[2], r: 0.075, c: YEL, a: lpDim }); }
        for (k = 0; k < vb - order; k++) { var o2 = orbitPos(PB, rBb * 1.45 + 0.14, k + 3, t, -w); items.push({ t: 's', x: o2[0], y: o2[1], z: o2[2], r: 0.075, c: YEL, a: lpDim }); }
        var mid = (xa + xb) / 2 + cxm * ov, semi = d / 2 * 0.95 + rAa * 0.25, bb = 0.36 * Math.min(rA, rB) + 0.12;
        for (var pr = 0; pr < pairs; pr++) for (k = 0; k < 2; k++) {
          var th2 = t * 2.3 + k * Math.PI, ph = pr * 1.1, gx = Math.cos(th2), gy = Math.sin(th2) * Math.cos(th2) * 2 * bb;
          var X0 = mid + gx * semi * (0.55 + 0.45 * ov), ez = [X0, gy * Math.cos(ph), gy * Math.sin(ph)], free = 1 - ov, home = k === 0 ? PA : PB, orb = orbitPos(home, (k === 0 ? rAa : rBb) * 1.45 + 0.14, pr * 2 + k, t, k === 0 ? w : -w);
          items.push({ t: 's', x: ez[0] * ov + orb[0] * free, y: ez[1] * ov + orb[1] * free, z: ez[2] * ov + orb[2] * free, r: 0.085, c: [255, 240, 120] });
        }
        if (kind === 'polar' && p > 0.8) { var f2 = clamp((p - 0.8) / 0.2, 0, 1), mA = cls.more === A; items.push({ t: 't', x: xa, y: 0, z: 0, text: mA ? 'δ−' : 'δ+', c: mA ? RED : BLUE, size: 16, dy: -(rAa * 62 + 16) }); items.push({ t: 't', x: xb, y: 0, z: 0, text: mA ? 'δ+' : 'δ−', c: mA ? BLUE : RED, size: 16, dy: -(rBb * 62 + 16) }); }
      }
      return items;
    }
    function nonBonded(p, t) {                                                   // London dispersion: instantaneous dipoles in step → a weak attraction
      var items = [], d = 7 + (deq - 7) * ease(p / 0.8), xa = -d / 2, xb = d / 2, k, ov = smooth((p - 0.45) / 0.35), shiftU = Math.sin(t * 2.4) * ov;
      [[A, xa, ea, ca, va, 1], [B, xb, eb, cb, vb, -1]].forEach(function (z, zi) {
        var r = Math.max(0.36, E.covR(z[2]) * 0.98), vw = E.vdwR(z[2]), sh = shiftU * 0.2 * vw;
        items.push({ t: 'k', x: z[1] + sh, y: 0, z: 0, r: vw * 0.8, c: z[3], a: 0.28 }); items.push({ t: 'k', x: z[1] + sh * 1.6, y: 0, z: 0, r: vw * 0.48, c: z[3], a: 0.3 });
        items.push({ t: 's', x: z[1], y: 0, z: 0, r: r * 0.62, c: z[3], label: z[0] });
        for (k = 0; k < z[4]; k++) { var q = orbitPos([z[1] + sh, 0, 0], vw * 0.42 + 0.1, k + zi * 3, t, zi ? -1.7 : 1.7); items.push({ t: 's', x: q[0], y: q[1], z: q[2], r: 0.06, c: YEL }); }
        var tagA = clamp(Math.abs(shiftU) * 1.4, 0, 1), nearMinus = shiftU * z[5] > 0;                  // the side the cloud moved towards is δ−, the side it left is δ+
        if (tagA > 0.15) { items.push({ t: 't', x: z[1] + z[5] * vw * 0.72, y: 0, z: 0, text: nearMinus ? 'δ−' : 'δ+', c: nearMinus ? RED : BLUE, size: 14, dy: -(vw * 40 + 10) }); items.push({ t: 't', x: z[1] - z[5] * vw * 0.72, y: 0, z: 0, text: nearMinus ? 'δ+' : 'δ−', c: nearMinus ? BLUE : RED, size: 14, dy: -(vw * 40 + 10) }); }
      });
      if (ov > 0.3) items.push({ t: 'l', p: [xa + 0.3, 0, 0], q: [xb - 0.3, 0, 0], c: [200, 200, 210], a: 0.4 * ov, w: 1.4, dash: true });
      return items;
    }
    function metallic(p, t) {
      var items = [], a = (E.covR(ea) + E.covR(eb)) * 1.0, nx = 3, ny = 3, nz = 2, i, j, k, idx = 0, free = smooth((p - 0.15) / 0.6), nElec = 0;
      for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) for (k = 0; k < nz; k++) {
        var x = (i - 1) * a, y = (j - 1) * a, z = (k - 0.5) * a, cA = (i + j + k) % 2 === 0, cc = cA ? ca : cb, sym = cA ? A : B, vc = Math.min(3, Math.max(1, E.valence(E.el(sym)) > 3 ? 2 : E.valence(E.el(sym))));
        items.push({ t: 's', x: x, y: y, z: z, r: 0.34, c: cc, label: sym });
        for (var q = 0; q < vc; q++) {
          var seed = idx * 7.7 + q * 3.1, home = orbitPos([x, y, z], 0.62, q + idx, t, 2.2), rx = 1.5 * a * Math.sin(t * (0.5 + (seed % 1) * 0.6) + seed * 2.1), ry = 1.5 * a * Math.sin(t * (0.45 + ((seed * 1.7) % 1) * 0.6) + seed * 3.3), rz = 0.9 * a * Math.sin(t * (0.4 + ((seed * 2.3) % 1) * 0.5) + seed * 1.3);
          items.push({ t: 's', x: home[0] * (1 - free) + rx * free, y: home[1] * (1 - free) + ry * free, z: home[2] * (1 - free) + rz * free, r: 0.07, c: YEL, a: 0.95 });
        }
        idx++;
      }
      for (var sq = 0; sq < 5; sq++) items.push({ t: 'k', x: 1.2 * a * Math.sin(t * 0.31 + sq * 1.9), y: 1.1 * a * Math.sin(t * 0.27 + sq * 2.7 + 1), z: 0.7 * a * Math.sin(t * 0.23 + sq * 3.3), r: 1.5 * a, c: [255, 232, 130], a: 0.1 * free });   // the delocalised electron sea
      return items;
    }
    if (kind === 'metallic') sc.radius = 4.2;
    var rFinal = kind === 'metallic' ? 4.2 : Math.max(2.2, deq / 2 + Math.max(rA, rB) * 1.7 + (kind === 'ionic' ? 0.5 : 1.1)), rStart = kind === 'metallic' ? 4.2 : 4.4;
    function camera(p) { sc.radius = rStart + (rFinal - rStart) * smooth((p - 0.25) / 0.6); }                 // the camera moves in as the atoms come together
    sc.live = function (ts) { if (st.t0 === null) st.t0 = ts; var p = st.held ? 1 : clamp((ts - st.t0) / dur, 0, 1); sc.items = build(p, ts); camera(p); };
    sc.replay = function () { st.t0 = null; st.held = false; }; sc.info = { cls: cls, kind: kind, n: n, deq: deq, order: order, cat: cat, an: an, ri: ri };
    sc.items = build(opt.still ? 1 : 0, 0); camera(opt.still ? 1 : 0);
    return sc;
  }

  /* ---------------------------------------------------------------- 2D Lewis drawing */
  function slotsFor(X, Ex) {
    if (X === 1) return [0]; if (X === 2 && (Ex === 0 || Ex === 3)) return [180, 0];
    if (X >= 4 && Ex >= 0) { var o = [], k; if (X === 4) return [0, 90, 180, 270]; for (k = 0; k < X; k++) o.push(90 + 360 * k / X); return o; }
    var SN = X + Ex, d = 360 / SN, out = [], j; for (j = Ex; j < SN; j++) out.push(Ex === 0 ? 90 + j * d : 90 + (j - (Ex - 1) / 2) * d); return out;
  }
  function norm360(a) { a = a % 360; return a < 0 ? a + 360 : a; }
  function adiff(a, b) { var d = Math.abs(norm360(a) - norm360(b)); return d > 180 ? 360 - d : d; }
  function layout2D(mol) {
    var atoms = mol.atoms, n = atoms.length, pos = new Array(n), ang = {}, done = {}, L = 66, rootI = 0, bx = -1;
    if (mol.arom) {
      var ring = [], seen = {}; atoms.forEach(function (a, i) { if (a.s === 'C' && !ring.length) ring.push(i); }); seen[ring[0]] = 1;
      while (ring.length < 6) { var last = ring[ring.length - 1], nx = atoms[last].nbr.filter(function (j) { return atoms[j].s === 'C' && !seen[j]; })[0]; if (nx === undefined) break; seen[nx] = 1; ring.push(nx); }
      ring.forEach(function (i, t) { var f = (90 + 60 * t) * Math.PI / 180; pos[i] = [64 * Math.cos(f), -64 * Math.sin(f)]; atoms[i].nbr.forEach(function (j) { if (atoms[j].s === 'H') pos[j] = [100 * Math.cos(f), -100 * Math.sin(f)]; }); });
      return { pos: pos, ang: {} };
    }
    atoms.forEach(function (a, i) { if (a.s !== 'H' && a.X > bx) { bx = a.X; rootI = i; } });
    function hasKids(j, par) { return atoms[j].nbr.some(function (x) { return x !== par; }); }
    function place(i, parent, thetaP) {
      var a = atoms[i], X = a.X, Ex = a.lp + (a.unp ? 1 : 0), slots = slotsFor(X, Ex), kids = a.nbr.filter(function (j) { return j !== parent; });
      if (parent !== null) { var off = thetaP - slots[0]; slots = slots.map(function (s) { return norm360(s + off); }); }
      var free = parent !== null ? slots.slice(1) : slots.slice(); var ref = parent !== null ? norm360(thetaP + 180) : 0;
      free.sort(function (p, q) { var dp = parent !== null ? adiff(p, ref) : Math.min(adiff(p, 0), adiff(p, 180)), dq = parent !== null ? adiff(q, ref) : Math.min(adiff(q, 0), adiff(q, 180)); return dp - dq; });
      kids.sort(function (p, q) { return (hasKids(q, i) ? 1 : 0) - (hasKids(p, i) ? 1 : 0) || atoms[q].X - atoms[p].X; });
      kids.forEach(function (j, t) { var th = free[t] === undefined ? 0 : free[t]; ang[i + ':' + j] = th; var r = th * Math.PI / 180; pos[j] = [pos[i][0] + L * Math.cos(r), pos[i][1] - L * Math.sin(r)]; });
      kids.forEach(function (j) { var th = ang[i + ':' + j]; place(j, i, norm360(th + 180)); });
    }
    pos[rootI] = [0, 0]; place(rootI, null, 0);
    atoms.forEach(function (a, i) { if (!pos[i]) pos[i] = [0, 0]; });
    return { pos: pos, ang: ang };
  }
  function bondAngle(pos, i, j) { return Math.atan2(-(pos[j][1] - pos[i][1]), pos[j][0] - pos[i][0]) * 180 / Math.PI; }
  /* lone pairs: greedy start, then relaxation so they end up evenly spaced between the bonds (never lopsided) */
  function placeLone(bd, n) {
    var cur = [], c, k, it;
    for (k = 0; k < n; k++) { var best = 90, bs = -1; for (c = 0; c < 48; c++) { var ca = c * 7.5, mn = 360; bd.concat(cur).forEach(function (t) { mn = Math.min(mn, adiff(ca, t)); }); if (mn > bs + 1e-6 || (Math.abs(mn - bs) < 1e-6 && Math.abs(ca - 90) < Math.abs(best - 90))) { bs = mn; best = ca; } } cur.push(best); }
    for (it = 0; it < 10; it++) for (k = 0; k < n; k++) {
      var others = bd.concat(cur.filter(function (_, q) { return q !== k; })), b2 = cur[k], s2 = -1;
      for (c = 0; c < 96; c++) { var cb = c * 3.75, m2 = 360; others.forEach(function (t) { m2 = Math.min(m2, adiff(cb, t)); }); if (m2 > s2 + 1e-6 || (Math.abs(m2 - s2) < 1e-6 && adiff(cb, cur[k]) < adiff(b2, cur[k]))) { s2 = m2; b2 = cb; } }
      cur[k] = b2;
    }
    return cur;
  }
  function lewisSVG(mol, form, opt) {
    opt = opt || {}; var f = form || mol, lay = mol._lay2d || (mol._lay2d = layout2D(mol)), pos = lay.pos, atoms = f.atoms, i, out = [], S = opt.scale || 1, avg = mol.avgOrder || {};
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    pos.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var pad = 46; minx -= pad; maxx += pad; miny -= pad; maxy += pad; if (mol.charged) { maxx += 48; minx -= 8; }
    var lpCol = '#4da3ff', neg = '#ff6b6b', posc = '#5aa9ff', ring = 12;
    f.bonds.forEach(function (b, k) {
      var A = pos[b.a], B = pos[b.b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, sh = 10;
      var x1 = A[0] + ux * sh, y1 = A[1] + uy * sh, x2 = B[0] - ux * sh, y2 = B[1] - uy * sh, o = f.bonds[k].o, ao = avg[k] !== undefined && !opt.noAvg ? avg[k] : o, w = Math.floor(ao + 0.001), fr = ao - w, nn = w + (fr > 0.05 ? 1 : 0), sp = 5.4, j;
      if (mol.arom && !opt.noAvg && avg[k] !== undefined) { w = 1; nn = 2; fr = 0.5; }
      for (j = 0; j < nn; j++) { var off = (j - (nn - 1) / 2) * sp; out.push('<line x1="' + (x1 + nx * off).toFixed(1) + '" y1="' + (y1 + ny * off).toFixed(1) + '" x2="' + (x2 + nx * off).toFixed(1) + '" y2="' + (y2 + ny * off).toFixed(1) + '" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"' + (j >= w ? ' stroke-dasharray="5 4" opacity=".75"' : '') + '/>'); }
    });
    var defs = {};
    atoms.forEach(function (a, i) {                                   // atom = shaded element-coloured disc + symbol, lone pairs spread evenly around it
      var p = pos[i], col = colOf(a.s), hx = col.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''), lum = (0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]) / 255, DR = a.s === 'H' ? 12.5 : a.s.length > 1 ? 16.5 : 15.5;
      defs[hx] = '<radialGradient id="bslg' + hx + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="rgb(' + col.map(function (v) { return Math.min(255, v + 70); }).join(',') + ')"/><stop offset=".6" stop-color="rgb(' + col.join(',') + ')"/><stop offset="1" stop-color="rgb(' + col.map(function (v) { return Math.round(v * 0.6); }).join(',') + ')"/></radialGradient>';
      out.push('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + DR + '" fill="url(#bslg' + hx + ')" stroke="rgba(0,0,0,.5)" stroke-width="1.3"/>');
      out.push('<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + (a.s === 'H' ? 5.2 : 6.2)).toFixed(1) + '" text-anchor="middle" font-size="' + (a.s === 'H' ? 15 : 18) + '" font-weight="800" fill="' + (lum > 0.6 ? '#10151c' : '#ffffff') + '" font-family="system-ui,sans-serif">' + a.s + '</text>');
      var bondDirs = a.nbr.map(function (j) { return bondAngle(pos, i, j); }), nIt = a.lp + (a.unp ? 1 : 0), dirs = placeLone(bondDirs, nIt), taken = bondDirs.concat(dirs), m;
      for (m = 0; m < nIt; m++) {
        var r = dirs[m] * Math.PI / 180, cx = p[0] + Math.cos(r) * (DR + 8), cy = p[1] - Math.sin(r) * (DR + 8), px = -Math.sin(r) * 3.9, py = -Math.cos(r) * 3.9;
        if (m < a.lp) out.push('<circle cx="' + (cx + px).toFixed(1) + '" cy="' + (cy + py).toFixed(1) + '" r="2.7" fill="' + lpCol + '"/><circle cx="' + (cx - px).toFixed(1) + '" cy="' + (cy - py).toFixed(1) + '" r="2.7" fill="' + lpCol + '"/>');
        else out.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.9" fill="#ffb020"/>');
      }
      var qd = !form && mol.resonant && !opt.noAvg && mol.avgCharge && mol.avgCharge[i] !== undefined ? mol.avgCharge[i] : a.q;
      if (qd !== 0) {
        var bestA = 45, bsc = -1, c2; for (c2 = 0; c2 < 24; c2++) { var ca2 = c2 * 15, mn2 = 360; taken.forEach(function (t) { mn2 = Math.min(mn2, adiff(ca2, t)); }); if (mn2 > bsc) { bsc = mn2; bestA = ca2; } }
        var rr = bestA * Math.PI / 180, qx = p[0] + Math.cos(rr) * (DR + 14), qy = p[1] - Math.sin(rr) * (DR + 14), lab = qLabel(qd), big = lab.length > 1 ? 11 : 7.5, col2 = qd < 0 ? neg : posc;
        out.push('<circle cx="' + qx.toFixed(1) + '" cy="' + qy.toFixed(1) + '" r="' + big + '" fill="none" stroke="' + col2 + '" stroke-width="1.5"/><text x="' + qx.toFixed(1) + '" y="' + (qy + 4).toFixed(1) + '" text-anchor="middle" font-size="' + (lab.length > 1 ? 11 : 12) + '" font-weight="700" fill="' + col2 + '" font-family="system-ui,sans-serif">' + lab + '</text>');
      }
    });
    out.unshift('<defs>' + Object.keys(defs).map(function (k) { return defs[k]; }).join('') + '</defs>');
    var W = maxx - minx, H = maxy - miny, bracket = '';
    if (mol.charged) {
      var bx0 = minx + 10, bx1 = maxx - 18, by0 = miny + 8, by1 = maxy - 8;
      bracket = '<path d="M' + (bx0 + 9) + ' ' + by0 + ' H' + bx0 + ' V' + by1 + ' H' + (bx0 + 9) + '" fill="none" stroke="currentColor" stroke-width="2"/><path d="M' + (bx1 - 9) + ' ' + by0 + ' H' + bx1 + ' V' + by1 + ' H' + (bx1 - 9) + '" fill="none" stroke="currentColor" stroke-width="2"/><text x="' + (bx1 + 4) + '" y="' + (by0 + 8) + '" font-size="17" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">' + (Math.abs(mol.charge) > 1 ? Math.abs(mol.charge) : '') + (mol.charge > 0 ? '+' : '−') + '</text>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + minx.toFixed(0) + ' ' + miny.toFixed(0) + ' ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" style="width:' + Math.min(100, Math.max(34, W * 0.34 * S)).toFixed(0) + '%;max-width:' + (W * 1.25 * S).toFixed(0) + 'px;height:auto;max-height:260px" role="img">' + bracket + out.join('') + '</svg>';
  }

  root.BSScenes = { molScene: molScene, crystalScene: crystalScene, pairScene: pairScene, lewisSVG: lewisSVG, colOf: colOf, lattice: lattice };
})(typeof window !== 'undefined' ? window : globalThis);
