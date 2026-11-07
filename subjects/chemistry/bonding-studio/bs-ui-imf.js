/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-ui-imf.js         tab “Intermolecular forces” (ES2015)
   Pick a substance → which forces it exerts and why (with the numbers), a 3D scene of the interaction (London / dipole–dipole /
   hydrogen bond / ion–dipole), typical energies on a log scale, boiling-point evidence (hydride series, α′ vs T_b)
   ========================================================================== */
(function (root) {
  'use strict';
  var B = root.BSStudio, A = B.api, T = A.T, E = A.E, V3 = A.V3, IMF = root.BSIMF, fx = A.fx, f1 = A.f1;
  var MOLS = ['H2O', 'NH3', 'HF', 'CH3OH', 'C2H5OH', 'CH3COOH', 'HCl', 'HBr', 'CH3Cl', 'CHCl3', 'SO2', 'CH32CO', 'CH4', 'C2H6', 'CO2', 'CCl4', 'N2', 'C6H6', 'SF6', 'Cl2', 'I2'];
  var ATOMS = ['He', 'Ne', 'Ar', 'Kr', 'Xe'];
  var IONS = [['Li', 1], ['Na', 1], ['K', 1], ['Mg', 2], ['Ca', 2], ['Al', 3], ['F', -1], ['Cl', -1], ['Br', -1], ['I', -1]];
  var IS = { kind: 'mol', id: 'H2O', ion: ['Na', 1], mode: 'hbond', n: 4, auto: false, tmol: null, sp: null, typedTxt: '', typedErr: '', kbOpen: false };
  var COL = { london: '#9aa4b2', dipole: '#4da3ff', hbond: '#ffb020', iondipole: '#2fd0b5', ionic: '#ff8a5c', covalent: '#b79cff' };
  function key(sym, q) { return sym + (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '-'); }
  function sub(x) { return E.sub(x); }
  function current() {
    if (IS.tmol) return IS.tmol;
    if (IS.kind === 'atom') return E.atomMol(IS.id, 0);
    if (IS.kind === 'ion') return E.atomMol(IS.ion[0], IS.ion[1]);
    return E.fromLibrary(IS.id);
  }
  function modesFor(m) {
    var an = IMF.analyze(m), out = { london: true };
    if (IS.kind === 'ion') return { iondipole: true };
    if (an.polar) out.dipole = IMF.dipoleScene(m) !== null;
    if (an.donors.length || an.acceptors.length) out.hbond = (an.hb === 'both' || an.hb === 'acceptor');
    if (m.charged) out.iondipole = true;
    return out;
  }
  function sceneFor(m, mode) {
    if (mode === 'london') return IMF.londonScene(m);
    if (mode === 'dipole') return IMF.dipoleScene(m);
    if (mode === 'hbond') return IMF.hbondScene(m, { n: IS.n });
    if (mode === 'iondipole') { if (IS.kind === 'ion') return IMF.ionScene(IS.ion[0], IS.ion[1]); if (m.atoms.length === 1) return IMF.ionScene(m.atoms[0].s, m.atoms[0].q); return IMF.ionScene('Na', 1); }
    return null;
  }
  function dominant(m, modes) { var an = IMF.analyze(m), pri = IS.kind === 'ion' ? ['iondipole'] : ['hbond', 'dipole', 'iondipole', 'london']; for (var i = 0; i < pri.length; i++) if (modes[pri[i]]) return pri[i]; return 'london'; }

  function energyBars(present) {
    var lo = Math.log(0.01) / Math.LN10, hi = Math.log(5000) / Math.LN10;
    function pos(v) { return (Math.log(v) / Math.LN10 - lo) / (hi - lo) * 100; }
    var ticks = [0.01, 0.1, 1, 10, 100, 1000], grid = ticks.map(function (v) { return `<s style="left:${pos(v).toFixed(1)}%"></s>`; }).join('');
    var rows = IMF.data.ENERGY.map(function (r) { var on = present.indexOf(r[0]) >= 0, l = pos(r[1]), w = pos(r[2]) - l;
      return `<div class="bs-ebar${on ? ' on' : ''}"><span class="bs-el">${T('imfK_' + r[0])}</span><div class="bs-etrack">${grid}<i style="left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;background:${COL[r[0]]}"></i></div><b>${r[1]}–${r[2]}</b></div>`; }).join('');
    var axis = ticks.map(function (v) { return `<span style="left:${pos(v).toFixed(1)}%">${String(v).replace('.', ',')}</span>`; }).join('');
    return `${rows}<div class="bs-ebar bs-ax"><span></span><div class="bs-eaxis">${axis}</div><b>kJ/mol</b></div>`;   /* same grid as the bars: each tick sits under its gridline */
  }
  function forcesList(m, an) {
    var rows = an.forces.map(function (f) {
      var txt;
      if (f.k === 'london') txt = an.alpha !== null && an.alpha !== undefined ? T('imf_london', { a: f1(an.alpha), m: f1(an.M), e: an.electrons }) : T('imf_londonNoA', { m: f1(an.M), e: an.electrons });
      else if (f.k === 'dipole') txt = T('imf_dipole', { mu: fx(an.mu, 2), src: an.muSrc === 'exp' ? T('expShort') : T('model') });
      else if (f.k === 'hbond') txt = an.hb === 'both' ? T('imf_hbBoth', { nd: an.donors.length, na: an.acceptors.length }) : T('imf_hbAcc');
      else txt = T('imf_iondipole') + (IS.kind === 'ion' && IMF.data.HYD[key(IS.ion[0], IS.ion[1])] !== undefined ? ' ' + T('imf_hyd', { h: IMF.data.HYD[key(IS.ion[0], IS.ion[1])] }) : '');
      return `<li><b style="color:${COL[f.k]}">${T('imfK_' + f.k)}</b>${f.partial ? ' (' + T('imfPartial') + ')' : ''} — ${txt}</li>`;
    }).join('');
    return `<ul class="bs-ul">${rows}</ul>`;
  }
  function boilingPlots(m) {
    if (!(root.BSPlot || root.PHLabPlot)) return; var D = IMF.data, series = [], pts = [], cols = { 14: '#9aa4b2', 15: '#4da3ff', 16: '#ff6b6b', 17: '#ffb020' }, nH = { 14: 4, 15: 3, 16: 2, 17: 1 }, mH = E.el('H').m;
    D.HYDRIDES.forEach(function (g) { var line = g.pts.map(function (p) { return [E.el(p[0]).m + nH[g.g] * mH, p[1]]; }); series.push({ name: T('imfGroup', { g: g.g }), pts: line, color: cols[g.g], w: 2.2 });
      g.pts.forEach(function (p, i) { pts.push({ x: line[i][0], y: p[1], color: cols[g.g], label: p[2], ring: m.formula === p[2] }); }); });
    var p1 = A.plotOf('bs-imf-pl1'); if (p1) p1.set({ x: { min: 0, max: 200, label: 'M (g/mol)', tip: function (x) { return f1(x) + ' g/mol'; } }, y: { min: 80, max: 400, label: 'T_b (K)', tip: function (y) { return f1(y) + ' K'; } }, legend: true, series: series, points: pts });
    var ng = ['He', 'Ne', 'Ar', 'Kr', 'Xe'].map(function (s) { return [D.ALPHA[s], D.BP_ATOMS[s]]; }), hl = [['F2', 'F₂'], ['Cl2', 'Cl₂'], ['Br2', 'Br₂'], ['I2', 'I₂']].map(function (s) { return [D.ALPHA[s[0]], D.BP[s[0]], s[1]]; }), pp = [];
    ['He', 'Ne', 'Ar', 'Kr', 'Xe'].forEach(function (s, i) { pp.push({ x: ng[i][0], y: ng[i][1], color: '#2fd0b5', label: s }); }); hl.forEach(function (h) { pp.push({ x: h[0], y: h[1], color: '#ff9f43', label: h[2] }); });
    var p2 = A.plotOf('bs-imf-pl2'); if (p2) p2.set({ x: { min: 0, max: 11, label: 'α′ (Å³)', tip: function (x) { return f1(x) + ' Å³'; } }, y: { min: 0, max: 500, label: 'T_b (K)', tip: function (y) { return f1(y) + ' K'; } }, legend: true,
      series: [{ name: T('imfNoble'), pts: ng, color: '#2fd0b5', w: 2.2 }, { name: T('imfHalogen'), pts: hl.map(function (h) { return [h[0], h[1]]; }), color: '#ff9f43', w: 2.2 }], points: pp });
  }

  function render(p) {
    var m = current(), an = IMF.analyze(m), modes = modesFor(m); if (!modes[IS.mode]) IS.mode = dominant(m, modes);
    var name = IS.tmol ? (A.molName(m) || '') : IS.kind === 'ion' ? A.ionTxt(IS.ion[0], IS.ion[1]) : (A.molName(m) || (IS.kind === 'atom' ? A.nameOf(E.el(IS.id)) : ''));
    p.innerHTML = `<div class="bs-note">${T('imfPick')}</div>
      <div class="bs-cats">${MOLS.map(function (id) { return `<button class="bs-cat${IS.kind === 'mol' && !IS.tmol && IS.id === id ? ' on' : ''}" data-act="imfSel" data-k="mol" data-v="${id}">${E.fromLibrary(id).formula}</button>`; }).join('')}</div>
      <div class="bs-cats">${ATOMS.map(function (s) { return `<button class="bs-cat${IS.kind === 'atom' && !IS.sp && IS.id === s ? ' on' : ''}" data-act="imfSel" data-k="atom" data-v="${s}">${s}</button>`; }).join('')}${IONS.map(function (x) { return `<button class="bs-cat${IS.kind === 'ion' && !IS.sp && IS.ion[0] === x[0] ? ' on' : ''}" data-act="imfSel" data-k="ion" data-v="${x[0]}" data-q="${x[1]}">${A.ionTxt(x[0], x[1])}</button>`; }).join('')}</div>
      ${typedBlock()}
      <div class="bs-mhead"><div class="bs-mf">${IS.sp ? A.ionTxt(IS.sp.sym, IS.sp.q) : m.formula}</div><div><div class="bs-mn">${name || ''}</div><div class="bs-mb">${an.forces.map(function (f) { return `<span class="bs-chip" style="border-color:${COL[f.k]};color:${COL[f.k]}">${T('imfK_' + f.k)}</span>`; }).join('')}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-imf-cv" class="bs-cv"></canvas><div class="bs-tb"><div class="bs-segs">${['london', 'dipole', 'hbond', 'iondipole'].filter(function (k) { return modes[k] !== undefined; }).map(function (k) { return `<button class="bs-seg${IS.mode === k ? ' on' : ''}${modes[k] ? '' : ' off'}" data-act="imfMode" data-v="${k}"${modes[k] ? '' : ' disabled'}>${T('imfM_' + k)}</button>`; }).join('')}</div>
        ${IS.mode === 'hbond' && an.hb === 'both' ? `<label class="bs-n">${T('imfN')}: <b id="bs-imf-nv">${IS.n}</b><input type="range" min="2" max="6" step="1" value="${IS.n}" data-act="imfN"></label>` : ''}
        <div class="bs-acts"><button class="bs-btn" data-act="imfReset">⟲ ${T('resetView')}</button><button class="bs-btn${IS.auto ? ' on' : ''}" data-act="imfAuto">⟳ ${T('autoRot')}</button></div></div><div class="bs-cnt" id="bs-imf-cap"></div></div>
      <div class="bs-info">${A.det(T('imfPresent'), forcesList(m, an) + `<div class="bs-note">${T('imf_rank')}</div>`, true)}${A.det(T('imfEnergy'), energyBars(an.forces.map(function (f) { return f.k; })) + `<div class="bs-note">${T('imf_energyNote')}</div>`, true)}
      ${A.det(T('imfConseq'), consequencesHtml(m, an), false)}${A.det(T('imfBoil'), `<canvas id="bs-imf-pl1" class="bs-plot"></canvas><div class="bs-cap">${T('imf_plHyd')}</div><canvas id="bs-imf-pl2" class="bs-plot"></canvas><div class="bs-cap">${T('imf_plAlpha')}</div>`, false)}</div></div>`;
    scene(m);
    boilingPlots(m);
  }
  function consequencesHtml(m, an) {
    var out = [];
    if (an.bp !== undefined) out.push(T('imf_bp', { bp: f1(an.bp), c: f1(an.bp - 273.15) }) + ' ' + (an.hb === 'both' ? T('imf_bpHb') : an.polar ? T('imf_bpPol') : T('imf_bpLon'))); else out.push(T('imf_noBp'));
    out.push(an.ion ? T('imf_solIon') : (an.polar || an.hb ? T('imf_solPolar') : T('imf_solNon'))); if (an.hb === 'both') out.push(T('imf_water'));
    return `<ul class="bs-ul">${out.map(function (x) { return `<li>${x}</li>`; }).join('')}</ul>`;
  }
  function scene(m) {
    A.destroyViewer('imf'); var c = A.$('#bs-imf-cv'); if (!c) return; var sc = sceneFor(m, IS.mode), cap = A.$('#bs-imf-cap');
    if (!sc) { if (cap) cap.textContent = T('imfNA'); return; }
    var vw = new V3.Viewer(c); A.viewers.imf = vw; vw.autoRotate = IS.auto; vw.setScene(sc); if (cap) cap.textContent = T('imfCap_' + IS.mode + (IS.mode === 'hbond' && IMF.analyze(m).hb === 'acceptor' ? 'Acc' : ''));
  }
  function leave() { A.destroyViewer('imf'); }

  function typedBlock() {                      // ⌨ any atom, ANY ion (no limit on the charge) or molecule — and an honest verdict when the species cannot exist
    var FX = root.BSFormula; if (!FX || !FX.available) return '';
    return FX.typedRow('bs-imf-typed', 'imfType', T, IS.typedTxt, IS.kbOpen) + (IS.typedErr ? `<div class="bs-typed-err">${IS.typedErr}</div>` : '') + (IS.sp ? FX.verdictBox(IS.sp, { T: T, lang: A.getLang(), chip: A.chip }) : '');
  }
  B.onAction('imfTypeToggle', function () { IS.kbOpen = !IS.kbOpen; render(A.$('#bs-p-imf')); });
  B.onAction('imfType', function () {
    var FX = root.BSFormula, inp = A.$('#bs-imf-typed'); if (!FX || !inp) return; IS.typedTxt = inp.value; var r = FX.typedResolve(inp.value);
    if (r.empty) { IS.typedErr = ''; render(A.$('#bs-p-imf')); return; }
    IS.tmol = null; IS.sp = null; IS.typedErr = '';
    if (r.err) IS.typedErr = FX.typedError(r, T);
    else if (r.kind === 'ion') { IS.kind = 'ion'; IS.ion = [r.sym, r.q]; IS.sp = r.sp; IS.mode = null; }
    else if (r.kind === 'atom') { IS.kind = 'atom'; IS.id = r.sym; IS.sp = r.sp; IS.mode = null; }
    else { IS.kind = 'mol'; IS.tmol = r.mol; IS.mode = null; }
    render(A.$('#bs-p-imf'));
  });
  B.onAction('imfSel', function (t) { IS.tmol = null; IS.sp = null; IS.typedErr = ''; var k = t.dataset.k; IS.kind = k; if (k === 'ion') IS.ion = [t.dataset.v, +t.dataset.q]; else IS.id = t.dataset.v; IS.mode = null; render(A.$('#bs-p-imf')); });
  B.onAction('imfMode', function (t) { IS.mode = t.dataset.v; render(A.$('#bs-p-imf')); });
  B.onInput('imfN', function (t) { IS.n = +t.value; var nv = A.$('#bs-imf-nv'); if (nv) nv.textContent = IS.n; var m = current(); A.destroyViewer('imf'); scene(m); });
  B.onAction('imfReset', function () { if (A.viewers.imf) A.viewers.imf.resetView(); });
  B.onAction('imfAuto', function (t) { IS.auto = !IS.auto; t.classList.toggle('on', IS.auto); if (A.viewers.imf) { A.viewers.imf.autoRotate = IS.auto; A.viewers.imf.wake(); } });

  B.registerTab('imf', 'tabImf', { render: render, leave: leave });
})(typeof window !== 'undefined' ? window : globalThis);
