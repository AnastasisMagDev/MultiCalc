/* MODULE-15-ELEMENT-RUSH / audio.js
   Ήχοι του Element Rush: sound effect όταν βρίσκεις στοιχείο + soundtracks που γεμίζουν ακριβώς τη διάρκεια του γύρου.
   Τα αρχεία βρίσκονται στον φάκελο sounds/ δίπλα σε αυτό το αρχείο.

   ΠΩΣ ΠΡΟΣΘΕΤΩ ΚΑΙ ΑΛΛΟ ΤΡΑΓΟΥΔΙ:
   1) βάλε το αρχείο στον φάκελο sounds/ (π.χ. "soundtrack 5.m4a")
   2) πρόσθεσε μία γραμμή στη λίστα TRACKS παρακάτω, με τη διάρκειά του σε δευτερόλεπτα (π.χ. 90.2)
   Ο προγραμματισμός (ποια τραγούδια παίζουν και με ποια σειρά) γίνεται αυτόματα. */
(function () {
'use strict';

/* ───────────── ρυθμίσεις ───────────── */
var CFG = {
    effectFile: 'sound effect.m4a',
    effectVolume: 0.9,
    musicVolume: 0.5,      /* χαμηλά επίτηδες: η μουσική από το ηχείο πιάνεται από το μικρόφωνο και δυσκολεύει την αναγνώριση φωνής */
    fadeMs: 500,           /* fade-out όταν τελειώνει ο γύρος ή βγαίνεις από το παιχνίδι */
    tol: 1.5,              /* πόσα δευτερόλεπτα επιτρέπεται να διαφέρει το άθροισμα των τραγουδιών από τη διάρκεια του γύρου */
    effectGap: 0.09        /* αν βρεθούν πολλά στοιχεία μαζί, τα sound effects μπαίνουν με αυτή την απόσταση (δευτ.) το ένα από το άλλο */
};
var TRACKS = [
    { file: 'soundtrack 1.m4a', sec: 120.16 },
    { file: 'soundtrack 2.m4a', sec: 60.14 },
    { file: 'soundtrack 3.m4a', sec: 120.17 },
    { file: 'soundtrack 4.m4a', sec: 59.92 }
];

/* ───────────── διαδρομή του φακέλου (δουλεύει και μέσα στην εφαρμογή και αυτόνομα) ─────────────
   Οι σχετικές διαδρομές μέσα στην JS λύνονται ως προς τη σελίδα της εφαρμογής, όχι ως προς τον φάκελο του module,
   γι' αυτό παίρνουμε τον φάκελο από το ίδιο το <script src> του audio.js (ή από τα αδέλφια του). */
function findBase() {
    var s = document.currentScript, src = s && s.src ? s.src : '', i, all, re = /\/(audio|matcher|aliases)\.js$/;
    if (!src) {
        all = document.getElementsByTagName('script');
        for (i = all.length - 1; i >= 0; i--) { var u = (all[i].src || '').replace(/[?#].*$/, ''); if (re.test(u)) { src = u; break; } }
    }
    return src ? src.replace(/[?#].*$/, '').replace(/[^\/]*$/, '') : '';
}
var BASE = findBase();
function url(file) { return BASE + 'sounds/' + encodeURIComponent(file); }
function warn(msg, er) { try { if (window.console && console.warn) console.warn('[ERushAudio] ' + msg, er || ''); } catch (e) { } }
function nop() { }
function guard(p) { if (p && typeof p.catch === 'function') p.catch(function (er) { warn('play() blocked/failed', er && er.name); }); }

/* ───────────── προγραμματισμός soundtracks ─────────────
   Ψάχνουμε σειρά τραγουδιών που το άθροισμά τους "κολλάει" στη διάρκεια του γύρου (±tol).
   feasible(rem): μπορούν να γεμίσουν τα rem δευτερόλεπτα που απομένουν; (με memo, βάθος ≤ διάρκεια/μικρότερο τραγούδι) */
var lastFirst = -1;
function feasible(rem, memo) {
    if (Math.abs(rem) <= CFG.tol) return true;
    if (rem < 0) return false;
    var k = Math.round(rem * 10), i;
    if (memo[k] !== undefined) return memo[k];
    memo[k] = false;
    for (i = 0; i < TRACKS.length; i++) { if (feasible(rem - TRACKS[i].sec, memo)) { memo[k] = true; break; } }
    return memo[k];
}
/* Κανόνες: (1) το άθροισμα ταιριάζει με τον γύρο (±tol), (2) κανένα τραγούδι δεν επαναλαμβάνεται αμέσως,
   (3) όσο γίνεται λιγότερες επαναλήψεις τραγουδιού μέσα στον ίδιο γύρο, (4) αν υπάρχει επιλογή, δεν ξεκινά με το ίδιο τραγούδι που ξεκίνησε ο προηγούμενος γύρος.
   Ανάμεσα σε όλους τους συνδυασμούς που πληρούν τα παραπάνω επιλέγεται τυχαίος (reservoir sampling), ώστε κάθε γύρος να ακούγεται διαφορετικός.
   Αν δεν υπάρχει ακριβής συνδυασμός (π.χ. γύρος 45'' με τραγούδια των 60''), παίζουν με τη σειρά και το τελευταίο κόβεται με fade-out. */
function shuffled(n) { var a = [], i, j, t; for (i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function buildPlan(total) {
    var n = TRACKS.length, memo = {}, i;
    if (!n || !(total > 0)) return [];
    if (feasible(total, memo)) {
        var seq = [], used = [], best = [], bestCost = Infinity, cnt = 0, nodes = 0;
        for (i = 0; i < n; i++) used.push(0);
        (function dfs(rem, cost, last) {
            if (nodes++ > 60000) return;                                       /* δίχτυ ασφαλείας αν μελλοντικά μπουν πολλά τραγούδια */
            if (rem <= CFG.tol) {
                if (cost < bestCost) { bestCost = cost; cnt = 0; }
                if (cost === bestCost) { cnt++; if (Math.random() * cnt < 1) best = seq.slice(); }
                return;
            }
            var order = shuffled(n), k, t, c;
            for (k = 0; k < n; k++) {
                t = order[k];
                if (t === last && n > 1) continue;
                if (!feasible(rem - TRACKS[t].sec, memo)) continue;
                c = cost + (used[t] > 0 ? 2 : 0) + (!seq.length && t === lastFirst && n > 1 ? 1 : 0);
                if (c > bestCost) continue;
                used[t]++; seq.push(t); dfs(rem - TRACKS[t].sec, c, t); seq.pop(); used[t]--;
            }
        })(total, 0, -1);
        if (best.length) return best;
    }
    /* εφεδρικά: δεν υπάρχει ακριβής συνδυασμός → τα λιγότερο παιγμένα με τυχαία σειρά, το τελευταίο θα κοπεί από τον γύρο */
    var plan = [], rem = total, last = -1, order = shuffled(n), p = 0;
    while (rem > CFG.tol && plan.length < 60) { var t = order[p++ % n]; if (t === last && n > 1) t = order[p++ % n]; plan.push(t); rem -= TRACKS[t].sec; last = t; }
    return plan;
}

/* ───────────── sound effect (Web Audio για άμεση απόκριση, με εφεδρικό HTMLAudio) ───────────── */
var ctx = null, effBuf = null, effState = 0 /* 0 δεν φορτώθηκε, 1 φορτώνει, 2 έτοιμο, -1 απέτυχε */, nextT = 0, pool = [], poolI = 0, lastFallback = 0;
function getCtx() {
    if (ctx) return ctx; var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (er) { ctx = null; } return ctx;
}
function loadEffect() {
    if (effState !== 0) return; effState = 1;
    var c = getCtx(), u = url(CFG.effectFile);
    if (!c || typeof fetch !== 'function') { effState = -1; return; }
    fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (ab) {
        c.decodeAudioData(ab, function (buf) { effBuf = buf; effState = 2; }, function (er) { effState = -1; warn('cannot decode sound effect, using HTMLAudio', er); });
    }).catch(function (er) { effState = -1; warn('cannot load sound effect via fetch, using HTMLAudio', er && er.message); });
}
function fallbackEffect() {
    var now = Date.now(); if (now - lastFallback < 60) return; lastFallback = now;
    if (!pool.length) { for (var i = 0; i < 4; i++) { var a = new Audio(url(CFG.effectFile)); a.preload = 'auto'; a.volume = CFG.effectVolume; pool.push(a); } }
    var el = pool[poolI++ % pool.length]; try { el.currentTime = 0; } catch (er) { } guard(el.play());
}
function found() {
    if (effState === 2 && ctx) {
        try {
            if (ctx.state === 'suspended' || ctx.state === 'interrupted') guard(ctx.resume());
            var src = ctx.createBufferSource(), g = ctx.createGain(), t = Math.max(ctx.currentTime, nextT);
            if (t - ctx.currentTime > 0.72) t = ctx.currentTime + 0.72;     /* πολλά στοιχεία μαζί: κλιμάκωση, όχι ένας τεράστιος θόρυβος */
            nextT = t + CFG.effectGap; g.gain.value = CFG.effectVolume; src.buffer = effBuf; src.connect(g); g.connect(ctx.destination); src.start(t);
            return;
        } catch (er) { warn('Web Audio effect failed', er); }
    }
    if (effState === 1) return;      /* ακόμα φορτώνει: καλύτερα καμία κλήση παρά καθυστερημένος ήχος */
    fallbackEffect();
}

/* ───────────── μουσική: δύο στοιχεία <audio> που εναλλάσσονται (το επόμενο τραγούδι είναι έτοιμο πριν τελειώσει το τρέχον) ───────────── */
var SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
var els = null, M = { plan: [], secs: 0, pos: 0, cur: 0, active: false, paused: false, ready: 0, fadeT: 0 }, unlocked = false, wd = 0, wdWarn = 0;
function mkEls() {
    if (els) return; els = [new Audio(), new Audio()];
    els.forEach(function (a, k) {
        a.preload = 'auto'; try { a.setAttribute('playsinline', ''); } catch (er) { }
        a.addEventListener('ended', function () { if (M.active && !M.paused && els[M.cur] === a) advance(); });
        a.addEventListener('error', function () { if (M.active && els[M.cur] === a && a.src && a.src.indexOf('data:') !== 0) { warn('cannot load soundtrack: ' + a.src); advance(); } });
    });
}
function trackUrl(posIdx) { return url(TRACKS[M.plan[posIdx]].file); }
function setSrc(a, u) { if (a.getAttribute('data-u') !== u) { a.setAttribute('data-u', u); a.src = u; try { a.load(); } catch (er) { } } }
function preloadNext() { if (M.pos + 1 < M.plan.length) setSrc(els[M.cur ^ 1], trackUrl(M.pos + 1)); }
function advance() {
    M.pos++; if (M.pos >= M.plan.length) { M.active = false; return; }
    M.cur ^= 1; var a = els[M.cur]; setSrc(a, trackUrl(M.pos));
    if (a.error) { warn('skipping soundtrack that failed to load: ' + a.src); advance(); return; }
    try { a.currentTime = 0; } catch (er) { } a.volume = CFG.musicVolume; guard(a.play()); preloadNext();
}
/* Φρουρός: αν το σύστημα σταματήσει τη μουσική ενώ το παιχνίδι τρέχει (π.χ. το μικρόφωνο πήρε τον ήχο), τη ξαναξεκινά. Δεν ενεργεί όταν το σταμάτησε η παύση του παιχνιδιού. */
function watch() {
    clearInterval(wd); wdWarn = 0;
    wd = setInterval(function () {
        if (!M.active) { clearInterval(wd); return; }
        if (M.paused) return;
        var a = els[M.cur];
        if (a.ended) { advance(); return; }
        if (a.paused && !a.error) { if (wdWarn++ < 3) warn('soundtrack was paused by the system, restarting it'); var p = a.play(); if (p && p.catch) p.catch(nop); }
    }, 400);
}
function silence() { clearInterval(wd); clearInterval(M.fadeT); if (els) els.forEach(function (a) { try { a.pause(); } catch (er) { } a.volume = CFG.musicVolume; }); }
/* Μέσα σε κίνηση του χρήστη (tap): ξεκλείδωμα ήχου (Chrome/Safari) και φόρτωση του sound effect. */
function unlock() {
    mkEls(); loadEffect();
    var c = getCtx(); if (c && c.state === 'suspended') guard(c.resume());
    if (unlocked) return; unlocked = true;
    els.forEach(function (a) { if (!a.src) { a.muted = true; a.src = SILENT; var p = a.play(); var done = function () { a.muted = false; if (!a.getAttribute('data-u')) { try { a.pause(); } catch (er) { } a.removeAttribute('src'); } };
        if (p && p.then) p.then(done, done); else done(); } });
}
/* Φτιάχνει το πρόγραμμα για γύρο seconds δευτερολέπτων και φορτώνει από πριν το πρώτο και το δεύτερο τραγούδι. */
function prepare(seconds) {
    mkEls(); M.active = false; silence();
    M.plan = buildPlan(seconds); M.secs = seconds; M.pos = 0; M.cur = 0; M.ready = M.plan.length ? 1 : 0;
    if (M.ready) { lastFirst = M.plan[0]; setSrc(els[0], trackUrl(0)); preloadNext(); }
}
function start(seconds) {
    mkEls(); if (!M.ready || M.secs !== seconds) prepare(seconds);
    if (!M.plan.length) return; silence(); M.ready = 0; M.active = true; M.paused = false; M.pos = 0; M.cur = 0;
    var a = els[0]; setSrc(a, trackUrl(0)); try { a.currentTime = 0; } catch (er) { } a.volume = CFG.musicVolume; guard(a.play()); preloadNext(); watch();
}
function pause() { if (!M.active || M.paused) return; M.paused = true; clearInterval(M.fadeT); try { els[M.cur].pause(); } catch (er) { } }
function resume() {
    if (!M.active || !M.paused) return; M.paused = false;
    if (ctx && ctx.state !== 'running') guard(ctx.resume());
    if (els[M.cur].ended) advance(); else guard(els[M.cur].play());
    watch();      /* αν το σύστημα αρνηθεί το πρώτο play() (π.χ. το μικρόφωνο μόλις άνοιξε), ο φρουρός ξαναδοκιμάζει */
}
function stop(fade) {
    var wasOn = M.active, a = els && els[M.cur]; M.active = false; M.ready = 0; clearInterval(M.fadeT); clearInterval(wd);
    if (!a) return;
    if (fade && wasOn && !M.paused && !a.paused) {
        var v0 = a.volume, t0 = Date.now();
        M.fadeT = setInterval(function () { var p = (Date.now() - t0) / CFG.fadeMs; if (p >= 1) { clearInterval(M.fadeT); try { a.pause(); } catch (er) { } a.volume = CFG.musicVolume; } else a.volume = Math.max(0, v0 * (1 - p)); }, 40);
    } else { try { a.pause(); } catch (er) { } a.volume = CFG.musicVolume; }
    M.paused = false;
    if (els) els.forEach(function (x) { if (x !== a) { try { x.pause(); } catch (er) { } } });
}

window.ERushAudio = {
    unlock: unlock, prepare: prepare, start: start, pause: pause, resume: resume, stop: stop, found: found,
    info: function () { return { base: BASE, plan: M.plan.map(function (i) { return TRACKS[i].file + ' (' + TRACKS[i].sec + 's)'; }), effect: effState, active: M.active }; },
    _plan: buildPlan, _tracks: TRACKS, _cfg: CFG
};
})();
