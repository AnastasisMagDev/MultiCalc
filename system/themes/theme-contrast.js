/* ════════════════════════════════════════════════════════════════════════════
   theme-contrast.js  ·  MultiCalc GLOBAL CONTRAST SYSTEM  ·  v1.0
   Part of MODULE-11-THEMES (lives in the same folder, loaded by its HTML).

   WHAT IT DOES
   Keeps text, icons, buttons and inputs of the WHOLE app readable on whatever
   background theme is active (glossy gradients, flat colors, duo colors),
   without touching any module's own CSS.

   HOW (no module needs to know about it)
   1. MODULE-11 tells it the active background:  MCContrast.setTheme(desc)
   2. On every pass it measures the REAL author colors of every visible element
      (our own override sheet is switched off while measuring), works out what
      is really behind each element (theme background sampled at the element's
      position + every translucent/gradient ancestor layer on top of it) and
      computes the WCAG contrast ratio.
   3. It only touches elements whose backdrop really depends on the theme:
      text / icons sitting on the page itself or on translucent panels.
      Anything on an (almost) opaque surface - menu cards, blue/white keys,
      colored pills, toasts - was designed on its own and is left exactly as is.
   4. Of those, only clear failures change (text < 3.5:1, large text < 3:1,
      icons < 2.2:1, invisible buttons). Replacement colors come from a small
      consistent set: near-white or near-black, dim variants for secondary text;
      colorful text keeps its hue only on calm pages and turns neutral on vivid
      ones (colored text on a colored page vibrates). Never shadows or glows.
      Elements that already read well are untouched, so the default theme is
      left exactly as designed.
   5. Overrides live in ONE <style id="mc-contrast-sheet">, matched through a
      data-mc-fx attribute. No inline styles, nothing to undo, nothing stale.

   PUBLIC API  (window.MCContrast)
     setTheme(desc)      desc = {angle:135, stops:[['#hex',0..1],...]}  or {flat:'#hex'}
     syncFromBody()      read the theme from body's computed background instead
     refresh()           re-check now (call after you render lots of new UI)
     setEnabled(bool) / isEnabled()   master switch, saved in localStorage
     report()            numbers of the last pass
     onPass(fn)          fn(report) after every pass
     palette()           current palette (CSS variables below)
   CSS variables set on :root for any new code:
     --mc-text  --mc-text-dim  --mc-surface  --mc-surface-strong
     --mc-border  --mc-accent  --mc-on-accent        + html[data-mc-mode=dark|light]
   Opt-out for a subtree: add the attribute  data-mc-skip

   FILE MAP:  §0 config · §1 color math · §2 gradients · §3 palette ·
              §4 fixing rules · §5 DOM measuring · §6 pass + stylesheet ·
              §7 scheduling · §8 public API
   ════════════════════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
if (root.MCContrast && root.MCContrast.__engine) return;

/* ═══ §0 · CONFIG ═══ */
var CFG = {
    textMin: 4.5,            // target a fixed normal text reaches
    largeMin: 3,             // target for large text (>=24px, or >=18.66px bold)
    graphicMin: 3,           // target for icons / svg shapes
    textFloor: 3.5,          // only act when the real contrast is below this (keeps designed pairs such as
    largeFloor: 3,           //   white on the indigo->purple buttons untouched; clear failures get fixed)
    graphicFloor: 2.2,
    largePx: 24, largeBoldPx: 18.66,
    minTheme: 0.25,          // only touch an element when at least this much of the THEME shows through its backdrop;
                             //   cards / keys / buttons with an (almost) opaque surface were designed on their own, leave them
    ringBelow: 1.12,         // a control whose fill is this close to its backdrop is "invisible"
    ringBorderBelow: 1.3,    //   ...and its border is weaker than the app's own glass-border look (≈1.34) -> add a boundary
    ringTarget: 2.5,
    pinDeviation: 1.3,       // a translucent panel / button / input whose look on this theme drifts further than this
                             //   (contrast ratio) from its look on the default dark theme is "pinned": it becomes a
                             //   dense surface in its designed color, so the app keeps its designed look on every theme
    pinAlpha: 0.94,
    designBase: '#141c30',   // the page color the app was designed on (default theme)
    brokenText: 1.8,         // text on a surface that was designed on its own (opaque card...) is only fixed when it
    brokenIcon: 1.4,         //   is practically invisible (average backdrop), never for marginal pairs
    takeOverLegacy: true,    // silence the old light-theme guard (mcCheckThemeLightness) and its body.theme-light class
    lMin: 0.04, lMax: 0.97,  // lightness limits for adjusted colors (no pure black/white)
    maxElements: 4000,       // safety cap per pass
    minGapMs: 300,           // minimum time between background passes
    debounceMs: 120,
    storageKey: 'multicalc_contrast'   // 'off' disables (multicalc_ prefix => included in Backup)
};
var SKIP_TAGS = {SCRIPT:1,STYLE:1,LINK:1,META:1,HEAD:1,TITLE:1,CANVAS:1,IFRAME:1,VIDEO:1,AUDIO:1,IMG:1,
    PICTURE:1,OBJECT:1,EMBED:1,NOSCRIPT:1,TEMPLATE:1,BR:1,HR:1,OPTION:1,OPTGROUP:1,DATALIST:1};
var SKIP_IDS = {splashOverlay:1,'app-splash':1,'theme-overlay':1,'live-theme-layer':1,'mc-diag-btn':1,'mc-diag-panel':1};
var SVG_SHAPES = {path:1,circle:1,rect:1,line:1,polyline:1,polygon:1,ellipse:1,text:1,tspan:1};
var CONTROL_TAGS = {BUTTON:1,INPUT:1,SELECT:1,TEXTAREA:1,SUMMARY:1};
var NON_TEXT_INPUT = {checkbox:1,radio:1,range:1,color:1,file:1,hidden:1,image:1};

/* ═══ §1 · COLOR MATH (pure) ═══ */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function num(s) { s = String(s).trim(); return s.charAt(s.length - 1) === '%' ? parseFloat(s) / 100 : parseFloat(s); }

function parseColor(str) {
    if (str === null || str === undefined) return null;
    var s = String(str).trim().toLowerCase(), m;
    if (!s) return null;
    if (s === 'transparent') return {r:0,g:0,b:0,a:0};
    if (s.charAt(0) === '#') {
        var h = s.slice(1);
        if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
        if (h.length !== 6 && h.length !== 8) return null;
        if (!/^[0-9a-f]+$/.test(h)) return null;
        return {r:parseInt(h.substr(0,2),16), g:parseInt(h.substr(2,2),16), b:parseInt(h.substr(4,2),16),
                a:h.length === 8 ? parseInt(h.substr(6,2),16) / 255 : 1};
    }
    m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
        var p = m[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
        if (p.length < 3) return null;
        function ch(v) { v = String(v); return v.charAt(v.length - 1) === '%' ? parseFloat(v) * 2.55 : parseFloat(v); }
        var c = {r:ch(p[0]), g:ch(p[1]), b:ch(p[2]), a:p.length > 3 ? num(p[3]) : 1};
        if (isNaN(c.r) || isNaN(c.g) || isNaN(c.b) || isNaN(c.a)) return null;
        return c;
    }
    m = s.match(/^color\(srgb\s+([^)]+)\)$/);
    if (m) {
        var q = m[1].replace(/\//g, ' ').split(/\s+/).filter(Boolean);
        if (q.length < 3) return null;
        return {r:parseFloat(q[0]) * 255, g:parseFloat(q[1]) * 255, b:parseFloat(q[2]) * 255, a:q.length > 3 ? num(q[3]) : 1};
    }
    return null;
}
function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lum(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
function ratio(a, b) {
    var la = lum(a), lb = lum(b), hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}
function over(top, bot) {                       // alpha composite (bot normally opaque)
    var a = top.a === undefined ? 1 : top.a;
    if (a >= 0.999) return {r:top.r, g:top.g, b:top.b, a:1};
    var ba = bot.a === undefined ? 1 : bot.a, oa = a + ba * (1 - a);
    if (oa <= 0) return {r:0,g:0,b:0,a:0};
    return {r:(top.r * a + bot.r * ba * (1 - a)) / oa, g:(top.g * a + bot.g * ba * (1 - a)) / oa,
            b:(top.b * a + bot.b * ba * (1 - a)) / oa, a:oa};
}
function hex2(v) { v = Math.round(clamp(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); }
function toHex(c) { return '#' + hex2(c.r) + hex2(c.g) + hex2(c.b); }
function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r,g,b), mn = Math.min(r,g,b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
        var d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h /= 6;
    }
    return {h:h, s:s, l:l};
}
function fromHsl(h, s, l) {
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; }
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else { var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p,q,h + 1/3); g = f(p,q,h); b = f(p,q,h - 1/3); }
    return {r:r * 255, g:g * 255, b:b * 255, a:1};
}
function colorsIn(str) {                        // every color token inside a computed css value
    var out = [], re = /rgba?\([^)]*\)|color\(srgb[^)]*\)/gi, m, c;
    str = String(str || '');
    while ((m = re.exec(str))) { c = parseColor(m[0]); if (c) out.push({tok:m[0], c:c}); }
    return out;
}
function dedupe(list, cap) {
    var seen = {}, out = [], i, k;
    for (i = 0; i < list.length; i++) {
        k = Math.round(list[i].r) + '|' + Math.round(list[i].g) + '|' + Math.round(list[i].b);
        if (!seen[k]) { seen[k] = 1; out.push(list[i]); }
    }
    if (out.length > cap) {
        out.sort(function (a, b) { return lum(a) - lum(b); });
        var pick = [], step = (out.length - 1) / (cap - 1);
        for (i = 0; i < cap; i++) pick.push(out[Math.round(i * step)]);
        out = pick;
    }
    return out;
}

/* ═══ §2 · GRADIENTS (pure) ═══ */
function splitTop(s) {
    var out = [], d = 0, cur = '', i, ch;
    for (i = 0; i < s.length; i++) {
        ch = s.charAt(i);
        if (ch === '(') d++; else if (ch === ')') d--;
        if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}
function parseLinear(str) {                     // first linear-gradient(...) in a css value -> {angle, stops:[{c,p}]} | null
    str = String(str || '');
    var i = str.toLowerCase().indexOf('linear-gradient(');
    if (i < 0) return null;
    var j = i + 16, d = 1, k;
    for (k = j; k < str.length && d > 0; k++) { if (str.charAt(k) === '(') d++; else if (str.charAt(k) === ')') d--; }
    var parts = splitTop(str.slice(j, k - 1)), angle = 180, first = parts[0] || '', m;
    if ((m = first.match(/^(-?[\d.]+)(deg|turn|rad)$/i))) {
        angle = parseFloat(m[1]) * (m[2].toLowerCase() === 'turn' ? 360 : (m[2].toLowerCase() === 'rad' ? 180 / Math.PI : 1)); parts.shift();
    } else if (/^to\s/i.test(first)) {
        var map = {'to top':0,'to right':90,'to bottom':180,'to left':270,'to top right':45,'to right top':45,
                   'to bottom right':135,'to right bottom':135,'to bottom left':225,'to left bottom':225,'to top left':315,'to left top':315};
        angle = map[first.toLowerCase().replace(/\s+/g, ' ')]; if (angle === undefined) angle = 180; parts.shift();
    }
    var stops = [], t, mm, c;
    for (var n = 0; n < parts.length; n++) {
        t = parts[n]; mm = t.match(/^(.*?)((?:\s+-?[\d.]+%)+)?$/);
        c = parseColor(mm[1]); if (!c) return null;
        var ps = mm[2] ? mm[2].trim().split(/\s+/).map(function (v) { return parseFloat(v) / 100; }) : [null];
        for (var q = 0; q < ps.length; q++) stops.push({c:c, p:ps[q]});
    }
    if (stops.length < 1) return null;
    if (stops[0].p === null) stops[0].p = 0;
    if (stops[stops.length - 1].p === null) stops[stops.length - 1].p = 1;
    var a = 0;
    for (n = 1; n < stops.length; n++) {         // fill missing positions, keep monotonic
        if (stops[n].p === null) {
            var b = n; while (stops[b].p === null) b++;
            for (var z = n; z < b; z++) stops[z].p = stops[a].p + (stops[b].p - stops[a].p) * (z - a) / (b - a);
        }
        if (stops[n].p < stops[n - 1].p) stops[n].p = stops[n - 1].p;
        a = n;
    }
    return {angle:angle, stops:stops};
}
function gradColorAt(stops, t) {
    if (t <= stops[0].p) return stops[0].c;
    var last = stops[stops.length - 1];
    if (t >= last.p) return last.c;
    for (var i = 0; i < stops.length - 1; i++) {
        var a = stops[i], b = stops[i + 1];
        if (t >= a.p && t < b.p) {
            var f = (t - a.p) / (b.p - a.p);
            return {r:a.c.r + (b.c.r - a.c.r) * f, g:a.c.g + (b.c.g - a.c.g) * f, b:a.c.b + (b.c.b - a.c.b) * f, a:1};
        }
    }
    return last.c;
}
function makeTheme(desc) {                      // desc -> {flat?, angle, stops:[{c,p}], at(x,y,W,H)}
    if (!desc) return null;
    var th;
    if (desc.flat) {
        var fc = parseColor(desc.flat); if (!fc) return null; fc.a = 1;
        th = {flat:fc, angle:0, stops:[{c:fc,p:0},{c:fc,p:1}]};
    } else if (desc.stops && desc.stops.length) {
        var st = desc.stops.map(function (s) { var c = parseColor(s[0]); if (c) c.a = 1; return {c:c, p:s[1]}; });
        for (var i = 0; i < st.length; i++) if (!st[i].c) return null;
        th = {angle:desc.angle === undefined ? 180 : desc.angle, stops:st};
    } else if (desc.css) {
        var g = parseLinear(desc.css);
        if (!g) { var cs = colorsIn(desc.css); if (!cs.length) return null; return makeTheme({flat:toHex(cs[0].c)}); }
        th = {angle:g.angle, stops:g.stops.map(function (s) { return {c:{r:s.c.r,g:s.c.g,b:s.c.b,a:1}, p:s.p}; })};
    } else return null;
    th.at = function (x, y, W, H) {
        if (th.flat) return th.flat;
        var r = th.angle * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), L = Math.abs(W * dx) + Math.abs(H * dy);
        if (L < 1) return th.stops[0].c;
        return gradColorAt(th.stops, ((x - W / 2) * dx + (y - H / 2) * dy) / L + 0.5);
    };
    return th;
}
function pageSamples(th, W, H, nx, ny) {        // colors over the whole page (for palette)
    var out = [];
    for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) out.push(th.at(W * (i + 0.5) / nx, H * (j + 0.5) / ny, W, H));
    return dedupe(out, 24);
}

/* ═══ §3 · PALETTE (pure) ═══ */
function minRatio(c, S, alpha) {                // worst contrast of color c over every possible backdrop in S
    var m = Infinity, col = {r:c.r, g:c.g, b:c.b, a:alpha === undefined ? 1 : alpha};
    for (var i = 0; i < S.length; i++) { var r = ratio(over(col, S[i]), S[i]); if (r < m) m = r; }
    return m;
}
function derivePalette(th, W, H) {
    var S = pageSamples(th, W || 800, H || 1200, 5, 5), avg = 0, i;
    for (i = 0; i < S.length; i++) avg += lum(S[i]);
    avg /= S.length;
    var dark = avg < 0.179, sum = {r:0,g:0,b:0};
    for (i = 0; i < S.length; i++) { sum.r += S[i].r; sum.g += S[i].g; sum.b += S[i].b; }
    var mean = {r:sum.r / S.length, g:sum.g / S.length, b:sum.b / S.length, a:1}, hs = toHsl(mean);
    var hue = hs.s > 0.12 ? hs.h : 0.64;
    function mk(l, s, target) {
        var a = adjust(fromHsl(hue, s, l), S, target, {dirLight:dark, alpha:1});
        return a.c;
    }
    var text = mk(dark ? 0.96 : 0.08, 0.22, 7), dim = mk(dark ? 0.76 : 0.28, 0.16, 4.5),
        accent = mk(dark ? 0.68 : 0.36, 0.85, 4.5);
    var onAcc = ratio({r:255,g:255,b:255}, accent) >= ratio({r:0,g:0,b:0}, accent) ? '#ffffff' : '#0b0f19';
    return {
        mode: dark ? 'dark' : 'light', avgLum: avg, bg: toHex(mean),
        text: toHex(text), textDim: toHex(dim), accent: toHex(accent), onAccent: onAcc,
        surface: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        surfaceStrong: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
        border: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'
    };
}

/* ═══ §4 · FIXING RULES (pure) ═══ */
/* Returns the closest color to `orig` (same hue, lightness mirrored if it sits on the wrong side)
   that reaches `target` contrast on EVERY backdrop in S. */
function adjust(orig, S, target, opts) {
    opts = opts || {};
    var alpha = opts.alpha === undefined ? 1 : opts.alpha;
    var white = {r:255,g:255,b:255}, black = {r:0,g:0,b:0};
    var dirLight = opts.dirLight !== undefined ? opts.dirLight : (minRatio(white, S, alpha) >= minRatio(black, S, alpha));
    var hsl = toHsl(orig), L = hsl.l;
    if (dirLight && L < 0.5) L = 1 - L; else if (!dirLight && L > 0.5) L = 1 - L;
    L = clamp(L, CFG.lMin, CFG.lMax);
    var best = null, cur, r;
    for (var i = 0; i < 60; i++) {
        cur = fromHsl(hsl.h, hsl.s, L); r = minRatio(cur, S, alpha);
        if (r >= target) return {c:cur, ratio:r, ok:true, dirLight:dirLight};
        if (!best || r > best.ratio) best = {c:cur, ratio:r, ok:false, dirLight:dirLight};
        L += dirLight ? 0.02 : -0.02;
        if (L > CFG.lMax || L < CFG.lMin) break;
    }
    /* One direction was not enough (e.g. a white|black duo background, where only a mid tone
       works on both sides): scan the whole lightness range, take the candidate that reaches the
       target and sits nearest to the start, otherwise the one with the best worst-case ratio. */
    var start = clamp((dirLight && hsl.l < 0.5) || (!dirLight && hsl.l > 0.5) ? 1 - hsl.l : hsl.l, CFG.lMin, CFG.lMax);
    var pick = null, pickD = Infinity, top = null, sat = Math.min(hsl.s, 0.35);
    for (var l = CFG.lMin; l <= CFG.lMax + 1e-9; l += 0.01) {
        cur = fromHsl(hsl.h, sat, l); r = minRatio(cur, S, alpha);
        if (!top || r > top.ratio) top = {c:cur, ratio:r, ok:r >= target, dirLight:dirLight};
        if (r >= target && Math.abs(l - start) < pickD) { pickD = Math.abs(l - start); pick = {c:cur, ratio:r, ok:true, dirLight:dirLight}; }
    }
    if (pick) return pick;
    return (!best || top.ratio > best.ratio) ? top : best;
}

/* Boundary / outline color: as close to the backdrop as possible while still reaching `target` on every
   backdrop in S (so a rescued control gets a quiet outline, not a bright frame). */
function edgeColor(S, hue, sat, target) {
    var avg = 0, i;
    for (i = 0; i < S.length; i++) avg += toHsl(S[i]).l;
    avg /= S.length;
    var pick = null, pickD = Infinity, top = null, c, r, l;
    for (l = CFG.lMin; l <= CFG.lMax + 1e-9; l += 0.01) {
        c = fromHsl(hue, sat, l); r = minRatio(c, S, 1);
        if (!top || r > top.ratio) top = {c:c, ratio:r, ok:r >= target};
        if (r >= target && Math.abs(l - avg) < pickD) { pickD = Math.abs(l - avg); pick = {c:c, ratio:r, ok:true}; }
    }
    return pick || top;
}

/* ═══ §5 · DOM MEASURING ═══ */
var doc = root.document, S0 = null;            // S0 = engine state, created in §6
function now() { return (root.performance && performance.now) ? performance.now() : Date.now(); }

function hasDirectText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
}
function textRect(el) {                         // tight box around the element's own text (falls back to its box)
    var r = null, rg;
    try {
        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType !== 3 || !/\S/.test(n.nodeValue)) continue;
            rg = rg || doc.createRange(); rg.selectNodeContents(n);
            var b = rg.getBoundingClientRect();
            if (b.width > 0 && b.height > 0) {
                if (!r) r = {left:b.left, top:b.top, right:b.right, bottom:b.bottom};
                else { r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
            }
        }
    } catch (e) {}
    if (!r) { var e0 = el.getBoundingClientRect(); return e0; }
    return {left:r.left, top:r.top, width:r.right - r.left, height:r.bottom - r.top};
}
function layerOf(el, ctx, csIn) {               // what this element paints behind its children
    if (ctx.layers.has(el)) return ctx.layers.get(el);
    var cs = csIn || root.getComputedStyle(el), hasGrad = false;
    var L = {colors:null, orig:null, opaque:false, uncertain:false, op:1, clipText:false, amin0:1, aminNow:1, scrimmable:false, pinned:false};
    var op = parseFloat(cs.opacity); L.op = isNaN(op) ? 1 : op;
    var bgc = parseColor(cs.backgroundColor), img = cs.backgroundImage || '', cols = [];
    L.clipText = (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text');
    if (!L.clipText) {
        hasGrad = img.indexOf('gradient(') >= 0;
        if (img.indexOf('url(') >= 0) L.uncertain = true;
        if (hasGrad) {
            var gc = colorsIn(img);
            for (var i = 0; i < gc.length; i++) cols.push(bgc && bgc.a > 0 ? over(gc[i].c, bgc) : gc[i].c);
        } else if (bgc && bgc.a > 0) cols.push(bgc);
        if (cols.length) {
            L.colors = cols; L.orig = cols.slice(); L.opaque = true;
            for (var k = 0; k < cols.length; k++) { if (cols[k].a < 0.99) L.opaque = false; L.amin0 = Math.min(L.amin0, cols[k].a); }
            L.aminNow = L.amin0;
            L.scrimmable = (!hasGrad && cols.length === 1 && cols[0].a >= 0.02 && cols[0].a < 0.93);
        }
    }
    ctx.layers.set(el, L);
    return L;
}
function applyLayer(Sx, L) {
    if (L.opaque) return dedupe(L.colors.map(function (c) { return {r:c.r,g:c.g,b:c.b,a:1}; }), 24);
    var out = [];
    for (var i = 0; i < Sx.length; i++) for (var j = 0; j < L.colors.length; j++) out.push(over(L.colors[j], Sx[i]));
    return dedupe(out, 24);
}
function themeSamples(rect, ctx) {
    var th = S0.theme;
    if (th.flat) return [th.flat];
    var W = ctx.bodyRect.width || root.innerWidth, H = Math.max(ctx.bodyRect.height, root.innerHeight), out = [], i, j;
    var fx = (rect.width < 6) ? [0.5] : [0.02, 0.18, 0.34, 0.5, 0.66, 0.82, 0.98], fy = (rect.height < 6) ? [0.5] : [0.1, 0.9];
    for (i = 0; i < fx.length; i++) for (j = 0; j < fy.length; j++)
        out.push(th.at(rect.left + rect.width * fx[i] - ctx.bodyRect.left, rect.top + rect.height * fy[j] - ctx.bodyRect.top, W, H));
    return dedupe(out, 24);
}
/* what is behind `el`: {S:[colors], op} or {S:null} when unknowable (photo background) */
/* Surfaces designed to be translucent (glass panels, ghost buttons, inputs) only look right on the dark
   page they were drawn for. On any other theme they turn into mud: pale, see-through, unreadable.
   So every such surface is compared with how it looks on the design page; when it drifts, it is "pinned":
   rewritten as a dense surface in its designed color (default-theme look, on every theme).
   Decided outer -> inner, so a panel is settled before the things sitting on it. */
function meanLayer(colors) {
    var r = 0, g = 0, b = 0, a = 0, i;
    for (i = 0; i < colors.length; i++) { r += colors[i].r; g += colors[i].g; b += colors[i].b; a += colors[i].a; }
    return {r:r / colors.length, g:g / colors.length, b:b / colors.length, a:a / colors.length};
}
function designColor(n, L, ctx) {
    var layers = [], p = n.parentElement, base = parseColor(CFG.designBase), i, m;
    while (p && p !== ctx.body && p !== doc.documentElement) { var PL = layerOf(p, ctx); if (PL.orig) layers.push(PL); p = p.parentElement; }
    for (i = layers.length - 1; i >= 0; i--) { m = meanLayer(layers[i].orig); base = (m.a >= 0.99) ? {r:m.r, g:m.g, b:m.b, a:1} : over(m, base); }
    return over(L.orig[0], base);
}
function decidePin(n, ctx) {
    ctx.pinDone.add(n);
    var L = layerOf(n, ctx);
    if (!L.scrimmable || L.uncertain) return;
    var rect = n.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 18) return;
    var bd = backdropCore(n, rect, false, ctx);
    if (!bd.S) return;
    var D = designColor(n, L, ctx), orig = L.orig[0], worst = 1;
    for (var i = 0; i < bd.S.length; i++) worst = Math.max(worst, ratio(over(orig, bd.S[i]), D));
    if (worst <= CFG.pinDeviation) return;
    var c = {r:D.r, g:D.g, b:D.b, a:CFG.pinAlpha};
    L.colors = [c]; L.opaque = false; L.aminNow = c.a; L.pinned = true;
    ctx.scrims.set(n, c);
}
function ensurePins(start, ctx) {
    var chain = [], n = start;
    while (n && n !== ctx.body && n !== doc.documentElement) { if (!ctx.pinDone.has(n)) chain.push(n); n = n.parentElement; }
    for (var i = chain.length - 1; i >= 0; i--) decidePin(chain[i], ctx);
}
/* what is behind `el`: {S:[colors], op, T} or {S:null} when unknowable (photo background).
   T = how much of the THEME still shows through all the translucent layers on top of it. */
function backdropCore(el, rect, includeOwn, ctx) {
    var chain = [], op = 1, T = 1, n = el, L, i;
    while (n && n !== ctx.body && n !== doc.documentElement) {
        L = layerOf(n, ctx); op *= L.op;
        if (n !== el || includeOwn) {
            if (L.uncertain) return {S:null, op:op, T:0};
            if (L.colors) { chain.push(L); T *= (1 - L.aminNow); }
        }
        n = n.parentElement;
    }
    var Sx = themeSamples(rect, ctx);
    for (i = chain.length - 1; i >= 0; i--) Sx = applyLayer(Sx, chain[i]);
    return {S:Sx, op:op, T:T};
}
function backdropOf(el, rect, includeOwn, ctx) {
    ensurePins(includeOwn ? el : el.parentElement, ctx);
    return backdropCore(el, rect, includeOwn, ctx);
}
/* Picks the replacement color for text / icons that cannot be read on their backdrop.
   - neutral (white / gray) originals become the app's two neutrals: near-white or near-black,
     whichever reads better; secondary (dim) originals get a softened variant of it, so the
     hierarchy survives and the whole app ends up with a handful of consistent tones;
   - colorful originals (amber, green, red...) keep their hue only on calm (neutral) pages;
     on vivid pages (red, green, blue...) they turn neutral, because colored text on a
     colored page vibrates even when the numbers say it is readable.
   Never adds shadows or glows. */
var LIGHT_BASE = {r:245,g:247,b:251,a:1}, DARK_BASE = {r:11,g:15,b:25,a:1};
function meanOf(S) {
    var r = 0, g = 0, b = 0, i;
    for (i = 0; i < S.length; i++) { r += S[i].r; g += S[i].g; b += S[i].b; }
    return {r:r / S.length, g:g / S.length, b:b / S.length, a:1};
}
function mixc(a, b, t) { return {r:a.r + (b.r - a.r) * t, g:a.g + (b.g - a.g) * t, b:a.b + (b.b - a.b) * t, a:1}; }
/* contrast of `c` over the AVERAGE backdrop: used to catch pairs that are practically invisible */
function meanRatio(c, alpha, S) { var m = meanOf(S); return ratio(over({r:c.r, g:c.g, b:c.b, a:alpha}, m), m); }
function recolor(orig, S, target, alpha) {
    var hs = toHsl(orig), mean = meanOf(S), mh = toHsl(mean);
    var chromatic = hs.s >= 0.35 && hs.l > 0.12 && hs.l < 0.92;
    var vivid = mh.s >= 0.35 && mh.l > 0.15 && mh.l < 0.85;
    if (chromatic && !vivid) return adjust(orig, S, target, {alpha:alpha});
    var mrL = minRatio(LIGHT_BASE, S, alpha), mrD = minRatio(DARK_BASE, S, alpha), wantLight = hs.l > 0.5, base;
    if (mrL >= target && mrD >= target) base = wantLight ? LIGHT_BASE : DARK_BASE;
    else base = (mrL >= mrD) ? LIGHT_BASE : DARK_BASE;
    var dim = orig.a < 0.85 || (hs.s < 0.35 && hs.l > 0.2 && hs.l < 0.88), c, r;
    if (dim) for (var k = 0.3; k >= 0; k -= 0.06) { c = mixc(base, mean, k); r = minRatio(c, S, alpha); if (r >= target) return {c:c, ratio:r, ok:true}; }
    r = minRatio(base, S, alpha);
    if (r >= target) return {c:base, ratio:r, ok:true};
    return adjust(base, S, target, {alpha:alpha});   // seam of a duo background etc.: best neutral tone available
}

function isLargeText(cs) {
    var px = parseFloat(cs.fontSize) || 16, w = parseInt(cs.fontWeight, 10) || 400;
    return px >= CFG.largePx || (px >= CFG.largeBoldPx && w >= 700);
}

function evaluate(el, cs, ctx) {
    var tag = el.tagName, isSvg = !!SVG_SHAPES[tag], isControl = !!CONTROL_TAGS[tag] || el.getAttribute('role') === 'button';
    if (tag === 'INPUT' && NON_TEXT_INPUT[(el.type || '').toLowerCase()]) isControl = isControl && false;
    var direct = hasDirectText(el), textual = direct || ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && !NON_TEXT_INPUT[(el.type || '').toLowerCase()]);
    if (!isSvg && !textual && !isControl) return null;
    var decl = {}, any = false, log = null, rect;

    /* ── SVG shapes: fill / stroke as graphics (text inside svg as text) ── */
    if (isSvg) {
        rect = el.getBoundingClientRect(); if (rect.width <= 0 && rect.height <= 0) return null;
        var bd = backdropOf(el, rect, false, ctx); if (!bd.S) return null;
        var dep = bd.T >= CFG.minTheme;
        var isTxt = (tag === 'text' || tag === 'tspan'), target = isTxt ? CFG.textMin : CFG.graphicMin, floor = isTxt ? CFG.textFloor : CFG.graphicFloor;
        var fc = parseColor(cs.fill), sc = parseColor(cs.stroke), sw = parseFloat(cs.strokeWidth) || 0;
        if (fc && fc.a > 0 && cs.fill !== 'none') {
            var fa = fc.a * bd.op, mr = dep ? minRatio(fc, bd.S, fa) : meanRatio(fc, fa, bd.S);
            if (mr < (dep ? floor : (isTxt ? CFG.brokenText : CFG.brokenIcon))) { var af = recolor(fc, bd.S, target, bd.op); decl.svgFill = toHex(af.c); ctx.stats.svg++; any = true; log = log || {kind:'svg-fill', from:toHex(fc), to:decl.svgFill, before:mr, after:af.ratio}; }
        }
        if (sc && sc.a > 0 && sw > 0 && cs.stroke !== 'none') {
            var sa = sc.a * bd.op, ms = dep ? minRatio(sc, bd.S, sa) : meanRatio(sc, sa, bd.S);
            if (ms < (dep ? floor : (isTxt ? CFG.brokenText : CFG.brokenIcon))) { var as = recolor(sc, bd.S, target, bd.op); decl.svgStroke = toHex(as.c); ctx.stats.svg++; any = true; log = log || {kind:'svg-stroke', from:toHex(sc), to:decl.svgStroke, before:ms, after:as.ratio}; }
        }
        return any ? {decl:decl, log:log} : null;
    }

    rect = textual ? textRect(el) : el.getBoundingClientRect();
    var box = el.getBoundingClientRect();
    if (box.width <= 0 && box.height <= 0) return null;
    if (rect.width <= 0 || rect.height <= 0) rect = box;

    /* ── text / gradient text ── */
    if (textual) {
        var clip = (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text'), img = cs.backgroundImage || '';
        if (clip && img.indexOf('gradient(') >= 0) {
            var bg1 = backdropOf(el, rect, false, ctx);
            if (bg1.S && bg1.T >= CFG.minTheme) {
                var toks = colorsIn(img), worst = Infinity, k;
                for (k = 0; k < toks.length; k++) worst = Math.min(worst, minRatio(toks[k].c, bg1.S, toks[k].c.a * bg1.op));
                var big = isLargeText(cs), need = big ? CFG.largeMin : CFG.textMin;
                if (worst < (big ? CFG.largeFloor : CFG.textFloor)) {
                    var dl = minRatio({r:255,g:255,b:255}, bg1.S, bg1.op) >= minRatio({r:0,g:0,b:0}, bg1.S, bg1.op), out = img, after = Infinity;
                    for (k = 0; k < toks.length; k++) {
                        var ag = adjust(toks[k].c, bg1.S, need, {dirLight:dl, alpha:bg1.op}); after = Math.min(after, ag.ratio);
                        out = out.split(toks[k].tok).join(toHex(ag.c));
                    }
                    decl.grad = out; ctx.stats.grad++; any = true;
                    log = log || {kind:'gradient-text', from:'gradient', to:'gradient*', before:worst, after:after};
                }
            }
        } else {
            var bd2 = backdropOf(el, rect, true, ctx);
            if (bd2.S) {
                var tc = parseColor(cs.color), tf = parseColor(cs.webkitTextFillColor), pc = (tf && tf.a > 0) ? tf : tc;
                if (pc && pc.a > 0) {
                    var dep2 = bd2.T >= CFG.minTheme, big2 = isLargeText(cs), ea = pc.a * bd2.op, need2 = big2 ? CFG.largeMin : CFG.textMin;
                    var m2 = dep2 ? minRatio(pc, bd2.S, ea) : meanRatio(pc, ea, bd2.S);
                    if (m2 < (dep2 ? (big2 ? CFG.largeFloor : CFG.textFloor) : CFG.brokenText)) {
                        var at = recolor(pc, bd2.S, need2, bd2.op);
                        decl.color = toHex(at.c); ctx.stats.text++; any = true;
                        log = log || {kind:'text', from:toHex(pc), to:toHex(at.c), before:m2, after:at.ratio};
                    }
                }
            }
        }
    }

    /* ── placeholder text of inputs / textareas ── */
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && el.getAttribute('placeholder') && !NON_TEXT_INPUT[(el.type || '').toLowerCase()]) {
        var bdp = backdropOf(el, box, true, ctx);
        if (bdp.S && bdp.T >= CFG.minTheme) {
            var pcs = null, pcol = null;
            try { pcs = root.getComputedStyle(el, '::placeholder'); pcol = parseColor(pcs.color); } catch (e) {}
            if (pcol && pcol.a > 0) {
                var pe = pcol.a * bdp.op, pm = minRatio(pcol, bdp.S, pe);
                if (pm < CFG.textFloor) {
                    var pa = recolor(pcol, bdp.S, CFG.textMin, bdp.op);
                    decl.ph = toHex(pa.c); ctx.stats.text++; any = true;
                    log = log || {kind:'placeholder', from:toHex(pcol), to:toHex(pa.c), before:pm, after:pa.ratio};
                }
            }
        }
    }

    /* ── controls: make sure the control itself can be seen ── */
    if (isControl && !(tag === 'INPUT' && NON_TEXT_INPUT[(el.type || '').toLowerCase()])) {
        var bd3 = backdropOf(el, box, false, ctx);
        if (bd3.S && bd3.T >= CFG.minTheme) {
            var own = layerOf(el, ctx), bw = parseFloat(cs.borderTopWidth) || 0, bcol = parseColor(cs.borderTopColor);
            var hasBorder = bw > 0 && cs.borderTopStyle !== 'none' && bcol && bcol.a > 0;
            if (own.colors || hasBorder) {
                var surf = Infinity, i, j;
                if (own.colors) for (i = 0; i < bd3.S.length; i++) for (j = 0; j < own.colors.length; j++)
                    surf = Math.min(surf, ratio(over(own.colors[j], bd3.S[i]), bd3.S[i]));
                var brd = hasBorder ? minRatio(bcol, bd3.S, bcol.a) : 0;
                if (surf < CFG.ringBelow && brd < CFG.ringBorderBelow) {
                    var seed = decl.color ? parseColor(decl.color) : (parseColor(cs.color) || {r:255,g:255,b:255,a:1});
                    var sh = toHsl(seed), ar = edgeColor(bd3.S, sh.h, Math.min(sh.s, 0.3), CFG.ringTarget);
                    if (hasBorder) decl.border = toHex(ar.c);
                    else decl.ring = toHex(ar.c) + '|' + (cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : '');
                    ctx.stats.ring++; any = true;
                    log = log || {kind:'control-boundary', from:'invisible', to:toHex(ar.c), before:Math.min(surf, 99), after:ar.ratio, border:brd};
                }
            }
        }
    }
    return any ? {decl:decl, log:log} : null;
}
function cssColor(hex, a) {
    if (a === undefined || a >= 0.999) return hex;
    var c = parseColor(hex);
    return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + (Math.round(a * 100) / 100) + ')';
}
function declText(d) {
    var s = '';
    if (d.color) s += 'color:' + d.color + ' !important;-webkit-text-fill-color:' + d.color + ' !important;';
    if (d.grad) s += 'background-image:' + d.grad + ' !important;';
    if (d.scrim) s += 'background-color:' + d.scrim + ' !important;';
    if (d.svgFill) s += 'fill:' + d.svgFill + ' !important;';
    if (d.svgStroke) s += 'stroke:' + d.svgStroke + ' !important;';
    if (d.border) s += 'border-color:' + d.border + ' !important;';
    if (d.ring) { var p = d.ring.split('|'); s += 'box-shadow:inset 0 0 0 1px ' + p[0] + (p[1] ? ',' + p[1] : '') + ' !important;'; }
    if (d.ph) s += '@@PH@@' + d.ph;
    return s;
}
function walk(rootEl, ctx) {
    var stack = [rootEl], el, cs, res, kid, layer;
    while (stack.length) {
        el = stack.pop();
        if (ctx.visited >= CFG.maxElements) { ctx.capped = true; return; }
        if (SKIP_TAGS[el.tagName] || (el.id && SKIP_IDS[el.id]) || (el.hasAttribute && el.hasAttribute('data-mc-skip'))) continue;
        cs = root.getComputedStyle(el);
        if (cs.display === 'none') continue;
        ctx.visited++;
        try {                                   // one odd element must never stop the pass
            layer = layerOf(el, ctx, cs);
            if (layer.scrimmable) ensurePins(el, ctx);
            if (cs.visibility !== 'hidden') {
                res = evaluate(el, cs, ctx);
                if (res) { ctx.fixes.push({el:el, decl:res.decl}); if (S0.debug && res.log) { res.log.el = el; ctx.items.push(res.log); } }
                else if (el.hasAttribute('data-mc-fx')) ctx.clear.push(el);
            }
        } catch (err) { ctx.errors++; if (!ctx.firstError) ctx.firstError = err; }
        for (kid = el.lastElementChild; kid; kid = kid.previousElementSibling) stack.push(kid);
    }
}

/* ═══ §6 · PASS + STYLESHEET ═══ */
S0 = {
    enabled: true, theme: null, palette: null, epoch: 0, keys: {}, keyList: [], sheet: null,
    last: null, listeners: [], debug: false, observer: null, timer: 0, nextAllowed: 0, roots: [], busy: false, lastMs: 0, desc: null,
    lastImmediate: 0, legacyDrops: [], legacyPatched: false, legacyGaveUp: false, legacyOrig: null
};
function ensureSheet() {
    if (S0.sheet) return S0.sheet;
    var st = doc.getElementById('mc-contrast-sheet');
    if (!st) { st = doc.createElement('style'); st.id = 'mc-contrast-sheet'; (doc.head || doc.documentElement).appendChild(st); }
    /* Tiny static sheet that is NEVER switched off: while a pass runs (class mc-cx-nt on <html>)
       author transitions are paused, so recoloring can never be seen as a slow color fade. */
    if (!doc.getElementById('mc-contrast-nt')) {
        var nt = doc.createElement('style'); nt.id = 'mc-contrast-nt';
        nt.textContent = 'html.mc-cx-nt,html.mc-cx-nt *,html.mc-cx-nt *::before,html.mc-cx-nt *::after{transition:none !important;}';
        (doc.head || doc.documentElement).appendChild(nt);
    }
    S0.sheet = st; return st;
}
function sheetText() {
    var p = S0.palette, s = '';
    if (p) {
        s += ':root{--mc-text:' + p.text + ';--mc-text-dim:' + p.textDim + ';--mc-surface:' + p.surface + ';--mc-surface-strong:' + p.surfaceStrong +
             ';--mc-border:' + p.border + ';--mc-accent:' + p.accent + ';--mc-on-accent:' + p.onAccent + ';}\n';
    }
    for (var i = 0; i < S0.keyList.length; i++) {
        var parts = S0.keyList[i].split('@@PH@@'), one = '[data-mc-fx="' + S0.epoch + '-' + i + '"]';
        /* repeated attribute = high specificity: these overrides must beat any leftover legacy "body.theme-light ... !important" rule */
        var sel = 'html body ' + one + one + one + one + one;
        if (parts[0]) s += sel + '{' + parts[0] + '}\n';
        if (parts[1]) s += sel + '::placeholder{color:' + parts[1] + ' !important;opacity:1 !important;}\n';
    }
    return s;
}
function keyFor(text) {
    if (S0.keys.hasOwnProperty(text)) return S0.keys[text];
    var i = S0.keyList.length; S0.keyList.push(text); S0.keys[text] = i; return i;
}
function emit(rep) {
    S0.last = rep;
    for (var i = 0; i < S0.listeners.length; i++) { try { S0.listeners[i](rep); } catch (e) {} }
}
function newCtx() {
    return {body:doc.body, bodyRect:doc.body.getBoundingClientRect(), layers:new Map(), fixes:[], clear:[], items:[],
            visited:0, capped:false, errors:0, firstError:null, stats:{text:0, grad:0, svg:0, ring:0, scrim:0},
            scrims:new Map(), pinDone:new Set()};
}
function pass(roots, opts) {
    opts = opts || {};
    if (!S0.enabled || !S0.theme || !doc.body) return null;
    var t0 = now(), st = ensureSheet(), html = doc.documentElement;
    var ctx = newCtx(), i;
    html.classList.add('mc-cx-nt');
    st.media = 'not all';                       // 1) measure pure author styles (override sheet off)
    try {
        var list = roots && roots.length ? roots : [doc.body];
        for (i = 0; i < list.length; i++) if (list[i] && list[i].isConnected) walk(list[i], ctx);
    } catch (err) {
        st.media = ''; html.classList.remove('mc-cx-nt'); throw err;
    }
    var byEl = new Map(), d, key, val;          // 2) write (attributes + sheet), then switch the sheet back on
    for (i = 0; i < ctx.fixes.length; i++) byEl.set(ctx.fixes[i].el, ctx.fixes[i].decl);
    ctx.scrims.forEach(function (c, el) {
        d = byEl.get(el) || {};
        d.scrim = 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' + c.a + ')';
        byEl.set(el, d); ctx.stats.scrim++;
    });
    byEl.forEach(function (decl, el) {
        key = keyFor(declText(decl)); val = S0.epoch + '-' + key;
        if (el.getAttribute('data-mc-fx') !== val) el.setAttribute('data-mc-fx', val);
    });
    for (i = 0; i < ctx.clear.length; i++) if (!byEl.has(ctx.clear[i])) ctx.clear[i].removeAttribute('data-mc-fx');
    var txt = sheetText();
    if (st.textContent !== txt) st.textContent = txt;
    st.media = '';
    var off = function () { html.classList.remove('mc-cx-nt'); };
    if (root.requestAnimationFrame) root.requestAnimationFrame(function () { root.requestAnimationFrame(off); }); else setTimeout(off, 50);
    var total = ctx.stats.text + ctx.stats.grad + ctx.stats.svg + ctx.stats.ring + ctx.stats.scrim;
    S0.lastMs = now() - t0;
    var rep = {fixes:total, text:ctx.stats.text, gradientText:ctx.stats.grad, icons:ctx.stats.svg, boundaries:ctx.stats.ring, panels:ctx.stats.scrim,
               visited:ctx.visited, capped:ctx.capped, errors:ctx.errors, firstError:ctx.firstError ? String(ctx.firstError && ctx.firstError.message || ctx.firstError) : null,
               ms:Math.round(S0.lastMs * 10) / 10, mode:S0.palette ? S0.palette.mode : null, epoch:S0.epoch, full:!roots || !roots.length,
               legacy:{silenced:!!S0.legacyPatched, gaveUp:!!S0.legacyGaveUp}};
    if (S0.debug) rep.items = ctx.items;
    emit(rep);
    return rep;
}

/* ═══ §7 · SCHEDULING ═══ */
function contained(a, b) { return a !== b && a.contains(b); }
function addRoot(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < S0.roots.length; i++) { if (S0.roots[i] === el || contained(S0.roots[i], el)) return; }
    S0.roots = S0.roots.filter(function (r) { return !contained(el, r); });
    S0.roots.push(el);
}
function runPending(suppress) {
    S0.timer = 0;
    var roots = S0.roots; S0.roots = [];
    try { pass(roots, {suppress:suppress}); }
    catch (e) { setTimeout(function () { throw e; }, 0); }       // surfaces in the 🩺 runtime-errors list
    S0.nextAllowed = now() + Math.max(CFG.minGapMs, S0.lastMs * 10);
}
function schedule(immediate, suppress) {
    if (!S0.enabled) return;
    if (immediate) { if (S0.timer) { clearTimeout(S0.timer); S0.timer = 0; } runPending(suppress); return; }
    if (S0.timer) return;
    var wait = Math.max(CFG.debounceMs, S0.nextAllowed - now());
    S0.timer = setTimeout(function () { runPending(false); }, wait);
}
function onMutations(list) {
    var immediate = false, any = false, bodyClass = false, i, j, m, n;
    for (i = 0; i < list.length; i++) {
        m = list[i];
        if (m.type === 'attributes') {
            if (m.oldValue !== null && m.oldValue === m.target.getAttribute(m.attributeName)) continue;   // same value re-written
            if (m.target === doc.body && m.attributeName === 'class') bodyClass = true;
            if (m.target.classList && m.target.classList.contains('screen')) immediate = true;
            addRoot(m.target); any = true;
        } else if (m.type === 'childList') {
            for (j = 0; j < m.addedNodes.length; j++) {
                n = m.addedNodes[j];
                if (n.nodeType === 1 && n.id !== 'mc-contrast-sheet' && n.id !== 'mc-contrast-nt') { addRoot(n); any = true; if (n.classList && n.classList.contains('screen')) immediate = true; }
            }
        }
    }
    if (bodyClass) takeOverLegacy();
    if (!any) return;
    /* Run before the browser paints whenever the page is light enough on its feet: new content never shows
       up in the wrong colors for a moment. Busy pages fall back to a short debounce. */
    var t = now();
    if (immediate || (S0.lastMs < 30 && t - S0.lastImmediate > 40)) { S0.lastImmediate = t; schedule(true, true); }
    else schedule(false);
}
/* The old light-theme guard (mcCheckThemeLightness in MODULE-01 + the body.theme-light rules scattered over the
   modules) fights this engine: its rules paint dark text on dark panels. This engine replaces it. The guard
   function is silenced when it is a plain global, and the class is dropped - never more than 3 times per 1.5 s,
   so a guard that keeps putting it back cannot trap the page in a loop. */
function dropLegacyClass() {
    if (!CFG.takeOverLegacy || S0.legacyGaveUp || !S0.enabled) return;
    var b = doc.body;
    if (!b || !b.classList.contains('theme-light')) return;
    var t = now();
    S0.legacyDrops = S0.legacyDrops.filter(function (x) { return t - x < 1500; });
    if (S0.legacyDrops.length >= 3) { S0.legacyGaveUp = true; return; }
    S0.legacyDrops.push(t);
    b.classList.remove('theme-light');
}
function takeOverLegacy() {
    if (!CFG.takeOverLegacy || !S0.enabled) return;
    try {
        var f = root.mcCheckThemeLightness;
        if (typeof f === 'function' && !f.__mcNoop) {
            var noop = function () {}; noop.__mcNoop = true; noop.__orig = f;
            S0.legacyOrig = f; root.mcCheckThemeLightness = noop; S0.legacyPatched = true;
        }
    } catch (e) {}
    dropLegacyClass();
}
function releaseLegacy() {
    try {
        if (S0.legacyPatched && S0.legacyOrig) { root.mcCheckThemeLightness = S0.legacyOrig; S0.legacyPatched = false; S0.legacyOrig(); }
    } catch (e) {}
    S0.legacyGaveUp = false; S0.legacyDrops = [];
}
function attach() {
    if (S0.observer || !doc.body || typeof MutationObserver === 'undefined') return;
    S0.observer = new MutationObserver(onMutations);
    S0.observer.observe(doc.body, {childList:true, subtree:true, attributes:true, attributeOldValue:true, attributeFilter:['class', 'hidden']});
    if (!S0.listening) {
        S0.listening = true;
        root.addEventListener('resize', function () { addRoot(doc.body); schedule(false); });
        root.addEventListener('orientationchange', function () { addRoot(doc.body); schedule(false); });
    }
}
function detach() { if (S0.observer) { S0.observer.disconnect(); S0.observer = null; } }

/* ═══ §8 · PUBLIC API ═══ */
function applyDesc(desc) {
    var th = makeTheme(desc);
    if (!th) return false;
    S0.theme = th; S0.desc = desc;
    S0.palette = derivePalette(th, root.innerWidth, Math.max(root.innerHeight, 800));
    S0.epoch++; S0.keys = {}; S0.keyList = [];
    doc.documentElement.setAttribute('data-mc-mode', S0.palette.mode);
    return true;
}
function setTheme(desc) {
    if (!applyDesc(desc)) return false;
    if (!S0.enabled || !doc.body) return true;
    S0.roots = []; if (S0.timer) { clearTimeout(S0.timer); S0.timer = 0; }
    takeOverLegacy();
    try { pass(null, {suppress:true}); } catch (e) { setTimeout(function () { throw e; }, 0); }
    S0.nextAllowed = now() + CFG.minGapMs;
    return true;
}
function syncFromBody() {
    if (!doc.body) return false;
    var cs = root.getComputedStyle(doc.body), img = cs.backgroundImage || '';
    if (img.indexOf('gradient(') >= 0 && parseLinear(img)) return setTheme({css:img});
    var c = parseColor(cs.backgroundColor);
    if (c && c.a > 0) return setTheme({flat:toHex(c)});
    var cs2 = root.getComputedStyle(doc.documentElement), img2 = cs2.backgroundImage || '';
    if (img2.indexOf('gradient(') >= 0 && parseLinear(img2)) return setTheme({css:img2});
    var c2 = parseColor(cs2.backgroundColor);
    return setTheme({flat:(c2 && c2.a > 0) ? toHex(c2) : '#0f172a'});
}
function clearAll() {
    var st = ensureSheet(); st.textContent = ''; st.media = '';
    var els = doc.querySelectorAll('[data-mc-fx]');
    for (var i = 0; i < els.length; i++) els[i].removeAttribute('data-mc-fx');
    doc.documentElement.removeAttribute('data-mc-mode');
}
function setEnabled(on) {
    on = !!on; S0.enabled = on;
    try { if (on) root.localStorage.removeItem(CFG.storageKey); else root.localStorage.setItem(CFG.storageKey, 'off'); } catch (e) {}
    if (!on) { releaseLegacy(); detach(); if (S0.timer) { clearTimeout(S0.timer); S0.timer = 0; } S0.roots = []; clearAll(); emit({fixes:0, text:0, gradientText:0, icons:0, boundaries:0, panels:0, visited:0, ms:0, mode:null, off:true}); }
    else { attach(); if (S0.desc) setTheme(S0.desc); else syncFromBody(); }
}
function init() {
    try { if (root.localStorage.getItem(CFG.storageKey) === 'off') S0.enabled = false; } catch (e) {}
    ensureSheet();
    var pending = root.__mcContrastPending;
    if (pending) { root.__mcContrastPending = null; applyDesc(pending); }
    if (!S0.enabled) return;
    attach();
    if (pending) setTheme(pending); else syncFromBody();
}

root.MCContrast = {
    __engine: 1, version: '1.0.0',
    setTheme: setTheme, syncFromBody: syncFromBody,
    refresh: function () { addRoot(doc.body); schedule(true, false); },
    setEnabled: setEnabled, isEnabled: function () { return S0.enabled; },
    report: function () { return S0.last; },
    onPass: function (fn) { if (typeof fn === 'function') S0.listeners.push(fn); if (S0.last) { try { fn(S0.last); } catch (e) {} } },
    palette: function () { return S0.palette; },
    setDebug: function (b) { S0.debug = !!b; },
    _t: {parseColor:parseColor, lum:lum, ratio:ratio, over:over, toHex:toHex, toHsl:toHsl, fromHsl:fromHsl, parseLinear:parseLinear,
         makeTheme:makeTheme, adjust:adjust, minRatio:minRatio, derivePalette:derivePalette, colorsIn:colorsIn, dedupe:dedupe, CFG:CFG}
};

if (doc) {
    if (doc.body) init();
    else doc.addEventListener('DOMContentLoaded', init);
}
})(typeof window !== 'undefined' ? window : this);
