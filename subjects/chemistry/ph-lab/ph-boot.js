/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-boot.js
   The loading screen. It is REAL: the wheel advances only as genuine work finishes.
   15 stages = 15 petals (pH 0…14). Each petal fills like a vial while its stage runs and, when the
   stage completes, shows the exact pH the engine computes for that petal's reference solution.
   Work done here (time-sliced so the screen stays smooth):
     · integrity of every compound/constant and of the three dictionaries
     · ~4 000 internal consistency checks in four groups (ENGINE, REGRESSION, PLOTS, DATA): closed forms, independent
       solutions, ion-ledger identities, charge/mass balance of every compound ideal + real, Davies reference values, HH,
       equivalence volumes, the audited H₂SO₄ / derivative / buffer-capacity cases. They are consistency checks — not a proof of accuracy.
     · pH–log c tables (ideal and Real) are warmed in the background right after the screen is usable (warm()), or computed on demand
     · distribution + Sillén checks for every acid family, buffer-capacity checks for every pair
     · reference titration curves for every titratable compound (computed once and shared with the checks)
   Robustness: every unit runs inside try/catch — a failure is recorded (CACHE.checks.failed, with details), shown on screen and in
   the app, and never aborts the loading. Heavy work is cut into chunks and the frame loop only starts a unit that is predicted to
   fit in the remaining frame budget. Timings (per unit, per frame, total) are measured: see PHLabBoot.lastPerf and PHLabBoot.bench(n).
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.PHLabEngine, D = root.PHLabData, V = root.PHLabViz;
  var NS = 'http://www.w3.org/2000/svg';
  var CACHE = root.PHLabCache = { phc: { ideal: {}, real: {} }, dist: {}, tit: {}, ready: false, checks: { total: 0, ok: 0, failed: [], groups: {} }, perf: null };
  function resetCache() { if (typeof warming !== 'undefined') warming = null; CACHE.phc = { ideal: {}, real: {} }; CACHE.dist = {}; CACHE.tit = {}; CACHE.ready = false; CACHE.checks = { total: 0, ok: 0, failed: [], groups: {} }; CACHE.perf = null; }
  var DEPTH = 1.3;   // table resolution multiplier — about 6–9 s on a typical tablet; tune here

  function el(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function polar(r, deg) { var a = deg * Math.PI / 180; return [200 + r * Math.cos(a), 200 + r * Math.sin(a)]; }
  function pt(p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }
  function wedge(r1, r2, a0, a1) { return 'M' + pt(polar(r1, a0)) + ' L' + pt(polar(r2, a0)) + ' A' + r2 + ' ' + r2 + ' 0 0 1 ' + pt(polar(r2, a1)) + ' L' + pt(polar(r1, a1)) + ' A' + r1 + ' ' + r1 + ' 0 0 0 ' + pt(polar(r1, a0)) + ' Z'; }
  function rgb(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }

  /* ---------- the real work ---------- */
  // record one check: true / {ok:true} = passed, anything else = failed (kept with its details so it can be diagnosed)
  function note(group, name, r) {
    var ok = r === true || (r && r.ok === true), g = CACHE.checks.groups[group] || (CACHE.checks.groups[group] = { ok: 0, total: 0 });
    CACHE.checks.total++; g.total++;
    if (ok) { CACHE.checks.ok++; g.ok++; } else CACHE.checks.failed.push({ name: name, group: group, detail: (r && typeof r === 'object') ? r : undefined });
  }
  // rough desktop cost (µs) of one check, by name — used only to size the batches and to weight the progress
  function weight(name) {
    var k = name.split(' ')[0];
    return k === 'sa' || k === 'sb' ? 60 : k === 'wa' || k === 'wb' ? 130 : k === 'balances' ? 160 : k === 'ledger' ? 200 : k === 'robust' ? 100 : k === 'titr' ? 30 :
      k === 'capacity' ? 800 : k === 'response' ? 300 : k === 'derivative' ? 2500 : k === 'H2SO4' ? 2000 : 60;
  }
  // a pH–log c table must be finite; for strong acids pH falls as c rises, for strong bases it rises (physical requirement)
  function checkPhc(c, r, N) {
    var i, bad = '', lc = r.pH;
    if (!lc || lc.length < 20) return { ok: false, expected: 'table with points', actual: lc && lc.length };
    for (i = 0; i < lc.length; i++) if (!isFinite(lc[i])) return { ok: false, expected: 'finite pH', actual: { index: i, pH: lc[i] } };
    if (c.type === 'sa' || c.type === 'sb') for (i = 1; i < lc.length; i++) { var d = lc[i] - lc[i - 1]; if (c.type === 'sa' ? d > 1e-9 : d < -1e-9) { bad = i; break; } }
    return bad === '' ? true : { ok: false, expected: c.type === 'sa' ? 'pH falls with c' : 'pH rises with c', actual: { atIndex: bad } };
  }
  function buildStages(T, depth) {
    var X = root.PHLabText, comps = D.COMPOUNDS, cur = 'b0', st = [];
    var byCat = function (cats) { return comps.filter(function (c) { return cats.indexOf(c.cat) >= 0; }); };
    var cases = E.selfTestCases(D, { curve: function (c, fam, dir) { return CACHE.tit[c.id + ':' + dir] || null; } });
    var inStage = function (stg, grp) { return cases.filter(function (c) { return c.stage === stg && (!grp || c.group === grp); }); };

    // a batch of checks — never longer than ≈1.5 ms on a desktop, so a unit cannot stall a frame on its own
    function checkUnits(list, msg) {
      var out = [], i = 0;
      while (i < list.length) {
        var chunk = [], w = 0;
        while (i < list.length && (chunk.length === 0 || w < 1500)) { chunk.push(list[i]); w += weight(list[i].name); i++; }
        (function (chunk, w) {
          out.push({ cost: w, msg: msg, name: chunk[0].group + ':' + chunk[0].name, run: function () {
            for (var q = 0; q < chunk.length; q++) { var r; try { r = chunk[q].run(); } catch (e) { r = { ok: false, expected: 'no exception', actual: String((e && e.message) || e) }; } note(chunk[q].group, chunk[q].name, r); }
          } });
        })(chunk, w);
      }
      return out;
    }
    // a long computation cut into pieces: mk() (called lazily, on the first piece) builds a job {step(n), …}; every piece advances
    // it by `chunk` items. `total` is an upper bound — pieces after completion do nothing.
    function jobUnits(msg, name, total, chunk, usPerItem, mk, finish) {
      var n = Math.max(1, Math.ceil(total / chunk)), job = null, finished = false, out = [], k;
      for (k = 0; k < n; k++) (function (idx) {
        out.push({ cost: Math.max(50, Math.round(chunk * usPerItem)), msg: msg, name: name + ' #' + (idx + 1) + '/' + n, run: function () {
          if (finished) return;
          if (!job) job = mk();
          var fin = job.step(chunk);
          if (fin || idx === n - 1) { finished = true; finish(job); }
        } });
      })(k);
      return out;
    }

    // 0 — data integrity + the DATA checks
    var u0 = [];
    comps.forEach(function (c) { u0.push({ cost: 150, msg: 'b0', name: 'data:' + c.id, run: function () { var fam = c.fam ? D.FAMILIES[c.fam] : null; note('DATA', 'data:' + c.id, !!(c.id && c.f && c.name.el && c.name.en && c.name.es && (!c.fam || (fam && fam.forms.length === fam.pKa.length + 1 && c.j !== undefined || c.type === 'wa')) && isFinite(E.solve(E.systemFor(c, fam, 0.01)).pH))); } }); });
    Object.keys(D.FAMILIES).forEach(function (id) { u0.push({ cost: 20, msg: 'b0', name: 'fam:' + id, run: function () { var f = D.FAMILIES[id], ok = f.forms.length === f.pKa.length + 1; for (var i = 1; i < f.pKa.length; i++) if (!(f.pKa[i] > f.pKa[i - 1])) ok = false; note('DATA', 'fam:' + id, ok); } }); });
    D.INDICATORS.forEach(function (i) { u0.push({ cost: 10, msg: 'b0', name: 'ind:' + i.id, run: function () { note('DATA', 'ind:' + i.id, !!(i.pK > 0 && i.acid && i.mid && i.base && i.name.el && i.name.en && i.name.es)); } }); });
    st.push(u0.concat(checkUnits(inStage('b0'), 'b0')));
    // 1 — dictionaries (placeholders must match in EL / EN / ES)
    var u1 = [], keys = Object.keys(X.el);
    for (var i = 0; i < keys.length; i += 6) (function (chunk) {
      u1.push({ cost: 30, msg: 'b1', name: 'i18n#' + (i / 6), run: function () { chunk.forEach(function (k) {
        ['en', 'es'].forEach(function (l) { var a = (X.el[k].match(/\{\w+\}/g) || []).sort().join(), b = ((X[l][k] || '').match(/\{\w+\}/g) || []).sort().join(); note('DATA', 'i18n:' + l + ':' + k, X[l][k] !== undefined && a === b); });
      }); } });
    })(keys.slice(i, i + 6));
    st.push(u1);
    // 2–4 — accuracy suite
    st.push(checkUnits(inStage('b2'), 'b2'));
    st.push(checkUnits(inStage('b3'), 'b3'));
    st.push(checkUnits(inStage('b4'), 'b4'));
    // 14 — reference titrations (0.1 M analyte, 25 mL, 0.1 M titrant): computed ONCE, in pieces, then shared with the checks
    var u14 = [];
    comps.forEach(function (c) {
      var fam = c.fam ? D.FAMILIES[c.fam] : null, sp = E.titrationSpec(c, fam);
      ['acid', 'base'].forEach(function (dir) {
        if (!sp[dir]) return;
        var mk = function () { return E.titrationCurveJob({ makeSys: function (cc) { return E.systemFor(c, fam, cc); }, Ca: 0.1, Va: 25, Ct: 0.1, dir: dir, nEq: sp[dir].neq, eqScale: sp[dir].escale }); };
        u14 = u14.concat(jobUnits('b14', 'tit:' + c.id + ':' + dir, 321 + 22 * sp[dir].neq, 40, 11, mk, function (job) { CACHE.tit[c.id + ':' + dir] = job.finish(); }));
      });
    });
    st.push(u14);
    st.push(checkUnits(inStage('b5'), 'b5'));
    st.push(checkUnits(inStage('b14'), 'b14'));
    // 6–11 — pH–log c tables (ideal and Real) are NOT part of the critical path any more: warm() computes them in the background
    // right after the screen is usable, and the plots compute any table that is still missing on demand.
    // 12 — distribution + Sillén consistency for every family (ideal and I = 0.1 M)
    var u12 = [];
    Object.keys(D.FAMILIES).forEach(function (id) {
      u12.push({ cost: 400, msg: 'b12', name: 'dist:' + id, run: function () {
        var f = D.FAMILIES[id], ok = true;
        [0, 0.1].forEach(function (I) {
          var s = E.distributionSeries(f, 1401, I); if (I === 0) CACHE.dist[id] = s;
          s.a.forEach(function (a) { var t = 0; a.forEach(function (x) { t += x; }); if (Math.abs(t - 1) > 1e-12) ok = false; });
        });
        // adjacent forms cross at pH = pKa (ideal, well separated stages)
        f.pKa.forEach(function (pK, j) { var gap = Math.min(j > 0 ? pK - f.pKa[j - 1] : 9, j < f.pKa.length - 1 ? f.pKa[j + 1] - pK : 9); if (gap > 3) { var a = E.alphas(Math.pow(10, -pK), E.famKs(f)); if (Math.abs(a[j] - a[j + 1]) > 0.02) ok = false; } });
        note('ENGINE', 'dist:' + id, ok);
      } });
    });
    st.push(u12);
    // 13 — buffer-capacity checks for every pair (peak at the pKa, height ln10·C/4 when the stages are well separated) + the audited Real/ideal checks
    var u13 = [];
    Object.keys(D.FAMILIES).forEach(function (id) {
      D.FAMILIES[id].pKa.forEach(function (pK, j) {
        u13.push({ cost: 700, msg: 'b13', name: 'beta:' + id + ':' + j, run: function () {
          var f = D.FAMILIES[id], s = E.capacitySeries(f, 0.1, 1401), best = 0, bp = 0, i, ok = true;
          for (i = 0; i < s.pH.length; i++) { var bb = s.beta[i] - s.water[i]; if (Math.abs(s.pH[i] - pK) < 1.2 && bb > best) { best = bb; bp = s.pH[i]; } }
          var gap = Math.min(j > 0 ? pK - f.pKa[j - 1] : 9, j < f.pKa.length - 1 ? f.pKa[j + 1] - pK : 9);
          if (gap > 3 && (Math.abs(bp - pK) > 0.02 || Math.abs(best / (Math.LN10 * 0.1 / 4) - 1) > 0.02)) ok = false;
          note('ENGINE', 'beta:' + id + ':' + j, ok ? true : { ok: false, expected: 'peak at pKa ' + pK + ', height ln10·C/4', actual: { peakAt: bp, ratio: best / (Math.LN10 * 0.1 / 4) } });
        } });
      });
    });
    st.push(u13.concat(checkUnits(inStage('b13'), 'b13')));
    var flat = []; st.forEach(function (grp) { grp.forEach(function (u) { flat.push(u); }); });
    return flat;
  }

  /* ---------- the wheel ---------- */
  function Wheel(host, T) {
    this.T = T; var svg = this.svg = el('svg', { viewBox: '0 0 400 400', class: 'phl-boot-svg', role: 'img', 'aria-label': T('bootTitle') }, host);
    var defs = el('defs', {}, svg), i;
    el('circle', { cx: 200, cy: 200, r: 190, fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': 1 }, svg);
    var ringBg = el('circle', { cx: 200, cy: 200, r: 90, fill: 'rgba(8,24,52,.55)', stroke: '#14305a', 'stroke-width': 18 }, svg);
    // arc labels (the water scale: acidic · neutral · basic)
    var pA = el('path', { id: 'phl-arcA', d: 'M200 108 A92 92 0 1 1 199.9 108', fill: 'none' }, defs);
    var pN = el('path', { id: 'phl-arcN', d: 'M108 200 A92 92 0 0 0 292 200', fill: 'none' }, defs);
    var circ = 2 * Math.PI * 92;
    function lab(path, text, off) { var t = el('text', { 'font-size': 9.5, fill: 'rgba(190,215,255,.9)', 'letter-spacing': 1.6, 'font-weight': 600 }, svg); var tp = el('textPath', { href: '#' + path, startOffset: off, 'text-anchor': 'middle' }, t); tp.textContent = text; }
    lab('phl-arcA', T('bootAcidic'), (circ * ((-18 + 90) / 360)).toFixed(1));
    lab('phl-arcA', T('bootBasic'), (circ * ((-90 + 24 * 11 + 90) / 360)).toFixed(1));
    lab('phl-arcN', T('bootNeutral'), (Math.PI * 92 / 2).toFixed(1));
    // ticks (radial progress)
    this.ticks = [];
    for (i = 0; i < 72; i++) { var a = -90 + i * 5, p1 = polar(66, a), p2 = polar(75, a); this.ticks.push(el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: 'rgba(120,170,255,.22)', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, svg)); }
    // petals
    this.petals = [];
    for (i = 0; i < 15; i++) {
      var ang = -90 + i * 24, a0 = ang - 9.2, a1 = ang + 9.2, col = V.universalColor(i);
      var base = el('path', { d: wedge(104, 182, a0, a1), fill: rgb(col, 0.12), stroke: rgb(col, 0.38), 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, svg);
      var fill = el('path', { d: '', fill: rgb(col, 0.95), stroke: rgb(col, 0.95), 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
      var bp = polar(118, ang), badge = el('circle', { cx: bp[0], cy: bp[1], r: 12.5, fill: 'rgba(255,255,255,.92)' }, svg);
      var bt = el('text', { x: bp[0], y: bp[1] + 4.2, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: '#10233f' }, svg); bt.textContent = String(i);
      var vp = polar(160, ang), val = el('text', { x: vp[0], y: vp[1] + 3.6, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: '#fff', opacity: 0 }, svg);
      this.petals.push({ fill: fill, val: val, ang: ang, a0: a0, a1: a1, p: 0, shown: false, col: col, base: base });
    }
    this.cTitle = el('text', { x: 200, y: 192, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 700, fill: '#eaf2ff' }, svg); this.cTitle.textContent = 'pH';
    this.cPct = el('text', { x: 200, y: 222, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 600, fill: '#9fc4ff' }, svg); this.cPct.textContent = '0 %';
  }
  Wheel.prototype.setStage = function (k, p) {
    var pe = this.petals[k]; pe.p = p;
    var r2 = 104 + p * 78; pe.fill.setAttribute('d', p <= 0.002 ? '' : wedge(104, Math.max(106, r2), pe.a0 + 1.2, pe.a1 - 1.2));
  };
  Wheel.prototype.finishStage = function (k, value) {
    var pe = this.petals[k]; this.setStage(k, 1); pe.val.textContent = value; pe.val.setAttribute('opacity', 1); pe.shown = true;
    pe.base.setAttribute('stroke-width', 2.4);
  };
  Wheel.prototype.setPercent = function (f) {
    var n = Math.round(f * 72), i; for (i = 0; i < 72; i++) this.ticks[i].setAttribute('stroke', i < n ? '#6fb2ff' : 'rgba(120,170,255,.22)');
    this.cPct.textContent = Math.round(f * 100) + ' %';
  };

  /* ---------- runner ---------- */
  function pctl(arr, p) { if (!arr.length) return 0; var b = arr.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 0.5))]; }
  /* The frame scheduler (shared by the loading screen and the benchmark). Per frame it runs units while they are PREDICTED to fit in
     the ≈11 ms budget (always at least one, so it always progresses). Every unit is timed; a throwing unit is recorded, never fatal. */
  function schedule(stages, onFrame, onDone) {
    var total = 0, done = 0, u = 0, msPerCost = 0, lastTs = 0;
    var perf = { t0: performance.now(), gaps: [], work: [], maxGapV: 0, maxGapFrame: 0, maxUnit: 0, maxUnitName: '', unitsOver16: 0, top: [] };
    stages.forEach(function (x) { total += x.cost; });
    function runUnit(unit) {
      var t = performance.now();
      try { unit.run(); } catch (e) {
        note('BOOT', unit.name || unit.msg, { ok: false, expected: 'no exception', actual: String((e && e.message) || e) });
        if (root.console) console.error('[MODULE-16] boot unit failed:', unit.name, e);
      }
      var dt = performance.now() - t;
      if (dt > perf.maxUnit) { perf.maxUnit = dt; perf.maxUnitName = unit.name || unit.msg; }
      if (dt > 16) perf.unitsOver16++;
      if (perf.top.length < 5 || dt > perf.top[perf.top.length - 1].ms) { perf.top.push({ name: unit.name || unit.msg, ms: dt }); perf.top.sort(function (x, y) { return y.ms - x.ms; }); if (perf.top.length > 5) perf.top.pop(); }
      if (unit.cost > 0) msPerCost = msPerCost ? 0.85 * msPerCost + 0.15 * dt / unit.cost : dt / unit.cost;
    }
    function finish() {
      var el = performance.now() - perf.t0, g = perf.gaps, w = perf.work;
      var sum = { elapsedMs: el, frames: w.length, medianGapMs: pctl(g, 0.5), p95GapMs: pctl(g, 0.95), maxGapMs: g.length ? Math.max.apply(null, g) : 0, stallsOver100ms: g.filter(function (x) { return x > 100; }).length, maxGapAtFrame: perf.maxGapFrame,
        medianWorkMs: pctl(w, 0.5), p95WorkMs: pctl(w, 0.95), maxWorkMs: w.length ? Math.max.apply(null, w) : 0, maxUnitMs: perf.maxUnit, maxUnitName: perf.maxUnitName, unitsOver16ms: perf.unitsOver16, slowestUnits: perf.top, units: stages.length };
      CACHE.perf = sum; PHLabBootPublic.lastPerf = sum;
      onDone(sum);
    }
    function frame(ts) {
      if (lastTs) { var gp = ts - lastTs; perf.gaps.push(gp); if (gp > perf.maxGapV) { perf.maxGapV = gp; perf.maxGapFrame = perf.gaps.length; } } lastTs = ts;
      var start = performance.now(), end = start + 11, ran = 0;
      while (u < stages.length) {
        var unit = stages[u], est = msPerCost ? unit.cost * msPerCost : 0;
        if (ran > 0 && performance.now() + est > end) break;
        runUnit(unit); done += unit.cost; u++; ran++;
        if (performance.now() >= end) break;
      }
      perf.work.push(performance.now() - start);
      onFrame(done, total, u < stages.length ? stages[u] : null);
      if (u < stages.length) root.requestAnimationFrame(frame); else finish();
    }
    root.requestAnimationFrame(frame);
  }

  function run(opts) {
    var T = opts.T, host = opts.host, depth = opts.depth || DEFAULT_DEPTH();
    host.innerHTML = '';
    var title = document.createElement('div'); title.className = 'phl-boot-title'; title.textContent = T('bootTitle'); host.appendChild(title);
    var box = document.createElement('div'); box.className = 'phl-boot-wheel'; host.appendChild(box);
    var msg = document.createElement('div'); msg.className = 'phl-boot-msg'; msg.setAttribute('role', 'status'); host.appendChild(msg);
    var sum = document.createElement('div'); sum.className = 'phl-boot-sum'; host.appendChild(sum);
    var perfLine = document.createElement('div'); perfLine.className = 'phl-boot-sum'; perfLine.style.opacity = '.6'; host.appendChild(perfLine);
    var wheel = new Wheel(box, T), refs = E.wheelRefs(), shown = 0, k;
    resetCache();
    var stages;
    try { stages = buildStages(T, depth); } catch (e) { stages = []; note('BOOT', 'buildStages', { ok: false, expected: 'no exception', actual: String((e && e.message) || e) }); if (root.console) console.error('[MODULE-16] could not build the boot stages:', e); }
    var per = Math.max(1, stages.reduce(function (t, x) { return t + x.cost; }, 0)) / 15;
    msg.textContent = T('b0');
    return new Promise(function (resolve) {
      schedule(stages, function (done, total, nextUnit) {
        for (k = 0; k < 15; k++) {                                              // petal k = the k-th fifteenth of the real work
          var p = Math.max(0, Math.min(1, (done - k * per) / per));
          if (k >= shown && p >= 1) { wheel.finishStage(k, E.fmtPH(refs[k]).replace('\u2212', '-')); shown = k + 1; } else if (k >= shown) wheel.setStage(k, p);
        }
        if (nextUnit) {
          msg.textContent = T(nextUnit.msg); wheel.setPercent(Math.min(1, done / total));
          if (CACHE.checks.total) sum.textContent = T('bootChecks', { ok: CACHE.checks.ok, n: CACHE.checks.total });
        }
      }, function (perf) {
        var f = CACHE.checks.failed;
        for (k = shown; k < 15; k++) wheel.finishStage(k, E.fmtPH(refs[k]).replace('\u2212', '-'));
        wheel.setPercent(1); CACHE.ready = true;
        msg.textContent = f.length ? T('bootReadyWarn', { k: f.length }) : T('bootReady');
        sum.textContent = T('bootChecks', { ok: CACHE.checks.ok, n: CACHE.checks.total }) + (f.length ? '  \u00b7  ' + T('bootFail', { k: f.length }) + ' ' + T('bootFailNames', { names: f.slice(0, 3).map(function (x) { return x.name; }).join(', ') }) : '');
        perfLine.textContent = T('bootPerf', { t: (perf.elapsedMs / 1000).toFixed(1), m: Math.round(perf.maxUnitMs) });
        if (root.console) {
          console.info('[MODULE-16] start-up', { seconds: +(perf.elapsedMs / 1000).toFixed(2), checks: CACHE.checks.ok + '/' + CACHE.checks.total, groups: CACHE.checks.groups, medianFrameGapMs: +perf.medianGapMs.toFixed(1), p95FrameGapMs: +perf.p95GapMs.toFixed(1), stallsOver100ms: perf.stallsOver100ms, heaviestUnit: perf.maxUnitName + ' ' + perf.maxUnitMs.toFixed(1) + ' ms' });
          if (f.length) console.warn('[MODULE-16] failed checks (name · group · details):', f.slice(0, 30));
        }
        resolve({ elapsed: perf.elapsedMs, checks: CACHE.checks, perf: perf });
        if (!opts.noWarm) warm();
      });
    });
  }

  /* Benchmark: PHLabBoot.bench(5) runs the real start-up 5 times, headless (no wheel), and returns median / p95 start-up time, the
     worst frame gap and the heaviest unit. Open the module with ?phl-bench=5 to run it on a device and read the result on screen. */
  function bench(n, opts) {
    n = n || 5; opts = opts || {};
    var runs = [], T = opts.T || function (k) { return k; };
    return new Promise(function (resolve) {
      (function next(i) {
        if (i >= n) {
          var el = runs.map(function (r) { return r.elapsedMs; }), maxGap = Math.max.apply(null, runs.map(function (r) { return r.maxGapMs; })), mu = runs.reduce(function (a, r) { return r.maxUnitMs > a.maxUnitMs ? r : a; }, runs[0]);
          CACHE.ready = true;
          var res = { runs: runs, startupMedianMs: pctl(el, 0.5), startupP95Ms: pctl(el, 0.95), startupMaxMs: Math.max.apply(null, el), worstFrameGapMs: maxGap, stallsOver100ms: runs.reduce(function (a, r) { return a + r.stallsOver100ms; }, 0), heaviestUnit: mu.maxUnitName, heaviestUnitMs: mu.maxUnitMs, failedChecks: CACHE.checks.failed.length };
          PHLabBootPublic.lastBench = res; if (root.console) console.info('[MODULE-16] boot bench', res);
          resolve(res); return;
        }
        resetCache();
        var stages = buildStages(T, opts.depth || DEFAULT_DEPTH());
        schedule(stages, function () { }, function (perf) { runs.push(perf); setTimeout(function () { next(i + 1); }, 30); });
      })(0);
    });
  }

  /* Background warm-up of the pH–log c tables (ideal, then Real), in small pieces (≈4 ms per frame) after the module is usable. A table
     the plots already computed on demand is skipped. Returns a Promise that resolves when everything is cached. */
  var warming = null;
  function warm() {
    if (warming) return warming;
    var units = [], Ni = Math.round(400 * DEPTH), Nr = 300;
    [false, true].forEach(function (act) {
      D.COMPOUNDS.forEach(function (c) {
        var fam = c.fam ? D.FAMILIES[c.fam] : null, N = act ? Nr : Ni, chunk = act ? 10 : 120, job = null, n = Math.ceil(N / chunk), key = act ? 'real' : 'ideal', k;
        for (k = 0; k < n; k++) (function (idx) {
          units.push(function () {
            if (CACHE.phc[key][c.id]) return;
            if (!job) job = E.phVsLogCJob(c, fam, -9, 1, N, act);
            if (job.step(chunk) || idx === n - 1) {
              if (!CACHE.phc[key][c.id]) {
                var r = job.result(), q = checkPhc(c, r); CACHE.phc[key][c.id] = r;
                note('ENGINE', 'phc:' + key + ':' + c.id, q);
                if (q !== true && root.PHLab && root.PHLab.checkStatus) root.PHLab.checkStatus();
              }
            }
          });
        })(k);
      });
    });
    warming = new Promise(function (resolve) {
      var i = 0, t0 = performance.now();
      function tick() {
        var end = performance.now() + 4;
        while (i < units.length && performance.now() < end) { try { units[i](); } catch (e) { if (root.console) console.warn('[MODULE-16] warm-up unit failed', e); } i++; }
        if (i < units.length) { if (root.requestIdleCallback) root.requestIdleCallback(tick, { timeout: 200 }); else root.setTimeout(tick, 16); }
        else { PHLabBootPublic.warmMs = performance.now() - t0; resolve(true); }
      }
      root.setTimeout(tick, 400);
    });
    return warming;
  }

  function DEFAULT_DEPTH() { return DEPTH; }
  var PHLabBootPublic = root.PHLabBoot = { run: run, bench: bench, cache: CACHE, lastPerf: null, lastBench: null, set DEPTH(v) { DEPTH = v; }, get DEPTH() { return DEPTH; }, warm: warm, warmMs: null, _buildStages: buildStages, _note: note, _reset: resetCache };
})(typeof window !== 'undefined' ? window : globalThis);
