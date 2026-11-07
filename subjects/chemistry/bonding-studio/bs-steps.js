/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-steps.js
   Builds the worked solutions as HTML from the engine's results. Two levels, like the other modules:
     'general'  — a short path to the answer (one line per step)
     'detailed' — the same steps with the how/why: electron bookkeeping, formal-charge table, VSEPR reasoning, bond-dipole values
   All wording comes from the dictionary (T); numbers, formulas and units are language-neutral and built here.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, U = E.util;
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function fx(x, d) { return Number(x).toFixed(d === undefined ? 2 : d); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function ul(items) { return '<ul class="bs-ul">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function mono(s) { return '<span class="bs-mono">' + s + '</span>'; }

  function measuredAngles(mol, ci) {
    var a = mol.atoms[ci], out = [], i, j; if (!mol.pos) return out;
    for (i = 0; i < a.nbr.length; i++) for (j = i + 1; j < a.nbr.length; j++) {
      var u = U.vnorm(U.vsub(mol.pos[a.nbr[i]], mol.pos[ci])), v = U.vnorm(U.vsub(mol.pos[a.nbr[j]], mol.pos[ci])); out.push(Math.acos(Math.max(-1, Math.min(1, U.vdot(u, v)))) * 180 / Math.PI);
    }
    return out;
  }
  function angleText(mol, ci) {
    var ang = measuredAngles(mol, ci); if (!ang.length) return '—';
    var uniq = [], seen = {}; ang.forEach(function (x) { var k = Math.round(x * 10) / 10; if (!seen[k]) { seen[k] = 1; uniq.push(k); } }); uniq.sort(function (a, b) { return a - b; });
    return uniq.slice(0, 3).map(function (x) { return f1(x) + '°'; }).join(', ');
  }
  function centreAtoms(mol) { return mol.atoms.filter(function (a) { return a.s !== 'H' && a.X >= 2; }); }
  function sumExpr(mol) {
    var cnt = {}, order = []; mol.atoms.forEach(function (a) { if (!cnt[a.s]) { cnt[a.s] = { n: 0, v: a.V }; order.push(a.s); } cnt[a.s].n++; });
    return order.map(function (s) { return s + ': ' + cnt[s].n + ' × ' + cnt[s].v; }).join(' + ');
  }

  function lewisSteps(mol, T, level) {
    var det = level === 'detailed', st = [], atoms = mol.atoms, heavy = atoms.filter(function (a) { return a.s !== 'H'; }), nb = mol.bonds.length;
    var cen = atoms.reduce(function (m, a) { return a.s !== 'H' && (!m || a.X > m.X) ? a : m; }, null), diat = atoms.length === 2, single = atoms.length === 1;
    /* 1 */
    var b1 = T('s1', { expr: sumExpr(mol), total: mol.valenceTotal });
    if (mol.charge) b1 += ' ' + (mol.charge < 0 ? T('s1neg', { q: Math.abs(mol.charge) }) : T('s1pos', { q: mol.charge }));
    if (det) b1 += '<div class="bs-why">' + T('s1why') + '</div>' + ul(Object.keys(atoms.reduce(function (o, a) { o[a.s] = a; return o; }, {})).map(function (s) {
      var a = atoms.filter(function (x) { return x.s === s; })[0], e = a.el; return T('s1atom', { sym: s, g: e.g || '—', sh: e.sh[e.sh.length - 1], v: a.V });
    }));
    st.push({ h: T('s1h'), b: b1 });
    /* 2 */
    var b2 = diat ? T('s2d', { e: 2 * nb }) : mol.centre >= 0 ? T('s2', { c: atoms[mol.centre].s, nb: nb, e: 2 * nb }) : T('s2c', { nb: nb, e: 2 * nb });
    if (det && !diat) b2 += '<div class="bs-why">' + T('s2why') + '</div>' + ul(heavy.filter(function (a, i, arr) { return arr.findIndex(function (b) { return b.s === a.s; }) === i; }).map(function (a) { return a.s + ': χ = ' + (E.en(a.el) === null ? '—' : fx(E.en(a.el))) + ', ' + T('s2x', { n: a.X }); }));
    st.push({ h: T('s2h'), b: b2 });
    /* 3 */
    var used = 2 * nb, rest = mol.valenceTotal - used, b3 = T('s3', { rest: rest, pairs: Math.floor(rest / 2) });
    if (det) b3 += '<div class="bs-why">' + mono(mol.valenceTotal + ' − ' + used + ' = ' + rest) + ' · ' + T('s3why') + '</div>';
    st.push({ h: T('s3h'), b: b3 });
    /* 4 */
    var multi = mol.bonds.filter(function (b) { return b.o > 1; }), b4 = '', notes = [];
    if (multi.length) b4 += T('s4m', { list: multi.map(function (b) { return atoms[b.a].s + (b.o === 2 ? '=' : '≡') + atoms[b.b].s; }).join(', ') }); else b4 += T('s4n');
    atoms.forEach(function (a) {
      if (a.state === 'expanded') notes.push(T('s4x', { a: a.s, n: a.around })); else if (a.state === 'deficient' && a.s !== 'H') notes.push(T('s4d', { a: a.s, n: a.around })); else if (a.state === 'radical') notes.push(T('s4r', { a: a.s }));
    });
    var seenN = {}; notes = notes.filter(function (x) { if (seenN[x]) return false; seenN[x] = 1; return true; });
    if (notes.length) b4 += ul(notes);
    if (det) {
      b4 += '<div class="bs-why">' + T('s4fc') + '</div>' + ul(atoms.filter(function (a, i, arr) { return arr.findIndex(function (b) { return b.s === a.s && b.q === a.q && b.L === a.L && b.B === a.B; }) === i; }).map(function (a) {
        return mono(a.s + ': ' + a.V + ' − ' + a.L + ' − ' + a.B + ' = ' + (a.q > 0 ? '+' : '') + a.q) + (atoms.filter(function (b) { return b.s === a.s && b.q === a.q && b.L === a.L && b.B === a.B; }).length > 1 ? ' (×' + atoms.filter(function (b) { return b.s === a.s && b.q === a.q && b.L === a.L && b.B === a.B; }).length + ')' : '');
      })) + '<div class="bs-why">' + T('s4sum', { q: mol.charge, s: mol.formalSum }) + '</div>';
    }
    if (mol.resonant && mol.forms) {
      var avgs = mol.avgOrder ? Object.keys(mol.avgOrder).map(function (k) { return mol.avgOrder[k]; }) : [], avg = avgs.length ? avgs[0] : 1.5;
      b4 += '<div class="bs-res">' + T('sRes', { n: mol.forms.length, o: f1(avg) }) + '</div>';
    }
    st.push({ h: T('s4h'), b: b4 });
    /* 5 check */
    var b5 = T('s5', { bp: mol.bondPairs, lp: mol.lonePairs + (mol.radical ? '+•' : ''), tot: 2 * mol.bondPairs + 2 * mol.lonePairs + (mol.radical ? 1 : 0) });
    if (det) b5 += '<div class="bs-why">' + atoms.filter(function (a, i, arr) { return arr.findIndex(function (b) { return b.s === a.s && b.around === a.around; }) === i; }).map(function (a) { return mono(a.s + ': ' + a.around + ' e⁻') + ' ' + T('state_' + a.state); }).join(' · ') + '</div>';
    st.push({ h: T('s5h'), b: b5 });
    /* 6 geometry */
    var b6, ca = centreAtoms(mol);
    if (diat || single) b6 = T('s6di');
    else if (ca.length) {
      b6 = ca.slice(0, 3).map(function (a) {
        var v = E.vsepr(a), line = T('s6', { a: a.s, x: a.X, e: a.E, sn: a.sn, key: v.key, geo: T('g_' + v.electron), shape: T('m_' + v.shape) });
        if (det) line += '<div class="bs-why">' + T('s6d', { ang: v.angles, real: angleText(mol, a.i), hyb: v.hyb, src: mol.ang && mol.centre === a.i ? T('srcExp') : T('srcModel') }) + '</div>';
        return '<div>' + line + '</div>';
      }).join('');
    } else b6 = T('s6di');
    st.push({ h: T('s6h'), b: b6 });
    /* 7 polarity */
    var b7 = mol.charged ? T('s7ion') : (mol.polar ? T('s7p') : T('s7n')) + ' ';
    if (!mol.charged) {
      b7 = (mol.polar ? T('s7p') : T('s7n'));
      if (det) {
        b7 += ul(mol.bondInfo.filter(function (bi, i, arr) { return arr.findIndex(function (b2) { return atoms[b2.a].s + atoms[b2.b].s + b2.order === atoms[bi.a].s + atoms[bi.b].s + bi.order; }) === i; }).map(function (bi) {
          return mono(atoms[bi.a].s + '–' + atoms[bi.b].s + ': Δχ = ' + (bi.cls.known ? fx(bi.cls.dChi) : '—')) + ' → ' + T('t_' + bi.cls.type) + (bi.cls.known ? ' (' + fx(bi.cls.hs * 100, 0) + '% ' + T('ionicWord') + ')' : '');
        }));
        b7 += '<div class="bs-why">' + T('s7d', { mu: fx(mol.dipole.mag, 2), src: mol.polarSource === 'exp' ? T('srcExpMu', { mu: mol.muExp }) : T('srcModelMu') }) + '</div>';
      }
    }
    st.push({ h: T('s7h'), b: b7 });
    if (!det) st = st.filter(function (s, i) { return true; });
    return st;
  }

  /* ---------- why do these two elements bond the way they do? ---------- */
  function pairInsights(A, B, cls, T) {
    var ea = E.el(A), eb = E.el(B), out = [], va = E.valence(ea), vb = E.valence(eb), ma = E.isMetal(ea), mb = E.isMetal(eb);
    function nm(e) { return e.s + ' (' + e[T.lang] + ')'; }
    if (!cls.known) { out.push({ k: 'x_noEn', t: T('x_noEn', { a: A, b: B }) }); return out; }
    /* valence */
    if (cls.type === 'metallic') out.push({ k: 'val', t: T('x_valMetal', { a: A, b: B, va: va, vb: vb }) });
    else if (ma !== mb) { var m = ma ? ea : eb, n = ma ? eb : ea, k = Math.min(8 - E.valence(n), 8); out.push({ k: 'val', t: T('x_valIonic', { m: m.s, vm: E.valence(m), n: n.s, k: E.anionCharge(n) ? -E.anionCharge(n) : k }) }); }
    else out.push({ k: 'val', t: T('x_valCov', { a: A, b: B, va: va, vb: vb }) });
    /* electronegativity */
    out.push({ k: 'en', t: T('x_en', { a: A, ea: fx(cls.chiA), b: B, eb: fx(cls.chiB), d: fx(cls.dChi), verdict: T('t_' + cls.type) }) });
    /* energetics of ion formation */
    if (ma !== mb) {
      var cat = ma ? A : B, an = ma ? B : A, cur = E.ionPairCurve(cat, an), eC = E.el(cat), eA = E.el(an);
      out.push({ k: 'ie', t: T('x_ie', { c: cat, ie: f1(eC.ie), an: an, ea: f1(eA.ea || 0) }) });
      if (cur) out.push({ k: 'ion', t: T('x_dE', { dE: f1(cur.dE), rstar: cur.rStar ? Math.round(cur.rStar) : '—', r0: Math.round(cur.r0), emin: Math.round(cur.Emin) }) });
    } else if (cls.type !== 'metallic') out.push({ k: 'cov', t: T('x_noble', { a: A, b: B }) });
    else out.push({ k: 'ie', t: T('x_ieMetal', { a: A, ia: f1(ea.ie), b: B, ib: f1(eb.ie) }) });
    /* size and bond strength */
    var o = E.typicalOrder(A, B), len = E.bondLength(A, B, o) * 100, en2 = E.bondEnergy(A, B, o);
    if (cls.type === 'ionic' || (ma !== mb && cls.type !== 'metallic')) {
      var catS = ma ? A : B, anS = ma ? B : A, cq0 = E.cationCharges(E.el(catS))[0] || 1, aq0 = -(E.anionCharge(E.el(anS)) || -1), rc = E.ionRadius(catS, cq0).r, ra = E.ionRadius(anS, -aq0).r;
      out.push({ k: 'size', t: T('x_sizeIonic', { c: catS, rc0: Math.round(E.covR(E.el(catS)) * 100), rc: Math.round(rc), a: anS, ra0: Math.round(E.covR(E.el(anS)) * 100), ra: Math.round(ra), d: Math.round(rc + ra) }) });
    } else if (cls.type !== 'metallic') out.push({ k: 'size', t: T('x_size', { a: A, ra: Math.round(E.covR(ea) * 100), b: B, rb: Math.round(E.covR(eb) * 100), len: Math.round(len) }) });
    if (cls.type !== 'ionic' && cls.type !== 'metallic') out.push({ k: 'energy', t: T('x_energy', { e: Math.round(en2.v), src: T('src_' + en2.src) }) });
    /* ionic character */
    out.push({ k: 'char', t: T('x_char', { p1: fx(cls.pauling * 100, 0), p2: fx(cls.hs * 100, 0) }) });
    if (cls.borderline) out.push({ k: 'border', t: T('x_border', { d: fx(cls.dChi) }) });
    return out;
  }
  function ionicInsights(ic, T) {
    var out = [], cq = ic.cat.q, aq = -ic.an.q, C = E.el(ic.cat.s), A = ic.poly ? null : E.el(ic.an.s);
    out.push(T('i_charges', { c: ic.cat.s || ic.cat.f, cq: cq, a: ic.an.f || ic.an.s, aq: aq, nc: ic.nc, na: ic.na, formula: ic.formula }));
    if (!ic.poly) {
      out.push(T('i_radii', { rc: Math.round(ic.r.cat), ra: Math.round(ic.r.an), ratio: fx(ic.ratio, 2), structure: T('st_' + ic.structure) }));
      out.push(T('i_lattice', { k: Math.round(ic.kapustinskii), bl: ic.bornLande ? ' · Born–Landé ' + Math.round(ic.bornLande) + ' kJ/mol (M = ' + ic.madelung + ', n = ' + fx(ic.bornN, 1) + ')' : '' }));
      if (ic.r.est) out.push(T('i_est'));
    }
    out.push(T('i_props'));
    return out;
  }

  root.BSSteps = { lewisSteps: lewisSteps, pairInsights: pairInsights, ionicInsights: ionicInsights, measuredAngles: measuredAngles, angleText: angleText, centreAtoms: centreAtoms, f1: f1, fx: fx, esc: esc, ul: ul };
})(typeof window !== 'undefined' ? window : globalThis);
