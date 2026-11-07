/* Element Rush — tolerant matching of spoken/typed text against element names.
   Pure functions (no DOM) so they can be unit-tested in Node. */
(function (root) {
'use strict';
function strip(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ'); }
function words(s) { return strip(s).split(/[^a-zα-ω]+/).filter(Boolean); }
function collapse(s) { return s.replace(/(.)\1+/g, '$1'); }
/* phonetic folding: collapses spellings that sound alike, per language */
function fold(lang, w) {
    w = strip(w).replace(/[^a-zα-ω]/g, '');
    if (lang === 'el') {
        w = w.replace(/φθ/g, 'φτ').replace(/γγ|γκ/g, 'γ').replace(/αι/g, 'ε').replace(/ει|οι|υι|η/g, 'ι').replace(/(?<![αεο])υ/g, 'ι').replace(/ω/g, 'ο');
    } else if (lang === 'es') {
        w = w.replace(/h/g, '').replace(/qu/g, 'k').replace(/gu(?=[ei])/g, 'g').replace(/g(?=[ei])/g, 'j').replace(/c(?=[ei])/g, 's').replace(/c/g, 'k').replace(/z/g, 's').replace(/v/g, 'b').replace(/ll|y/g, 'i');
    } else {
        w = w.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/y/g, 'i').replace(/^kn/, 'n');
    }
    return collapse(w);
}
function tol(len) { return len <= 4 ? 0 : len <= 7 ? 1 : len <= 11 ? 2 : 3; }
function lev(a, b, max) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
        cur[0] = i; var rowMin = i;
        for (j = 1; j <= b.length; j++) { var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1; cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c); if (cur[j] < rowMin) rowMin = cur[j]; }
        if (rowMin > max) return max + 1; var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
}
/* index = the elements of the current game, each with every accepted spelling (already folded) */
function build(elements, lang, aliases, count) {
    var al = (aliases && aliases[lang]) || {}, entries = [];
    elements.slice(0, count).forEach(function (e) {
        var names = [e[lang]].concat(al[e.s] || []), forms = [];
        names.forEach(function (nm) { var f = fold(lang, nm); if (f && forms.indexOf(f) < 0) forms.push(f); });
        entries.push({ n: e.n, s: e.s, forms: forms });
    });
    return { lang: lang, entries: entries };
}
/* best single match for one candidate string: {n,d} or null (null also when two different elements tie) */
function best(index, cand, exactOnly, target) {
    var f = fold(index.lang, cand); if (f.length < 3) return null;
    var bn = 0, bd = 99, tie = false, dt = 99;
    for (var i = 0; i < index.entries.length; i++) {
        var en = index.entries[i], d = 99;
        for (var k = 0; k < en.forms.length; k++) {
            var form = en.forms[k], m = Math.min(form.length, f.length), t = exactOnly ? 0 : tol(m), dd = lev(f, form, t);
            if (dd <= t && dd < d) d = dd;
            if (target && en.n === target && !exactOnly) { var t2 = t + (m >= 6 ? 1 : 0), d2 = lev(f, form, t2); if (d2 <= t2 && d2 < dt) dt = d2; }   /* the awaited element gets one extra edit of slack */
        }
        if (d < bd) { bd = d; bn = en.n; tie = false; } else if (d === bd && d < 99 && en.n !== bn) tie = true;
    }
    if (target && dt < 99 && dt <= bd) return { n: target, d: dt };
    if (bd === 99) return null;
    if (tie && bd > 0) return null;
    return { n: bn, d: bd };
}
/* every element named in a piece of text, in order of appearance (single words, then two words glued together) */
function analyze(index, text, exactOnly) {
    var w = words(text), out = [], seen = {}, i = 0;
    while (i < w.length) {
        var m = best(index, w[i], exactOnly), used = 1;
        if (!m && i + 1 < w.length) { var m2 = best(index, w[i] + w[i + 1], exactOnly); if (m2) { m = m2; used = 2; } }
        if (m) { if (!seen[m.n]) { seen[m.n] = 1; out.push(m); } }
        i += used;
    }
    return out;
}
/* elements whose name (any accepted spelling) starts with the folded fragment f */
function prefixMatches(index, f) {
    var out = [];
    for (var i = 0; i < index.entries.length; i++) { var en = index.entries[i]; for (var k = 0; k < en.forms.length; k++) if (en.forms[k].indexOf(f) === 0) { out.push(en.n); break; } }
    return out;
}
/* Live analysis of a (possibly still growing) transcript — this is what makes the game feel instant:
   - every word that is already followed by another word is complete  -> tolerant matching
   - the word being spoken right now (interim result)                  -> exact match, or a fragment that can only be ONE element
   - a final result                                                    -> everything is complete
   opts.target = the element the game is waiting for (ordered mode): it gets extra tolerance and wins ties. */
function analyzeLive(index, text, final, opts) {
    opts = opts || {}; var w = words(text), out = [], seen = {}, i = 0;
    while (i < w.length) {
        var last = i === w.length - 1 && !final, m = null, used = 1;
        if (!last) {
            m = best(index, w[i], false, opts.target);
            if (!m && i + 1 < w.length) { var g = best(index, w[i] + w[i + 1], false, opts.target); if (g) { m = g; used = 2; } }
        } else {
            m = best(index, w[i], true, opts.target);
            if (m) { var pm0 = prefixMatches(index, fold(index.lang, w[i])); if (pm0.some(function (n) { return n !== m.n; })) m.late = true; }   /* a complete name that is also the start of a longer one (neo / neodymium): wait a moment */
            if (!m) { var f = fold(index.lang, w[i]); if (f.length >= 4) { var pm = prefixMatches(index, f); if (pm.length === 1) m = { n: pm[0], d: 0, how: 'prefix' }; } }
        }
        if (m && !seen[m.n]) { seen[m.n] = 1; out.push(m); }
        i += used;
    }
    return out;
}
var SKIP = { el: ['πασο', 'επομενο', 'παραλειψη', 'skip'], en: ['skip', 'pass', 'next'], es: ['paso', 'pasar', 'siguiente', 'salta', 'saltar'] };
/* true when the utterance is just a "pass" command (and not an element) */
function isSkip(lang, text) { var w = words(text), list = SKIP[lang] || []; return w.length > 0 && w.length <= 2 && w.some(function (x) { return list.indexOf(x) >= 0; }); }
/* the first alternative (best transcript first) that names at least one element */
function analyzeAlts(index, alts, exactOnly) {
    for (var i = 0; i < alts.length; i++) { var r = analyze(index, alts[i], exactOnly); if (r.length) return r; }
    return [];
}
root.ERushMatcher = { strip: strip, words: words, fold: fold, lev: lev, tol: tol, build: build, best: best, analyze: analyze, analyzeAlts: analyzeAlts, analyzeLive: analyzeLive, prefixMatches: prefixMatches, isSkip: isSkip };
if (typeof module !== 'undefined' && module.exports) module.exports = root.ERushMatcher;
})(typeof window !== 'undefined' ? window : globalThis);
