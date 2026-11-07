/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-ui.js   (ES2015: template strings)
   Three tabs:  Elements → Compounds (periodic-table picker) · Molecule studio (3D, Lewis, VSEPR, polarity, steps) · Bond lab
   Reuses from the other modules: MC_ELEMENTS (elements.js — every property) and PHLabPlot (ph-lab/ph-plot.js — the scientific plot).
   Language: BSStudio.setLang('el'|'en'|'es'); on start it looks for the app language (see detectLang) and falls back to Greek.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, SC = root.BSScenes, ST = root.BSSteps, X = root.BSText, EL = root.MC_ELEMENTS || [], U = E.util, V3 = root.BS3D, doc = root.document;
  var lang = 'el', R = null, reg = [], viewers = { mol: null, pair: null }, plots = {}, checks = null;
  var TABS = [['build', 'tabBuild'], ['mol', 'tabMol'], ['bond', 'tabBond']], EXT = {}, ACTIONS = {}, INPUTS = {}, CHECKS = [];
  var S = { tab: 'build', sel: [], mol: null, ic: null, salt: null, style: 'ball', lp: true, dip: true, chg: false, lab: true, level: 'general', pair: ['Na', 'Cl'], N: 3, q: '', cat: 'all', auto: false, sp: null, fml: null };

  function T(k, p) { var s = (X[lang] && X[lang][k]); if (s === undefined) s = X.en[k]; if (s === undefined) s = k; return p ? s.replace(/\{(\w+)\}/g, function (m, n) { return p[n] !== undefined ? p[n] : m; }) : s; }
  Object.defineProperty(T, 'lang', { get: function () { return lang; } });
  function f1(x) { return ST.f1(x); } function fx(x, d) { return ST.fx(x, d); }
  function nameOf(e) { return e[lang] || e.en; }
  function molName(m) { return m.names ? (m.names[lang] || m.names.en) : null; }
  function $(s, r) { return (r || R).querySelector(s); } function $$(s, r) { return Array.prototype.slice.call((r || R).querySelectorAll(s)); }
  function inApp() { return !!(root.MultiCalc && root.MultiCalc.modules && root.MultiCalc.modules.loaded); }
  function appLang() { try { var m = root.MultiCalc && root.MultiCalc.state && root.MultiCalc.state.currentLang; return m === 'el' || m === 'en' || m === 'es' ? m : null; } catch (e) { return null; } }
  function detectLang() {
    var al = appLang(); if (al) return al;
    var c = [root.MC_LANG, root.currentLang, root.curLang, root.LANG, root.lang]; try { ['mc_lang', 'mc-lang', 'mcLang', 'lang', 'multicalc-lang', 'language'].forEach(function (k) { c.push(root.localStorage.getItem(k)); }); } catch (e) { }
    c.push(doc.documentElement.lang);
    for (var i = 0; i < c.length; i++) { var v = typeof c[i] === 'string' ? c[i].slice(0, 2).toLowerCase() : ''; if (v === 'el' || v === 'gr') return 'el'; if (v === 'en' || v === 'es') return v; }
    return 'el';
  }
  var BADGE = { ionic: 'bs-b-ion', polar: 'bs-b-pol', nonpolar: 'bs-b-non', metallic: 'bs-b-met', unknown: 'bs-b-non' };
  function badge(type) { return `<span class="bs-badge ${BADGE[type] || ''}">${T('t_' + type)}</span>`; }
  function chip(txt, cls) { return `<span class="bs-chip ${cls || ''}">${txt}</span>`; }
  function shapeOf(m) { var c = ST.centreAtoms(m)[0]; return c ? T('m_' + E.vsepr(c).shape) : (m.atoms.length === 2 ? T('m_linear') : '—'); }
  function ionTxt(sym, q) { return sym + E.supCharge(q).replace(/^[¹]/, ''); }
  function nobleFor(z) { return { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn' }[z] || null; }

  /* ================================================================= skeleton */
  function mount(el) {
    R = typeof el === 'string' ? doc.getElementById(el) : el; if (!R) return; lang = detectLang(); R.classList.add('bs-root');
    R.innerHTML = `
      <header class="bs-head"><div class="bs-title"><h1 id="bs-h1"></h1><p id="bs-sub"></p></div><div class="bs-lang" id="bs-lang"></div></header>
      <nav class="bs-tabs" id="bs-tabs" role="tablist"></nav>
      ${TABS.map(function (t) { return `<section class="bs-panel" id="bs-p-${t[0]}"></section>`; }).join('')}
      <footer class="bs-foot" id="bs-foot"></footer>`;
    R.addEventListener('click', onClick); R.addEventListener('input', onInput); R.addEventListener('change', onInput); R.addEventListener('keydown', onKey);
    buildPT(); render(); setTimeout(function () { runChecks(); renderFoot(); }, 60);
  }
  function setLang(l) { lang = l; if (R) render(); }
  function syncLang() { var l = appLang(); if (l && l !== lang) setLang(l); }
  function render() {
    $('#bs-h1').textContent = T('title'); $('#bs-sub').textContent = T('subtitle');
    $('#bs-lang').innerHTML = inApp() ? '' : ['el', 'en', 'es'].map(function (l) { return `<button class="bs-lg${l === lang ? ' on' : ''}" data-act="lang" data-v="${l}">${l.toUpperCase()}</button>`; }).join('');
    $('#bs-tabs').innerHTML = TABS.map(function (t) { return `<button role="tab" class="bs-tab${S.tab === t[0] ? ' on' : ''}" data-act="tab" data-v="${t[0]}">${T(t[1])}</button>`; }).join('');
    var ld = $('#bs-lead'); if (!ld) { ld = root.document.createElement('p'); ld.id = 'bs-lead'; ld.className = 'bs-lead'; $('#bs-tabs').parentNode.insertBefore(ld, $('#bs-tabs').nextSibling); } ld.textContent = X[lang]['lead_' + S.tab] || X.en['lead_' + S.tab] || '';
    TABS.forEach(function (t) { $('#bs-p-' + t[0]).style.display = S.tab === t[0] ? '' : 'none'; });
    Object.keys(EXT).forEach(function (k) { if (k !== S.tab && EXT[k].leave) EXT[k].leave(); });
    if (S.tab === 'build') renderBuild(); else if (S.tab === 'mol') renderStudio(); else if (S.tab === 'bond') renderBond(); else if (EXT[S.tab]) EXT[S.tab].render($('#bs-p-' + S.tab));
    if (S.tab !== 'mol') destroyViewer('mol'); if (S.tab !== 'bond') destroyViewer('pair');
    renderFoot();
  }
  function debugOn() { try { return /[?&#]bsdebug/.test(root.location.href) || root.localStorage.getItem('bs_debug') === '1'; } catch (e) { return false; } }
  function renderFoot() { var f = $('#bs-foot'); if (!f) return; f.innerHTML = checks && debugOn() ? `<button class="bs-chk ${checks.failed.length ? 'bad' : 'ok'}" data-act="checks">${checks.failed.length ? '⚠' : '✓'} ${T('checksLabel', { ok: checks.ok, n: checks.total })}</button><div id="bs-chk-detail"></div>` : ''; }

  /* ================================================================= TAB 1 — elements → compounds */
  function lumOf(h) { h = String(h || '888888'); return (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255; }
  function buildPT() {
    $('#bs-p-build').innerHTML = `<div class="bs-hint" id="bs-pthint"></div><div class="bs-ptwrap"><div class="bs-pt bs-pt2" id="bs-pt"></div></div><div id="bs-sel"></div><div id="bs-res"></div>`;
    fillPT();
  }
  var ptLang = null;
  function fillPT() {                                                       // the table is rebuilt only when the language changes (names and decimal marks)
    var dc = lang === 'en' ? '.' : ',', metals = 0, mtl = 0, cells = '';
    EL.forEach(function (e) { if (E.isMetal(e)) metals++; else if (e.c === 'metalloid') mtl++; });
    var g, p;
    cells += '<div class="bs-pt-blk" style="grid-column:2/4;grid-row:1;--b:#ff6b6b"><span>s</span></div><div class="bs-pt-blk" style="grid-column:4/14;grid-row:1;--b:#5aa9ff"><span>d</span></div><div class="bs-pt-blk" style="grid-column:14/20;grid-row:1;--b:#ffd666"><span>p</span></div>';
    for (g = 1; g <= 18; g++) cells += `<div class="bs-pt-g" style="grid-column:${g + 1};grid-row:2">${g}</div>`;
    for (p = 1; p <= 7; p++) cells += `<div class="bs-pt-p" style="grid-column:1;grid-row:${p + 2}">${p}</div>`;
    cells += '<div class="bs-pt-p f" style="grid-column:1;grid-row:11">f</div><div class="bs-pt-p f" style="grid-column:1;grid-row:12">f</div>';
    cells += '<div class="bs-pt-ph" style="grid-column:4;grid-row:8"><b>57–71</b></div><div class="bs-pt-ph" style="grid-column:4;grid-row:9"><b>89–103</b></div>';
    cells += `<div class="bs-pt-info" style="grid-column:4/14;grid-row:3/6"><div class="bs-pt-big">${EL.length}</div><div class="bs-pt-t">${T('ptCardHint')}</div><div class="bs-pt-ch"><span>${metals} ${T('ptMetals')}</span><span>${mtl} ${T('ptMetalloids')}</span><span>${EL.length - metals - mtl} ${T('ptNonmetals')}</span></div></div>`;
    cells += EL.map(function (e) {
      var k = (e.k || '8899aa').replace('#', ''), light = lumOf(k) > 0.6, m = e.m === undefined || e.m === null ? '' : (e.m < 10 ? e.m.toFixed(2) : e.m < 100 ? e.m.toFixed(2) : e.m.toFixed(e.m % 1 ? 2 : 0)).replace('.', dc);
      return `<button class="bs-t" data-act="pt" data-s="${e.s}" data-cat="${e.c}" style="grid-column:${e.x + 1};grid-row:${e.y + 2};--k:#${k};--fg:${light ? '#0b1322' : '#ffffff'}" title="${nameOf(e)}"><i class="n">${e.n}</i><b>${e.s}</b><span class="nm">${nameOf(e)}</span><span class="ms">${m}</span></button>`;
    }).join('');
    $('#bs-pt').innerHTML = cells; ptLang = lang;
  }
  function selectEl(s) { var i = S.sel.indexOf(s); if (i >= 0) S.sel.splice(i, 1); else { S.sel.push(s); if (S.sel.length > 3) S.sel.shift(); } renderBuild(); }
  function profileCard(e) {
    var v = E.valence(e), ions = E.isMetal(e) ? E.cationCharges(e).map(function (q) { return ionTxt(e.s, q); }) : (E.anionCharge(e) ? [ionTxt(e.s, E.anionCharge(e))] : []);
    return `<div class="bs-prof"><div class="bs-prof-h"><span class="bs-sym" style="background:#${e.k || '8899aa'}">${e.s}</span><div><b>${nameOf(e)}</b><small>Z = ${e.n} · ${T('cat_' + e.c)}</small></div></div>
      <div class="bs-kv"><div><small>${T('valence')}</small><b>${v}</b></div><div><small>χ (Pauling)</small><b>${E.en(e) === null ? '—' : fx(E.en(e))}</b></div><div><small>IE₁ kJ/mol</small><b>${e.ie ? f1(e.ie) : '—'}</b></div><div><small>EA kJ/mol</small><b>${e.ea === null || e.ea === undefined ? '—' : f1(e.ea)}</b></div><div><small>r<sub>cov</sub> pm</small><b>${Math.round(E.covR(e) * 100)}</b></div><div><small>${T('ions')}</small><b>${ions.join(' ') || '—'}</b></div></div></div>`;
  }
  function compCard(x, kind) {
    var i = reg.push({ x: x, kind: kind }) - 1;
    if (kind === 'mol') { var m = x.mol, nm = molName(m); return `<button class="bs-card" data-act="open" data-i="${i}"><div class="bs-card-f">${m.formula}</div><div class="bs-card-n">${nm || T('noName')}</div><div class="bs-card-m">${x.known ? chip(T('known'), 'ok') : chip(T('predicted'), 'pr')}${m.charged ? chip(T('ion'), 'io') : ''}${chip(shapeOf(m))}${m.charged ? '' : chip(m.polar ? T('polar') : T('nonpolar'), m.polar ? 'po' : 'np')}</div></button>`; }
    if (kind === 'ionic') { var n2 = x.names && x.names[lang]; return `<button class="bs-card" data-act="open" data-i="${i}"><div class="bs-card-f">${x.formula}</div><div class="bs-card-n">${n2 || T('noName')}</div><div class="bs-card-m">${chip(ionTxt(x.cat.s, x.cat.q) + ' · ' + ionTxt(x.an.s, x.an.q), 'io')}${chip(T('st_short_' + x.structure))}${chip('U ≈ ' + Math.round(x.kapustinskii) + ' kJ/mol')}</div></button>`; }
    var n3 = x.names && x.names[lang]; return `<button class="bs-card" data-act="open" data-i="${i}"><div class="bs-card-f">${x.formula}</div><div class="bs-card-n">${n3 || T('noName')}</div><div class="bs-card-m">${chip(T('ionic'), 'io')}${chip(T('polyIon'))}</div></button>`;
  }
  function renderBuild() {
    reg = []; if (ptLang !== lang) fillPT(); $('#bs-pthint').textContent = T('ptHint');
    $$('.bs-t').forEach(function (b) { b.classList.toggle('on', S.sel.indexOf(b.dataset.s) >= 0); });
    var sel = S.sel, selEl = $('#bs-sel'), res = $('#bs-res');
    selEl.innerHTML = sel.length ? `<div class="bs-selrow">${sel.map(function (s) { var e = E.el(s); return `<span class="bs-selchip"><span class="bs-dot" style="background:#${e.k || '8899aa'}"></span>${s} · ${nameOf(e)}</span>`; }).join('')}<button class="bs-btn sm" data-act="clear">${T('clear')}</button></div>` : '';
    if (!sel.length) { res.innerHTML = `<div class="bs-empty">${T('pickNone')}</div>`; return; }
    var out = '';
    sel.forEach(function (s) { if (sel.length === 1) out += profileCard(E.el(s)); });
    if (sel.length === 2) {
      var cls = E.classify(sel[0], sel[1]);
      out += `<div class="bs-pair"><div class="bs-pair-h"><b>${sel[0]} – ${sel[1]}</b>${badge(cls.type)}${cls.borderline ? chip(T('borderline'), 'pr') : ''}</div><div class="bs-kv">${cls.known ? `<div><small>Δχ</small><b>${fx(cls.dChi)}</b></div><div><small>${T('ionicPct')}</small><b>${fx(cls.hs * 100, 0)}%</b></div><div><small>χ<sub>${sel[0]}</sub> / χ<sub>${sel[1]}</sub></small><b>${fx(cls.chiA, 2)} / ${fx(cls.chiB, 2)}</b></div>` : `<div><small>χ</small><b>—</b></div>`}</div><button class="bs-btn" data-act="pairlab" data-a="${sel[0]}" data-b="${sel[1]}">${T('openLab')}</button></div>`;
    }
    var r = E.compoundsFor(sel), ions = r.molecular.filter(function (x) { return x.mol.charged; }), mols = r.molecular.filter(function (x) { return !x.mol.charged; });
    if (r.metallic) out += `<h3 class="bs-h3">${T('resMetallic')}</h3><div class="bs-note">${T('metallicNote')} <button class="bs-btn sm" data-act="pairlab" data-a="${sel[0]}" data-b="${sel[sel.length > 1 ? 1 : 0]}">${T('openLab')}</button></div>`;
    if (r.ionic.length) out += `<h3 class="bs-h3">${T('resIonic')}</h3><div class="bs-cards">${r.ionic.map(function (x) { return compCard(x, 'ionic'); }).join('')}</div>`;
    if (r.poly.length) out += `<h3 class="bs-h3">${T('resPoly')}</h3><div class="bs-cards">${r.poly.map(function (x) { return compCard(x, 'poly'); }).join('')}</div>`;
    if (mols.length) out += `<h3 class="bs-h3">${T('resMolecular')}</h3><div class="bs-cards">${mols.map(function (x) { return compCard(x, 'mol'); }).join('')}</div>`;
    if (ions.length) out += `<h3 class="bs-h3">${T('resIons')}</h3><div class="bs-cards">${ions.map(function (x) { return compCard(x, 'mol'); }).join('')}</div>`;
    if (!r.ionic.length && !r.poly.length && !mols.length && !r.metallic) out += `<div class="bs-empty">${T('resNone')}</div>`;
    res.innerHTML = out;
  }

  /* ================================================================= TAB 2 — molecule studio */
  var CATS = ['all', 'diatomic', 'hydride', 'oxide', 'halide', 'organic', 'acid', 'ion'];
  function ensureStudioShell() {
    var p = $('#bs-p-mol'); if (p.dataset.ready) return; p.dataset.ready = 1;
    p.innerHTML = `<div class="bs-search"><input id="bs-q" type="search" autocomplete="off" spellcheck="false"><div class="bs-cats" id="bs-cats"></div></div><div class="bs-list" id="bs-list"></div><div id="bs-fmsg"></div><div id="bs-view"></div>`;
  }
  function renderStudio() {
    ensureStudioShell(); $('#bs-q').placeholder = T('searchPh'); if ($('#bs-q').value !== S.q) $('#bs-q').value = S.q;
    $('#bs-cats').innerHTML = CATS.map(function (c) { return `<button class="bs-cat${S.cat === c ? ' on' : ''}" data-act="cat" data-v="${c}">${T('cat_' + c)}</button>`; }).join('') + (root.BSFormula && root.BSFormula.available ? `<button class="bs-cat bs-kb" data-act="kbFocus">⌨ ${T('f_t_lbl')}</button>` : '');
    renderList(); if (!S.mol && !S.ic && !S.sp) S.mol = E.fromLibrary('H2O'); renderView();
  }
  function renderList() {
    var lst = E.search(S.q).filter(function (r) { return S.cat === 'all' || r.cat === S.cat; });
    var FX = root.BSFormula, fc = FX && S.q ? FX.list(S.q, fctx(), lst) : { html: '', msg: '' };       // typed formulas (bs-formula.js): cards in the list, explanations under it
    var libHtml = lst.length ? lst.map(function (r) { var cur = S.mol && S.mol.id === r.id; return `<button class="bs-li${cur ? ' on' : ''}" data-act="lib" data-id="${r.id}" data-c="${r.cat}"><b>${r.f}</b><small>${r.n[lang] || r.n.en}</small></button>`; }).join('') : (fc.html || fc.msg ? '' : `<div class="bs-empty">${T('noResults')}${S.q && FX ? ' ' + T('f_hint') : ''}</div>`);
    $('#bs-list').innerHTML = fc.html + libHtml; $('#bs-fmsg').innerHTML = fc.msg;
  }
  function fctx() { return { T: T, lang: lang, chip: chip, det: det, f1: f1, fx: fx, nameOf: nameOf }; }
  function fmlBanner() { var FX = root.BSFormula; return FX && S.fml ? FX.banner(S.fml, fctx()) : ''; }
  function saltBlock() {
    if (!S.salt) return ''; var FX = root.BSFormula, typed = !!S.salt.parts && FX;
    return `<div class="bs-saltcard"><b>${S.salt.formula}</b> — ${(S.salt.names && S.salt.names[lang]) || T('noName')}<div class="bs-why">${ST.ionicInsights(S.salt, T).slice(0, 1).join('')}${typed ? '' : ' ' + T('saltNote')}</div>${typed ? FX.saltChips(S.salt, S, fctx()) : ''}</div>`;
  }
  function applyTarget(t) { S.mol = t.mol || null; S.ic = t.ic || null; S.salt = t.salt || null; S.sp = t.sp || null; S.fml = t.fml || null; }
  function renderSpecies(v) { v.innerHTML = fmlBanner() + saltBlock() + root.BSFormula.speciesHTML(S.sp, fctx()); }
  function onKey(ev) {                                                                   // Enter in the search box: open the first result
    if (ev.key === 'Enter' && ev.target && ev.target.dataset && ev.target.dataset.enter && ACTIONS[ev.target.dataset.enter]) { ACTIONS[ev.target.dataset.enter](ev.target); return; }
    if (ev.key !== 'Enter' || !ev.target || ev.target.id !== 'bs-q') return;
    var FX = root.BSFormula, t = FX && FX.available && S.q ? FX.open(0) : null;
    if (t) { applyTarget(t); renderView(); return; }
    var lst = E.search(S.q).filter(function (r) { return S.cat === 'all' || r.cat === S.cat; });
    if (lst.length) { S.mol = E.fromLibrary(lst[0].id); S.ic = null; S.salt = null; S.sp = null; S.fml = null; renderView(); }
  }
  function destroyViewer(k) { if (viewers[k]) { viewers[k].destroy(); viewers[k] = null; } }
  function scenOpts() { return { style: S.style, lp: S.lp, dip: S.dip, chg: S.chg, lab: S.lab }; }
  function toolbar(isIon) {
    var styles = [['ball', 'sBall'], ['stick', 'sStick'], ['space', 'sSpace']].map(function (s) { return `<button class="bs-seg${S.style === s[0] ? ' on' : ''}" data-act="style" data-v="${s[0]}">${T(s[1])}</button>`; }).join('');
    var tog = isIon ? '' : [['lp', 'tLp'], ['dip', 'tDip'], ['chg', 'tChg'], ['lab', 'tLab']].map(function (t) { return `<button class="bs-tg${S[t[0]] ? ' on' : ''}" data-act="tog" data-v="${t[0]}">${T(t[1])}</button>`; }).join('');
    var N = isIon && S.ic.structure !== 'cluster' ? `<label class="bs-n">${T('cells')}: <b id="bs-nv">${S.N}</b><input type="range" min="1" max="4" step="1" value="${S.N}" data-act="N"></label>` : '';
    return `<div class="bs-tb"><div class="bs-tbg"><small>${T('tbModel')}</small><div class="bs-segs">${styles}</div></div>${tog ? `<div class="bs-tbg"><small>${T('tbShow')}</small><div class="bs-tgs">${tog}</div></div>` : ''}${N}<div class="bs-tbg"><small>${T('tbMove')}</small><div class="bs-acts"><button class="bs-btn" data-act="form">▶ ${T(isIon ? 'grow' : 'formation')}</button><button class="bs-btn" data-act="reset">⟲ ${T('resetView')}</button><button class="bs-btn${S.auto ? ' on' : ''}" data-act="auto">⟳ ${T('autoRot')}</button></div></div></div>`;
  }
  function renderView() {
    destroyViewer('mol'); var v = $('#bs-view'); renderList();
    if (S.sp) { renderSpecies(v); return; }
    if (S.ic) { renderIonic(v); return; }
    var m = S.mol, nm = molName(m);
    var salt = saltBlock();
    v.innerHTML = `${fmlBanner()}${salt}<div class="bs-mhead"><div class="bs-mf">${m.formula}</div><div><div class="bs-mn">${nm || T('noName')}</div><div class="bs-mb">${chip(T('cat_' + (m.cat || 'other')))}${m.charged ? chip(T('ion') + ' ' + E.supCharge(m.charge).replace('¹', ''), 'io') : chip(m.polar ? T('polar') : T('nonpolar'), m.polar ? 'po' : 'np')}${m.radical ? chip(T('radical'), 'pr') : ''}${m.resonant ? chip(T('resonance'), 'io') : ''}${chip(shapeOf(m))}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-cv" class="bs-cv"></canvas>${toolbar(false)}</div><div class="bs-info" id="bs-info"></div></div>`;
    var vw = new V3.Viewer($('#bs-cv')); viewers.mol = vw; vw.autoRotate = S.auto; vw.setScene(SC.molScene(m, scenOpts()));
    $('#bs-info').innerHTML = sumCard(m) + molPanels(m);
  }
  /* the whole molecule in one glance, before the four steps */
  function sumCard(m) {
    var cs = ST.centreAtoms(m), hy = cs.length ? E.vsepr(cs[0]).hyb : null, mu = !m.charged && m.dipole ? (m.muExp !== null && m.muExp !== undefined ? m.muExp : m.dipole.mag) : null, dc = lang === 'en' ? '.' : ',', cell = function (k, v) { return `<div><small>${k}</small><b>${v}</b></div>`; };
    return `<div class="bs-sum"><div class="bs-sum-h">${T('sumTitle')}</div><div class="bs-sum-g">${cell(T('shape'), shapeOf(m))}${hy ? cell(T('hybrid'), String(hy).replace('sp3d2', 'sp³d²').replace('sp3d', 'sp³d').replace('sp3', 'sp³').replace('sp2', 'sp²')) : ''}${mu !== null ? cell(T('sumMu'), (+mu).toFixed(2).replace('.', dc) + ' D') : ''}${cell(T('bondPairs') + ' · ' + T('lonePairs'), m.bondPairs + ' · ' + m.lonePairs)}</div></div>`;
  }
  function det(title, body, open) { var p = String(title).split('|'); return `<details class="bs-det"${open ? ' open' : ''}><summary><span class="bs-dt"><b>${p[0]}</b>${p[1] ? '<small>' + p[1] + '</small>' : ''}</span></summary><div class="bs-det-b">${body}</div></details>`; }   /* title|subtitle — the step number comes from a CSS counter */
  function lewisPanel(m) {
    var forms = m.resonant && m.forms ? m.forms : null, body = '';
    if (forms) { body += `<div class="bs-forms">${forms.slice(0, 6).map(function (f, i) { return `<div class="bs-fm"><span class="bs-fn">${i + 1}</span><div class="bs-lw">${SC.lewisSVG(m, f, { scale: 0.8, noAvg: true })}</div></div>`; }).join('')}</div><div class="bs-cap">↔ ${T('resArrows')}</div><div class="bs-note">${T('hybridNote', { n: forms.length })}</div><div class="bs-lw big">${SC.lewisSVG(m, null, { scale: 1 })}</div><div class="bs-cap">${T('hybridCap')}</div>`; }
    else body += `<div class="bs-lw big">${SC.lewisSVG(m, null, { scale: 1 })}</div>`;
    var ledger = `<div class="bs-kv"><div><small>${T('valTotal')}</small><b>${m.valenceTotal}</b></div><div><small>${T('bondPairs')}</small><b>${m.bondPairs}</b></div><div><small>${T('lonePairs')}</small><b>${m.lonePairs}${m.radical ? '+•' : ''}</b></div><div><small>${T('formalSum')}</small><b>${m.formalSum}</b></div></div>`;
    var states = {}; m.atoms.forEach(function (a) { states[a.s] = a.state; });
    var legend = `<div class="bs-legend"><span><i class="bs-ldot"></i> ${T('lgLone')}</span><span><i class="bs-lline"></i> ${T('lgBond')}</span><span><i class="bs-lfc"></i> ${T('lgFormal')}</span></div>`;
    return body + ledger + legend + `<div class="bs-states">${Object.keys(states).map(function (s) { return chip(s + ': ' + T('state_' + states[s]), states[s] === 'octet' || states[s] === 'duet' ? 'ok' : 'pr'); }).join('')}</div>` + (m.id === 'O2' ? `<div class="bs-note bs-warn">${T('noteTriplet', { f: m.formula })}</div>` : '');
  }
  function geomPanel(m) {
    var cs = ST.centreAtoms(m); if (!cs.length) return `<div class="bs-note">${T('s6di')}</div><div class="bs-kv"><div><small>${T('shape')}</small><b>${T('m_linear')}</b></div><div><small>${T('hybrid')}</small><b>sp</b></div></div>`;
    return `<div class="bs-tbl"><table><thead><tr><th>${T('atom')}</th><th>AXₙEₘ</th><th>${T('eGeom')}</th><th>${T('shape')}</th><th>${T('angIdeal')}</th><th>${T('angReal')}</th><th>${T('hybrid')}</th></tr></thead><tbody>${cs.filter(function (a, i, arr) { var k = function (z) { return z.s + E.vsepr(z).key + ST.angleText(m, z.i); }; return arr.findIndex(function (b) { return k(b) === k(a); }) === i; }).slice(0, 6).map(function (a) { var v = E.vsepr(a); return `<tr><td><b>${a.s}</b></td><td>${v.key}</td><td>${T('g_' + v.electron)}</td><td>${T('m_' + v.shape)}</td><td>${v.angles}</td><td>${ST.angleText(m, a.i)}${m.ang && m.centre === a.i ? ' <sup>exp</sup>' : ''}</td><td>${v.hyb}</td></tr>`; }).join('')}</tbody></table></div><div class="bs-note">${T('vseprNote')}</div>`;
  }
  function bondsPanel(m) {
    var seen = {}, rows = m.bondInfo.filter(function (bi) { var k = m.atoms[bi.a].s + m.atoms[bi.b].s + f1(bi.order); if (seen[k]) { seen[k]++; return false; } seen[k] = 1; return true; });
    var cnt = {}; m.bondInfo.forEach(function (bi) { var k = m.atoms[bi.a].s + m.atoms[bi.b].s + f1(bi.order); cnt[k] = (cnt[k] || 0) + 1; });
    var table = `<div class="bs-tbl"><table><thead><tr><th>${T('bond')}</th><th>${T('order')}</th><th>Δχ</th><th>${T('type')}</th><th>${T('ionicPct')}</th><th>${T('len')} pm</th><th>${T('energy')} kJ/mol</th></tr></thead><tbody>${rows.map(function (bi) { var k = m.atoms[bi.a].s + m.atoms[bi.b].s + f1(bi.order), a = m.atoms[bi.a].s, b = m.atoms[bi.b].s; return `<tr><td><b>${a}–${b}</b>${cnt[k] > 1 ? ' ×' + cnt[k] : ''}</td><td>${f1(bi.order)}</td><td>${bi.cls.known ? fx(bi.cls.dChi) : '—'}</td><td>${badge(bi.cls.type)}</td><td>${bi.cls.known ? fx(bi.cls.hs * 100, 0) + '%' : '—'}</td><td>${Math.round(bi.len)}</td><td>${Math.round(bi.energy)}${bi.src === 'table' ? '' : '*'}</td></tr>`; }).join('')}</tbody></table></div>`;
    var verdict = m.charged ? `<div class="bs-verdict">${T('s7ion')}</div>` : `<div class="bs-verdict ${m.polar ? 'po' : 'np'}"><b>${m.polar ? T('polarMol') : T('nonpolarMol')}</b> — ${m.dipole.mag < 0.05 && !m.muExp ? T('cancel') : ''} μ<sub>${T('model')}</sub> ≈ ${fx(m.dipole.mag, 2)} D${m.muExp !== null && m.muExp !== undefined ? ` · μ<sub>${T('expShort')}</sub> = ${fx(m.muExp, 2)} D` : ''}</div>`;
    var pc = m.charged ? '' : `<div class="bs-states">${m.atoms.filter(function (a, i, arr) { return Math.abs(m.partial[i]) > 0.02 && arr.findIndex(function (b) { return b.s === a.s && Math.abs(m.partial[b.i] - m.partial[i]) < 0.005; }) === i; }).map(function (a) { var q = m.partial[a.i]; return chip(`${a.s}: δ${q < 0 ? '−' : '+'} ${fx(Math.abs(q), 2)}`, q < 0 ? 'neg' : 'pos'); }).join('')}</div>`;
    return table + verdict + pc + `<div class="bs-note">${T('dipNote')} ${T('starNote')}</div>`;
  }
  function propsPanel(m) {
    var seen = {}, pairs = [];
    m.bondInfo.forEach(function (bi) { var a = m.atoms[bi.a].s, b = m.atoms[bi.b].s, k = [a, b].sort().join('-'); if (!seen[k]) { seen[k] = 1; pairs.push([a, b, bi.cls]); } });
    pairs.sort(function (p, q) { return (q[2].dChi || 0) - (p[2].dChi || 0); });
    return pairs.slice(0, 2).map(function (p) { var ins = ST.pairInsights(p[0], p[1], p[2], T); return `<div class="bs-pairins"><div class="bs-pair-h"><b>${p[0]}–${p[1]}</b>${badge(p[2].type)}<button class="bs-btn sm" data-act="pairlab" data-a="${p[0]}" data-b="${p[1]}">${T('openLab')}</button></div>${ST.ul(ins.map(function (x) { return x.t; }))}</div>`; }).join('') || `<div class="bs-note">${T('noBonds')}</div>`;
  }
  function stepsPanel(m, id) {
    var steps = ST.lewisSteps(m, T, S.level);
    return `<div class="bs-segs lvl"><button class="bs-seg${S.level === 'general' ? ' on' : ''}" data-act="level" data-v="general">${T('lvlGeneral')}</button><button class="bs-seg${S.level === 'detailed' ? ' on' : ''}" data-act="level" data-v="detailed">${T('lvlDetailed')}</button></div><ol class="bs-steps">${steps.map(function (s, i) { return `<li><div class="bs-step-h"><span class="bs-sn">${i + 1}</span>${s.h}</div><div class="bs-step-b">${s.b}</div></li>`; }).join('')}</ol>`;
  }
  function molPanels(m) {
    return det(T('pLewis'), lewisPanel(m), true) + det(T('pGeom'), geomPanel(m), true) + det(T('pBonds'), bondsPanel(m), false) + det(T('pProps'), propsPanel(m), false) + det(T('pSteps'), stepsPanel(m), false);
  }

  /* ---------- ionic compound view ---------- */
  function nobleStr(sym, q) { var e = E.el(sym), z = e.n - q, ng = nobleFor(z); return ng ? '[' + ng + ']' : '—'; }
  function ionicSteps(ic) {
    var det = S.level === 'detailed', C = E.el(ic.cat.s), A = ic.poly ? null : E.el(ic.an.s), st = [];
    st.push({ h: T('i1h'), b: T('i1', { c: ic.cat.s, vc: E.valence(C), a: (ic.an.f || ic.an.s), va: A ? E.valence(A) : '—' }) + (det ? `<div class="bs-why">${T('i1why', { cfgc: C.cfg, cfga: A ? A.cfg : '' })}</div>` : '') });
    st.push({ h: T('i2h'), b: T('i2', { c: ic.cat.s, cq: ic.cat.q, nc: nobleStr(ic.cat.s, ic.cat.q), a: (ic.an.f || ic.an.s), aq: -ic.an.q, na: A && !ic.poly ? nobleStr(ic.an.s, ic.an.q) : '—' }) + (det && A && !ic.poly ? `<div class="bs-why">${T('i2why', { ie: f1(C.ie), ea: f1(A.ea || 0) })}</div>` : '') });
    st.push({ h: T('i3h'), b: `${ic.nc} × (${ic.cat.q}+) + ${ic.na} × (${ic.an.q}−) = ${ic.nc * ic.cat.q + ic.na * ic.an.q} → <b>${ic.formula}</b>` + (det ? `<div class="bs-why">${T('i3why')}</div>` : '') });
    if (!ic.poly) st.push({ h: T('i4h'), b: T('i4', { k: Math.round(ic.kapustinskii), s: T('st_short_' + ic.structure) }) + (det ? `<div class="bs-why">${T('i4why', { d: Math.round(ic.r.sum), ratio: fx(ic.ratio, 2) })}</div>` : '') });
    return `<div class="bs-segs lvl"><button class="bs-seg${S.level === 'general' ? ' on' : ''}" data-act="level" data-v="general">${T('lvlGeneral')}</button><button class="bs-seg${S.level === 'detailed' ? ' on' : ''}" data-act="level" data-v="detailed">${T('lvlDetailed')}</button></div><ol class="bs-steps">${st.map(function (s, i) { return `<li><div class="bs-step-h"><span class="bs-sn">${i + 1}</span>${s.h}</div><div class="bs-step-b">${s.b}</div></li>`; }).join('')}</ol>`;
  }
  function renderIonic(v) {
    var ic = S.ic, C = E.el(ic.cat.s), A = E.el(ic.an.s), nm = ic.names && ic.names[lang], coord = { nacl: '6 : 6', cscl: '8 : 8', zns: '4 : 4', fluorite: '8 : 4', antifluorite: '4 : 8' }[ic.structure] || '—';
    var count = ic.structure === 'cluster' ? ic.nc + ic.na : SC.lattice(ic, S.N).pts.length;
    v.innerHTML = `${fmlBanner()}<div class="bs-mhead"><div class="bs-mf">${ic.formula}</div><div><div class="bs-mn">${nm || T('noName')}</div><div class="bs-mb">${chip(T('ionic'), 'io')}${chip(ionTxt(ic.cat.s, ic.cat.q) + ' · ' + ionTxt(ic.an.s, ic.an.q))}${chip(T('st_short_' + ic.structure))}</div></div></div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-cv" class="bs-cv"></canvas>${toolbar(true)}<div class="bs-cnt" id="bs-cnt">${T('ionsShown', { n: count })}</div></div><div class="bs-info">
      ${det(T('pIons'), `<div class="bs-tbl"><table><thead><tr><th></th><th>${T('cation')}</th><th>${T('anion')}</th></tr></thead><tbody>
        <tr><td>${T('ion')}</td><td><b>${ionTxt(ic.cat.s, ic.cat.q)}</b> · ${nameOf(C)}</td><td><b>${ionTxt(ic.an.s, ic.an.q)}</b> · ${nameOf(A)}</td></tr>
        <tr><td>${T('electrons')}</td><td>${T('loses', { n: ic.cat.q })} → ${nobleStr(ic.cat.s, ic.cat.q)}</td><td>${T('gains', { n: -ic.an.q })} → ${nobleStr(ic.an.s, ic.an.q)}</td></tr>
        <tr><td>χ</td><td>${fx(E.en(C))}</td><td>${fx(E.en(A))}</td></tr><tr><td>${T('radius')} pm</td><td>${f1(ic.r.cat)}</td><td>${f1(ic.r.an)}${ic.r.est ? '*' : ''}</td></tr>
        <tr><td>IE₁ / EA kJ/mol</td><td>${f1(C.ie)}</td><td>${f1(A.ea || 0)}</td></tr></tbody></table></div>`, true)}
      ${det(T('pLattice'), `<div class="bs-kv"><div><small>r₊/r₋</small><b>${fx(ic.ratio, 2)}</b></div><div><small>${T('coord')}</small><b>${coord}</b></div><div><small>U Kapustinskii</small><b>${Math.round(ic.kapustinskii)}</b></div><div><small>U Born–Landé</small><b>${ic.bornLande ? Math.round(ic.bornLande) : '—'}</b></div></div><div class="bs-note">${T('st_' + ic.structure)}</div>`, true)}
      ${det(T('pExplain'), ST.ul(ST.ionicInsights(ic, T)) + `<button class="bs-btn sm" data-act="pairlab" data-a="${ic.cat.s}" data-b="${ic.an.s}">${T('openLab')}</button>`, false)}
      ${root.BSThermo ? det(T('pBH'), '<button class="bs-btn sm" data-act="bhreplay">▶ ' + T('replay') + '</button><div id="bs-bh"></div>', false) : ''}
      ${det(T('pSteps'), ionicSteps(ic), false)}</div></div>`;
    var vw = new V3.Viewer($('#bs-cv')); viewers.mol = vw; vw.autoRotate = S.auto; vw.setScene(SC.crystalScene(ic, S.N, { style: S.style }));
    if (root.BSThermo && $('#bs-bh')) $('#bs-bh').innerHTML = root.BSThermo.panel(ic, T, S.level);
  }

  /* ================================================================= TAB 3 — bond lab */
  var PRESETS = [['Na', 'Cl'], ['H', 'H'], ['H', 'Cl'], ['C', 'H'], ['O', 'H'], ['Mg', 'O'], ['Cs', 'F'], ['Cu', 'Zn'], ['Al', 'Cl'], ['C', 'O']];
  function elOptions(sel) { return EL.map(function (e) { return `<option value="${e.s}"${e.s === sel ? ' selected' : ''}>${e.n}. ${e.s} — ${nameOf(e)}</option>`; }).join(''); }
  function renderBond() {
    destroyViewer('pair'); var p = $('#bs-p-bond'), A = S.pair[0], B = S.pair[1], cls = E.classify(A, B), ea = E.el(A), eb = E.el(B);
    var bar = function (e, c) { var v = E.en(e); return `<div class="bs-enbar"><span>${e.s}</span><div class="bs-track"><div class="bs-fill" style="width:${v === null ? 0 : (v / 4 * 100).toFixed(1)}%;background:#${e.k || '8899aa'}"></div></div><b>${v === null ? '—' : fx(v)}</b></div>`; };
    var gauge = cls.known ? `<div class="bs-gauge"><div class="bs-zones"><i style="width:${0.4 / 3.3 * 100}%" class="z1"></i><i style="width:${1.3 / 3.3 * 100}%" class="z2"></i><i style="width:${1.6 / 3.3 * 100}%" class="z3"></i></div><div class="bs-mark" style="left:${Math.min(100, cls.dChi / 3.3 * 100)}%"></div><div class="bs-gl"><span>0</span><span>0,4</span><span>1,7</span><span>3,3</span></div></div>` : '';
    p.innerHTML = `<div class="bs-pick"><select id="bs-sa" data-act="selA">${elOptions(A)}</select><button class="bs-btn sm" data-act="swap">⇄</button><select id="bs-sb" data-act="selB">${elOptions(B)}</select></div>
      <div class="bs-cats">${PRESETS.map(function (q) { return `<button class="bs-cat${q[0] === A && q[1] === B ? ' on' : ''}" data-act="preset" data-a="${q[0]}" data-b="${q[1]}">${q[0]}–${q[1]}</button>`; }).join('')}</div>
      <div class="bs-pair"><div class="bs-pair-h"><b>${A} – ${B}</b>${badge(cls.type)}${cls.borderline ? chip(T('borderline'), 'pr') : ''}</div>${cls.known ? `<div class="bs-kv"><div><small>Δχ</small><b>${fx(cls.dChi)}</b></div><div><small>${T('ionicPct')} (Pauling)</small><b>${fx(cls.pauling * 100, 0)}%</b></div><div><small>${T('ionicPct')} (H–S)</small><b>${fx(cls.hs * 100, 0)}%</b></div><div><small>χ̄</small><b>${fx(cls.avg)}</b></div></div>` : `<div class="bs-note">${T('x_noEn', { a: A, b: B })}</div>`}${bar(ea)}${bar(eb)}${gauge}</div>
      <div class="bs-grid2"><div class="bs-viewcard"><canvas id="bs-cv2" class="bs-cv"></canvas><div class="bs-tb"><div class="bs-acts"><button class="bs-btn" data-act="replay">▶ ${T('replay')}</button><button class="bs-btn" data-act="reset2">⟲ ${T('resetView')}</button></div><div class="bs-cap" id="bs-pcap"></div></div></div>
      <div class="bs-info">${det(T('pProps'), '<div id="bs-ins"></div>', true)}${det(T('plChar'), '<canvas id="bs-pl1" class="bs-plot"></canvas>', true)}${det(T('plKet'), '<canvas id="bs-pl2" class="bs-plot"></canvas><div class="bs-note">' + T('ketNote') + '</div>', false)}${det(T('plEnergy'), '<canvas id="bs-pl3" class="bs-plot"></canvas><div class="bs-note" id="bs-pl3n"></div>', false)}${cls.type === 'ionic' && root.BSThermo ? det(T('pBH'), '<button class="bs-btn sm" data-act="bhreplay">▶ ' + T('replay') + '</button><div id="bs-bh2"></div>', false) : ''}</div></div>`;
    var vw = new V3.Viewer($('#bs-cv2')); viewers.pair = vw; var sc = SC.pairScene(A, B); vw.setScene(sc); S.pairScene = sc; vw.autoRotate = false;
    $('#bs-pcap').textContent = T('cap_' + sc.kind, { n: sc.n });
    $('#bs-ins').innerHTML = ST.ul(ST.pairInsights(A, B, cls, T).map(function (x) { return x.t; }));
    drawPlots(A, B, cls, sc);
    if (cls.type === 'ionic' && root.BSThermo && $('#bs-bh2')) { var cand = E.ionicCandidates(A, B).filter(function (c) { return root.BSThermo.bornHaber(c); })[0] || E.ionicCandidates(A, B)[0]; $('#bs-bh2').innerHTML = cand ? `<div class="bs-note"><b>${cand.formula}</b></div>` + root.BSThermo.panel(cand, T, S.level) : ''; }
  }
  function plotOf(id) { var cv = $('#' + id); var PL = root.BSPlot || root.PHLabPlot; if (!cv || !PL) return null; return plots[id] = new PL.Plot(cv); }
  function drawPlots(A, B, cls, sc) {
    if (!(root.BSPlot || root.PHLabPlot)) return; var acc = '#36c5b0', or = '#ff9f43', bl = '#5aa9ff', pk = '#ff6b6b';
    var p1 = plotOf('bs-pl1'); if (p1) {
      var pa = [], ph = [], d; for (d = 0; d <= 3.3001; d += 0.05) { pa.push([d, E.ionicPauling(d) * 100]); ph.push([d, E.ionicHS(d) * 100]); }
      p1.set({ x: { min: 0, max: 3.3, label: 'Δχ', tip: function (x) { return fx(x, 2); } }, y: { min: 0, max: 100, label: T('ionicPct') + ' (%)', tip: function (y) { return fx(y, 0) + ' %'; } }, legend: true,
        series: [{ name: 'Pauling 1−e^(−Δχ²/4)', pts: pa, color: bl, w: 2.2 }, { name: 'Hannay–Smyth', pts: ph, color: or, w: 2.2 }], vlines: [{ x: 0.4, dash: [4, 4], label: '0,4' }, { x: 1.7, dash: [4, 4], label: '1,7' }], hlines: [{ y: 50, dash: [2, 5] }],
        points: cls.known ? [{ x: cls.dChi, y: cls.pauling * 100, color: bl, label: A + '–' + B, ring: true }, { x: cls.dChi, y: cls.hs * 100, color: or, ring: true }] : [] });
    }
    var p2 = plotOf('bs-pl2'); if (p2) {
      var samples = [['Na', 'Na', 'Na'], ['Cu', 'Cu', 'Cu'], ['Si', 'Si', 'Si'], ['C', 'C', 'C'], ['Cl', 'Cl', 'Cl₂'], ['O', 'O', 'O₂'], ['H', 'F', 'HF'], ['H', 'O', 'H₂O'], ['Si', 'O', 'SiO₂'], ['Na', 'Cl', 'NaCl'], ['Cs', 'F', 'CsF'], ['Mg', 'O', 'MgO'], ['Al', 'Cl', 'AlCl₃']], pts = [];
      samples.forEach(function (s) { var c = E.classify(s[0], s[1]); if (c.known) pts.push({ x: c.dChi, y: c.avg, color: c.type === 'ionic' ? or : c.type === 'metallic' ? '#c0a8ff' : bl, label: s[2] }); });
      if (cls.known) pts.push({ x: cls.dChi, y: cls.avg, color: pk, label: A + '–' + B, ring: true });
      p2.set({ x: { min: 0, max: 3.4, label: 'Δχ', tip: function (x) { return fx(x, 2); } }, y: { min: 0.6, max: 4, label: 'χ̄', tip: function (y) { return fx(y, 2); } }, bands: [{ y0: 0.6, y1: 1.8, color: '#c0a8ff', label: T('regMetal') }, { y0: 1.8, y1: 4, color: bl, label: T('regCov') }], vlines: [{ x: 1.7, dash: [4, 4], label: T('regIonic') }], series: [], points: pts });
    }
    var p3 = plotOf('bs-pl3'), note = $('#bs-pl3n'); if (p3) {
      if (sc.kind === 'ionic') {
        var cur = E.ionPairCurve(sc.cat, sc.an);
        if (cur) { p3.set({ x: { min: 150, max: 1000, label: 'r (pm)', tip: function (x) { return Math.round(x) + ' pm'; } }, y: { min: Math.floor((cur.Emin - 60) / 50) * 50, max: Math.ceil((cur.dE + 120) / 50) * 50, label: 'E (kJ/mol)', tip: function (y) { return Math.round(y) + ' kJ/mol'; } }, legend: true,
          series: [{ name: T('curNeutral'), pts: cur.ref, color: '#9aa4b2', dash: [6, 4], w: 1.8 }, { name: sc.cat + '⁺ + ' + sc.an + '⁻', pts: cur.pts, color: or, w: 2.6 }], vlines: cur.rStar ? [{ x: cur.rStar, dash: [3, 4], label: 'r* ' + Math.round(cur.rStar) }] : [], points: [{ x: cur.r0, y: cur.Emin, color: pk, label: 'r₀ ' + Math.round(cur.r0), ring: true }] });
          note.textContent = T('curIonNote', { dE: f1(cur.dE), rs: cur.rStar ? Math.round(cur.rStar) : '—' }); }
        else { $('#bs-pl3').style.display = 'none'; note.textContent = T('curIonMulti'); }
      } else if (sc.kind === 'metallic') { $('#bs-pl3').style.display = 'none'; note.textContent = T('curMetal'); }
      else { var o = sc.order, mo = E.morseCurve(A, B, o); p3.set({ x: { min: Math.round(mo.pts[0][0]), max: Math.round(mo.pts[mo.pts.length - 1][0]), label: 'r (pm)', tip: function (x) { return Math.round(x) + ' pm'; } }, y: { min: -Math.ceil(mo.De * 1.1 / 50) * 50, max: Math.ceil(mo.De * 0.35 / 50) * 50, label: 'E (kJ/mol)', tip: function (y) { return Math.round(y) + ' kJ/mol'; } }, series: [{ name: 'Morse', pts: mo.pts, color: bl, w: 2.6 }], hlines: [{ y: 0, dash: [6, 4] }], points: [{ x: mo.re, y: -mo.De, color: pk, label: 'r₀ ' + Math.round(mo.re) + ' · D ' + Math.round(mo.De), ring: true }] });
        note.textContent = T('curCovNote'); }
    }
  }

  /* ================================================================= events */
  function onClick(ev) {
    var t = ev.target.closest('[data-act]'); if (!t || !R.contains(t)) return; var a = t.dataset.act;
    switch (a) {
      case 'lang': setLang(t.dataset.v); break;
      case 'tab': S.tab = t.dataset.v; render(); break;
      case 'pt': selectEl(t.dataset.s); break;
      case 'clear': S.sel = []; renderBuild(); break;
      case 'open': { var r = reg[+t.dataset.i]; if (!r) break; S.tab = 'mol'; S.salt = null; S.sp = null; S.fml = null;
        if (r.kind === 'mol') { S.mol = r.x.mol; S.ic = null; } else if (r.kind === 'ionic') { S.ic = r.x; S.mol = null; } else { var id = r.x.an.id || r.x.cat.id, mm = E.fromLibrary(id); if (r.x.an.id) { S.mol = mm; S.ic = null; S.salt = r.x; } else { S.mol = E.fromLibrary(r.x.cat.id); S.ic = null; S.salt = r.x; } }
        render(); var vv = $('#bs-view'); if (vv && vv.scrollIntoView) vv.scrollIntoView({ block: 'start' }); break; }
      case 'lib': S.mol = E.fromLibrary(t.dataset.id); S.ic = null; S.salt = null; S.sp = null; S.fml = null; renderView(); break;
      case 'fml': { var tg = root.BSFormula && root.BSFormula.open(t.dataset.k); if (tg) { applyTarget(tg); renderView(); var vf = $('#bs-view'); if (vf && vf.scrollIntoView) vf.scrollIntoView({ block: 'start' }); } break; }                // a typed formula
      case 'fsp': { var spx = root.BSFormula && root.BSFormula.species(t.dataset.s, +t.dataset.q); if (spx) { S.sp = spx; S.mol = null; S.ic = null; S.salt = null; S.fml = null; renderView(); } break; }   // another ion of the same element
      case 'fion': { var pt = S.salt && root.BSFormula && root.BSFormula.partTarget(S.salt, t.dataset.i); if (pt) { S.mol = pt.mol; S.sp = pt.sp; renderView(); } break; }           // switch between the ions of a typed salt
      case 'cat': S.cat = t.dataset.v; renderStudio(); break;
      case 'kbFocus': { var qi = $('#bs-q'); if (qi) { qi.focus(); if (qi.scrollIntoView) qi.scrollIntoView({ block: 'center', behavior: 'smooth' }); } break; }
      case 'style': S.style = t.dataset.v; refreshScene(); break;
      case 'tog': S[t.dataset.v] = !S[t.dataset.v]; refreshScene(); break;
      case 'form': { var vw = viewers.mol; if (!vw) break; var sc = S.ic ? SC.crystalScene(S.ic, S.N, { style: S.style, p: 0 }) : SC.molScene(S.mol, Object.assign(scenOpts(), { p: 0 })); vw.setScene(sc); vw.play(); break; }
      case 'reset': if (viewers.mol) viewers.mol.resetView(); break;
      case 'reset2': if (viewers.pair) viewers.pair.resetView(); break;
      case 'auto': S.auto = !S.auto; t.classList.toggle('on', S.auto); if (viewers.mol) { viewers.mol.autoRotate = S.auto; viewers.mol.wake(); } break;
      case 'level': S.level = t.dataset.v; if (S.tab === 'mol') { var open = $$('.bs-det', $('#bs-info')).map(function (d) { return d.open; }); renderView(); $$('.bs-det', $('#bs-info')).forEach(function (d, i) { d.open = open[i] || (d.querySelector('.bs-steps') ? true : false); }); } break;
      case 'pairlab': S.pair = [t.dataset.a, t.dataset.b]; S.tab = 'bond'; render(); break;
      case 'preset': S.pair = [t.dataset.a, t.dataset.b]; renderBond(); break;
      case 'swap': S.pair = [S.pair[1], S.pair[0]]; renderBond(); break;
      case 'replay': if (S.pairScene) { S.pairScene.replay(); if (viewers.pair) viewers.pair.wake(); } break;
      case 'bhreplay': { var bw = $('#bs-bh') || $('#bs-bh2'); if (bw) { var wsvg = bw.querySelector('.bsbh-wrap'); if (wsvg) { var c = wsvg.innerHTML; wsvg.innerHTML = ''; void wsvg.offsetWidth; wsvg.innerHTML = c; } } break; }
      case 'checks': { var d = $('#bs-chk-detail'); d.innerHTML = d.innerHTML ? '' : `<div class="bs-chkbox"><b>${T('checksTitle')}</b>${Object.keys(checks.groups).map(function (g) { return `<div>${g}: ${checks.groups[g].ok}/${checks.groups[g].total}</div>`; }).join('')}${checks.failed.map(function (f) { return `<div class="bad">✗ ${f}</div>`; }).join('')}</div>`; break; }
      default: if (ACTIONS[a]) ACTIONS[a](t, ev);
    }
  }
  function onInput(ev) {
    var t = ev.target; if (t.dataset && INPUTS[t.dataset.act]) { INPUTS[t.dataset.act](t, ev); return; }
    if (t.id === 'bs-q') { if (S.q !== t.value) { S.q = t.value; renderList(); } return; }   // never rebuild the list on blur/change: it would swallow the tap on a chip
    if (t.dataset && t.dataset.act === 'N') { S.N = +t.value; var nv = $('#bs-nv'); if (nv) nv.textContent = S.N; if (viewers.mol && S.ic) { viewers.mol.setScene(SC.crystalScene(S.ic, S.N, { style: S.style })); var c = $('#bs-cnt'); if (c) c.textContent = T('ionsShown', { n: SC.lattice(S.ic, S.N).pts.length }); } return; }
    if (t.id === 'bs-sa' || t.id === 'bs-sb') { var np = [$('#bs-sa').value, $('#bs-sb').value]; if (np[0] !== S.pair[0] || np[1] !== S.pair[1]) { S.pair = np; renderBond(); } }
  }
  function refreshScene() {
    var vw = viewers.mol; if (!vw) return; vw.setScene(S.ic ? SC.crystalScene(S.ic, S.N, { style: S.style }) : SC.molScene(S.mol, scenOpts()));
    $$('.bs-seg', $('#bs-view')).forEach(function (b) { if (b.dataset.act === 'style') b.classList.toggle('on', b.dataset.v === S.style); }); $$('.bs-tg', $('#bs-view')).forEach(function (b) { b.classList.toggle('on', !!S[b.dataset.v]); });
  }

  /* ================================================================= self-checks (reference values) */
  function runChecks() {
    var res = { ok: 0, total: 0, failed: [], groups: {} };
    function chk(g, name, cond) { res.total++; var G = res.groups[g] || (res.groups[g] = { ok: 0, total: 0 }); G.total++; if (cond) { res.ok++; G.ok++; } else res.failed.push(g + ': ' + name); }
    function near(g, n, a, b, t) { chk(g, n + ' (' + (typeof a === 'number' ? a.toFixed(2) : a) + ' vs ' + b + ')', Math.abs(a - b) <= t); }
    try {
      E.library.forEach(function (r) { var m = E.fromLibrary(r.id), g = 'LEWIS';
        var sumV = m.atoms.reduce(function (s, a) { return s + a.V; }, 0) - m.charge; chk(g, r.id + ' e⁻ count', m.valenceTotal === sumV && 2 * m.bondPairs + 2 * m.lonePairs + (m.radical ? 1 : 0) === m.valenceTotal);
        chk(g, r.id + ' charge', m.atoms.reduce(function (s, a) { return s + a.q; }, 0) === m.charge); chk(g, r.id + ' no invalid atoms', !m.atoms.some(function (a) { return a.state === 'invalid'; }));
        var mn = 9; for (var i = 0; i < m.pos.length; i++) for (var j = i + 1; j < m.pos.length; j++) mn = Math.min(mn, U.vlen(U.vsub(m.pos[i], m.pos[j]))); chk('GEOMETRY', r.id + ' no overlapping atoms', mn > 0.6);
        if (r.x.mu !== undefined && !m.charged) chk('POLARITY', r.id + ' polar/non-polar vs experiment', m.polar === (r.x.mu > 0.05)); });
      function angs(id, s) { var m = E.fromLibrary(id), ci = -1, bx = -1; m.atoms.forEach(function (a, i) { if (a.s === s && a.X > bx) { bx = a.X; ci = i; } }); return ST.measuredAngles(m, ci).sort(function (a, b) { return a - b; }); }
      near('GEOMETRY', 'H₂O', angs('H2O', 'O')[0], 104.5, 0.3); near('GEOMETRY', 'NH₃', angs('NH3', 'N')[0], 107, 0.3); near('GEOMETRY', 'CH₄', angs('CH4', 'C')[0], 109.47, 0.05); near('GEOMETRY', 'CO₂', angs('CO2', 'C')[0], 180, 0.01);
      near('GEOMETRY', 'BF₃', angs('BF3', 'B')[0], 120, 0.05); near('GEOMETRY', 'SF₆', angs('SF6', 'S')[0], 90, 0.05); near('GEOMETRY', 'SF₆ trans', angs('SF6', 'S')[14], 180, 0.05); near('GEOMETRY', 'XeF₄', angs('XeF4', 'Xe')[5], 180, 0.05); near('GEOMETRY', 'XeF₂', angs('XeF2', 'Xe')[0], 180, 0.05);
      near('GEOMETRY', 'PCl₅ eq', angs('PCl5', 'P')[6], 120, 0.05); near('GEOMETRY', 'PCl₅ ax', angs('PCl5', 'P')[9], 180, 0.05); near('GEOMETRY', 'SO₂', angs('SO2', 'S')[0], 119, 0.3); near('GEOMETRY', 'SO₄²⁻', angs('SO42-', 'S')[0], 109.47, 0.05); near('GEOMETRY', 'NO₃⁻', angs('NO3-', 'N')[0], 120, 0.05);
      var C = E.classify; chk('BONDS', 'Na–Cl ionic', C('Na', 'Cl').type === 'ionic'); chk('BONDS', 'H–Cl polar', C('H', 'Cl').type === 'polar'); chk('BONDS', 'C–H non-polar', C('C', 'H').type === 'nonpolar'); chk('BONDS', 'Cl–Cl non-polar', C('Cl', 'Cl').type === 'nonpolar'); chk('BONDS', 'Na–K metallic', C('Na', 'K').type === 'metallic'); chk('BONDS', 'Cs–F ionic', C('Cs', 'F').type === 'ionic');
      near('BONDS', 'ΔχNaCl', C('Na', 'Cl').dChi, 2.23, 0.01); near('BONDS', 'Pauling % NaCl', C('Na', 'Cl').pauling * 100, 71, 1); near('BONDS', 'O–H length pm', E.fromLibrary('H2O').bondInfo[0].len, 96, 0.5);
      var nacl = E.ionicCompound('Na', 1, 'Cl', -1); near('LATTICE', 'Kapustinskii NaCl', nacl.kapustinskii, 745, 15); near('LATTICE', 'Born–Landé NaCl', nacl.bornLande, 753, 15); chk('LATTICE', 'NaCl structure', nacl.structure === 'nacl'); chk('LATTICE', 'CsCl structure', E.ionicCompound('Cs', 1, 'Cl', -1).structure === 'cscl'); chk('LATTICE', 'CaF₂ fluorite', E.ionicCompound('Ca', 2, 'F', -1).structure === 'fluorite');
      chk('LATTICE', 'Al₂O₃ formula', E.ionicCandidates('Al', 'O')[0].formula === 'Al₂O₃'); near('LATTICE', 'MgO Kapustinskii (exp. 3795)', E.ionicCompound('Mg', 2, 'O', -2).kapustinskii, 3795, 250);
      var cur = E.ionPairCurve('Na', 'Cl'); near('ENERGY', 'IE−EA NaCl', cur.dE, 147.2, 0.5); near('ENERGY', 'crossing r* NaCl', cur.rStar, 944, 6);
      chk('COMPOUNDS', 'C+H gives CH₄', E.compoundsFor(['C', 'H']).molecular.some(function (x) { return x.mol.formula === 'CH₄'; })); chk('COMPOUNDS', 'Na+Cl gives NaCl', E.compoundsFor(['Na', 'Cl']).ionic[0].formula === 'NaCl'); chk('COMPOUNDS', 'Na+O+H gives NaOH', E.compoundsFor(['Na', 'O', 'H']).poly.some(function (x) { return x.formula === 'NaOH'; }));
    } catch (e) { chk('RUNTIME', 'exception: ' + e.message, false); }
    CHECKS.forEach(function (h) { try { h(chk, near); } catch (e) { chk('RUNTIME', 'exception in ' + (h.name || 'check') + ': ' + e.message, false); } });
    checks = res; return res;
  }

  var api = { S: S, T: T, E: E, SC: SC, ST: ST, V3: V3, U: U, $: $, $$: $$, det: det, chip: chip, badge: badge, f1: f1, fx: fx, nameOf: nameOf, molName: molName, viewers: viewers, destroyViewer: destroyViewer, plotOf: plotOf, plots: plots, ionTxt: ionTxt,
    has: function (k) { return X.en[k] !== undefined; }, getLang: function () { return lang; }, render: function () { render(); }, openMolecule: function (id) { S.mol = E.fromLibrary(id); S.ic = null; S.sp = null; S.salt = null; S.fml = null; S.tab = 'mol'; render(); } };
  if (root.BSFormula && root.BSFormula.checks) CHECKS.push(root.BSFormula.checks);                                       // typed-formula checks (bs-formula.js)
  function registerTab(id, labelKey, mod) { if (TABS.some(function (t) { return t[0] === id; })) return; TABS.push([id, labelKey]); EXT[id] = mod; }
  root.BSStudio = { api: api, registerTab: registerTab, onAction: function (n, fn) { ACTIONS[n] = fn; }, onInput: function (n, fn) { INPUTS[n] = fn; }, addChecks: function (fn) { CHECKS.push(fn); }, syncLang: syncLang, inApp: inApp, viewers: viewers, mount: mount, setLang: setLang, getLang: function () { return lang; }, state: S, selfTest: runChecks, text: X, T: T, openPair: function (a, b) { S.pair = [a, b]; S.tab = 'bond'; render(); }, openMolecule: function (id) { S.mol = E.fromLibrary(id); S.ic = null; S.sp = null; S.salt = null; S.fml = null; S.tab = 'mol'; render(); } };
})(typeof window !== 'undefined' ? window : globalThis);
