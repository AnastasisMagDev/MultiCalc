/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-ui-orbitals.js        tab “Orbitals & MO” (ES2015)
   Hybridisation (3D lobes + box diagram + worked solution) · Atomic orbitals (s, p, d, spⁿ sets, animated mixing)
   · Molecular orbitals (energy diagram, click a level to see its shape, bond order, magnetism, experimental data)
   ========================================================================== */
(function (root) {
  'use strict';
  var B = root.BSStudio, A = B.api, T = A.T, E = A.E, SC = A.SC, V3 = A.V3, ST = A.ST, OR = root.BSOrbitals, fx = A.fx, f1 = A.f1;
  var OS = { sub: 'hyb', tmol: null, typedTxt: '', typedErr: '', kbOpen: false, mol: 'CH4', atom: null, sigma: true, pi: true, mix: false, ao: '2s', mo: 'O2', lvl: null, level: 'general', auto: false };
  var HYB_MOLS = ['BeCl2', 'BF3', 'CH4', 'NH3', 'H2O', 'C2H4', 'C2H2', 'CO2', 'HCN', 'CH2O', 'SO2', 'C6H6', 'PCl5', 'SF4', 'SF6', 'XeF4'];
  var AO_LIST = ['1s', '2s', 'px', 'py', 'pz', 'dz2', 'dx2y2', 'dxy', 'dxz', 'dyz', 'sp', 'sp2', 'sp3', 'sp3d', 'sp3d2'];
  var AO_LABEL = { '1s': '1s', '2s': '2s', px: '2pₓ', py: '2pᵧ', pz: '2p_z', dz2: '3d_z²', dx2y2: '3d_x²−y²', dxy: '3d_xy', dxz: '3d_xz', dyz: '3d_yz', sp: 'sp', sp2: 'sp²', sp3: 'sp³', sp3d: 'sp³d', sp3d2: 'sp³d²' };
  var AO_QN = { '1s': [1, 0], '2s': [2, 0], px: [2, 1], py: [2, 1], pz: [2, 1], dz2: [3, 2], dx2y2: [3, 2], dxy: [3, 2], dxz: [3, 2], dyz: [3, 2] };
  var MO_ORDER = ['H2', 'H2+', 'He2', 'He2+', 'Li2', 'Be2', 'B2', 'C2', 'N2', 'N2+', 'O2+', 'O2', 'O2-', 'O22-', 'F2', 'Ne2', 'CO', 'CN-', 'NO+', 'NO', 'HF'];
  var cv = null;
  function sup(n) { return String(n).replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(+d); }); }
  function chips(list, cur, act, label, dk) { return `<div class="bs-cats">${list.map(function (x) { return `<button class="bs-cat${cur === x ? ' on' : ''}" data-act="${act}" data-${dk || 'v'}="${x}">${label(x)}</button>`; }).join('')}</div>`; }
  function level() { return `<div class="bs-segs lvl"><button class="bs-seg${OS.level === 'general' ? ' on' : ''}" data-act="orbLvl" data-v="general">${T('lvlGeneral')}</button><button class="bs-seg${OS.level === 'detailed' ? ' on' : ''}" data-act="orbLvl" data-v="detailed">${T('lvlDetailed')}</button></div>`; }
  function steps(list) { return `<ol class="bs-steps">${list.map(function (s, i) { return `<li><div class="bs-step-h"><span class="bs-sn">${i + 1}</span>${s.h}</div><div class="bs-step-b">${s.b}</div></li>`; }).join('')}</ol>`; }
  function viewer(canvasId, scene, play) {
    A.destroyViewer('orb'); var c = A.$('#' + canvasId); if (!c) return null; var vw = new V3.Viewer(c); A.viewers.orb = vw; vw.autoRotate = OS.auto; vw.setScene(scene); if (play) vw.play(); return vw;
  }
  function toolbar(extra) { return `<div class="bs-tb">${extra || ''}<div class="bs-acts"><button class="bs-btn" data-act="orbReset">⟲ ${T('resetView')}</button><button class="bs-btn${OS.auto ? ' on' : ''}" data-act="orbAuto">⟳ ${T('autoRot')}</button></div></div>`; }

  /* ------------------------------------------------------------------ shell */
  function render(p) {
    p.innerHTML = `<div class="bs-segs lvl bs-subtabs">${[['hyb', 'orbSubHyb'], ['ao', 'orbSubAo'], ['mo', 'orbSubMo']].map(function (s) { return `<button class="bs-seg${OS.sub === s[0] ? ' on' : ''}" data-act="orbSub" data-v="${s[0]}">${T(s[1])}</button>`; }).join('')}</div><div id="bs-orb-body"></div>`;
    body();
  }
  function body() { var b = A.$('#bs-orb-body'); if (!b) return; A.destroyViewer('orb'); if (OS.sub === 'hyb') hyb(b); else if (OS.sub === 'ao') ao(b); else mo(b); }
  function leave() { A.destroyViewer('orb'); }

  /* ------------------------------------------------------------------ hybridisation */
  function centres(m) { var out = []; m.atoms.forEach(function (a, i) { if (a.s !== 'H' && (a.X >= 2 || m.bonds.some(function (b) { return (b.a === i || b.b === i) && b.o > 1; }))) out.push(i); }); return out; }
  function cfgText(info) { var g = info.ground, ns = info.n; return ns + 's' + sup(g.s[0]) + ' ' + ns + 'p' + sup(g.p.reduce(function (a, b) { return a + b; }, 0)) + (info.hasD ? ' ' + ns + 'd' + sup(g.d.reduce(function (a, b) { return a + b; }, 0)) : ''); }
  function hybSteps(m, info) {
    var det = OS.level === 'detailed', a = m.atoms[info.atom], v = E.vsepr(a), need = info.X + info.pi + (info.unp ? 1 : 0), st = [];
    st.push({ h: T('orbH1h'), b: T('orbH1', { a: info.sym, x: info.X, e: info.E, sn: info.sn }) + (det ? `<div class="bs-why">${T('orbH1why')}</div>` : '') });
    st.push({ h: T('orbH2h'), b: T('orbH2', { sn: info.sn, t: AO_LABEL[info.type] || info.type, ang: v.angles, shape: T('m_' + v.shape) }) + (det ? `<div class="bs-why">${T('orbH2why')}</div>` : '') });
    st.push({ h: T('orbH3h'), b: T('orbH3', { v: info.V, cfg: cfgText(info) }) + ' ' + (info.promote ? T('orbH3p', { n: info.promote, need: need }) : T('orbH3n')) + (det ? `<div class="bs-why">${T('orbH3why', { need: need })}</div>` : '') });
    st.push({ h: T('orbH4h'), b: T('orbH4', { lp: info.lp + (info.unp ? '+•' : ''), x: info.X, pi: info.pi }) + (det ? `<div class="bs-why">${T('orbH4why', { v: info.V })}</div>` : '') });
    st.push({ h: T('orbH5h'), b: info.pi ? T('orbH5', { pi: info.pi, p: Math.max(info.pLeft, 0) }) + (info.piOver ? ' ' + T('orbPiOver') : '') + (det ? `<div class="bs-why">${T('orbH5why')}</div>` : '') : T('orbH5n') });
    if (info.hyper) st.push({ h: T('orbH6h'), b: T('orbHyper') });
    return st;
  }
  function hyb(b) {
    var m = OS.tmol || E.fromLibrary(OS.mol), cs = centres(m); if (OS.atom === null || cs.indexOf(OS.atom) < 0) OS.atom = cs[0];
    var info = OR.hybridInfo(m, OS.atom), nm = A.molName(m), count = {};
    var atomChips = cs.length > 1 ? chips(cs, OS.atom, 'orbAtom', function (i) { count[m.atoms[i].s] = (count[m.atoms[i].s] || 0) + 1; return m.atoms[i].s + (cs.filter(function (j) { return m.atoms[j].s === m.atoms[i].s; }).length > 1 ? ' #' + (cs.filter(function (j) { return m.atoms[j].s === m.atoms[i].s && j <= i; }).length) : ''); }, 'i') : '';
    b.innerHTML = `${chips(HYB_MOLS, OS.tmol ? null : OS.mol, 'orbMol', function (id) { return E.fromLibrary(id).formula; })}${typedBlock()}
      <div class="bs-mhead"><div class="bs-mf">${m.formula}</div><div><div class="bs-mn">${nm || ''}</div><div class="bs-mb">${A.chip(T('orbType') + ': ' + (AO_LABEL[info.type] || info.type), 'io')}${A.chip(T('shape') + ': ' + T('m_' + E.vsepr(m.atoms[OS.atom]).shape))}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-orb-cv" class="bs-cv"></canvas>${toolbar(`<div class="bs-tgs"><button class="bs-tg${OS.sigma ? ' on' : ''}" data-act="orbTog" data-v="sigma">${T('orbSigma')}</button><button class="bs-tg${OS.pi ? ' on' : ''}" data-act="orbTog" data-v="pi">${T('orbPi')}</button><button class="bs-btn sm${OS.mix ? ' on' : ''}" data-act="orbMix">${OS.mix ? '◀ ' + T('orbBack') : '▶ ' + T('orbMix')}</button></div>`)}<div class="bs-cnt">${T('orbLegend')}</div></div>
      <div class="bs-info">${A.det(T('orbPDiagram'), atomChips + `<div class="bs-note">${T('orbHybInfo', { a: info.sym, x: info.X, e: info.E, sn: info.sn, t: AO_LABEL[info.type] || info.type, pi: info.pi })}</div>` + OR.hybridSVG(info, T) + (info.hyper ? `<div class="bs-note">${T('orbHyper')}</div>` : ''), true)}
      ${A.det(T('orbPType'), `<div class="bs-note">${A.has('orbT_' + info.type) ? T('orbT_' + info.type) : ''}</div>`, true)}
      ${A.det(T('pSteps'), level() + steps(hybSteps(m, info)), false)}</div></div>`;
    var t = OS.mix ? OR.hybridSetScene(info.type in OR.SETS ? info.type : 'sp3', 0) : OR.orbScene(m, { sigma: OS.sigma, pi: OS.pi });
    viewer('bs-orb-cv', t, OS.mix);
  }

  /* ------------------------------------------------------------------ atomic orbitals */
  function ao(b) {
    var name = OS.ao, isH = !!OR.SETS[name], qn = AO_QN[name], kind = isH ? 'h' : name === '1s' || name === '2s' ? 's' : name[0] === 'p' ? 'p' : 'd', text = isH ? 'orbAoH' : name === '1s' || name === '2s' ? 'orbAoS' : name[0] === 'p' ? 'orbAoP' : 'orbAoD';
    b.innerHTML = `${chips(AO_LIST, name, 'aoSel', function (n) { return AO_LABEL[n]; })}
      <div class="bs-mhead"><div class="bs-mf">${AO_LABEL[name]}</div><div><div class="bs-mn">${T(isH ? 'orbHybSet' : 'orbAtomic')}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-orb-cv" class="bs-cv"></canvas>${toolbar(isH ? `<button class="bs-btn sm" data-act="aoMix">▶ ${T('orbMix')}</button>` : '')}<div class="bs-cnt">${T('orbLegend')}</div></div>
      <div class="bs-info">${A.det(T('orbAoProps'), qn ? `<div class="bs-kv"><div><small>n</small><b>${qn[0]}</b></div><div><small>ℓ</small><b>${qn[1]}</b></div><div><small>${T('orbNodesR')}</small><b>${qn[0] - qn[1] - 1}</b></div><div><small>${T('orbNodesA')}</small><b>${qn[1]}</b></div><div><small>${T('orbNodes')}</small><b>${qn[0] - 1}</b></div><div><small>${T('orbMaxE')}</small><b>2</b></div></div><div class="bs-note">${T(text)}</div>` : `<div class="bs-note">${T(text)}</div><div class="bs-kv"><div><small>${T('orbMixes')}</small><b>${'s + ' + OR.MIX[name].map(function (x) { return AO_LABEL[x]; }).join(' + ')}</b></div><div><small>${T('orbN')}</small><b>${OR.SETS[name]}</b></div><div><small>${T('angIdeal')}</small><b>${{ sp: '180°', sp2: '120°', sp3: '109,5°', sp3d: '90°, 120°, 180°', sp3d2: '90°, 180°' }[name]}</b></div></div>`, true)}
      ${A.det(T('orbAoShapeH'), `<div class="bs-note">${T('orbAoShape_' + kind)}</div>`, true)}
      ${A.det(T('orbAoEnH'), `<div class="bs-note">${T('orbAoEn')}</div>`, false)}
      ${A.det(T('orbAoChemH'), `<div class="bs-note">${T('orbAoChem_' + kind)}</div>`, false)}
      ${qn ? A.det(T('orbAoStepsH'), `<div class="bs-steps">${[T('orbAoSt1', { n: qn[0] }), T('orbAoSt2', { l: qn[1], t: ['s', 'p', 'd', 'f'][qn[1]], a: qn[1] }), T('orbAoSt3', { r: qn[0] - qn[1] - 1 }), T('orbAoSt4')].map(function (x, i) { return `<div class="bs-step"><div class="bs-step-h"><span class="bs-sn">${i + 1}</span><span>${x}</span></div></div>`; }).join('')}</div>`, false) : ''}
      ${A.det(T('orbPhaseH'), `<div class="bs-note">${T('orbPhaseT')}</div>`, false)}</div></div>`;
    viewer('bs-orb-cv', isH ? OR.hybridSetScene(name, 1) : OR.aoScene(name), false);
  }

  /* ------------------------------------------------------------------ molecular orbitals */
  function moStats(m) {
    var lvl = m.levels, kind = m.special ? 'special' : m.set;
    return `<div class="bs-kv"><div><small>${T('moVal')}</small><b>${m.n}</b></div><div><small>${T('moBO')}</small><b>${f1(m.BO)}</b></div><div><small>${T('moUnp')}</small><b>${m.unpaired}</b></div><div><small>${T('moMag')}</small><b>${m.para ? T('moPara') : T('moDia')}</b></div>` +
      `<div><small>${T('moExpLen')} pm</small><b>${m.exp ? f1(m.exp[0]) : '—'}</b></div><div><small>${T('moExpE')} kJ/mol</small><b>${m.exp && m.exp[1] ? Math.round(m.exp[1]) : '—'}</b></div></div>`;
  }
  function moSteps(m) {
    var det = OS.level === 'detailed', st = [], A1 = m.A, B1 = m.B, set = m.set;
    st.push({ h: T('moS1h'), b: T('moS1', { a: A1, b: B1, va: E.valence(E.el(A1)), vb: E.valence(E.el(B1)), q: m.q > 0 ? '−' + m.q : m.q < 0 ? '+' + (-m.q) : '0', n: m.n }) + (det ? `<div class="bs-why">${T('moS1why')}</div>` : '') });
    st.push({ h: T('moS2h'), b: set === 'H' ? T('moS2H') : m.special ? T('moS2HF') : set === 'L' ? T('moS2L') : T('moS2Hv') + (det ? `<div class="bs-why">${T('moS2why')}</div>` : '') });
    st.push({ h: T('moS3h'), b: T('moS3') + ': ' + m.levels.filter(function (l) { return l.e > 0; }).map(function (l) { return `<span class="bs-mono">${l.lab}${sup(l.e)}</span>`; }).join(' ') + (det ? `<div class="bs-why">${T('moS3why')}</div>` : '') });
    st.push({ h: T('moS4h'), b: T('moS4', { nb: m.nb, na: m.na, bo: f1(m.BO) }) + (det ? `<div class="bs-why">${T('moS4why')}</div>` : '') });
    st.push({ h: T('moS5h'), b: m.para ? T('moS5p', { n: m.unpaired }) : T('moS5d') });
    st.push({ h: T('moS6h'), b: (m.BO > 0 ? T('moS6stable') : T('moS6none')) + (m.exp ? ' ' + T('moS6exp', { l: f1(m.exp[0]), e: m.exp[1] ? Math.round(m.exp[1]) : '—' }) : '') });
    return st;
  }
  function mo(b) {
    var m = OR.moBuild(OS.mo); if (!OS.lvl || !m.levels.some(function (l) { return l.id === OS.lvl; })) OS.lvl = m.homo || m.levels[0].id;
    var note = A.has('moN_' + m.id) ? `<div class="bs-note"><b>${m.f}:</b> ${T('moN_' + m.id)}</div>` : '';
    b.innerHTML = `${chips(MO_ORDER, OS.mo, 'moSel', function (id) { return OR.SPECIES.filter(function (s) { return s.id === id; })[0].f; })}
      <div class="bs-mhead"><div class="bs-mf">${m.f}</div><div><div class="bs-mn">${T('moBO')}: ${f1(m.BO)}</div><div class="bs-mb">${A.chip(m.para ? T('moPara') : T('moDia'), m.para ? 'po' : 'np')}${m.hypo ? A.chip(T('moHypo'), 'pr') : ''}${m.BO <= 0 ? A.chip(T('moNoBond'), 'pr') : ''}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-orb-cv" class="bs-cv"></canvas>${toolbar(`<div class="bs-cap" id="bs-mo-name">${T('moShowing', { l: (m.levels.filter(function (l) { return l.id === OS.lvl; })[0] || {}).lab || '' })}</div>`)}<div class="bs-cnt">${T('orbLegend')}</div></div>
      <div class="bs-info">${moStats(m)}${note}${A.det(T('moDiagram'), `<div id="bs-mosvg">${OR.moSVG(m, T, OS.lvl)}</div><div class="bs-cap">${T('moClick')}</div>`, true)}
      ${A.det(T('pSteps'), level() + steps(moSteps(m)), false)}${A.det(T('moTrends'), `<canvas id="bs-mo-pl1" class="bs-plot"></canvas><div class="bs-cap">${T('moPl1')}</div><canvas id="bs-mo-pl2" class="bs-plot"></canvas><div class="bs-cap">${T('moPl2')}</div>`, false)}</div></div>`;
    viewer('bs-orb-cv', OR.moScene(m, OS.lvl), false); trendPlots(m);
  }
  function trendPlots(m) {
    if (!(root.BSPlot || root.PHLabPlot)) return; var pts1 = [], pts2 = [];
    OR.SPECIES.forEach(function (s) { var d = OR.moBuild(s.id); if (!d.exp || d.BO <= 0) return; var cur = s.id === m.id; if (d.exp[1]) pts1.push({ x: d.BO, y: d.exp[1], color: cur ? '#ff6b6b' : '#4da3ff', label: s.f, ring: cur }); pts2.push({ x: d.BO, y: d.exp[0], color: cur ? '#ff6b6b' : '#4da3ff', label: s.f, ring: cur }); });
    var p1 = A.plotOf('bs-mo-pl1'), p2 = A.plotOf('bs-mo-pl2');
    if (p1) p1.set({ x: { min: 0.25, max: 3.25, label: T('moBO'), tip: function (x) { return fx(x, 1); } }, y: { min: 0, max: 1200, label: 'D (kJ/mol)', tip: function (y) { return Math.round(y) + ' kJ/mol'; } }, series: [], points: pts1 });
    if (p2) p2.set({ x: { min: 0.25, max: 3.25, label: T('moBO'), tip: function (x) { return fx(x, 1); } }, y: { min: 70, max: 280, label: 'r (pm)', tip: function (y) { return Math.round(y) + ' pm'; } }, series: [], points: pts2 });
  }

  /* ------------------------------------------------------------------ events */
  B.onAction('orbSub', function (t) { OS.sub = t.dataset.v; OS.mix = false; render(A.$('#bs-p-orb')); });
  B.onAction('orbMol', function (t) { OS.mol = t.dataset.v; OS.tmol = null; OS.typedErr = ''; OS.atom = null; OS.mix = false; body(); });
  function typedBlock() {                       // ⌨ any molecule or polyatomic ion (formula typed by the student) — structure comes from the Formula Lab reader
    var FX = root.BSFormula; if (!FX || !FX.available) return '';
    return FX.typedRow('bs-orb-typed', 'orbType', T, OS.typedTxt, OS.kbOpen) + (OS.typedErr ? `<div class="bs-typed-err">${OS.typedErr}</div>` : '') + (OS.tmol ? `<div class="bs-typed-ok">${OS.tmol.formula}</div>` : '');
  }
  B.onAction('orbTypeToggle', function () { OS.kbOpen = !OS.kbOpen; body(); });
  B.onAction('orbType', function () {
    var FX = root.BSFormula, inp = A.$('#bs-orb-typed'); if (!FX || !inp) return; OS.typedTxt = inp.value; var r = FX.typedResolve(inp.value);
    if (r.empty) { OS.typedErr = ''; body(); return; }
    if (r.err) OS.typedErr = FX.typedError(r, T); else if (r.kind !== 'mol' || r.mol.atoms.length < 2) OS.typedErr = `<div class="bs-hint bs-f-err">${T('f_t_needmol')}</div>`;
    else { OS.typedErr = ''; OS.tmol = r.mol; OS.atom = null; OS.mix = false; }
    body();
  });
  B.onAction('orbAtom', function (t) { OS.atom = +t.dataset.i; OS.mix = false; body(); });
  B.onAction('orbTog', function (t) { OS[t.dataset.v] = !OS[t.dataset.v]; OS.mix = false; body(); });
  B.onAction('orbMix', function () { OS.mix = !OS.mix; body(); });
  B.onAction('aoSel', function (t) { OS.ao = t.dataset.v; body(); });
  B.onAction('aoMix', function () { var vw = A.viewers.orb; if (!vw) return; vw.setScene(OR.hybridSetScene(OS.ao, 0)); vw.play(); });
  B.onAction('moSel', function (t) { OS.mo = t.dataset.v; OS.lvl = null; body(); });
  B.onAction('mo', function (t) {
    OS.lvl = t.dataset.mo; var m = OR.moBuild(OS.mo), svg = A.$('#bs-mosvg'); if (svg) svg.innerHTML = OR.moSVG(m, T, OS.lvl);
    var vw = A.viewers.orb; if (vw) vw.setScene(OR.moScene(m, OS.lvl)); var nm = A.$('#bs-mo-name'); if (nm) nm.textContent = T('moShowing', { l: (m.levels.filter(function (l) { return l.id === OS.lvl; })[0] || {}).lab || '' });
  });
  B.onAction('orbLvl', function (t) { OS.level = t.dataset.v; var open = A.$$('.bs-det', A.$('#bs-orb-body')).map(function (d) { return d.open; }); body(); A.$$('.bs-det', A.$('#bs-orb-body')).forEach(function (d, i) { d.open = open[i] || !!d.querySelector('.bs-steps'); }); });
  B.onAction('orbReset', function () { if (A.viewers.orb) A.viewers.orb.resetView(); });
  B.onAction('orbAuto', function (t) { OS.auto = !OS.auto; t.classList.toggle('on', OS.auto); if (A.viewers.orb) { A.viewers.orb.autoRotate = OS.auto; A.viewers.orb.wake(); } });

  /* self-checks contributed to the module's test panel */
  B.addChecks(function orbitalChecks(chk, near) {
    var ref = { H2: [1, 0], 'H2+': [0.5, 1], He2: [0, 0], 'He2+': [0.5, 1], Li2: [1, 0], Be2: [0, 0], B2: [1, 2], C2: [2, 0], N2: [3, 0], 'N2+': [2.5, 1], O2: [2, 2], 'O2+': [2.5, 1], 'O2-': [1.5, 1], 'O22-': [1, 0], F2: [1, 0], Ne2: [0, 0], CO: [3, 0], NO: [2.5, 1], 'NO+': [3, 0], 'CN-': [3, 0], HF: [1, 0] };
    Object.keys(ref).forEach(function (id) { var m = OR.moBuild(id); chk('MO', id + ' bond order ' + m.BO + ' vs ' + ref[id][0], m.BO === ref[id][0]); chk('MO', id + ' unpaired ' + m.unpaired + ' vs ' + ref[id][1], m.unpaired === ref[id][1]); });
    [['CH4', 'C', 'sp3', 1], ['BF3', 'B', 'sp2', 1], ['BeCl2', 'Be', 'sp', 1], ['NH3', 'N', 'sp3', 0], ['H2O', 'O', 'sp3', 0], ['SF6', 'S', 'sp3d2', 2], ['PCl5', 'P', 'sp3d', 1], ['XeF4', 'Xe', 'sp3d2', 2], ['CO2', 'C', 'sp', 1], ['C2H4', 'C', 'sp2', 1]].forEach(function (r) {
      var m = E.fromLibrary(r[0]), ci = -1, bx = -1; m.atoms.forEach(function (a, i) { if (a.s === r[1] && a.X > bx) { bx = a.X; ci = i; } }); var h = OR.hybridInfo(m, ci); chk('HYBRID', r[0] + ' ' + r[1] + ' = ' + r[2] + ', ' + r[3] + ' promotion(s)', h.type === r[2] && h.promote === r[3] && h.check);
    });
    var bhs = root.BSThermo; if (bhs) { var u = bhs.bornHaber(E.ionicCompound('Na', 1, 'Cl', -1)), mg = bhs.bornHaber(E.ionicCompound('Mg', 2, 'O', -2)); near('BORN-HABER', 'U(NaCl) from the cycle', u.U, -787, 6); near('BORN-HABER', 'U(MgO) from the cycle', mg.U, -3795, 25); chk('BORN-HABER', 'cycle closes for NaCl', Math.abs(u.closure) < 1e-6); }
    var im = root.BSIMF; if (im) { chk('FORCES', 'water: H-bond + dipole + London', im.analyze(E.fromLibrary('H2O')).forces.length === 3); chk('FORCES', 'CH4: London only', im.analyze(E.fromLibrary('CH4')).forces.length === 1); chk('FORCES', 'HCl: dipole + London, no H-bond', im.analyze(E.fromLibrary('HCl')).forces.map(function (f) { return f.k; }).sort().join() === 'dipole,london'); }
  });

  B.registerTab('orb', 'tabOrb', { render: render, leave: leave });
})(typeof window !== 'undefined' ? window : globalThis);
