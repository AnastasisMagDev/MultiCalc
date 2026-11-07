/* ══════════════════════════════════════════════════════════════════════════
   modules.js — ΚΑΤΑΛΟΓΟΣ ΤΩΝ MODULES
   ──────────────────────────────────────────────────────────────────────────
   Εδώ ορίζεται ΤΙ modules υπάρχουν. Το ΠΩΣ φορτώνονται το ξέρει το
   module-loader.js — εδώ δεν υπάρχει καθόλου κώδικας φόρτωσης, μόνο δεδομένα.
   Αυτό είναι το αρχείο που θα αλλάζεις συχνότερα.

   Πεδία κάθε εγγραφής:
     id         Μοναδικό όνομα (χρησιμοποιείται σε splash, diagnostics και στο
                MultiCalc.modules.loaded/failed). ΜΗΝ το αλλάζεις σε υπάρχον module.
     file       Διαδρομή του κύριου .html του module, ΩΣ ΠΡΟΣ ΤΟ index.html.
     navTarget  id της οθόνης (.screen) του module, π.χ. 'scr-ptbl'. Αν το module
                απενεργοποιηθεί ή αποτύχει, κρύβεται η κάρτα μενού που οδηγεί εκεί.
                null = το module δεν έχει δική του οθόνη/κάρτα.
     name       Όνομα σε { el, en, es }.
     category   'system' | 'tools' | 'mathematics' | 'physics' | 'chemistry'
                (ακολουθεί τους φακέλους: system/, tools/, subjects/<μάθημα>/).
     order      Θέση της κάρτας του module στο κύριο μενού (1, 2, 3 …).
                null = το module δεν έχει κάρτα στο κύριο μενού.
     required   true = χωρίς αυτό η εφαρμογή δεν ξεκινά (μόνο το κύριο μενού).
     enabled    false = το module παραλείπεται και η κάρτα του κρύβεται.

   ΣΕΙΡΑ ΦΟΡΤΩΣΗΣ = η σειρά των εγγραφών παρακάτω (το required πρώτο).
   ΣΕΙΡΑ ΣΤΟ ΜΕΝΟΥ = το πεδίο `order` (δεν επηρεάζει τη φόρτωση).

   Νέο module: φτιάξε φάκελο στο σωστό σημείο (subjects/…, tools/, system/),
   βάλε εκεί το .html του (και τα αδερφικά του αρχεία), και πρόσθεσε μία εγγραφή.
   ══════════════════════════════════════════════════════════════════════════ */
window.MC_MODULES = [

    /* ── Required ─────────────────────────────────────────────────────── */
    { id: 'menu', file: 'system/main-menu/MODULE-01-MAIN-MENU.html', navTarget: null,
      name: { el: 'Κύριο μενού', en: 'Main menu', es: 'Menú principal' },
      category: 'system', order: null, required: true, enabled: true },

    /* ── Optional — απενεργοποίηση με enabled:false ───────────────────── */
    { id: 'equation', file: 'subjects/mathematics/equations/MODULE-02-EQUATION-SOLVER.html', navTarget: 'scr-equation',
      name: { el: 'Επίλυση Εξισώσεων', en: 'Equation Solver', es: 'Solucionador de Ecuaciones' },
      category: 'mathematics', order: 6, required: false, enabled: true },

    { id: 'units', file: 'tools/unit-converters/MODULE-03-UNIT-CONVERTERS.html', navTarget: 'scr-units',
      name: { el: 'Μετατροπέας Μονάδων', en: 'Unit Converter', es: 'Conversor de Unidades' },
      category: 'tools', order: 3, required: false, enabled: true },

    { id: 'physics', file: 'subjects/physics/MODULE-04-PHYSICS.html', navTarget: 'scr-physics',
      name: { el: 'Φυσική', en: 'Physics', es: 'Física' },
      category: 'physics', order: 4, required: false, enabled: true },

    { id: 'currency', file: 'tools/currency/MODULE-05-CURRENCY.html', navTarget: 'scr-curr',
      name: { el: 'Νόμισμα', en: 'Currency', es: 'Moneda' },
      category: 'tools', order: 5, required: false, enabled: true },

    { id: 'sci', file: 'tools/scientific-calculator/MODULE-06-SCIENTIFIC-CALC.html', navTarget: 'scr-sci',
      name: { el: 'Επιστημονική', en: 'Scientific', es: 'Científica' },
      category: 'tools', order: 2, required: false, enabled: true },

    { id: 'calc', file: 'tools/standard-calculator/MODULE-07-STANDARD-CALC.html', navTarget: 'scr-calc',
      name: { el: 'Αριθμομηχανή', en: 'Calculator', es: 'Calculadora' },
      category: 'tools', order: 1, required: false, enabled: true },

    { id: 'bmi', file: 'tools/bmi-health/MODULE-08-BMI-HEALTH.html', navTarget: 'scr-bmi',
      name: { el: 'BMI / Υγεία', en: 'BMI / Health', es: 'IMC / Salud' },
      category: 'tools', order: 9, required: false, enabled: true },

    { id: 'date', file: 'tools/date-calculator/MODULE-09-DATE-CALCULATOR.html', navTarget: 'scr-date',
      name: { el: 'Υπολογιστής Ημερομηνιών', en: 'Date Calculator', es: 'Calculadora de Fechas' },
      category: 'tools', order: 7, required: false, enabled: true },

    { id: 'percent', file: 'subjects/mathematics/percentages/MODULE-10-PERCENTAGE.html', navTarget: 'scr-percent',
      name: { el: 'Εργαλεία Ποσοστών', en: 'Percentage Tools', es: 'Herramientas de Porcentaje' },
      category: 'mathematics', order: 8, required: false, enabled: true },

    { id: 'themes', file: 'system/themes/MODULE-11-THEMES.html', navTarget: 'scr-themes',
      name: { el: 'Θέματα', en: 'Themes', es: 'Temas' },
      category: 'system', order: 10, required: false, enabled: true },

    { id: 'funfacts', file: 'system/fun-facts/MODULE-12-FUN-FACTS.html', navTarget: null,
      name: { el: 'Ενδιαφέροντα Γεγονότα', en: 'Fun Facts', es: 'Datos Curiosos' },
      category: 'system', order: null, required: false, enabled: true },

    { id: 'worldclock', file: 'tools/world-clock/MODULE-13-WORLD-CLOCK.html', navTarget: 'scr-worldclock',
      name: { el: 'Παγκόσμια Ώρα', en: 'World Clock', es: 'Hora Mundial' },
      category: 'tools', order: 11, required: false, enabled: true },

    /* ── Chemistry ────────────────────────────────────────────────────── */
    { id: 'periodic', file: 'subjects/chemistry/periodic-table/MODULE-14-PERIODIC-TABLE.html', navTarget: 'scr-ptbl',
      name: { el: 'Περιοδικός Πίνακας', en: 'Periodic Table', es: 'Tabla Periódica' },
      category: 'chemistry', order: 12, required: false, enabled: true },

    /* Ανοίγει από το κουμπί «Game» μέσα στον Περιοδικό Πίνακα (όχι από κάρτα μενού). */
    { id: 'erush', file: 'subjects/chemistry/element-rush/MODULE-15-ELEMENT-RUSH.html', navTarget: 'scr-erush',
      name: { el: 'Element Rush', en: 'Element Rush', es: 'Element Rush' },
      category: 'chemistry', order: null, required: false, enabled: true },

    /* Ανοίγει από την κάρτα «Εργαστήριο pH» του κύριου μενού (order 13, μετά τον Περιοδικό Πίνακα). */
    { id: 'phlab', file: 'subjects/chemistry/ph-lab/MODULE-16-ACIDS-BASES-PH-LAB.html', navTarget: 'scr-phlab',
      name: { el: 'Εργαστήριο Οξέων, Βάσεων & pH', en: 'Acids, Bases & pH Lab', es: 'Laboratorio de Ácidos, Bases y pH' },
      category: 'chemistry', order: 13, required: false, enabled: true },

    /* Ανοίγει από την κάρτα «Εργαστήριο Τύπων» του κύριου μενού (order 14, μετά το Εργαστήριο pH).
       Φορτώνει το elements.js του Περιοδικού Πίνακα (../periodic-table/) — δεν μεταφέρεται στο shared/. */
    { id: 'formula', file: 'subjects/chemistry/formula-lab/MODULE-17-CHEMICAL-FORMULA-LAB.html', navTarget: 'scr-formula',
      name: { el: 'Εργαστήριο Χημικών Τύπων', en: 'Chemical Formula Lab', es: 'Laboratorio de Fórmulas Químicas' },
      category: 'chemistry', order: 14, required: false, enabled: true },

    /* Ανοίγει από την κάρτα «Εργαστήριο Δεσμών & Μορίων» του κύριου μενού (order 15, μετά το Εργαστήριο Τύπων).
       Φορτώνει το elements.js του Περιοδικού Πίνακα (../periodic-table/) και το ph-plot.js του Εργαστηρίου pH (../ph-lab/) —
       κανένα από τα δύο δεν αντιγράφεται μέσα στο module και δεν μεταφέρεται στο shared/. */
    { id: 'bonding', file: 'subjects/chemistry/bonding-studio/MODULE-18-BONDING-MOLECULE-STUDIO.html', navTarget: 'scr-bonding',
      name: { el: 'Εργαστήριο Δεσμών & Μορίων', en: 'Bonding & Molecule Studio', es: 'Estudio de Enlaces y Moléculas' },
      category: 'chemistry', order: 15, required: false, enabled: true },

    /* ── System — βοηθητικά modules (όχι calculator tools) ────────────── */
    { id: 'backup', file: 'system/backup-restore/SYSTEM-01-BACKUP-RESTORE.html', navTarget: 'scr-backup',
      name: { el: 'Backup & Restore Δεδομένων', en: 'Backup & Restore', es: 'Copia de seguridad y restauración' },
      category: 'system', order: null, required: false, enabled: true }
];
