/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-engine.js  (v2)
   Pure computation. No DOM, no globals except window.PHLabEngine.

   Model (one engine for everything):
   A "system" is one acid family H_nA^(z0) (stepwise pKa list) holding formal amounts in any of
   its n+1 protonation states, plus spectator ions from fully dissociated salts / strong acids /
   strong bases. pH is the single root of the exact charge balance
       h − Kw'/h + S + Ctot · Σ_j α_j(h)·(z0 − j) = 0
   solved by bisection in log10(h). No "ignore water", no "x ≪ C" shortcuts — those only appear in
   the tutor text, where they are checked, not assumed.

   Two physical models:
     ideal  — activity = concentration (γ = 1)
     real   — Davies activity coefficients: log γ = −A z² (√I/(1+√I) − 0.3 I), A = 0.509 (25 °C),
              conditional constants K' = K / (γ_H·γ_j/γ_(j−1)), Kw' = Kw/(γ_H·γ_OH), self-consistent in
              the ionic strength I; pH = −log a(H⁺) (what a glass electrode reads).
              Davies is reliable up to I ≈ 0.5 M; beyond that the number is flagged as indicative.
   Temperature: 25 °C ONLY (Kw = 1.0×10⁻¹⁴, the IUPAC/school convention; Davies A = 0.509). The pKw-vs-T table in
   ph-data.js is reference information — it does not drive this engine.

   Ionic strength (v3): I = ½ Σ cᵢ zᵢ² is computed from ONE explicit ion ledger (sol.ions) that lists only REAL ions:
   H⁺, OH⁻, every protonation state of the family, the declared spectator ions (sys.spec) and the counter-ions of the
   dissolved forms (counterIons). `sys.offset` is pure charge-balance bookkeeping and is never an ion: for H₂SO₄ the
   proton of the complete first dissociation is already part of h, so the offset −C cancels it and nothing is counted
   twice. The tutor, the residual checks and the self-tests all read this same ledger.
   ========================================================================== */
(function (root) {
  'use strict';

  var KW = 1e-14, PKW = 14, LN10 = Math.LN10, A_DAV = 0.509, I_DAVIES_MAX = 0.5;
  var CAT = 'Na<sup>+</sup>', AN = 'Cl<sup>\u2212</sup>';   // default (monovalent) counter-ions
  function log10(x) { return Math.log(x) / LN10; }

  /* ---------- parsing & formatting ---------- */

  // Accepts "0,1", "1e-5", "1.8×10^-5", "1,8*10^-5", unicode minus.
  function parseNum(s) {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    s = String(s).trim().replace(/\u2212/g, '-').replace(/\s+/g, '').replace(/,/g, '.');
    s = s.replace(/[×x\*]10\^?/i, 'e');
    if (s === '' || s === '-' || s === '.') return NaN;
    var v = Number(s);
    return isFinite(v) ? v : NaN;
  }
  function minus(str) { return str.replace(/-/g, '\u2212'); }

  // Fixed number as plain text, `sig` significant digits; null when it should be scientific.
  function num(x, sig, trim) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    sig = sig || 3;
    var ax = Math.abs(x), e = Math.floor(log10(ax)), s;
    if (ax >= 1e-3 && ax < 1e5) {
      s = x.toFixed(Math.min(Math.max(0, sig - 1 - e), 12));
      if (trim && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    } else return null;
    return minus(s);
  }
  function sciHTML(x, sig) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    sig = sig || 3;
    var neg = x < 0, ax = Math.abs(x), e = Math.floor(log10(ax)), m = ax / Math.pow(10, e), ms = m.toFixed(sig - 1);
    if (parseFloat(ms) >= 10) { e += 1; ms = (m / 10).toFixed(sig - 1); }
    return (neg ? '\u2212' : '') + ms + '\u00d710<sup>' + (e < 0 ? '\u2212' : '') + Math.abs(e) + '</sup>';
  }
  function fmt(x, sig, trim) { var s = num(x, sig, trim); return s === null ? sciHTML(x, sig) : s; }
  function fmtPH(p) { return isFinite(p) ? minus(p.toFixed(2)) : '—'; }
  function fmtPH3(p) { return isFinite(p) ? minus(p.toFixed(3)) : '—'; }
  function fmtConc(c) {
    if (!isFinite(c)) return '—';
    if (c === 0) return '0 M';
    if (c >= 0.1) return fmt(c, 3, true) + ' M';
    if (c >= 1e-4) return fmt(c * 1e3, 3, true) + ' mM';
    if (c >= 1e-7) return fmt(c * 1e6, 3, true) + ' \u00b5M';
    return sciHTML(c, 3) + ' M';
  }
  // Plain-text versions for canvas / tooltips (no HTML)
  function numPlain(x, sig) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var ax = Math.abs(x);
    if (ax >= 1e-3 && ax < 1e5) return num(x, sig || 3, true);
    var e = Math.floor(log10(ax)), m = x / Math.pow(10, e);
    return minus(m.toFixed((sig || 3) - 1)) + 'e' + (e < 0 ? '\u2212' : '+') + Math.abs(e);
  }

  /* ---------- activity coefficients (Davies) ---------- */
  function gamma(z, I) {
    if (!z || I <= 0) return 1;
    var s = Math.sqrt(I);
    return Math.pow(10, -A_DAV * z * z * (s / (1 + s) - 0.3 * I));
  }

  /* ---------- core chemistry ---------- */

  // Fractions α_0..α_n of the n+1 protonation states (j = protons lost).
  function alphas(h, Ks) {
    var n = Ks.length, t = new Array(n + 1), prod = 1, D = 0, j;
    for (j = 0; j <= n; j++) {
      if (j > 0) prod *= Ks[j - 1];
      t[j] = prod * Math.pow(h, n - j);
      D += t[j];
    }
    for (j = 0; j <= n; j++) t[j] /= D;
    return t;
  }
  function famKs(fam) { var out = [], i; for (i = 0; i < fam.pKa.length; i++) out.push(Math.pow(10, -fam.pKa[i])); return out; }

  /* sys.spec   — REAL spectator ions {c, z, label}: they carry charge and they count in I.
     sys.offset — charge-balance bookkeeping, NOT an ion (≤ 0; the part of the formal counter-charge supplied by free H⁺ in h). */
  function newSys(Ks, z0) { return { Ks: Ks || [], z0: z0 || 0, forms: [], offset: 0, spec: [], cat: CAT, an: AN }; }
  function addSpec(sys, c, z, label) { if (c > 0) sys.spec.push({ c: c, z: z, label: label || (z > 0 ? sys.cat : sys.an) }); return sys; }

  // I = ½ Σ c·z² over a list of REAL ions — the single definition used by the engine, the tutor and the tests.
  function ionicStrength(ions) { var I = 0, i; for (i = 0; i < ions.length; i++) I += 0.5 * ions[i].c * ions[i].z * ions[i].z; return I; }

  // Counter-ions that came with the dissolved forms: a cation (Na⁺/K⁺) for every anionic form, an anion (Cl⁻) for every
  // cationic form — all monovalent (verified against every salt in the data by the self-tests). The protons of a complete
  // first dissociation (H₂SO₄ → H⁺ + HSO₄⁻) are NOT counter-ions: they live in h, which is why sys.offset removes them.
  function counterIons(sys) {
    var z0 = sys.z0 || 0, forms = sys.forms || [], pos = 0, neg = 0, j, q, out = [];
    for (j = 0; j < forms.length; j++) { q = z0 - j; if (q < 0) pos -= forms[j] * q; else if (q > 0) neg += forms[j] * q; }
    pos += sys.offset || 0;
    if (pos > 1e-300) out.push({ c: pos, z: 1, label: sys.cat || CAT });
    if (neg > 1e-300) out.push({ c: neg, z: -1, label: sys.an || AN });
    return out;
  }

  /* One solve at a fixed ionic strength I (I = 0 → ideal). */
  function solveAt(sys, I) {
    var Ks = sys.Ks || [], n = Ks.length, z0 = sys.z0 || 0, forms = sys.forms || [], j;
    var gH = gamma(1, I), Kw1 = KW / (gH * gamma(-1, I)), Kc = [], gam = [];
    for (j = 0; j < Ks.length; j++) Kc.push(Ks[j] / (gH * gamma(z0 - (j + 1), I) / gamma(z0 - j, I)));
    for (j = 0; j <= n; j++) gam.push(gamma(z0 - j, I));
    var C = 0, Sf = 0, spec = sys.spec || [], specQ = 0;
    for (j = 0; j < forms.length; j++) { C += forms[j]; Sf -= forms[j] * (z0 - j); }
    for (j = 0; j < spec.length; j++) specQ += spec[j].c * spec[j].z;
    var S = Sf + specQ + (sys.offset || 0);      // net charge of everything that is not H⁺/OH⁻/the family

    function F(lh) {
      var h = Math.pow(10, lh), v = h - Kw1 / h + S, i, s = 0, a;
      if (C > 0) { a = alphas(h, Kc); for (i = 0; i <= n; i++) s += a[i] * (z0 - i); v += C * s; }
      return v;
    }
    var lo = -20, hi = 4, k = 0;
    while (F(hi) < 0 && k++ < 30) hi += 2;
    k = 0;
    while (F(lo) > 0 && k++ < 30) lo -= 2;
    var bracketed = F(lo) <= 0 && F(hi) >= 0 && isFinite(F(lo)) && isFinite(F(hi)), tight = false;
    for (var it = 0; it < 200; it++) {
      var mid = (lo + hi) / 2;
      if (F(mid) < 0) lo = mid; else hi = mid;
      if (hi - lo < 1e-12) { tight = true; break; }
    }
    var lh = (lo + hi) / 2, h = Math.pow(10, lh), oh = Kw1 / h;
    var a2 = C > 0 ? alphas(h, Kc) : [], conc = [];
    for (j = 0; j < a2.length; j++) conc.push(C * a2[j]);
    // ion ledger of the solution just solved — REAL ions only (see header); I is computed from it and nowhere else
    var ions = [{ k: 'H', c: h, z: 1 }, { k: 'OH', c: oh, z: -1 }], ctr = counterIons(sys), q;
    for (j = 0; j < conc.length; j++) { q = z0 - j; if (q !== 0 && conc[j] > 0) ions.push({ k: 'sp', j: j, c: conc[j], z: q }); }
    for (j = 0; j < spec.length; j++) ions.push({ k: 'spec', c: spec[j].c, z: spec[j].z, label: spec[j].label });
    for (j = 0; j < ctr.length; j++) ions.push({ k: 'ctr', c: ctr[j].c, z: ctr[j].z, label: ctr[j].label });
    var Ic = ionicStrength(ions);
    var pH = -(lh + log10(gH));
    return { h: h, oh: oh, pH: pH, pOH: PKW - pH, pHc: -lh, pOHc: -log10(oh), I: Ic, Iused: I, gH: gH, gOH: gamma(-1, I), gam: gam, Kc: Kc, Kw1: Kw1,
             alpha: a2, conc: conc, C: C, S: S, Sf: Sf, z0: z0, n: n, ions: ions, offset: sys.offset || 0, converged: bracketed && tight && isFinite(pH) && isFinite(Ic) };
  }

  // opts: { act: true → Davies, self-consistent in I ; I0: warm start }
  function solve(sys, opts) {
    if (!opts || !opts.act) return solveAt(sys, 0);
    var I = opts.I0 || 0, sol = null, k;
    var settled = false;
    for (k = 0; k < 200; k++) {
      sol = solveAt(sys, I);
      if (Math.abs(sol.I - I) <= 1e-13 + 1e-10 * sol.I) { settled = true; break; }
      I += 0.7 * (sol.I - I);
    }
    // a Real result is only trustworthy when the ionic-strength iteration really settled — otherwise it is flagged, never hidden
    sol.iter = k; sol.converged = sol.converged && settled; return sol;
  }

  // Buffer capacity, IDEAL / concentration form: β = ln10 · (h + oh + Ctot·Var(j))  [mol/(L·pH)].
  // For the Real model use bufferCapacityAt (numerical dB/dpH with the same solver) — this closed form is not valid there.
  function bufferCapacity(sol) {
    var m1 = 0, m2 = 0, j;
    for (j = 0; j < sol.alpha.length; j++) { m1 += j * sol.alpha[j]; m2 += j * j * sol.alpha[j]; }
    return LN10 * (sol.h + sol.oh + sol.C * Math.max(0, m2 - m1 * m1));
  }

  /* compound → system. comp.type: sa | sb | wa | wb | salt | neutral */
  function systemFor(comp, fam, C) {
    var sys = newSys([], 0), i, d, m;
    if (comp.type === 'sa') { addSpec(sys, C, -1, comp.anion); return sys; }
    if (comp.type === 'sb') { addSpec(sys, C, comp.zS || comp.n || 1, comp.cation); return sys; }
    if (comp.type === 'neutral') { addSpec(sys, C, 1, CAT); addSpec(sys, C, -1, AN); return sys; }
    sys.Ks = famKs(fam); sys.z0 = fam.z0 || 0;
    for (i = 0; i <= sys.Ks.length; i++) sys.forms.push(0);
    sys.forms[(comp.type === 'wa') ? 0 : comp.j] = C;
    // names of the real counter-ions, read from the dissolution equation of the compound
    d = comp.diss || ''; m = /(Na|K)<sup>\+<\/sup>/.exec(d); if (m) sys.cat = m[0];
    // complete first dissociation (H₂SO₄): the proton is free H⁺ inside h, so it must not be counted again as a spectator
    if (comp.strongH) sys.offset = -comp.strongH * C;
    return sys;
  }

  // β for the SELECTED model: strong base needed per unit pH, differentiated numerically with the very solver that produces
  // the displayed pH (so in Real mode it follows pH = −log a(H⁺) and the self-consistent I). Central difference around delta0.
  function bufferCapacityAt(fam, k, ca, cb, delta0, opts) {
    var s0 = solve(bufferSystem(fam, k, ca, cb, delta0 || 0), opts), est = bufferCapacity(s0), d = Math.max(est * 5e-4, 1e-18), I0 = s0.I;
    var up = solve(bufferSystem(fam, k, ca, cb, (delta0 || 0) + d), opts && opts.act ? { act: true, I0: I0 } : opts);
    var dn = solve(bufferSystem(fam, k, ca, cb, (delta0 || 0) - d), opts && opts.act ? { act: true, I0: I0 } : opts);
    return 2 * d / (up.pH - dn.pH);
  }

  // Buffer pair: acid form = state k, base form = state k+1. strongDelta: +NaOH / −HCl, mol/L.
  function bufferSystem(fam, k, ca, cb, strongDelta) {
    var sys = newSys(famKs(fam), fam.z0 || 0), i;
    for (i = 0; i <= sys.Ks.length; i++) sys.forms.push(0);
    sys.forms[k] = ca; sys.forms[k + 1] = cb;
    if (strongDelta) addSpec(sys, Math.abs(strongDelta), strongDelta > 0 ? 1 : -1);
    return sys;
  }
  function pureWater(strongDelta, opts) {
    var sys = newSys([], 0);
    if (strongDelta) addSpec(sys, Math.abs(strongDelta), strongDelta > 0 ? 1 : -1);
    return solve(sys, opts);
  }

  // Exact recipe for a target pH (bisection on log10(base/acid), range 10⁻⁹…10⁹).
  function designBuffer(fam, k, Ct, targetPH, opts) {
    function phAt(lr) {
      var r = Math.pow(10, lr), cb = Ct * r / (1 + r), ca = Ct - cb;
      return solve(bufferSystem(fam, k, ca, cb, 0), opts).pH;
    }
    var lo = -9, hi = 9;
    if (targetPH < phAt(lo) || targetPH > phAt(hi)) return { ok: false, pHmin: phAt(lo), pHmax: phAt(hi) };
    for (var it = 0; it < 70; it++) { var mid = (lo + hi) / 2; if (phAt(mid) < targetPH) lo = mid; else hi = mid; }
    var lr = (lo + hi) / 2, r = Math.pow(10, lr), cb = Ct * r / (1 + r), ca = Ct - cb;
    return { ok: true, ratio: r, ca: ca, cb: cb, pH: phAt(lr) };
  }

  /* ---------- residuals: how well the returned numbers satisfy every equation ---------- */
  function residuals(sys, sol) {
    var z0 = sol.z0, n = sol.n, j, net = sol.h - sol.oh + sol.S;
    for (j = 0; j < sol.conc.length; j++) net += sol.conc[j] * (z0 - j);
    // electroneutrality of the declared REAL ions (independent of the balance the solver used)
    var lp = 0, ln = 0, lnet = 0, ions = sol.ions || [];
    for (j = 0; j < ions.length; j++) { var qq = ions[j].c * ions[j].z; lnet += qq; if (qq > 0) lp += qq; else ln -= qq; }
    var scale = Math.max(lp, ln, 1e-300);
    var out = { charge: net, chargeRel: Math.abs(net) / scale, posTotal: lp, negTotal: ln, ledgerCharge: lnet, ledgerChargeRel: Math.abs(lnet) / scale,
                IledgerRel: Math.abs(ionicStrength(ions) - sol.I) / Math.max(sol.I, 1e-300), mass: 0, K: [] };
    var sum = 0; for (j = 0; j < sol.conc.length; j++) sum += sol.conc[j];
    out.mass = sum - sol.C; out.massRel = sol.C > 0 ? Math.abs(out.mass) / sol.C : 0;
    for (j = 1; j <= n; j++) {
      if (sol.conc[j - 1] > 0 && sol.conc[j] > 0) {
        var Kobs = sol.gH * sol.h * sol.gam[j] * sol.conc[j] / (sol.gam[j - 1] * sol.conc[j - 1]);
        var Kth = Math.pow(10, -(sys.pKaList ? sys.pKaList[j - 1] : -log10(sys.Ks[j - 1])));
        out.K.push({ j: j, obs: Kobs, th: Kth, rel: Math.abs(Kobs / Kth - 1) });
      }
    }
    out.Kw = { obs: sol.gH * sol.h * sol.gOH * sol.oh, rel: Math.abs(sol.gH * sol.h * sol.gOH * sol.oh / KW - 1) };
    return out;
  }

  /* ---------- naive (textbook) estimates, for comparison with the exact result ---------- */
  function naivePH(comp, fam, C) {
    var n = fam ? fam.pKa.length : 0;
    if (comp.type === 'sa') return -log10(C);
    if (comp.type === 'sb') return 14 + log10(C * (comp.n || 1));
    if (comp.type === 'neutral') return 7;
    if (comp.type === 'wa' && comp.strongH) return -log10(C);
    if (comp.type === 'wa') return 0.5 * (fam.pKa[0] - log10(C));
    if (comp.type === 'wb') return 14 - 0.5 * ((14 - fam.pKa[0]) - log10(C));
    var j = comp.j;
    if (j === 0) return 0.5 * (fam.pKa[0] - log10(C));
    if (j === n) return 7 + 0.5 * (fam.pKa[n - 1] + log10(C));
    return 0.5 * (fam.pKa[j - 1] + fam.pKa[j]);
  }

  /* ---------- which titrations make sense for a compound ---------- */
  // acid: titrate with NaOH (protons removed) · base: titrate with HCl (protons added)
  function titrationSpec(comp, fam) {
    var n = fam ? fam.pKa.length : 0, spec = { acid: null, base: null, def: 'acid' };
    if (comp.type === 'sa') spec.acid = { neq: 1, escale: comp.n || 1 };
    else if (comp.type === 'sb') { spec.base = { neq: 1, escale: comp.n || 1 }; spec.def = 'base'; }
    else if (comp.type === 'wa') { spec.acid = comp.strongH ? { neq: 1, escale: comp.strongH + n } : { neq: n, escale: 1 }; }
    else if (comp.type === 'wb') { spec.base = { neq: comp.j, escale: 1 }; spec.def = 'base'; }
    else if (comp.type === 'salt') {
      var j = comp.j;
      if (n - j > 0) spec.acid = { neq: n - j, escale: 1 };
      if (j > 0) spec.base = { neq: j, escale: 1 };
      spec.def = j > 0 ? 'base' : 'acid';
    }
    return spec;
  }

  /* ---------- titration ---------- */
  // dir 'acid' → analyte acid titrated with NaOH; 'base' → analyte base titrated with HCl.
  function titrationSol(makeSys, Ca, Va, Ct, dir, Vt, opts) {
    var V = Va + Vt, c = Ca * Va / V, add = Ct * Vt / V, sys = makeSys(c);
    if (add > 0) addSpec(sys, add, dir === 'acid' ? 1 : -1);
    var sol = solve(sys, opts); sol.V = V; sol.vt = Vt; sol.sys = sys; return sol;
  }
  function titrationPH(makeSys, Ca, Va, Ct, dir, Vt, opts) { return titrationSol(makeSys, Ca, Va, Ct, dir, Vt, opts).pH; }

  /* Chunkable job: boot slices the work (job.step(n) computes up to n volume points) so that no single call can stall a frame;
     titrationCurve(o) is the one-shot wrapper with the very same result. */
  function titrationCurveJob(o) {
    var act = o.act ? { act: true } : null;
    var veq1 = (o.eqScale || 1) * o.Ca * o.Va / o.Ct, nEq = o.nEq, vmax = (nEq + 0.5) * veq1;
    var set = {}, vs = [], i, k;
    function add(v) { if (v >= 0 && v <= vmax) set[v.toPrecision(12)] = v; }
    for (i = 0; i <= 320; i++) add(vmax * i / 320);
    var deltas = [1e-4, 3e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 4e-2, 7e-2, 0.12];
    for (k = 1; k <= nEq; k++) {
      add(k * veq1);
      for (i = 0; i < deltas.length; i++) { add(k * veq1 * (1 + deltas[i])); add(k * veq1 * (1 - deltas[i])); }
      add((k - 0.5) * veq1);
    }
    for (var key in set) vs.push(set[key]);
    vs.sort(function (a, b) { return a - b; });
    var pts = [], st = { i: 0, I0: 0, minP: Infinity, maxP: -Infinity, bad: 0, maxI: 0 };
    return {
      total: vs.length,
      step: function (n) {
        var end = Math.min(vs.length, st.i + n);
        for (; st.i < end; st.i++) {
          var sol = titrationSol(o.makeSys, o.Ca, o.Va, o.Ct, o.dir, vs[st.i], act ? { act: true, I0: st.I0 } : null); st.I0 = sol.I;
          pts.push({ v: vs[st.i], pH: sol.pH, a: sol.alpha, I: sol.I, ok: sol.converged });
          if (!sol.converged) st.bad++;
          if (sol.I > st.maxI) st.maxI = sol.I;
          if (sol.pH < st.minP) st.minP = sol.pH; if (sol.pH > st.maxP) st.maxP = sol.pH;
        }
        return st.i >= vs.length;
      },
      finish: function () {
        var eq = [], half = [], kk, ii;
        function ph(v) { return titrationPH(o.makeSys, o.Ca, o.Va, o.Ct, o.dir, v, act); }
        for (kk = 1; kk <= nEq; kk++) {
          var ve = kk * veq1;
          eq.push({ v: ve, pH: ph(ve), lo: ph(ve * 0.999), hi: ph(ve * 1.001) });
          half.push({ v: (kk - 0.5) * veq1, pH: ph((kk - 0.5) * veq1) });
        }
        // first derivative dpH/dV (central differences on the non-uniform grid) — SIGNED
        var der = [];
        for (ii = 0; ii < pts.length; ii++) {
          var a = pts[Math.max(0, ii - 1)], b = pts[Math.min(pts.length - 1, ii + 1)];
          der.push({ v: pts[ii].v, d: (b.pH - a.pH) / (b.v - a.v) });
        }
        return { pts: pts, eq: eq, half: half, der: der, veq1: veq1, vmax: vmax, minPH: st.minP, maxPH: st.maxP, act: !!o.act, maxI: st.maxI, unconverged: st.bad };
      }
    };
  }
  function titrationCurve(o) { var job = titrationCurveJob(o); job.step(1e9); return job.finish(); }

  function curveAt(curve, v) {
    var P = curve.pts, lo = 0, hi = P.length - 1;
    if (v <= P[0].v) return P[0].pH;
    if (v >= P[hi].v) return P[hi].pH;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (P[m].v <= v) lo = m; else hi = m; }
    var t = (v - P[lo].v) / (P[hi].v - P[lo].v);
    return P[lo].pH + t * (P[hi].pH - P[lo].pH);
  }

  /* ---------- series for the analysis diagrams ---------- */
  // α_j vs pH (distribution diagram). I > 0 uses conditional constants at that ionic strength.
  function distributionSeries(fam, n, I) {
    var Ks = famKs(fam), z0 = fam.z0 || 0, out = { pH: [], a: [], logK: [] }, i, j, gH = gamma(1, I || 0), Kc = [];
    for (j = 0; j < Ks.length; j++) Kc.push(Ks[j] / (gH * gamma(z0 - (j + 1), I || 0) / gamma(z0 - j, I || 0)));
    n = n || 561;
    for (i = 0; i < n; i++) { var pH = 14 * i / (n - 1); out.pH.push(pH); out.a.push(alphas(Math.pow(10, -pH) / gH, Kc)); }
    return out;
  }
  /* Strong base B (mol/L, negative = strong acid) that a family of total concentration Ct, starting as its fully protonated
     form (+ its counter-ion), needs to reach a GIVEN pH = −log a(H⁺) in the Real model. At fixed I the charge balance gives B
     in closed form; I = ½Σc·z² of the resulting ions is then iterated to self-consistency (same ions as the Real solver). */
  function baseNeededReal(Ks, z0, Ct, pH) {
    var I = 0, k, res = null, n = Ks.length, j;
    for (k = 0; k < 400; k++) {
      var gH = gamma(1, I), h = Math.pow(10, -pH) / gH, Kw1 = KW / (gH * gamma(-1, I)), oh = Kw1 / h, Kc = [], Q = 0, s2 = 0, a, q;
      for (j = 0; j < n; j++) Kc.push(Ks[j] / (gH * gamma(z0 - (j + 1), I) / gamma(z0 - j, I)));
      if (Ct > 0) { a = alphas(h, Kc); for (j = 0; j <= n; j++) { q = z0 - j; Q += a[j] * q; s2 += Ct * a[j] * q * q; } }
      var Sneed = -(h - oh + Ct * Q);             // net charge that all non-family ions together must carry
      var B = Sneed + Ct * z0;                    // …of which −Ct·z0 belongs to the counter-ion of the starting form
      var In = 0.5 * (h + oh + s2 + Ct * Math.abs(z0) + Math.abs(B));
      res = { B: B, I: In, h: h };
      if (Math.abs(In - I) <= 1e-14 + 1e-12 * In) break;
      I += 0.7 * (In - I);
    }
    return res;
  }
  function capacityRealAt(Ks, z0, Ct, pH) {
    var e = 5e-4; return (baseNeededReal(Ks, z0, Ct, pH + e).B - baseNeededReal(Ks, z0, Ct, pH - e).B) / (2 * e);
  }
  // β vs pH for a buffer family at total concentration Ct.
  //   act falsy → Ideal: closed form (activity = concentration).
  //   act true  → Real (Davies): β = dB/dpH, pH = −log a(H⁺), I self-consistent at every pH. The water curve is real too.
  function capacitySeries(fam, Ct, n, act) {
    var Ks = famKs(fam), z0 = fam.z0 || 0, out = { pH: [], beta: [], water: [], model: act ? 'real' : 'ideal' }, i, j;
    n = n || 561;
    for (i = 0; i < n; i++) {
      var pH = 14 * i / (n - 1);
      out.pH.push(pH);
      if (act) { out.beta.push(capacityRealAt(Ks, z0, Ct, pH)); out.water.push(capacityRealAt([], 0, 0, pH)); continue; }
      var h = Math.pow(10, -pH), a = alphas(h, Ks), m1 = 0, m2 = 0;
      for (j = 0; j < a.length; j++) { m1 += j * a[j]; m2 += j * j * a[j]; }
      out.beta.push(LN10 * (h + KW / h + Ct * Math.max(0, m2 - m1 * m1))); out.water.push(LN10 * (h + KW / h));
    }
    return out;
  }

  // Derivative chart data. dpH/dV is SIGNED (negative when the titrant lowers the pH, i.e. base + HCl); a log axis cannot show a
  // sign, so the chart plots log₁₀|dpH/dV| and the tooltip reports the sign separately.
  var DER_FLOOR = 1e-6;
  function derivativeSeries(der) {
    var out = [], i, a;
    for (i = 0; i < der.length; i++) { a = Math.abs(der[i].d); out.push({ v: der[i].v, d: der[i].d, mag: a, y: log10(Math.max(a, DER_FLOOR)), sign: der[i].d > 0 ? 1 : der[i].d < 0 ? -1 : 0 }); }
    return out;
  }
  // pH vs log10 C for one compound; returns exact (ideal / real) and the textbook estimate
  function phVsLogCJob(comp, fam, lcMin, lcMax, n, act) {
    var out = { lc: [], pH: [], naive: [] }, st = { i: 0, I0: 0 };
    return {
      total: n,
      step: function (m) {
        var end = Math.min(n, st.i + m);
        for (; st.i < end; st.i++) {
          var lc = lcMin + (lcMax - lcMin) * st.i / (n - 1), C = Math.pow(10, lc);
          var sol = solve(systemFor(comp, fam, C), act ? { act: true, I0: st.I0 } : null); st.I0 = sol.I;
          out.lc.push(lc); out.pH.push(sol.pH); out.naive.push(naivePH(comp, fam, C));
        }
        return st.i >= n;
      },
      result: function () { return out; }
    };
  }
  function phVsLogC(comp, fam, lcMin, lcMax, n, act) { var job = phVsLogCJob(comp, fam, lcMin, lcMax, n, act); job.step(n); return job.result(); }
  // pH of a buffer vs mmol of strong base (+) / acid (−) added, compared with pure water
  function bufferResponse(fam, k, ca, cb, vol, maxAmt, n, act) {
    var out = { x: [], buf: [], water: [] }, i, I0 = 0;
    for (i = 0; i <= n; i++) {
      var amt = maxAmt * (2 * i / n - 1), delta = amt / vol;     // negative = acid
      var s = solve(bufferSystem(fam, k, ca, cb, delta), act ? { act: true, I0: I0 } : null); I0 = s.I;
      out.x.push(amt); out.buf.push(s.pH); out.water.push(pureWater(delta, act ? { act: true } : null).pH);
    }
    return out;
  }

  /* ---------- self-verification (run by the loading screen) ----------
     Every case has {name, group, stage, run}. run() returns true, or — on failure — an object {ok:false, expected, actual, err…}
     so a failing check is diagnosable. Groups: ENGINE (chemistry), REGRESSION (confirmed bugs + fixed values), PLOTS (chart
     transforms), DATA (tables/constants). The expected values of the new checks come from independent code in this function
     (own Davies, own bisection, own stoichiometry parser) — they never call the routine they are checking.
     hooks.curve(comp, fam, dir, spec) may hand over an already computed reference titration curve (avoids doing it twice);
     hooks.extended adds the heavy Real-mode curve checks (used by the Node runner, not by the loading screen). */
  function selfTestCases(D, hooks) {
    hooks = hooks || {};
    var cases = [], i, j, lc, pk, KWc = KW, grp = 'ENGINE', stg = 'b2';
    function add(name, fn) { cases.push({ name: name, group: grp, stage: stg, run: fn }); }
    function sec(g, s) { grp = g; stg = s; }
    function near(actual, expected, tol, rel) {
      var err = Math.abs(actual - expected), lim = rel ? tol * Math.max(Math.abs(expected), 1e-300) : tol;
      return (err <= lim && isFinite(actual)) ? true : { ok: false, expected: expected, actual: actual, err: err, tol: lim };
    }
    function newton(p, x) { for (var it = 0; it < 80; it++) { var f = p(x), h = 1e-7 * Math.abs(x) + 1e-300, d = (p(x + h) - f) / h; if (!d) break; var nx = x - f / d; if (nx <= 0) nx = x / 2; if (Math.abs(nx - x) < 1e-15 * x) { x = nx; break; } x = nx; } return x; }
    var fe = function (x) { return x.toExponential(1); };

    // 1. strong acid / base closed forms (with the water term)
    sec('ENGINE', 'b2');
    for (i = 0; i < 90; i++) {
      lc = -9 + 10 * i / 89;
      (function (C) {
        add('sa C=' + fe(C), function () { var h = (C + Math.sqrt(C * C + 4 * KWc)) / 2; return near(solve(systemFor({ type: 'sa', n: 1 }, null, C)).pH, -log10(h), 1e-8); });
        add('sb C=' + fe(C), function () { var o = (C + Math.sqrt(C * C + 4 * KWc)) / 2; return near(solve(systemFor({ type: 'sb', n: 1 }, null, C)).pH, 14 + log10(o), 1e-8); });
      })(Math.pow(10, lc));
    }
    // 2. weak monoprotic acid / base against an independent Newton solution of the cubic
    sec('ENGINE', 'b3');
    for (pk = 1; pk <= 13; pk += 0.5) for (i = 0; i < 12; i++) {
      (function (pK, C) {
        var K = Math.pow(10, -pK);
        add('wa pK=' + pK + ' C=' + fe(C), function () {
          var cub = function (h) { return h * h * h + K * h * h - (KWc + K * C) * h - K * KWc; };
          var h = newton(cub, Math.max(Math.sqrt(K * C), 1e-7));
          return near(solve(systemFor({ type: 'wa' }, { pKa: [pK], z0: 0 }, C)).pH, -log10(h), 1e-6);
        });
        add('wb pK=' + pK + ' C=' + fe(C), function () {
          var Kb = KWc / K, cub = function (o) { return o * o * o + Kb * o * o - (KWc + Kb * C) * o - Kb * KWc; };
          var o = newton(cub, Math.max(Math.sqrt(Kb * C), 1e-7));
          return near(solve(systemFor({ type: 'wb', j: 1 }, { pKa: [pK], z0: 1 }, C)).pH, 14 + log10(o), 1e-6);
        });
      })(pk, Math.pow(10, -6 + 6 * i / 11));
    }
    // 3. every compound × 14 concentrations × {ideal, real}: charge balance, mass balance, mass-action laws
    sec('ENGINE', 'b4');
    if (D) D.COMPOUNDS.forEach(function (comp) {
      var fam = comp.fam ? D.FAMILIES[comp.fam] : null;
      for (i = 0; i < 14; i++) (function (C) {
        [false, true].forEach(function (act) {
          add('balances ' + comp.id + ' C=' + fe(C) + (act ? ' real' : ' ideal'), function () {
            var sys = systemFor(comp, fam, C); if (fam) sys.pKaList = fam.pKa;
            var sol = solve(sys, act ? { act: true } : null);
            var r = residuals(sys, sol), ok = r.chargeRel < 1e-9 && r.massRel < 1e-12 && isFinite(sol.pH), badK = 0;
            r.K.forEach(function (k) { if (k.rel > 1e-6) { ok = false; badK = Math.max(badK, k.rel); } });
            if (r.Kw.rel > 1e-9) ok = false;
            return ok ? true : { ok: false, expected: 'chargeRel<1e-9, massRel<1e-12, Ka<1e-6, Kw<1e-9', actual: { chargeRel: r.chargeRel, massRel: r.massRel, KaRel: badK, KwRel: r.Kw.rel, pH: sol.pH } };
          });
        });
      })(Math.pow(10, -7 + 8 * i / 13));
    });
    // 4. Davies coefficients (published values at 25 °C): I = 0.001 → 0.964 · 0.01 → 0.903 · 0.1 → 0.781 (z = 1)
    sec('ENGINE', 'b5');
    [[0.001, 0.964], [0.01, 0.903], [0.1, 0.781]].forEach(function (p) { add('davies I=' + p[0], function () { return near(gamma(1, p[0]), p[1], 0.0015); }); });
    add('davies z²', function () { return near(log10(gamma(2, 0.01)), 4 * log10(gamma(1, 0.01)), 1e-12); });
    // 5. real-solution reference: 0.1 M HCl, pH(a) = 1.108 within 0.004; 0.01 M HCl → 2.045
    add('HCl 0.1 real', function () { return near(solve(systemFor({ type: 'sa', n: 1 }, null, 0.1), { act: true }).pH, 1.108, 0.004); });
    add('HCl 0.01 real', function () { return near(solve(systemFor({ type: 'sa', n: 1 }, null, 0.01), { act: true }).pH, 2.045, 0.004); });
    // 6. buffer: Henderson–Hasselbalch (ideal) at 0.1/0.1, 0.05/0.15, 0.2/0.02
    D && [[0.1, 0.1], [0.05, 0.15], [0.2, 0.02]].forEach(function (p) {
      add('HH ' + p[0] + '/' + p[1], function () { var s = solve(bufferSystem(D.FAMILIES.acetic, 0, p[0], p[1], 0)); return near(s.pH, 4.76 + log10(p[1] / p[0]), 0.01); });
    });
    // 7. titration: equivalence volume and monotonic curves for every compound that can be titrated
    if (D) D.COMPOUNDS.forEach(function (comp) {
      var fam = comp.fam ? D.FAMILIES[comp.fam] : null, sp = titrationSpec(comp, fam);
      ['acid', 'base'].forEach(function (dir) {
        if (!sp[dir]) return;
        add('titr ' + comp.id + ' ' + dir, function () {
          var cv = hooks.curve && hooks.curve(comp, fam, dir, sp[dir]);
          if (!cv) cv = titrationCurve({ makeSys: function (c) { return systemFor(comp, fam, c); }, Ca: 0.1, Va: 25, Ct: 0.1, dir: dir, nEq: sp[dir].neq, eqScale: sp[dir].escale });
          var ok = Math.abs(cv.eq[0].v - sp[dir].escale * 25) < 1e-9, bad = -1;
          for (var q = 1; q < cv.pts.length; q++) { var d = cv.pts[q].pH - cv.pts[q - 1].pH; if (dir === 'acid' ? d < -1e-9 : d > 1e-9) { ok = false; bad = q; } }
          return ok ? true : { ok: false, expected: 'eq1 = ' + sp[dir].escale * 25 + ' mL, monotone ' + (dir === 'acid' ? 'rising' : 'falling'), actual: { eq1: cv.eq[0].v, badIndex: bad } };
        });
      });
    });

    /* ===== v3 — checks added after the audit. Expected values: independent code ===== */
    var refGamma = function (z, I, act) { if (!act || I <= 0) return 1; var r = Math.sqrt(I); return Math.pow(10, -0.509 * z * z * (r / (1 + r) - 0.3 * I)); };
    // H₂SO₄ solved a second way: closed form of the charge balance in h, own bisection, own Davies; ions = H⁺ OH⁻ HSO₄⁻ SO₄²⁻ ONLY
    function refH2SO4(C, act) {
      var K2 = Math.pow(10, -1.99), I = 0, k, h = 0, g1 = 1, Kw1 = 1e-14, lo, hi, it, mid;
      for (k = 0; k < 500; k++) {
        g1 = refGamma(1, I, act); var g2 = refGamma(2, I, act), Kc = K2 / g2; Kw1 = 1e-14 / (g1 * g1);
        var f = function (x) { var hh = Math.pow(10, x); return hh - Kw1 / hh - C * (hh + 2 * Kc) / (hh + Kc); };
        lo = -16; hi = 2; for (it = 0; it < 200; it++) { mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
        h = Math.pow(10, (lo + hi) / 2);
        var b = C * h / (h + Kc), s2 = C * Kc / (h + Kc), In = 0.5 * (h + Kw1 / h + b + 4 * s2);
        if (Math.abs(In - I) < 1e-15) { I = In; break; }
        I += 0.7 * (In - I);
      }
      return { pH: -log10(g1 * h), I: I };
    }
    var h2so4 = D && D.COMPOUNDS.filter(function (c) { return c.id === 'H2SO4'; })[0];
    sec('REGRESSION', 'b5');
    if (h2so4) {
      var hFam = D.FAMILIES[h2so4.fam];
      [0.1, 0.01, 0.001].forEach(function (C) {
        add('H2SO4 ' + C + ' M real vs independent solver', function () {
          var sol = solve(systemFor(h2so4, hFam, C), { act: true }), ref = refH2SO4(C, true), a = near(sol.pH, ref.pH, 1e-8);
          return a === true ? near(sol.I, ref.I, 1e-8, true) : a;
        });
      });
      // targets stated in the audit (same Davies model, ions counted once): pH 1.037842 / I 0.140120 · I 0.020767 · I 0.002746
      add('H2SO4 0.1 M audit target pH', function () { return near(solve(systemFor(h2so4, hFam, 0.1), { act: true }).pH, 1.037842, 6e-7); });
      [[0.1, 0.140120], [0.01, 0.020767], [0.001, 0.002746]].forEach(function (p) {
        add('H2SO4 ' + p[0] + ' M audit target I', function () { return near(solve(systemFor(h2so4, hFam, p[0]), { act: true }).I, p[1], 6e-7); });
      });
      add('H2SO4 ledger has no invented cation', function () {
        var sol = solve(systemFor(h2so4, hFam, 0.1), { act: true }), bad = sol.ions.filter(function (x) { return x.k === 'spec' || x.k === 'ctr'; });
        return bad.length === 0 ? true : { ok: false, expected: 'no spectator / counter-ion entries', actual: bad };
      });
      add('H2SO4 ideal pH unchanged by the fix', function () { return near(solve(systemFor(h2so4, hFam, 0.1)).pH, 0.964128, 6e-7); });
    }
    // salts must NOT change: values of the pre-fix engine (they carry real counter-ions, which the old term counted correctly)
    var saltRef = [['NaHSO4', 0.1, 1.491935579, 0.185912007], ['NaHSO4', 0.01, 2.207130725, 0.024419866], ['Na2SO4', 0.1, 7.291944543, 0.299999872], ['Na2SO4', 0.01, 7.089516932, 0.030000047],
      ['NaAc', 0.1, 8.773026483, 0.100000002], ['NH4Cl', 0.1, 5.231971890, 0.100000002], ['Na2CO3', 0.1, 11.389273762, 0.296662282], ['NaHCO3', 0.1, 8.124883349, 0.101276124]];
    if (D) saltRef.forEach(function (r) {
      add(r[0] + ' ' + r[1] + ' M unchanged (pH, I)', function () {
        var comp = D.COMPOUNDS.filter(function (c) { return c.id === r[0]; })[0], sol = solve(systemFor(comp, D.FAMILIES[comp.fam], r[1]), { act: true }), a = near(sol.pH, r[2], 2e-8);
        return a === true ? near(sol.I, r[3], 2e-8) : a;
      });
    });
    // ledger identity for every compound: I = ½Σc·z² of the REAL ions, charge neutral, matching the stoichiometry of the dissolved compound
    sec('ENGINE', 'b4');
    function refSpectatorWeight(comp, C) {
      if (comp.type === 'sa') return C;
      if (comp.type === 'sb') { var z = comp.zS || comp.n || 1; return C * z * z; }
      if (comp.type === 'neutral') return 2 * C;
      if (comp.type === 'salt') {
        var d = comp.diss || '', w = 0, m, re1 = /(^|[^A-Za-z])(\d+)?\s*(?:Na|K)<sup>\+<\/sup>/g, re2 = /(^|[^A-Za-z])(\d+)?\s*Cl<sup>\u2212<\/sup>/g;   // 'OCl⁻' is an anion of the family, not chloride
        while ((m = re1.exec(d))) w += (m[2] ? +m[2] : 1) * C;
        while ((m = re2.exec(d))) w += (m[2] ? +m[2] : 1) * C;
        return w;
      }
      return 0;      // weak acids/bases and H₂SO₄: no spectator at all
    }
    if (D) D.COMPOUNDS.forEach(function (comp) {
      var fam = comp.fam ? D.FAMILIES[comp.fam] : null;
      [1e-5, 1e-2, 1].forEach(function (C) {
        [false, true].forEach(function (act) {
          add('ledger ' + comp.id + ' C=' + fe(C) + (act ? ' real' : ' ideal'), function () {
            var sys = systemFor(comp, fam, C), sol = solve(sys, act ? { act: true } : null), z0 = fam ? (fam.z0 || 0) : 0, I = 0.5 * (sol.h + sol.oh), q, r = residuals(sys, sol);
            for (q = 0; q < sol.conc.length; q++) I += 0.5 * sol.conc[q] * (z0 - q) * (z0 - q);
            I += 0.5 * refSpectatorWeight(comp, C);
            var a = near(sol.I, I, 1e-9, true);
            if (a !== true) return a;
            return r.ledgerChargeRel < 1e-9 ? true : { ok: false, expected: 'Σ c·z = 0 over the declared ions', actual: r.ledgerCharge, rel: r.ledgerChargeRel };
          });
        });
      });
    });
    sec('DATA', 'b0');
    // the engine assumes monovalent counter-ions (Na⁺, K⁺, Cl⁻); every salt in the data must respect that
    if (D) D.COMPOUNDS.filter(function (c) { return c.type === 'salt'; }).forEach(function (comp) {
      add('counter-ions monovalent: ' + comp.id, function () { var d = comp.diss || ''; return /(^|[^A-Za-z])(Ca|Mg|Ba|Zn|Fe|Al|Cu|Sr|Li|Mn|Ni|Co)(?![a-z])/.test(d.replace(/<[^>]+>/g, '')) ? { ok: false, expected: 'only Na+/K+/Cl- counter-ions', actual: d } : true; });
    });
    // 25 °C consistency: pKw table ↔ engine constant ↔ neutral-water reference
    if (D && D.PKW_T) {
      add('pKw table 25 °C vs engine PKW', function () { var row = D.PKW_T.filter(function (r) { return r[0] === 25; })[0]; return row ? near(row[1], PKW, 0.01) : { ok: false, expected: 'a 25 °C row', actual: null }; });
      add('neutral water pH = PKW/2', function () { return near(solve(newSys([], 0)).pH, PKW / 2, 1e-9); });
      add('pKw table decreases with T', function () { var ok = true, q; for (q = 1; q < D.PKW_T.length; q++) if (!(D.PKW_T[q][1] < D.PKW_T[q - 1][1] && D.PKW_T[q][0] > D.PKW_T[q - 1][0])) ok = false; return ok; });
    }
    add('Davies limit constant', function () { return near(I_DAVIES_MAX, 0.5, 0); });
    if (h2so4) add('H2SO4 1 M real flagged above the Davies limit', function () { return solve(systemFor(h2so4, D.FAMILIES[h2so4.fam], 1), { act: true }).I > I_DAVIES_MAX ? true : { ok: false, expected: 'I > 0.5', actual: 'below' }; });
    // robustness: empty / tiny / large concentrations must give a finite, converged answer (or be flagged, never a plausible-looking wrong one)
    if (D) D.COMPOUNDS.forEach(function (comp) {
      var fam = comp.fam ? D.FAMILIES[comp.fam] : null;
      [0, 1e-30, 10].forEach(function (C) {
        [false, true].forEach(function (act) {
          add('robust ' + comp.id + ' C=' + C + (act ? ' real' : ' ideal'), function () {
            var sol = solve(systemFor(comp, fam, C), act ? { act: true } : null);
            return (isFinite(sol.pH) && isFinite(sol.I) && sol.h > 0 && sol.converged) ? true : { ok: false, expected: 'finite, converged', actual: { pH: sol.pH, I: sol.I, converged: sol.converged } };
          });
        });
      });
    });

    // buffer capacity consistent with the selected model
    sec('ENGINE', 'b13');
    if (D) {
      var capFams = [['acetic', 0.1], ['phosphoric', 0.05], ['ammonium', 0.1], ['glycine', 0.1], ['bisulfate', 0.1], ['citric', 0.02]];
      capFams.forEach(function (cf) {
        var fam = D.FAMILIES[cf[0]]; if (!fam) return;
        var Ks = famKs(fam), z0 = fam.z0 || 0, Ct = cf[1];
        [2, 4, 6, 8, 10, 12].forEach(function (pH0) {
          // (a) round trip: the strong base the closed form asks for really produces that pH in the forward Real solver
          add('capacity ' + cf[0] + ' real round trip pH ' + pH0, function () {
            var B = baseNeededReal(Ks, z0, Ct, pH0).B, sys = newSys(Ks, z0), q; for (q = 0; q <= Ks.length; q++) sys.forms.push(0); sys.forms[0] = Ct;
            if (B > 0) addSpec(sys, B, 1); else if (B < 0) addSpec(sys, -B, -1);
            return near(solve(sys, { act: true }).pH, pH0, 1e-6);
          });
          // (b) β(Real) from the closed form at fixed pH ≡ β from differentiating the forward solver (two independent routes)
          add('capacity ' + cf[0] + ' real β vs solver derivative pH ' + pH0, function () {
            var B = baseNeededReal(Ks, z0, Ct, pH0).B, q, mk = function (b) { var sy = newSys(Ks, z0); for (q = 0; q <= Ks.length; q++) sy.forms.push(0); sy.forms[0] = Ct; if (b > 0) addSpec(sy, b, 1); else if (b < 0) addSpec(sy, -b, -1); return sy; };
            var bc = capacityRealAt(Ks, z0, Ct, pH0), d = 5e-4 * bc, p1 = solve(mk(B + d), { act: true }).pH, p0 = solve(mk(B - d), { act: true }).pH;
            return near(bc, 2 * d / (p1 - p0), 1e-4, true);
          });
        });
        // (e) the number the Buffer tab shows (bufferCapacityAt, Real) agrees with the closed form on the very same composition
        [4, 8].forEach(function (pH0) {
          add('capacity ' + cf[0] + ' real bufferCapacityAt pH ' + pH0, function () {
            var B = baseNeededReal(Ks, z0, Ct, pH0).B;
            return near(bufferCapacityAt(fam, 0, Ct, 0, B, { act: true }), capacityRealAt(Ks, z0, Ct, pH0), 1e-4, true);
          });
        });
        // (c) Ideal: closed form = numerical dB/dpH of the ideal solver, in a real buffer composition
        add('capacity ' + cf[0] + ' ideal closed form vs numeric', function () {
          var k = 0, s0 = solve(bufferSystem(fam, k, Ct / 2, Ct / 2, 0));
          return near(bufferCapacity(s0), bufferCapacityAt(fam, k, Ct / 2, Ct / 2, 0, null), 1e-5, true);
        });
        // (d) Real number is finite, positive and differs from the ideal one only moderately at I < 0.5
        add('capacity ' + cf[0] + ' real buffer β finite', function () {
          var b = bufferCapacityAt(fam, 0, Ct / 2, Ct / 2, 0, { act: true }); return (isFinite(b) && b > 0) ? true : { ok: false, expected: 'finite > 0', actual: b };
        });
      });
    }

    sec('ENGINE', 'b13');
    // buffer response: adding strong base can only raise the pH (every acid/base pair, both models in the dev suite)
    if (D) Object.keys(D.FAMILIES).forEach(function (id) {
      var fam = D.FAMILIES[id];
      fam.pKa.forEach(function (pK, k) {
        [false, true].forEach(function (act) {
          if (act && !hooks.extended) return;
          add('response ' + id + ':' + k + (act ? ' real' : ' ideal'), function () {
            var prev = -Infinity, q, p, o = act ? { act: true } : null;
            for (q = -5; q <= 5; q++) { p = solve(bufferSystem(fam, k, 0.05, 0.05, q * 0.01), o).pH; if (!isFinite(p) || p < prev - 1e-9) return { ok: false, expected: 'pH rises with added base', actual: { step: q, pH: p, prev: prev } }; prev = p; }
            return true;
          });
        });
      });
    });
    // plot transforms
    sec('PLOTS', 'b14');
    add('derivative transform keeps negative slopes', function () {
      var t = derivativeSeries([{ v: 0, d: -100 }, { v: 1, d: -1e-9 }, { v: 2, d: 5 }, { v: 3, d: 0 }]);
      var ok = Math.abs(t[0].y - 2) < 1e-12 && t[0].sign === -1 && Math.abs(t[2].y - log10(5)) < 1e-12 && t[2].sign === 1 && t[1].y === log10(DER_FLOOR) && t[3].sign === 0;
      return ok ? true : { ok: false, expected: 'y = log10|d|, sign kept', actual: t };
    });
    var plotCmp = D && ['HCl', 'NaOH', 'acetic', 'nh3', 'H3PO4'].map(function (id) { return D.COMPOUNDS.filter(function (c) { return c.id === id; })[0]; }).filter(Boolean);
    if (plotCmp) plotCmp.forEach(function (comp) {
      var fam = comp.fam ? D.FAMILIES[comp.fam] : null, sp = titrationSpec(comp, fam);
      ['acid', 'base'].forEach(function (dir) {
        if (!sp[dir]) return;
        [false, true].forEach(function (act) {
          if (act && (!hooks.extended || (comp.id !== 'HCl' && comp.id !== 'NaOH' && comp.id !== 'acetic'))) return;   // Real curves are heavy: dev runner only
          add('derivative chart ' + comp.id + ' ' + dir + (act ? ' real' : ' ideal'), function () {
            var cv = (!act && hooks.curve && hooks.curve(comp, fam, dir, sp[dir])) || titrationCurve({ makeSys: function (c) { return systemFor(comp, fam, c); }, Ca: 0.1, Va: 25, Ct: 0.1, dir: dir, nEq: sp[dir].neq, eqScale: sp[dir].escale, act: act });
            var t = derivativeSeries(cv.der), lo = Infinity, hi = -Infinity, best = 0, bv = 0, wrong = 0, q;
            for (q = 0; q < t.length; q++) {
              if (!isFinite(t[q].y)) return { ok: false, expected: 'finite log|d|', actual: t[q] };
              if (t[q].y < lo) lo = t[q].y; if (t[q].y > hi) { hi = t[q].y; } if (t[q].mag > best) { best = t[q].mag; bv = t[q].v; }
              if ((dir === 'acid' && t[q].d < -1e-9) || (dir === 'base' && t[q].d > 1e-9)) wrong++;
            }
            var spread = hi - lo, atEq = Math.abs(bv - cv.eq[0].v) <= 0.03 * cv.veq1 || cv.eq.some(function (e) { return Math.abs(bv - e.v) <= 0.03 * cv.veq1; });
            return (wrong === 0 && spread > 2 && atEq) ? true : { ok: false, expected: 'sign ' + (dir === 'acid' ? '+' : '−') + ', not flat (log-range > 2), peak at an equivalence point', actual: { wrongSign: wrong, logRange: spread, peakAt: bv, eq1: cv.eq[0].v } };
          });
        });
      });
    });
    add('capacity series Real stays finite and close to or above water', function () {
      if (!D) return true;
      var f = D.FAMILIES.acetic, s = capacitySeries(f, 0.1, 41, true), q;
      for (q = 0; q < s.pH.length; q++) if (!isFinite(s.beta[q]) || s.beta[q] < s.water[q] * 0.95) return { ok: false, expected: 'finite, ≥ 95 % of the water curve', actual: { pH: s.pH[q], beta: s.beta[q], water: s.water[q] } };
      return true;
    });
    return cases;
  }

  // 15 reference solutions (pH 0…14) — shown on the loading wheel with their exact computed pH
  function wheelRefs() {
    var refs = [], k;
    var acid = function (C) { return systemFor({ type: 'sa', n: 1 }, null, C); }, base = function (C) { return systemFor({ type: 'sb', n: 1 }, null, C); };
    var defs = [[acid, 1], [acid, 0.1], [acid, 1e-2], [acid, 1e-3], [acid, 1e-4], [acid, 1e-5], [acid, 1e-6], [null, 0], [base, 1e-6], [base, 1e-5], [base, 1e-4], [base, 1e-3], [base, 1e-2], [base, 1e-1], [base, 1]];
    for (k = 0; k < 15; k++) refs.push(solve(defs[k][0] ? defs[k][0](defs[k][1]) : newSys([], 0)).pH);
    return refs;
  }

  root.PHLabEngine = {
    KW: KW, PKW: PKW, A_DAV: A_DAV, log10: log10,
    parseNum: parseNum, num: num, sciHTML: sciHTML, fmt: fmt, fmtPH: fmtPH, fmtPH3: fmtPH3, fmtConc: fmtConc, minus: minus, numPlain: numPlain,
    gamma: gamma, alphas: alphas, famKs: famKs, newSys: newSys, addSpec: addSpec, solve: solve, solveAt: solveAt,
    I_DAVIES_MAX: I_DAVIES_MAX, ionicStrength: ionicStrength, counterIons: counterIons, bufferCapacityAt: bufferCapacityAt, baseNeededReal: baseNeededReal,
    capacityRealAt: capacityRealAt, derivativeSeries: derivativeSeries, DER_FLOOR: DER_FLOOR,
    bufferCapacity: bufferCapacity, systemFor: systemFor, bufferSystem: bufferSystem, pureWater: pureWater, designBuffer: designBuffer,
    residuals: residuals, naivePH: naivePH, titrationSpec: titrationSpec,
    titrationSol: titrationSol, titrationPH: titrationPH, titrationCurve: titrationCurve, titrationCurveJob: titrationCurveJob, curveAt: curveAt,
    distributionSeries: distributionSeries, capacitySeries: capacitySeries, phVsLogC: phVsLogC, phVsLogCJob: phVsLogCJob, bufferResponse: bufferResponse,
    selfTestCases: selfTestCases, wheelRefs: wheelRefs
  };
})(typeof window !== 'undefined' ? window : globalThis);
