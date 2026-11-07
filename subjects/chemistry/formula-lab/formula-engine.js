/* formula-engine.js — MultiCalc Chemical Formula Engine (pure logic, no DOM).
   Shared mechanism for any module that needs to read a chemical formula.
   API (window.FormulaEngine):
     analyze(text) -> {ok, norm, atoms[], mass, total, kind, parts, error?}
     normalize(text), pretty(normText), atomicMass(sym), hasElement(sym),
     setMassProvider(fn(sym)->number|undefined)   // plug elements.js in here
   Atomic masses: IUPAC/CIAAW conventional standard atomic weights (abridged);
   elements with no stable isotope use the mass number of the longest-lived isotope. */
(function (root) {
  'use strict';
  var SRC = 'H 1.008|He 4.0026|Li 6.94|Be 9.0122|B 10.81|C 12.011|N 14.007|O 15.999|F 18.998|Ne 20.180|' +
    'Na 22.990|Mg 24.305|Al 26.982|Si 28.085|P 30.974|S 32.06|Cl 35.45|Ar 39.95|K 39.098|Ca 40.078|' +
    'Sc 44.956|Ti 47.867|V 50.942|Cr 51.996|Mn 54.938|Fe 55.845|Co 58.933|Ni 58.693|Cu 63.546|Zn 65.38|' +
    'Ga 69.723|Ge 72.630|As 74.922|Se 78.971|Br 79.904|Kr 83.798|Rb 85.468|Sr 87.62|Y 88.906|Zr 91.224|' +
    'Nb 92.906|Mo 95.95|Tc 98|Ru 101.07|Rh 102.91|Pd 106.42|Ag 107.87|Cd 112.41|In 114.82|Sn 118.71|' +
    'Sb 121.76|Te 127.60|I 126.90|Xe 131.29|Cs 132.91|Ba 137.33|La 138.91|Ce 140.12|Pr 140.91|Nd 144.24|' +
    'Pm 145|Sm 150.36|Eu 151.96|Gd 157.25|Tb 158.93|Dy 162.50|Ho 164.93|Er 167.26|Tm 168.93|Yb 173.05|' +
    'Lu 174.97|Hf 178.49|Ta 180.95|W 183.84|Re 186.21|Os 190.23|Ir 192.22|Pt 195.08|Au 196.97|Hg 200.59|' +
    'Tl 204.38|Pb 207.2|Bi 208.98|Po 209|At 210|Rn 222|Fr 223|Ra 226|Ac 227|Th 232.04|' +
    'Pa 231.04|U 238.03|Np 237|Pu 244|Am 243|Cm 247|Bk 247|Cf 251|Es 252|Fm 257|' +
    'Md 258|No 259|Lr 266|Rf 267|Db 268|Sg 269|Bh 270|Hs 277|Mt 278|Ds 281|' +
    'Rg 282|Cn 285|Nh 286|Fl 289|Mc 290|Lv 293|Ts 294|Og 294';
  var AR = {}, Z = {}, provider = null;
  SRC.split('|').forEach(function (s, i) { var p = s.split(' '); AR[p[0]] = +p[1]; Z[p[0]] = i + 1; });
  var NM = {}; 'H He B C N O F Ne Si P S Cl Ar Ge As Se Br Kr Sb Te I Xe At Rn'.split(' ').forEach(function (x) { NM[x] = 1; });

  function setMassProvider(fn) { provider = typeof fn === 'function' ? fn : null; }
  var DB = null;   // lazy index of MC_ELEMENTS (elements.js) by symbol
  function db() {
    if (!DB && typeof root.MC_ELEMENTS !== 'undefined') { DB = {}; root.MC_ELEMENTS.forEach(function (e) { DB[e.s] = e; }); }
    return DB;
  }
  function info(sym) { var d = db(); return (d && d[sym]) || null; }
  function atomicMass(sym) {
    var v = provider ? provider(sym) : undefined;
    if (!(typeof v === 'number' && v > 0)) { var e = info(sym); v = e ? +e.m.toFixed(4) : AR[sym]; }
    return v;
  }
  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])/g, function (m, d, sg) { return '^' + d.replace(/./g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c); }) + (sg === '⁺' ? '+' : '-'); })
      .replace(/\u2212/g, '-')
      .replace(/[₀-₉]/g, function (c) { return '₀₁₂₃₄₅₆₇₈₉'.indexOf(c); })
      .replace(/[\[\{]/g, '(').replace(/[\]\}]/g, ')')
      .replace(/[•∙⋅*.]/g, '·').replace(/\s+/g, '');
  }
  function pretty(s) { return String(s).replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>'); }

  /* charge notations: ^2-  ^-2  Al-2  Na+5  Fe3+  SO42-  NH4+  Na+  Cl-  (and unicode superscripts via normalize) */
  function splitCharge(s) {
    var m, tbl = root.POLYATOMIC_IONS || [];
    function known(f, q) { return tbl.some(function (t) { return t[0] === f && t[1] === q; }); }
    if ((m = /\^(\d*)([+-])$/.exec(s))) return { s: s.slice(0, m.index), q: (m[1] === '' ? 1 : +m[1]) * (m[2] === '+' ? 1 : -1) };
    if ((m = /\^([+-])(\d+)$/.exec(s))) return { s: s.slice(0, m.index), q: +m[2] * (m[1] === '+' ? 1 : -1) };
    if ((m = /([+-])(\d+)$/.exec(s)) && m.index > 0) return { s: s.slice(0, m.index), q: +m[2] * (m[1] === '+' ? 1 : -1) };
    if ((m = /(\d+)([+-])$/.exec(s)) && m.index > 0) {
      var sg = m[2] === '+' ? 1 : -1, fb = s.slice(0, -1), d = +m[1].slice(-1), fa = s.slice(0, -2);
      if (known(fb, sg)) return { s: fb, q: sg };
      if (fa && known(fa, sg * d)) return { s: fa, q: sg * d };
      if (/^[A-Z][a-z]?$/.test(fa) && (fa in Z)) return { s: fa, q: sg * d };
      return { s: fb, q: sg };
    }
    if ((m = /([+-])$/.exec(s)) && m.index > 0) return { s: s.slice(0, m.index), q: m[1] === '+' ? 1 : -1 };
    return { s: s, q: 0 };
  }

  function analyze(input) {
    var s = normalize(input), i = 0, cs = splitCharge(s), charge = cs.q;
    s = cs.s;
    if (!s) return { ok: false, norm: s, error: { code: 'EMPTY', pos: 0 } };
    function E(code, pos, info) { throw { code: code, pos: pos, info: info }; }
    function num() { var st = i; while (i < s.length && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) i++; return i > st ? parseInt(s.slice(st, i), 10) : null; }
    function seq() {
      var kids = [];
      while (i < s.length && s[i] !== ')' && s[i] !== '·') {
        var c = s[i], n;
        if (c === '(') {
          var o = i; i++;
          var inner = seq();
          if (s[i] !== ')') E('UNBALANCED', o);
          i++; n = num();
          if (n === 0) E('ZERO', i - 1);
          if (!inner.length) E('EMPTYPART', o);
          kids.push({ t: 'g', kids: inner, n: n === null ? 1 : n });
        } else if (c >= 'A' && c <= 'Z') {
          var st = i; i++;
          if (i < s.length && s[i] >= 'a' && s[i] <= 'z' && (s.slice(st, i + 1) in Z)) i++;
          var sym = s.slice(st, i);
          if (!(sym in Z)) E('UNKNOWN', st, s.slice(st, Math.min(st + 2, st + 1 + (/[a-z]/.test(s[st + 1] || '') ? 1 : 0))));
          n = num();
          if (n === 0) E('ZERO', i - 1);
          kids.push({ t: 'a', el: sym, n: n === null ? 1 : n });
        } else E('CHAR', i, c);
      }
      return kids;
    }
    var parts = [];
    try {
      for (;;) {
        var ps = i, co = num(), kids = seq();
        if (i < s.length && s[i] === ')') E('UNBALANCED', i);
        if (!kids.length) E('EMPTYPART', i);
        parts.push({ coef: co === null ? 1 : co, kids: kids, src: s.slice(ps, i) });
        if (i < s.length && s[i] === '·') { i++; continue; }
        break;
      }
    } catch (e) {
      if (e && e.code) return { ok: false, norm: s, error: e };
      throw e;
    }
    var tally = {}, order = [], total = 0, groups = false;
    function walk(kids, fac) {
      kids.forEach(function (k) {
        var f = [k.n].concat(fac);
        if (k.t === 'g') { groups = true; walk(k.kids, f); return; }
        var c = f.reduce(function (a, b) { return a * b; }, 1);
        var t = tally[k.el];
        if (!t) { t = tally[k.el] = { el: k.el, Z: Z[k.el], count: 0, terms: [] }; order.push(k.el); }
        var ff = f.filter(function (x) { return x !== 1; });
        t.count += c; t.terms.push({ f: ff.length ? ff : [1], c: c }); total += c;
      });
    }
    parts.forEach(function (p) { walk(p.kids, [p.coef]); });
    var M = 0;
    var atoms = order.map(function (el) { var t = tally[el]; t.ar = atomicMass(el); t.info = info(el); t.sub = t.count * t.ar; M += t.sub; return t; });
    atoms.forEach(function (t) { t.pct = t.sub / M * 100; });
    var metal = atoms.some(function (t) { return !NM[t.el]; });
    return {
      ok: true, norm: s, charge: charge, atoms: atoms,
      partCounts: parts.map(function (p) { return countsOf(p.kids, p.coef, {}); }), partSrc: parts.map(function (p) { return p.src; }), mass: M, total: total, groups: groups, parts: parts.length,
      kind: (metal || parts.length > 1 || /\(NH4\)/.test(s)) ? 'formula' : 'molecular'
    };
  }

  var MINUS = '\u2212';
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function fmtOx(num, den) {
    if (num === 0) return '0';
    var g = gcd(num, den), n = num / g, d = den / g;
    return (n > 0 ? '+' : MINUS) + Math.abs(n) + (d !== 1 ? '/' + d : '');
  }
  /* Oxidation numbers by priority rules; the single unknown element is solved from charge balance
     (sum of count x ox = ion charge). Anything the rules cannot decide is reported, never guessed. */
  function oxidation(r) {
    if (!r || !r.ok) return null;
    var A = r.atoms, Q = r.charge || 0;
    if (!A.every(function (a) { return a.info; })) return { status: 'nodata', rows: [] };
    function has(x) { return A.some(function (a) { return a.el === x; }); }
    function salt(a) { return (a.info.g === 1 && a.el !== 'H') || a.info.g === 2 || a.el === 'Al'; }
    var rows = A.map(function (a) { return { el: a.el, Z: a.Z, info: a.info, count: a.count, num: null, den: 1, rule: null }; });
    function S() { return rows.reduce(function (s, w) { return w.num === null ? s : s + w.count * w.num / w.den; }, 0); }
    function fin(status) {
      rows.forEach(function (w) { w.ox = w.num === null ? null : fmtOx(w.num, w.den); });
      return { status: status, rows: rows, sum: S(), charge: Q };
    }
    if (A.length === 1) { var w0 = rows[0]; w0.num = Q; w0.den = w0.count; w0.rule = Q ? 'ion' : 'elem'; return fin('ok'); }
    var hyd = has('H') && A.every(function (a) { return a.el === 'H' || salt(a); });
    var n17 = A.filter(function (a) { return a.info.g === 17; }).length;
    rows.forEach(function (w) {
      var e = w.el;
      function set(v, rule) { w.num = v; w.den = 1; w.rule = rule; }
      if (w.info.g === 1 && e !== 'H') set(1, 'g1');
      else if (w.info.g === 2) set(2, 'g2');
      else if (e === 'Al') set(3, 'Al');
      else if (e === 'Zn' || e === 'Cd') set(2, 'common');
      else if (e === 'Ag') set(1, 'common');
      else if (e === 'F') set(-1, 'F');
      else if (e === 'H') set(hyd ? -1 : 1, hyd ? 'hyd' : 'H');
      else if (e === 'O' && !has('F')) set(-2, 'O');
      else if ((e === 'Cl' || e === 'Br' || e === 'I') && !has('O') && !has('F') && n17 === 1) set(-1, 'hal');
    });
    var unk = rows.filter(function (w) { return w.num === null; });
    if (!unk.length && Math.abs(S() - Q) > 1e-9 && rows.some(function (w) { return w.el === 'O' && w.count >= 2; }) && A.every(function (a) { return a.el === 'O' || a.el === 'H' || salt(a); })) {
      [[-1, 1, 'perox'], [-1, 2, 'super']].some(function (t) {
        rows.forEach(function (w) { if (w.el === 'O') { w.num = t[0]; w.den = t[1]; w.rule = t[2]; } });
        return Math.abs(S() - Q) < 1e-9;
      });
      if (Math.abs(S() - Q) > 1e-9) rows.forEach(function (w) { if (w.el === 'O') { w.num = -2; w.den = 1; w.rule = 'O'; } });
    }
    if (unk.length > 1) return fin('undetermined');
    if (unk.length === 1) {
      var u = unk[0], s2 = Math.round(2 * (S() - Q));
      u.num = -s2; u.den = 2 * u.count; u.rule = 'solved'; u.avg = u.count > 1;
      var v = u.num / u.den;
      return fin(v > 8 || v < -4 ? 'implausible' : 'ok');
    }
    return fin(Math.abs(S() - Q) < 1e-9 ? 'ok' : 'mismatch');
  }
  /* Empirical / molecular formula from mass percentages (or grams). Smallest k (1..8) giving integers within 0.08. */
  function empirical(items, M) {
    if (!items || !items.length) return { ok: false, error: { code: 'EMPTY' } };
    var rows = [], seen = {}, sum = 0, i;
    for (i = 0; i < items.length; i++) {
      var s = String(items[i].el || '').trim(), v = parseFloat(String(items[i].val).replace(',', '.'));
      s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      if (!(s in Z)) return { ok: false, error: { code: 'UNKNOWN', row: i, info: s } };
      if (!(v > 0) || !isFinite(v)) return { ok: false, error: { code: 'BADVAL', row: i, info: s } };
      if (seen[s]) return { ok: false, error: { code: 'DUP', row: i, info: s } };
      seen[s] = 1; sum += v;
      var ar = atomicMass(s);
      rows.push({ el: s, Z: Z[s], info: info(s), val: v, ar: ar, mol: v / ar });
    }
    var minMol = Math.min.apply(null, rows.map(function (r) { return r.mol; }));
    rows.forEach(function (r) { r.ratio = r.mol / minMol; });
    var best = null, k, dev;
    for (k = 1; k <= 8; k++) {
      dev = Math.max.apply(null, rows.map(function (r) { var x = r.ratio * k; return Math.abs(x - Math.round(x)); }));
      if (dev <= 0.08) { best = { k: k, dev: dev, exact: true }; break; }
      if (!best || dev < best.dev) best = { k: k, dev: dev, exact: false };
    }
    var empMass = 0;
    rows.forEach(function (r) { r.n = Math.round(r.ratio * best.k); empMass += r.n * r.ar; });
    function fm(mult) { return rows.map(function (r) { return r.el + (r.n * mult > 1 ? r.n * mult : ''); }).join(''); }
    var out = { ok: true, rows: rows, sum: sum, minMol: minMol, k: best.k, dev: best.dev, exact: best.exact, formula: fm(1), empMass: empMass, molecular: null };
    if (M > 0) {
      var nn = M / empMass, rn = Math.round(nn);
      out.molecular = { nn: nn, n: rn, ok: rn >= 1 && Math.abs(M - rn * empMass) / M <= 0.02, formula: rn >= 1 ? fm(rn) : fm(1), mass: Math.max(rn, 1) * empMass };
    }
    return out;
  }

  /* Isotopic composition (data: ciaaw-isotopes-2024.js). Interval-type elements (variable composition) use the
     interval midpoint, normalised to 1; if the midpoints are too far from 1 (Pb) no pattern is computed. */
  function isoRows(sym) {
    var d = root.CIAAW_ISO_2024 && root.CIAAW_ISO_2024[sym];
    if (!d) return null;
    var rows = d.i.map(function (r) { var iv = r[4] != null; return { A: r[0], mass: r[1], x: iv ? null : r[2], u: iv ? null : r[3], lo: iv ? r[4] : null, hi: iv ? r[5] : null, mid: iv ? (r[4] + r[5]) / 2 : r[2] }; });
    var sum = rows.reduce(function (a, r) { return a + r.mid; }, 0);
    return { rows: rows, interval: d.v === 1, sum: sum, wide: Math.abs(sum - 1) > 0.002, notes: d.n };
  }
  function isoPattern(r) {
    if (!r || !r.ok) return null;
    if (r.total > 3000) return { ok: false, reason: 'big' };
    var dist = { 0: { p: 1, mp: 0 } }, mono = 0, monoA = 0, avg = 0, approx = false, a, t, e;
    function conv(d, el) {
      var o = {};
      Object.keys(d).forEach(function (k) {
        el.forEach(function (x) {
          var p = d[k].p * x.p; if (p < 1e-14) return;
          var q = o[+k + x.A] || (o[+k + x.A] = { p: 0, mp: 0 });
          q.p += p; q.mp += d[k].mp * x.p + p * x.m;
        });
      });
      return o;
    }
    for (a = 0; a < r.atoms.length; a++) {
      t = r.atoms[a]; e = isoRows(t.el);
      if (!e) return { ok: false, reason: 'nodata', el: t.el };
      if (e.wide) return { ok: false, reason: 'wide', el: t.el };
      if (e.interval) approx = true;
      var el = e.rows.map(function (x) { return { A: x.A, p: x.mid / e.sum, m: x.mass }; });
      var best = el.reduce(function (b, x) { return x.p > b.p ? x : b; });
      mono += t.count * best.m; monoA += t.count * best.A;
      avg += t.count * el.reduce(function (s, x) { return s + x.p * x.m; }, 0);
      for (var c = 0; c < t.count; c++) dist = conv(dist, el);
    }
    var keys = Object.keys(dist).map(Number).sort(function (x, y) { return x - y; });
    var maxp = Math.max.apply(null, keys.map(function (k) { return dist[k].p; }));
    var peaks = keys.map(function (k) { return { k: k - monoA, A: k, mass: dist[k].mp / dist[k].p, p: dist[k].p, rel: 100 * dist[k].p / maxp }; })
      .filter(function (x) { return x.rel >= 0.05; }).sort(function (x, y) { return y.rel - x.rel; }).slice(0, 16).sort(function (x, y) { return x.A - y.A; });
    return { ok: true, monoA: monoA, mono: mono, avg: avg, peaks: peaks, approx: approx, sumP: keys.reduce(function (s, k) { return s + dist[k].p; }, 0) };
  }

  /* Ionic decomposition: exact search over curated polyatomic ions (polyatomic-ions.js) + monatomic ions with
     fixed charges; one variable-charge metal may be solved from neutrality (integer 1..7). Fewest ion species wins,
     then fewest particles; equal best candidates are reported as ambiguous, never guessed. */
  function countsOf(kids, fac, out) {
    kids.forEach(function (k) { var f = fac * k.n; if (k.t === 'g') countsOf(k.kids, f, out); else out[k.el] = (out[k.el] || 0) + f; });
    return out;
  }
  var ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function monoName(el, q, variable) {
    var i = info(el), mn = (root.MONO_ION_NAMES || {})[el];
    if (q < 0) return mn ? { en: mn[0], el: mn[1], es: mn[2] } : { en: el, el: el, es: el };
    var s = variable ? '(' + ROM[q] + ')' : '';
    return { en: (i ? i.en : el) + s, el: (i ? i.el : el) + s, es: (i ? i.es : el) + s };
  }
  function ionic(r) {
    if (!r || !r.ok || r.charge) return null;
    var tbl = root.POLYATOMIC_IONS;
    if (!tbl) return { status: 'nodata', metal: false };
    var FIX = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1, Ag: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2, Zn: 2, Cd: 2, Al: 3 },
        AN = { F: -1, Cl: -1, Br: -1, I: -1, O: -2, S: -2, Se: -2, N: -3, P: -3, H: -1 };
    var base0 = r.partCounts[0], g0 = Object.keys(base0).reduce(function (x, k) { var a = x, b = base0[k]; while (b) { var t = a % b; a = b; b = t; } return a; }, 0), base = {}, budget = 250000;
    Object.keys(base0).forEach(function (k) { base[k] = base0[k] / g0; });   // the decomposition is invariant under scaling: solve the reduced formula
    var metal = Object.keys(base).some(function (e) { return !NM[e]; }), cands = [];
    var ions = tbl.map(function (t) { return { f: t[0], q: t[1], comp: analyze(t[0]).partCounts[0], row: t }; });
    var curM = 1;
    function finish(rem, chosen) {
      var parts = chosen.slice(), sumq = 0, unk = [], bad = false;
      chosen.forEach(function (c) { sumq += c.n * c.q; });
      Object.keys(rem).forEach(function (el) {
        var n = rem[el], q;
        if (!n) return;
        if (FIX[el] !== undefined) q = FIX[el]; else if (AN[el] !== undefined) q = AN[el];
        if (q !== undefined) { parts.push({ el: el, n: n, q: q, mono: true }); sumq += n * q; }
        else if (!NM[el]) unk.push(el); else bad = true;
      });
      if (bad || unk.length > 1) return;
      var o2 = chosen.filter(function (c) { var k = Object.keys(c.ion.comp); return k.length === 1 && k[0] === 'O' && c.ion.comp.O === 2; });
      if (o2.length > 1 || (o2.length && unk.length)) return;   // peroxide/superoxide only with fixed-charge cations, never both
      if (unk.length === 1) {
        var u = unk[0], n2 = rem[u], q2 = -sumq / n2;
        if (!(q2 >= 1 && q2 <= 7 && q2 === Math.floor(q2))) return;
        parts.push({ el: u, n: n2, q: q2, mono: true, variable: true }); sumq += n2 * q2;
      }
      if (sumq !== 0 || !parts.some(function (p) { return p.q > 0; }) || !parts.some(function (p) { return p.q < 0; })) return;
      parts.m = curM; cands.push(parts);
    }
    function rec(i, rem, chosen) {
      if (--budget < 0) return;
      if (i === ions.length) { finish(rem, chosen); return; }
      var ion = ions[i], m = Infinity, k, x;
      for (x in ion.comp) m = Math.min(m, Math.floor((rem[x] || 0) / ion.comp[x]));
      for (k = m; k >= 0; k--) {
        var r2 = {}; for (x in rem) r2[x] = rem[x];
        if (k) for (x in ion.comp) r2[x] -= ion.comp[x] * k;
        rec(i + 1, r2, k ? chosen.concat([{ ion: ion, n: k, q: ion.q }]) : chosen);
      }
    }
    for (var mm = 1; mm <= 6 && budget >= 0; mm++) {   // multi-atom ions may need the formula unit repeated (Na2O2, Hg2Cl2): try divisors of the common factor
      if (g0 % mm) continue;
      var bm = {}; Object.keys(base).forEach(function (k) { bm[k] = base[k] * mm; });
      curM = mm; rec(0, bm, []);
    }
    var seenSig = {};
    cands = cands.filter(function (c) {
      var key = c.map(function (p) { return (p.ion ? p.ion.f : p.el) + '/' + p.q + 'x' + (p.n * g0 / c.m); }).sort().join('|');
      if (seenSig[key]) return false; seenSig[key] = 1; return true;
    });
    if (!cands.length || budget < 0) return { status: 'none', metal: metal };
    function score(c) { return [c.length, c.reduce(function (s, p) { return s + p.n * g0 / c.m; }, 0)]; }
    cands.sort(function (a, b) { var x = score(a), y = score(b); return x[0] - y[0] || x[1] - y[1]; });
    var found = cands[0].m, s0 = score(cands[0]);
    if (cands.length > 1) { var s1 = score(cands[1]); if (s1[0] === s0[0] && s1[1] === s0[1]) return { status: 'ambiguous', metal: metal }; }
    var total = 0, out = cands[0].map(function (p) {
      var comp = p.mono ? (function () { var o = {}; o[p.el] = 1; return o; })() : p.ion.comp, mass = 0, el;
      for (el in comp) mass += comp[el] * atomicMass(el);
      total += p.n * mass;
      return p.mono ? { f: p.el, q: p.q, n: p.n, mono: true, nm: monoName(p.el, p.q, p.variable), mass: mass }
                    : { f: p.ion.f, q: p.q, n: p.n, mono: false, nm: { en: p.ion.row[2], el: p.ion.row[3], es: p.ion.row[4] }, mass: mass };
    });
    out.forEach(function (p) { p.share = p.n * p.mass / total * 100; });
    out.forEach(function (p) { p.n = p.n * g0 / found; });
    out.sort(function (a, b) { return (b.q > 0) - (a.q > 0); });
    return { status: 'ok', metal: metal, ions: out, extra: r.partSrc.slice(1) };
  }

  /* Classification of the mass type from chemistry, not from the characters: an ionic decomposition (step 7) makes it a
     formula mass; hydrates and a few network solids too. Everything else is flagged "sure: false" (indicative). */
  var NETWORK = ['SiO2', 'SiC', 'GeO2', 'B2O3', 'BN', 'B4C', 'Si3N4'];
  function sig(c) { return Object.keys(c).sort().map(function (k) { return k + c[k]; }).join(''); }
  function classify(r) {
    if (!r || !r.ok) return null;
    if (r.charge) return { kind: 'ion', sure: true, why: 'ion' };
    if (r.atoms.length === 1) {
      if (r.total === 1) return { kind: 'atomic', sure: true, why: 'atomic' };
      return NM[r.atoms[0].el] ? { kind: 'molecular', sure: true, why: 'elem' } : { kind: 'formula', sure: false, why: 'metal' };
    }
    if (r.parts > 1) return { kind: 'formula', sure: true, why: 'hyd' };
    var io = ionic(r);
    if (io && io.status === 'ok') return { kind: 'formula', sure: true, why: 'ionic' };
    var sg = sig(r.partCounts[0]);
    if (NETWORK.some(function (f) { return sig(analyze(f).partCounts[0]) === sg; })) return { kind: 'formula', sure: true, why: 'net' };
    if (r.atoms.some(function (a) { return !NM[a.el]; })) return { kind: 'formula', sure: false, why: 'metal' };
    return { kind: 'molecular', sure: false, why: 'mol' };
  }

  root.FormulaEngine = {
    analyze: analyze, oxidation: oxidation, empirical: empirical, isoRows: isoRows, isoPattern: isoPattern, ionic: ionic, classify: classify, normalize: normalize, pretty: pretty, atomicMass: atomicMass, info: info, NA: 6.02214076e23,
    hasElement: function (x) { return x in Z; }, zOf: function (x) { return Z[x]; }, setMassProvider: setMassProvider
  };
})(typeof window !== 'undefined' ? window : this);
