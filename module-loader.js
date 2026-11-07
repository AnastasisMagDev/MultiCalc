/* ══════════════════════════════════════════════════════════════════════════
   module-loader.js — Ο ΜΗΧΑΝΙΣΜΟΣ ΦΟΡΤΩΣΗΣ ΤΩΝ MODULES
   ──────────────────────────────────────────────────────────────────────────
   Το modules.js λέει ΠΟΙΑ modules υπάρχουν· αυτό το αρχείο ξέρει ΠΩΣ τα φορτώνει:
     • getModuleList()   διαβάζει και ελέγχει τον κατάλογο (window.MC_MODULES)
     • loadModule(mod)   κατεβάζει το module, περνά στυλ/scripts/οθόνες στη σελίδα
     • applyMenuOrder()  βάζει τις κάρτες του μενού στη σειρά του καταλόγου
     • κανάλι αναφορών   ανακοινώνει ό,τι συμβαίνει (φόρτωση, αποτυχίες, σφάλματα) ως
                         CustomEvent 'multicalc:diag'. Το ακούει το προαιρετικό chip
                         system/diagnostics/ — αν λείπει, δεν αλλάζει τίποτα.
   Φορτώνεται από το index.html ΜΕΤΑ το modules.js και ΠΡΙΝ τον κώδικα εκκίνησης.
   Δεν περιέχει δεδομένα modules — αυτά ζουν μόνο στο modules.js.
   Όλες οι συναρτήσεις είναι global, όπως ήταν όταν ζούσαν μέσα στο index.html.
   ══════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   0c. ΚΑΝΑΛΙ ΑΝΑΦΟΡΩΝ (diagnostics channel)
   Ο loader ΔΕΝ ξέρει τίποτα για το diagnostic chip (system/diagnostics/).
   Απλώς ανακοινώνει ό,τι συμβαίνει με _mcReport():
     • ένα CustomEvent 'multicalc:diag' στο window (cancelable)·
     • ένα μικρό, περιορισμένο αρχείο καταγραφής (__mcReportLog), ώστε ένα chip
       που συνδέεται ΑΡΓΟΤΕΡΑ να «ξαναπαίξει» ό,τι έχασε.
   Αν κανείς δεν ακούει, τίποτα δεν σπάει: οι αποτυχίες απλώς γράφονται στο
   console. Αν ακούει το chip, δηλώνει ότι χειρίστηκε το γεγονός (preventDefault)
   και ο loader δεν γράφει διπλά.
   ════════════════════════════════════════════════════════════════════ */
var __mcReportLog = [];
var __mcReportSeq = 0;
var _MC_FAILURE_KINDS = ['module-fail', 'script-fail', 'runtime-error',
                         'catalog-problem', 'boot-abort', 'menu-order-error'];

/** @param {string} kind
 *  @param {object} [detail] καταγράφεται στο __mcReportLog
 *  @param {object} [extra]  ΜΟΝΟ για τον ακροατή του event (δεν καταγράφεται): π.χ. το HTML που
 *                           μόλις κατέβασε ο loader, ώστε το chip να μην το ξανακατεβάσει. */
function _mcReport(kind, detail, extra) {
    var rec = { seq: ++__mcReportSeq, kind: kind, at: Date.now(),
                perf: Math.round(performance.now()), detail: detail || {} };
    if (__mcReportLog.length < 400) __mcReportLog.push(rec);
    var handled = false;
    try {
        var evDetail = extra ? { seq: rec.seq, kind: rec.kind, at: rec.at, perf: rec.perf,
                                 detail: rec.detail, extra: extra } : rec;
        handled = !window.dispatchEvent(new CustomEvent('multicalc:diag', { detail: evDetail, cancelable: true }));
    } catch (e) { /* το κανάλι δεν πρέπει ποτέ να σπάσει τον loader */ }
    if (!handled && _MC_FAILURE_KINDS.indexOf(kind) !== -1) {
        console.warn('[MultiCalc] ' + kind + ':', rec.detail);
    }
}

/** Καλείται μέσα από το τυλιγμένο inline <script> ενός module αν ο κώδικάς του
 *  πετάξει σφάλμα κατά την εκτέλεση (δες το βήμα D του loadModule).
 *  @param {string} modId @param {Error} err */
window.__mcDiagScriptError = function (modId, err) {
    _mcReport('runtime-error', { module: String(modId),
        name: err && err.name, message: err && err.message, stack: err && err.stack });
};

/** Ποια στοιχεία του HTML ενός module περνούν στο app (ό,τι άλλο στο <body>
 *  αγνοείται). Δημόσια, ώστε το chip να ελέγχει τα modules με την ίδια λίστα. */
var MC_INJECT_SELECTORS = [
    '.screen',
    '.fun-facts-panel',   /* MODULE-12: class selector */
    '#fun-facts-panel',   /* fallback if ever given an id */
    '#theme-overlay',
    '#curr-picker-overlay',
    '#fullscreen-modal',
    '#splashOverlay'      /* MODULE-13: world-clock entrance/exit overlay */
];

/** Resolve a registry path (e.g. "subjects/mathematics/equations/MODULE-02-....html") to the
 *  exact absolute URL the browser will actually request. */
function _mcResolveUrl(path) {
    try { return new URL(path, document.baseURI).href; }
    catch (e) { return path + '  (δεν μπόρεσε να γίνει resolve: ' + e.message + ')'; }
}


/* ════════════════════════════════════════════════════════════════════
   3. MODULE LOADER
   ════════════════════════════════════════════════════════════════════ */

/* Strip the local MultiCalc stub from module scripts before injection.
   Modules declare  var/const/let MultiCalc = {...}  for standalone use.
   When loaded inside the App, this would overwrite or conflict with the
   protected runtime. We remove it so only the runtime MultiCalc exists. */
/** @param {string} code */
function _stripMultiCalcStub(code) {
    var re = /(?:var|const|let)\s+MultiCalc\s*=\s*\{/;
    var m  = re.exec(code);
    if (!m) return code;

    /* Go back to start of that line */
    var lineStart = code.lastIndexOf('\n', m.index) + 1;

    /* Walk braces to find the matching } */
    var braceOpen = code.indexOf('{', m.index);
    var depth = 0, i;
    for (i = braceOpen; i < code.length; i++) {
        if      (code[i] === '{') depth++;
        else if (code[i] === '}') { depth--; if (depth === 0) break; }
    }

    /* Skip optional trailing ; and newline */
    var end = i + 1;
    if (code[end] === ';') end++;
    if (code[end] === '\n') end++;

    return code.slice(0, lineStart)
         + '/* [MultiCalc App] stub removed — using runtime */\n'
         + code.slice(end);
}

/* CSS injection — no aggressive deduplication.
   All modules share the same base CSS header, so fingerprinting by
   first N chars causes false positives and drops module-specific rules
   (e.g. .theme-grid, .bmi-gauge etc.). CSS rules are idempotent —
   injecting the same rule twice is harmless. We only deduplicate by
   EXACT full-content match to prevent truly identical blocks. */
var _injectedCSSFingerprints = new Set();
/** @param {string} cssText
 *  @param {string} moduleId */
function _injectStyle(cssText, moduleId) {
    /* Use full normalized content as key — safe deduplication */
    var fp = cssText.replace(/\s+/g,' ').trim();
    if (_injectedCSSFingerprints.has(fp)) return;
    _injectedCSSFingerprints.add(fp);
    var s = document.createElement('style');
    s.setAttribute('data-module', moduleId);
    s.textContent = cssText;
    document.head.appendChild(s);
}

/* Ίδια λογική με το _rewriteRelativeAssetPaths, σαν μικρή επαναχρησιμοποιήσιμη
   συνάρτηση: δίνει το σωστό, ως προς τον φάκελο του module, path για ΟΠΟΙΟ
   σχετικό src (εικόνα, script, ό,τι άλλο) — απαραίτητο τώρα που κάθε module
   μπορεί να έχει δικά του αδερφικά αρχεία (π.χ. system/main-menu/icons.js)
   μέσα στον δικό του φάκελο, όχι μόνο εικόνες.
   @param {string} src @param {string} modFile @returns {string} */
function _resolveModuleRelativeSrc(src, modFile) {
    if (!src || /^([a-z]+:)?\/\//i.test(src) || src.indexOf('data:') === 0 || src.charAt(0) === '/') return src;
    var slash = modFile.lastIndexOf('/');
    if (slash === -1) return src;
    return _normalizePath(modFile.slice(0, slash + 1) + src);
}

/* Καθαρίζει τα "./" και "../" μιας διαδρομής, π.χ.
   "subjects/chemistry/element-rush/../periodic-table/elements.js"
   → "subjects/chemistry/periodic-table/elements.js".
   Έτσι το ίδιο αρχείο έχει ΠΑΝΤΑ το ίδιο όνομα και δεν φορτώνεται/εκτελείται
   δύο φορές όταν το ζητούν δύο modules (π.χ. elements.js από MODULE-14 και 15).
   @param {string} p @returns {string} */
function _normalizePath(p) {
    var out = [];
    String(p).split('/').forEach(function (seg) {
        if (seg === '..' && out.length && out[out.length - 1] !== '..') out.pop();
        else if (seg !== '.') out.push(seg);
    });
    return out.join('/');
}

/* Ένα module (π.χ. MODULE-01) γράφει τοπικά assets σαν src="icons/x.png",
   σωστό όταν το αρχείο ζει standalone στον δικό του φάκελο. Μόλις όμως
   το HTML του μπει μέσα στο index.html (άλλο documentURI), ένα σχετικό
   src λύνεται ως προς το index.html, όχι ως προς τον φάκελο του module — το
   εικονίδιο σκάει 404. Διορθώνουμε το src ώστε να δείχνει σωστά ως προς
   τον φάκελο του ΙΔΙΟΥ module, όποιο module κι αν είναι, χωρίς να
   χρειάζεται να αλλάξει τίποτα μέσα στα ίδια τα module files.
   @param {Element} node @param {string} modFile */
function _rewriteRelativeAssetPaths(node, modFile) {
    var slash = modFile.lastIndexOf('/');
    if (slash === -1) return; /* module file is at root -- nothing to rewrite */
    var moduleDir = modFile.slice(0, slash + 1); /* π.χ. "system/main-menu/" */
    var imgs = [];
    if (node.matches && node.matches('img[src]')) imgs.push(node);
    if (node.querySelectorAll) imgs = imgs.concat(Array.from(node.querySelectorAll('img[src]')));
    imgs.forEach(function (img) {
        var src = img.getAttribute('src') || '';
        if (!src || /^([a-z]+:)?\/\//i.test(src) || src.indexOf('data:') === 0 || src.charAt(0) === '/') return;
        img.setAttribute('src', _normalizePath(moduleDir + src));
    });
}

/* Queue για menu cards που πρέπει να κρυφτούν αλλά
   το MODULE-01 δεν έχει φορτωθεί ακόμα */
var _pendingHide = [];

/** @param {string} navTarget */
function _doHideCard(navTarget) {
    if (!navTarget) return;
    var patterns = [
        'navTo(\'' + navTarget + '\')',
        navTarget,
    ];
    document.querySelectorAll('.menu-card').forEach(function(card) {
        var onclick = card.getAttribute('onclick') || '';
        if (patterns.some(function(p){ return onclick.includes(p); })) {
            card.style.display = 'none';
            card.setAttribute('aria-hidden', 'true');
            card.classList.add('module-unavailable');
        }
    });
}

/** @param {string} navTarget */
function hideMenuCard(navTarget) {
    if (!navTarget) return;
    if (!MultiCalc.modules.loaded.has('menu')) {
        _pendingHide.push(navTarget);   // defer until menu is ready
        return;
    }
    _doHideCard(navTarget);
}

function _flushPendingHides() {
    _pendingHide.forEach(_doHideCard);
    _pendingHide = [];
}

/* Core load function */
/** @param {object} mod */
async function loadModule(mod) {
    if (!mod.enabled) {
        MultiCalc.modules.failed.add(mod.id);
        hideMenuCard(mod.navTarget);
        _mcReport('module-skipped', { id: mod.id, file: mod.file });
        return false;
    }

    var _t0          = performance.now();
    var _resolvedUrl = _mcResolveUrl(mod.file);
    var _httpStatus  = null;
    var _contentType = null;
    var _bytes       = null;

    try {
        var response = await fetch(mod.file, { cache: 'no-store' });
        _httpStatus = response.status;
        _contentType = response.headers.get('content-type');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var html = await response.text();
        _bytes = html.length;

        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var container = document.getElementById('app-screens');

        /* ── A. Inject <style> blocks (deduplicated) ── */
        doc.querySelectorAll('style').forEach(function(el) {
            _injectStyle(el.textContent, mod.id);
        });

        /* ── B. External scripts (Plotly CDN etc.) ── */
        var extScripts = Array.from(doc.querySelectorAll('script[src]'));
        if (extScripts.length) {
            await Promise.all(extScripts.map(function(el) {
                return new Promise(function(resolve) {
                    var rawSrc = el.getAttribute('src');
                    var src = _resolveModuleRelativeSrc(rawSrc, mod.file);
                    if (!src || document.querySelector('script[src="'+src+'"]'))
                        { resolve(); return; }
                    var s = document.createElement('script');
                    s.src = src;
                    s.async = false;   /* εκτέλεση με τη σειρά του HTML (η φόρτωση παραμένει παράλληλη) */
                    if (el.hasAttribute('defer')) s.defer = true;
                    s.onload = resolve;
                    s.setAttribute('data-module', mod.id);   /* ώστε το chip να ξέρει σε ποιο module ανήκει */
                    s.onerror = function() {
                        _mcReport('script-fail', { module: mod.id, src: src, file: mod.file });
                        resolve();
                    };
                    document.head.appendChild(s);
                });
            }));
        }

        /* ── C. Inject HTML elements ── */
        /* NOTE: fun-facts-panel uses CLASS not ID in MODULE-12 */
        var wanted = MC_INJECT_SELECTORS;   /* ορίζεται στην ενότητα 0c */
        wanted.forEach(function(sel) {
            doc.querySelectorAll(sel).forEach(function(el) {
                /* Deduplicate: by id (if has one) or by class for panels */
                if (el.id && document.getElementById(el.id)) return;
                if (el.classList.contains('fun-facts-panel') &&
                    document.querySelector('.fun-facts-panel')) return;
                var wrap = document.createElement('div');
                wrap.innerHTML = el.outerHTML;
                var node = wrap.firstElementChild;
                if (!node) return;
                _rewriteRelativeAssetPaths(node, mod.file);
                /* Overlays must start hidden — ensure display:none */
                if (node.id === 'curr-picker-overlay' ||
                    node.id === 'fullscreen-modal') {
                    node.style.display = 'none';
                }
                container.appendChild(node);
            });
        });

        /* ── D. Execute inline scripts ──
           Wrapped in try/catch at the STRING level: a dynamically-inserted
           <script> that throws does NOT propagate to this loadModule()'s
           own try/catch (it runs in global scope) — without this wrap,
           a module can fetch fine (✅) and still silently die partway
           through its own script with zero visibility. */
        var _inlineIdx = 0;
        doc.querySelectorAll('script:not([src])').forEach(function(scriptEl) {
            var code = _stripMultiCalcStub(scriptEl.textContent);
            _inlineIdx++;
            var s = document.createElement('script');
            s.setAttribute('data-module', mod.id);
            s.setAttribute('data-script-index', String(_inlineIdx));
            /* Το //# sourceURL δίνει στο script όνομα «mc-module/<id>/script-<n>.js»: κάθε
               σφάλμα/stack/DevTools δείχνει ΠΟΙΟ module και ΠΟΙΟ script, όχι "index.html". */
            s.textContent = 'try{\n' + code + '\n}catch(__mcErr){' +
                'if(window.__mcDiagScriptError) window.__mcDiagScriptError(' + JSON.stringify(mod.id) + ', __mcErr);' +
                'else console.error(__mcErr);' +
            '}\n//# sourceURL=mc-module/' + encodeURIComponent(mod.id) + '/script-' + _inlineIdx + '.js';
            /* Σφάλμα ΣΥΝΤΑΞΗΣ σε δυναμικό inline script αναφέρεται από τον browser με όνομα
               αρχείου "index.html" και χωρίς καμία ένδειξη module. Ο δείκτης δηλώνει ποιο
               script εισάγεται ΤΩΡΑ, ώστε το chip να το αποδώσει στο σωστό module. */
            window.__mcInjecting = { module: mod.id, script: _inlineIdx };
            try { document.body.appendChild(s); }
            finally { window.__mcInjecting = null; }
        });

        MultiCalc.modules.loaded.add(mod.id);

        /* After menu module: flush deferred card hides */
        if (mod.id === 'menu') _flushPendingHides();

        _mcReport('module-ok', { id: mod.id, file: mod.file, resolvedUrl: _resolvedUrl,
            required: !!mod.required, status: _httpStatus, contentType: _contentType,
            bytes: _bytes, ms: Math.round(performance.now() - _t0) }, { html: html });

        return true;

    } catch(e) {
        console.warn('[MultiCalc] Module "' + mod.id + '" not loaded: ' + e.message);
        MultiCalc.modules.failed.add(mod.id);
        if (!mod.required && mod.navTarget) hideMenuCard(mod.navTarget);
        _mcReport('module-fail', { id: mod.id, file: mod.file, resolvedUrl: _resolvedUrl,
            required: !!mod.required, status: _httpStatus, contentType: _contentType,
            errorName: e.name, errorMessage: e.message, ms: Math.round(performance.now() - _t0) });
        return false;
    }
}

/* ════════════════════════════════════════════════════════════════════
   2. ΑΝΑΓΝΩΣΗ ΚΑΤΑΛΟΓΟΥ (modules.js → window.MC_MODULES)
   Επιστρέφει τη λίστα προς φόρτωση: έγκυρες εγγραφές, χωρίς διπλά id,
   με το required πρώτο και κατά τα άλλα στη σειρά που γράφτηκαν.
   Κάθε πρόβλημα του καταλόγου δηλώνεται στο κανάλι αναφορών (catalog-problem)
   αντί να σπάει σιωπηλά η εκκίνηση.
   ════════════════════════════════════════════════════════════════════ */
/** @returns {Array<object>} */
function getModuleList() {
    var raw = window.MC_MODULES;
    if (!Array.isArray(raw)) {
        _mcReport('catalog-problem', { code: 'missing',
            message: 'Ο κατάλογος modules (window.MC_MODULES) δεν βρέθηκε — το modules.js λείπει ή απέτυχε να φορτωθεί.' });
        return [];
    }
    var seen = {}, list = [];
    raw.forEach(function (m, i) {
        if (!m || typeof m.id !== 'string' || !m.id || typeof m.file !== 'string' || !m.file) {
            _mcReport('catalog-problem', { code: 'invalid-entry', index: i,
                message: 'Η εγγραφή #' + (i + 1) + ' του καταλόγου είναι άκυρη (απαιτούνται id και file) — αγνοήθηκε.' });
            return;
        }
        if (seen[m.id]) {
            _mcReport('catalog-problem', { code: 'duplicate-id', id: m.id, index: i,
                message: 'Διπλό id "' + m.id + '" στον κατάλογο — η δεύτερη εγγραφή αγνοήθηκε.' });
            return;
        }
        seen[m.id] = true;
        list.push({
            id: m.id, file: m.file, navTarget: m.navTarget || null,
            name: m.name || null, category: m.category || null,
            order: (typeof m.order === 'number') ? m.order : null,
            required: !!m.required, enabled: m.enabled !== false
        });
    });
    var req = list.filter(function (m) { return m.required; });
    var opt = list.filter(function (m) { return !m.required; });
    return req.concat(opt);
}

/* ════════════════════════════════════════════════════════════════════
   2b. ΣΕΙΡΑ ΚΑΡΤΩΝ ΣΤΟ ΚΥΡΙΟ ΜΕΝΟΥ (πεδίο `order` του καταλόγου)
   Οι κάρτες είναι γραμμένες μέσα στο MODULE-01· εδώ απλώς αναδιατάσσονται
   με βάση τον κατάλογο. Αν η σειρά ήδη ταιριάζει (η προεπιλογή) δεν
   γίνεται καμία αλλαγή στο DOM. Κάρτες χωρίς εγγραφή/order μένουν στο τέλος,
   στη σχετική σειρά τους. Μη-κάρτες μέσα στο grid κρατούν τη θέση τους.
   @param {Array<object>} list  το αποτέλεσμα του getModuleList()
   ════════════════════════════════════════════════════════════════════ */
function applyMenuOrder(list) {
    try {
        var grid = document.getElementById('main-menu-grid');
        if (!grid) return;
        var children = Array.prototype.slice.call(grid.children);
        var cards = children.filter(function (c) { return c.classList && c.classList.contains('menu-card'); });
        if (cards.length < 2) return;

        function keyOf(card, domIdx) {
            var onclick = card.getAttribute('onclick') || '';
            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                if (m.navTarget && typeof m.order === 'number' &&
                    onclick.indexOf("navTo('" + m.navTarget + "')") !== -1) return m.order;
            }
            return 1000 + domIdx;
        }
        var ranked = cards.map(function (c, i) { return { c: c, k: keyOf(c, i), i: i }; });
        ranked.sort(function (a, b) { return (a.k - b.k) || (a.i - b.i); });
        var sorted = ranked.map(function (r) { return r.c; });

        var unchanged = sorted.every(function (c, i) { return c === cards[i]; });
        if (unchanged) return;

        var slot = 0;
        var newOrder = children.map(function (ch) { return cards.indexOf(ch) !== -1 ? sorted[slot++] : ch; });
        newOrder.forEach(function (node) { grid.appendChild(node); });
    } catch (e) {
        _mcReport('menu-order-error', { name: e && e.name, message: e && e.message, stack: e && e.stack });
    }
}
