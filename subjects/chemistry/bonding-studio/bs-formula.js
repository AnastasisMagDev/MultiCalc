/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-formula.js
   Typed chemical formulas.  Whatever the student types in the search box — H2O, Al2(SO4)3, SO4 2-, Fe3+, Na+5, Al-2, CuSO4·5H2O —
   is read with the Formula Lab's own engine (FormulaEngine + POLYATOMIC_IONS, shared files, nothing copied) and turned into
   something the Studio can show:
     lib      a species that is already in the Studio library (experimental angles / dipoles are kept)
     mol      a molecule or polyatomic ion whose Lewis structure is derived here (one central atom + terminal ligands, oxo-acids,
              a few curated skeletons) — the existing engine then does resonance, VSEPR, polarity exactly as for library entries
     ionic    two monatomic ions → the lattice view (Kapustinskii, Born–Landé, Born–Haber)
     salt     polyatomic ions (Al2(SO4)3, NH4NO3, KMnO4 …) → the ions with their own structures, switch between them
     species  one atom or monatomic ion (Na, Cl-, Fe3+, Na+5, Al-2) → electron shells + a verdict that follows data, not taste
   Principle of the project: decisions follow scientific data. Nothing is guessed silently: when the formula alone does not define
   one reliable structure the Studio says so (and why) instead of drawing something.
   Needs: BSData, BSEngine, BSText (this module) · FormulaEngine, POLYATOMIC_IONS (formula lab) · MC_ELEMENTS (periodic table).
   Exposes window.BSFormula; bs-ui.js calls list / open / banner / speciesHTML / saltChips / checks.
   ========================================================================== */
(function (root) {
  'use strict';
  var E = root.BSEngine, D = root.BSData, TX = root.BSText;
  var API = {};
  Object.defineProperty(API, 'available', { get: function () { return !!(root.FormulaEngine && root.FormulaEngine.analyze && root.BSEngine); } });
  root.BSFormula = API;
  if (!E || !D || !TX) return;
  function FE() { return root.FormulaEngine; }

  /* ================================================================= dictionary (every key exists in el / en / es) */
  function d(k, el, en, es) { TX.el[k] = el; TX.en[k] = en; TX.es[k] = es; }
  function fmt(s, p) { return String(s).replace(/\{(\w+)\}/g, function (m, n) { return p && p[n] !== undefined ? p[n] : m; }); }

  d('f_hint', 'Γράψε έναν τύπο: H2O · Al2(SO4)3 · SO4 2- · Fe3+ · Na+5 · Al-2 · CuSO4·5H2O', 'Type a formula: H2O · Al2(SO4)3 · SO4 2- · Fe3+ · Na+5 · Al-2 · CuSO4·5H2O', 'Escribe una fórmula: H2O · Al2(SO4)3 · SO4 2- · Fe3+ · Na+5 · Al-2 · CuSO4·5H2O');
  d('f_typed', 'Τύπος που έγραψες', 'Formula you typed', 'Fórmula escrita');
  d('f_alt', 'εναλλακτική ανάγνωση', 'alternative reading', 'lectura alternativa');
  d('f_k_mol', 'μόριο', 'molecule', 'molécula');
  d('f_k_ionic', 'ιοντική ένωση', 'ionic compound', 'compuesto iónico');
  d('f_k_salt', 'άλας', 'salt', 'sal');
  d('f_k_atom', 'άτομο', 'atom', 'átomo');
  d('f_k_mono', 'μονοατομικό ιόν', 'monatomic ion', 'ion monoatómico');
  d('f_k_lib', 'από τη βιβλιοθήκη', 'from the library', 'de la biblioteca');
  d('f_k_ionlib', 'ιόν', 'ion', 'ion');

  /* parse errors (codes come from the Formula Lab engine) */
  d('f_err_EMPTY', 'Γράψε έναν τύπο.', 'Type a formula.', 'Escribe una fórmula.');
  d('f_err_UNBALANCED', 'Οι παρενθέσεις δεν κλείνουν σωστά (θέση {pos}).', 'The brackets do not match (position {pos}).', 'Los paréntesis no coinciden (posición {pos}).');
  d('f_err_ZERO', 'Ο δείκτης 0 δεν επιτρέπεται.', 'A subscript of 0 is not allowed.', 'No se permite el subíndice 0.');
  d('f_err_EMPTYPART', 'Υπάρχει κενή ομάδα ατόμων στον τύπο.', 'There is an empty group of atoms in the formula.', 'Hay un grupo de átomos vacío en la fórmula.');
  d('f_err_UNKNOWN', 'Άγνωστο σύμβολο στοιχείου «{info}».', 'Unknown element symbol "{info}".', 'Símbolo de elemento desconocido «{info}».');
  d('f_err_CHAR', 'Μη αποδεκτός χαρακτήρας «{info}» (θέση {pos}).', 'Character "{info}" is not allowed (position {pos}).', 'Carácter «{info}» no permitido (posición {pos}).');

  /* structures the Studio will not draw (and why) */
  d('f_no_struct', 'Ο τύπος {f} από μόνος του δεν ορίζει μία αξιόπιστη δομή. Το Studio χτίζει δομή όταν υπάρχει ένα κεντρικό άτομο με τερματικούς υποκαταστάτες ή όταν το σωματίδιο υπάρχει στη βιβλιοθήκη — δεν θα μαντέψω.',
    'The formula {f} alone does not define one reliable structure. The Studio builds a structure when there is one central atom with terminal ligands, or when the species is in the library — it will not guess.',
    'La fórmula {f} por sí sola no define una estructura fiable. El Studio construye una estructura cuando hay un átomo central con ligandos terminales o cuando la especie está en la biblioteca; no adivina.');
  d('f_no_radical', 'Το {f} έχει περιττό αριθμό ηλεκτρονίων σθένους ({n}): είναι ρίζα και δεν περιγράφεται από μία δομή Lewis με πλήρη ζεύγη.',
    '{f} has an odd number of valence electrons ({n}): it is a radical and has no single Lewis structure made of complete pairs.',
    '{f} tiene un número impar de electrones de valencia ({n}): es un radical y no tiene una única estructura de Lewis con pares completos.');
  d('f_no_network', 'Το {f} είναι ομοιοπολικό πλέγμα (δίκτυο), όχι μόριο: δεν υπάρχει μονάδα {f} με καθορισμένα όρια. Ο τύπος δείχνει μόνο την απλούστερη αναλογία των ατόμων.',
    '{f} is a covalent network, not a molecule: there is no {f} unit with definite boundaries. The formula only gives the simplest atom ratio.',
    '{f} es una red covalente, no una molécula: no existe una unidad {f} con límites definidos. La fórmula solo indica la proporción más sencilla de átomos.');
  d('f_no_ionic', 'Το {f} δεν αναλύεται με βεβαιότητα σε ιόντα (φορτία που δεν ισοσταθμίζονται, μικτό σθένος, κράμα/διμεταλλική ένωση ή περισσότερες από μία πιθανές αναλύσεις) — δεν θα μαντέψω.',
    '{f} cannot be split into ions with certainty (charges that do not balance, mixed valence, an alloy / intermetallic, or more than one possible split) — it will not guess.',
    '{f} no se puede separar en iones con certeza (cargas que no se equilibran, valencia mixta, aleación / compuesto intermetálico o más de una separación posible); no adivina.');
  d('f_no_form', 'Το {f} είναι στοιχειακή μορφή χωρίς μία καθορισμένη δομή Lewis εδώ (π.χ. P₄, S₈: δακτύλιοι ή πολυμερή).',
    '{f} is an elemental form without one defined Lewis structure here (e.g. P₄, S₈: rings or polymers).',
    '{f} es una forma elemental sin una estructura de Lewis definida aquí (p. ej., P₄, S₈: anillos o polímeros).');
  d('f_no_lab', 'Η ανάγνωση τύπων χρειάζεται τα αρχεία του Formula Lab (formula-engine.js, polyatomic-ions.js) — δεν φορτώθηκαν.',
    'Reading formulas needs the Formula Lab files (formula-engine.js, polyatomic-ions.js) — they were not loaded.',
    'Leer fórmulas requiere los archivos del Formula Lab (formula-engine.js, polyatomic-ions.js); no se cargaron.');

  /* notes */
  d('f_n_skel', 'Υπόθεση: κεντρικό άτομο {c} με τερματικούς υποκαταστάτες. Ο μοριακός τύπος από μόνος του δεν καθορίζει τη δομή — μπορεί να υπάρχουν ισομερή.',
    'Assumption: central atom {c} with terminal ligands. A molecular formula alone does not fix the structure — isomers may exist.',
    'Suposición: átomo central {c} con ligandos terminales. La fórmula molecular por sí sola no fija la estructura; pueden existir isómeros.');
  d('f_n_sep', 'Σε ουδέτερο μόριο η δομή έχει διαχωρισμό τυπικού φορτίου — άλλες διατάξεις των ίδιων ατόμων μπορεί να είναι σταθερότερες.',
    'In a neutral molecule this structure has formal-charge separation — other arrangements of the same atoms may be more stable.',
    'En una molécula neutra esta estructura tiene separación de carga formal; otras disposiciones de los mismos átomos pueden ser más estables.');
  d('f_n_iso', 'Ο τύπος αντιστοιχεί σε περισσότερα ισομερή· εμφανίζεται το «{name}» από τη βιβλιοθήκη.',
    'The formula matches more than one isomer; "{name}" from the library is shown.',
    'La fórmula corresponde a más de un isómero; se muestra «{name}» de la biblioteca.');
  d('f_n_reduced', 'Εμφανίζεται η απλούστερη μονάδα τύπου {f} (ο τύπος που έγραψες είναι πολλαπλάσιό της).',
    'The simplest formula unit {f} is shown (what you typed is a multiple of it).',
    'Se muestra la unidad fórmula más simple {f} (lo que escribiste es un múltiplo).');
  d('f_n_unusual', 'Ασυνήθιστο φορτίο για το {sym}: {q}+ (σύνηθες: {common}). Έλεγξε αν ο τύπος εκφράζει άλλη δομή (π.χ. ιόν S₂²⁻ αντί για S²⁻) — αυτή είναι η ανάλυση που προκύπτει από την ηλεκτρική ουδετερότητα.',
    'Unusual charge for {sym}: {q}+ (usual: {common}). Check whether the formula stands for another structure (e.g. an S₂²⁻ ion instead of S²⁻) — this is the split that follows from electrical neutrality.',
    'Carga poco habitual para {sym}: {q}+ (habitual: {common}). Comprueba si la fórmula representa otra estructura (p. ej., un ion S₂²⁻ en lugar de S²⁻); esta es la separación que sale de la neutralidad eléctrica.');
  d('f_n_hydrate', 'Κρυσταλλικό νερό: {w}. Εμφανίζεται το άνυδρο άλας.', 'Water of crystallisation: {w}. The anhydrous salt is shown.', 'Agua de cristalización: {w}. Se muestra la sal anhidra.');
  d('f_n_border', 'Οριακός δεσμός (Δχ = {d} < 1,7): ο τύπος διαβάζεται ως ομοιοπολικό μόριο· δες και την ιοντική ανάγνωση.',
    'Borderline bond (Δχ = {d} < 1.7): the formula is read as a covalent molecule; see the ionic reading too.',
    'Enlace límite (Δχ = {d} < 1,7): la fórmula se lee como molécula covalente; mira también la lectura iónica.');
  d('f_n_border2', 'Οριακός δεσμός (Δχ = {d} < 1,7): ιοντική ανάγνωση — ο πραγματικός δεσμός έχει σημαντικό ομοιοπολικό χαρακτήρα.',
    'Borderline bond (Δχ = {d} < 1.7): ionic reading — the real bond has a large covalent share.',
    'Enlace límite (Δχ = {d} < 1,7): lectura iónica; el enlace real tiene una parte covalente importante.');
  d('f_n_dblock', 'Στα μέταλλα μετάπτωσης η δομή Lewis είναι τυπική απεικόνιση: οι δεσμοί M–O δεν περιγράφονται πλήρως από ακέραιες τάξεις δεσμού.',
    'For transition metals the Lewis structure is a formal picture: the M–O bonds are not fully described by whole bond orders.',
    'En los metales de transición la estructura de Lewis es una representación formal: los enlaces M–O no se describen del todo con órdenes enteros.');
  d('f_n_many', 'Το άλας έχει {n} είδη ιόντων — διάλεξε ένα για να δεις τη δομή του.', 'The salt contains {n} kinds of ion — pick one to see its structure.', 'La sal contiene {n} tipos de iones; elige uno para ver su estructura.');
  d('f_n_elem', 'Στερεό μέταλλο: ο τύπος γράφεται {sym}. Εμφανίζεται το άτομο.', 'A solid metal is written {sym}. The atom is shown.', 'Un metal sólido se escribe {sym}. Se muestra el átomo.');
  d('f_n_alt', 'Το «{t}» διαβάζεται με δύο τρόπους — εδώ διαβάστηκε ως {a}. Δες και την εναλλακτική στη λίστα.',
    '"{t}" can be read in two ways — here it was read as {a}. See the alternative in the list.',
    '«{t}» se puede leer de dos formas; aquí se leyó como {a}. Mira la alternativa en la lista.');
  d('f_n_nostruct', 'χωρίς δομή στη βιβλιοθήκη', 'no structure in the library', 'sin estructura en la biblioteca');
  d('f_ions', 'Ιόντα της ένωσης — πάτα για να δεις τη δομή τους', 'Ions of the compound — tap to see their structure', 'Iones del compuesto: pulsa para ver su estructura');

  /* atom / monatomic ion card */
  d('f_sp_head', 'Υπάρχει αυτό το σωματίδιο;', 'Does this species exist?', '¿Existe esta especie?');
  d('f_sp_shells', 'Κελύφη e⁻', 'e⁻ shells', 'Capas e⁻');
  d('f_sp_ng', 'Ισοηλεκτρονιακό με', 'Isoelectronic with', 'Isoelectrónico con');
  d('f_sp_cum', 'Σύνολο ενεργειών ιοντισμού', 'Total ionisation energy', 'Energía de ionización total');
  d('f_sp_steps', 'Διαδοχικές ενέργειες ιοντισμού (kJ/mol)', 'Successive ionisation energies (kJ/mol)', 'Energías de ionización sucesivas (kJ/mol)');
  d('f_sp_src', 'Πηγή: Wikipedia «Molar ionization energies of the elements» (WEL/CRC).', 'Source: Wikipedia "Molar ionization energies of the elements" (WEL/CRC).', 'Fuente: Wikipedia «Molar ionization energies of the elements» (WEL/CRC).');
  d('f_sp_common', 'Σύνηθη ιόντα — πάτα για να τα δεις', 'Usual ions — tap to see them', 'Iones habituales: pulsa para verlos');
  d('f_sp_radius', 'Ακτίνα (Shannon) pm', 'Radius (Shannon) pm', 'Radio (Shannon) pm');
  d('f_sp_cov', 'Ομοιοπολική ακτίνα pm', 'Covalent radius pm', 'Radio covalente pm');
  d('f_sp_est', '* εκτίμηση (το ιόν δεν υπάρχει στον πίνακα Shannon)', '* estimate (the ion is not in the Shannon table)', '* estimación (el ion no está en la tabla de Shannon)');
  d('f_sp_prot', 'Πρωτόνια', 'Protons', 'Protones');
  d('f_sp_neutral', 'Ουδέτερο άτομο: {Z} ηλεκτρόνια · κελύφη {sh}.', 'Neutral atom: {Z} electrons · shells {sh}.', 'Átomo neutro: {Z} electrones · capas {sh}.');

  /* verdicts */
  d('f_v_common', 'Συνηθισμένο ιόν: το {ion} εμφανίζεται σε ενώσεις και διαλύματα (σύνηθες φορτίο του στοιχείου: {common}).', 'Common ion: {ion} occurs in compounds and solutions (usual charge of the element: {common}).', 'Ion habitual: {ion} aparece en compuestos y disoluciones (carga habitual del elemento: {common}).');
  d('f_v_commonan', 'Συνηθισμένο ανιόν: το {ion} έχει δομή ευγενούς αερίου ({ng}) και είναι δέσμιο ακόμη και στην αέρια φάση (ηλεκτρονιοσυγγένεια {ea} kJ/mol).', 'Common anion: {ion} has a noble-gas configuration ({ng}) and is bound even in the gas phase (electron affinity {ea} kJ/mol).', 'Anión habitual: {ion} tiene configuración de gas noble ({ng}) y está ligado incluso en fase gaseosa (afinidad electrónica {ea} kJ/mol).');
  d('f_v_proton', 'Γυμνό πρωτόνιο (χωρίς κανένα ηλεκτρόνιο): στο νερό δεν υπάρχει ελεύθερο — ενώνεται με μόριο νερού και δίνει H₃O⁺.', 'A bare proton (no electrons at all): it does not exist free in water — it binds to a water molecule to give H₃O⁺.', 'Un protón desnudo (sin electrones): no existe libre en agua; se une a una molécula de agua y da H₃O⁺.');
  d('f_v_hydride', 'Ιόν υδριδίου: υπάρχει σε αλατώδη υδρίδια (π.χ. NaH, CaH₂) και είναι δέσμιο στην αέρια φάση (EA {ea} kJ/mol). Στο νερό δεν επιβιώνει: H⁻ + H₂O → H₂ + OH⁻.', 'Hydride ion: it exists in salt-like hydrides (e.g. NaH, CaH₂) and is bound in the gas phase (EA {ea} kJ/mol). It does not survive in water: H⁻ + H₂O → H₂ + OH⁻.', 'Ion hidruro: existe en hidruros salinos (p. ej., NaH, CaH₂) y está ligado en fase gaseosa (EA {ea} kJ/mol). No sobrevive en agua: H⁻ + H₂O → H₂ + OH⁻.');
  d('f_v_rare', 'Ασυνήθιστο φορτίο: το {ion} απαιτεί να χαθούν {q} ηλεκτρόνια από τα {V} του σθένους του {sym}. Εμφανίζεται μόνο σε λίγες ειδικές ενώσεις (σύνηθες: {common}).', 'Unusual charge: {ion} needs {q} electrons to be lost out of the {V} valence electrons of {sym}. It appears only in a few special compounds (usual: {common}).', 'Carga poco habitual: {ion} exige perder {q} de los {V} electrones de valencia de {sym}. Solo aparece en pocos compuestos especiales (habitual: {common}).');
  d('f_v_dblock', 'Το {ion} είναι εφικτή οξειδωτική βαθμίδα στοιχείου μετάπτωσης (μέχρι περίπου +{max}), αλλά το Studio δεν έχει πίνακα σύνηθων φορτίων για το {sym} — έλεγξε τη βιβλιογραφία για τις ενώσεις του.', '{ion} is a possible oxidation state of a transition element (up to about +{max}), but the Studio has no table of usual charges for {sym} — check the literature for its compounds.', '{ion} es un estado de oxidación posible de un elemento de transición (hasta aprox. +{max}), pero el Studio no tiene tabla de cargas habituales para {sym}; consulta la bibliografía sobre sus compuestos.');
  d('f_v_unknown', 'Πέρα από τις γνωστές οξειδωτικές βαθμίδες: δεν έχει τεκμηριωθεί ένωση του {sym} με φορτίο {q}+ (η μέγιστη γνωστή είναι περίπου +{max}).', 'Beyond the known oxidation states: no compound of {sym} with charge {q}+ is established (the highest known is about +{max}).', 'Más allá de los estados de oxidación conocidos: no hay un compuesto establecido de {sym} con carga {q}+ (el máximo conocido es aprox. +{max}).');
  d('f_v_covalent', 'Στα αμέταλλα το +{q} είναι αριθμός οξείδωσης (λογιστικό εργαλείο): οι δεσμοί είναι ομοιοπολικοί και δεν υπάρχει ελεύθερο ιόν {ion}.', 'For non-metals +{q} is an oxidation number (a bookkeeping tool): the bonds are covalent and there is no free {ion} ion.', 'En los no metales +{q} es un número de oxidación (herramienta contable): los enlaces son covalentes y no existe un ion {ion} libre.');
  d('f_v_core', 'Αδύνατο ως χημικό ιόν: το {sym} έχει μόνο {ve}. Το φορτίο {q}+ θα έβγαζε άλλα {k} από το κλειστό εσωτερικό κέλυφος n = {n}{cn}, όπου η ενέργεια ιοντισμού ανεβαίνει απότομα.{jump}', 'Impossible as a chemical ion: {sym} has only {ve}. A charge of {q}+ would pull another {k} out of the closed inner shell n = {n}{cn}, where the ionisation energy jumps.{jump}', 'Imposible como ion químico: {sym} solo tiene {ve}. Una carga {q}+ arrancaría otros {k} de la capa interna cerrada n = {n}{cn}, donde la energía de ionización se dispara.{jump}');
  d('f_v_jump', ' Στο {sym}: IE{a} = {ea} → IE{b} = {eb} kJ/mol (×{ratio}). Συνολικά για {q} ηλεκτρόνια: {cum} kJ/mol — περίπου {x} φορές ο ισχυρότερος δεσμός του πίνακα ({bond}). Καμία χημική αντίδραση δεν δίνει τέτοια ενέργεια· τέτοια ιόντα υπάρχουν μόνο σε πλάσμα ή αστέρες.', ' For {sym}: IE{a} = {ea} → IE{b} = {eb} kJ/mol (×{ratio}). In total {cum} kJ/mol for {q} electrons — about {x} times the strongest bond in the table ({bond}). No chemical reaction supplies that; such ions exist only in plasmas or stars.', ' En {sym}: IE{a} = {ea} → IE{b} = {eb} kJ/mol (×{ratio}). En total {cum} kJ/mol para {q} electrones: unas {x} veces el enlace más fuerte de la tabla ({bond}). Ninguna reacción química aporta eso; tales iones solo existen en plasmas o estrellas.');
  d('f_v_toomany', 'Το {sym} έχει μόνο {Z} ηλεκτρόνια — δεν μπορεί να χάσει {q}.', '{sym} has only {Z} electrons — it cannot lose {q}.', '{sym} solo tiene {Z} electrones; no puede perder {q}.');
  d('f_v_lattice', 'Υπάρχει μόνο μέσα σε κρυστάλλους (ή πολύ ειδικά περιβάλλοντα): στο ελεύθερο άτομο η προσθήκη του {k}ου ηλεκτρονίου δεν είναι ευνοϊκή (η 2η/3η ηλεκτρονιοσυγγένεια είναι αρνητική) και το ιόν σταθεροποιείται από την ενέργεια πλέγματος. Στο νερό αντιδρά (π.χ. O²⁻ + H₂O → 2 OH⁻).', 'It exists only inside crystals (or very special environments): on the free atom adding the {k}th electron is not favourable (the 2nd/3rd electron affinity is negative) and the ion is stabilised by the lattice energy. In water it reacts (e.g. O²⁻ + H₂O → 2 OH⁻).', 'Solo existe dentro de cristales (o entornos muy especiales): en el átomo libre añadir el electrón n.º {k} no es favorable (la 2.ª/3.ª afinidad electrónica es negativa) y el ion se estabiliza con la energía reticular. En agua reacciona (p. ej., O²⁻ + H₂O → 2 OH⁻).');
  d('f_v_partial', 'Ριζικό ανιόν της αέριας φάσης: το {ion} είναι δέσμιο (EA {ea} kJ/mol) αλλά δεν συμπληρώνει οκτάδα — στις ενώσεις το {sym} παίρνει {need} ηλεκτρόνια ({full}).', 'Gas-phase radical anion: {ion} is bound (EA {ea} kJ/mol) but does not complete an octet — in compounds {sym} takes {need} electrons ({full}).', 'Anión radical de fase gaseosa: {ion} está ligado (EA {ea} kJ/mol) pero no completa el octeto; en los compuestos {sym} toma {need} electrones ({full}).');
  d('f_v_gasphase', 'Ανιόν της αέριας φάσης: το άτομο έχει θετική ηλεκτρονιοσυγγένεια ({ea} kJ/mol), άρα το {ion} είναι δέσμιο στο κενό, αλλά τα μέταλλα δεν σχηματίζουν ανιόντα σε συνηθισμένες ενώσεις (εξαιρέσεις: ουρίδες/αλκαλίδια σε ειδικά συστήματα).', 'Gas-phase anion: the atom has a positive electron affinity ({ea} kJ/mol), so {ion} is bound in vacuum, but metals do not form anions in ordinary compounds (exceptions: aurides / alkalides in special systems).', 'Anión de fase gaseosa: el átomo tiene afinidad electrónica positiva ({ea} kJ/mol), así que {ion} está ligado en el vacío, pero los metales no forman aniones en compuestos corrientes (excepciones: auriuros / alcaluros en sistemas especiales).');
  d('f_v_unbound', 'Δεν είναι δέσμιο: η ηλεκτρονιοσυγγένεια του {sym} είναι ≤ 0 — το επιπλέον ηλεκτρόνιο δεν συγκρατείται από το άτομο.', 'Not bound: the electron affinity of {sym} is ≤ 0 — the atom does not hold the extra electron.', 'No está ligado: la afinidad electrónica de {sym} es ≤ 0; el átomo no retiene el electrón extra.');
  d('f_v_dianion', 'Δεν υπάρχει ως απομονωμένο ιόν: ένα άτομο δεν συγκρατεί {k} επιπλέον ηλεκτρόνια στην αέρια φάση — το επόμενο ηλεκτρόνιο απωθείται από το ήδη αρνητικό ιόν (αρνητική 2η ηλεκτρονιοσυγγένεια).{first} Τα μέταλλα επιπλέον δεν σχηματίζουν ανιόντα στις ενώσεις.', 'It does not exist as an isolated ion: an atom does not hold {k} extra electrons in the gas phase — the next electron is repelled by the already negative ion (negative 2nd electron affinity).{first} Metals, moreover, do not form anions in compounds.', 'No existe como ion aislado: un átomo no retiene {k} electrones extra en fase gaseosa; el siguiente electrón es repelido por el ion ya negativo (2.ª afinidad electrónica negativa).{first} Además, los metales no forman aniones en los compuestos.');
  d('f_v_first', ' Το {sym}⁻ είναι δέσμιο (EA {ea} kJ/mol), το {sym}²⁻ όχι.', ' {sym}⁻ is bound (EA {ea} kJ/mol), {sym}²⁻ is not.', ' {sym}⁻ está ligado (EA {ea} kJ/mol), {sym}²⁻ no.');
  d('f_v_octet', 'Πέρα από τη συμπληρωμένη οκτάδα: το επιπλέον ηλεκτρόνιο θα έμπαινε στο επόμενο κέλυφος (n+1), πολύ ψηλότερα ενεργειακά — δεν σχηματίζεται.', 'Beyond a completed octet: the extra electron would go into the next shell (n+1), far higher in energy — it does not form.', 'Más allá del octeto completo: el electrón extra iría a la capa siguiente (n+1), mucho más alta en energía; no se forma.');

  /* ================================================================= small helpers */
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  function sub(n) { return String(n).replace(/\d/g, function (c) { return SUB.charAt(+c); }); }
  function chargeTxt(q) { return q ? E.supCharge(q) : ''; }
  function prettyNorm(s) {
    return String(s).split('·').map(function (part) {
      var m = /^(\d+)(.*)$/.exec(part), co = m ? m[1] : '', rest = m ? m[2] : part;
      return co + rest.replace(/([A-Za-z)])(\d+)/g, function (x, a, dg) { return a + sub(dg); });
    }).join('·');
  }
  function pretty(r) { return prettyNorm(r.norm) + chargeTxt(r.charge || 0); }
  function ionTxt(sym, q) { return sym + chargeTxt(q); }
  function sigOfComp(c) { return Object.keys(c).sort().map(function (k) { return k + c[k]; }).join(''); }
  function heavyCount(c) { var n = 0; Object.keys(c).forEach(function (k) { if (k !== 'H') n += c[k]; }); return n; }
  function hill(c) {
    var ks = Object.keys(c), order = c.C ? ['C', 'H'].filter(function (k) { return c[k]; }).concat(ks.filter(function (k) { return k !== 'C' && k !== 'H'; }).sort()) : ks.slice().sort();
    return order.map(function (k) { return k + (c[k] > 1 ? c[k] : ''); }).join('');
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function head(s) { return String(s).split(' (')[0]; }
  function num(x, dp, lang) { var s = Number(x).toFixed(dp === undefined ? 1 : dp); if (Math.abs(x) >= 10000) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009'); return lang === 'en' ? s : s.replace('.', ','); }
  function valenceElectrons(comp, q) { var t = -q; Object.keys(comp).forEach(function (k) { t += comp[k] * E.valence(E.el(k)); }); return t; }
  function nm3(en, el, es) { return { en: en, el: el, es: es }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* ================================================================= library lookup */
  var libIdx = null;
  function libIndex() {
    if (libIdx) return libIdx; libIdx = {};
    E.library.forEach(function (r) { var m = E.fromLibrary(r.id), k = m.sig + '|' + m.charge; (libIdx[k] = libIdx[k] || []).push(r.id); });
    return libIdx;
  }
  function libCore(f) { return E.plain(String(f).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]$/, '')); }
  function libLookup(r) {
    var q = r.charge || 0, comp = r.partCounts[0], ids = libIndex()[sigOfComp(comp) + '|' + q]; if (!ids) return null;
    var typed = r.norm, hc = heavyCount(comp), h = hill(comp), pick = null;
    ids.forEach(function (id) {
      if (pick) return; var m = E.fromLibrary(id), core = libCore(m.formula);
      if (typed === core || hc <= 1 || typed === h) pick = { id: id, mol: m, iso: hc > 1 && typed !== core };
    });
    return pick;
  }

  /* ================================================================= Lewis structures for one central atom + terminal ligands */
  var HYP = { F: 1, O: 1, Cl: 1, Br: 1 }, HALH = { H: 1, F: 1, Cl: 1, Br: 1, I: 1 };
  function lkey(l) { return l.s + (l.oh ? 'H' : ''); }
  /* ligs: [{s:'O'}, {s:'O', oh:true} (hydroxyl), {s:'H'} …] sorted so that equal ligands are adjacent.  Returns a graph for E.buildGraph or null. */
  function lewisAXn(cs, ligs, Q, opt) {
    opt = opt || {};
    var c = E.el(cs), n = ligs.length; if (!c || c.s === 'H' || !n || E.en(c) === null) return null;
    var ligEl = ligs.map(function (l) { return E.el(l.oh ? 'O' : l.s); });
    if (ligEl.some(function (x) { return !x || E.isMetal(x); })) return null;
    if (E.isMetal(c)) {
      var light = (c.s === 'Be' || c.s === 'Al') && ligs.every(function (l) { return !l.oh && HALH[l.s]; });
      var dblk = c.c === 'transition' && ligs.every(function (l) { return !l.oh && l.s === 'O'; });
      if (!light && !dblk) return null;
    }
    if (ligs.some(function (l, i) { return l.s !== 'H' && E.en(c) !== null && E.en(ligEl[i]) !== null && E.en(c) > E.en(ligEl[i]) + 0.3; })) return null;
    if (n === 1 && !(ligs[0].oh || (HALH[c.s] && HALH[ligs[0].s]))) return null;
    if (n > ({ 2: 4, 3: 6, 4: 6 }[c.p] || 7)) return null;
    var Vc = E.valence(c), T = Vc - Q, nOH = 0;
    ligs.forEach(function (l, i) { if (l.oh) { T += 7; nOH++; } else T += E.valence(ligEl[i]); });
    if (T % 2) return null;
    var ordMax = ligs.map(function (l, i) { if (l.oh || l.s === 'H') return 1; return HALH[l.s] ? 1 : ligEl[i].g === 16 ? 2 : 3; });
    var allHyp = opt.hyp || ligs.every(function (l) { return l.oh || HYP[l.s]; });
    var orders = [], best = null;
    function cmp(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
    function evalO(o) {
      var sum = 0, Lt = 0, ok = true, fc = [];
      o.forEach(function (x, i) {
        var l = ligs[i]; sum += x;
        if (l.oh) { Lt += 4; fc.push(0); return; }
        var capL = l.s === 'H' ? 2 : 8, L = capL - 2 * x; if (L < 0) { ok = false; return; }
        Lt += L; fc.push(E.valence(ligEl[i]) - L - x);
      });
      if (!ok) return;
      var Lc = T - 2 * sum - Lt - 2 * nOH; if (Lc < 0 || Lc % 2) return;
      var around = Lc + 2 * sum;
      if (c.p === 2) { if (around > 8) return; if (around < 8 && !(c.g === 2 || c.g === 13)) return; }
      else { if (around > (c.p >= 5 ? 16 : 14)) return; if (around < 8 && !(c.g === 2 || c.g === 13)) return; if (around > 8 && !allHyp) return; }
      var fcc = Vc - Lc - sum, all = fc.concat([fcc]), s1 = 0, mx = 0;
      all.forEach(function (x) { s1 += Math.abs(x); mx = Math.max(mx, Math.abs(x)); });
      var score = [s1, mx, Math.max(0, around - 8), around < 8 ? 1 : 0];
      if (!best || cmp(score, best.score) < 0) best = { score: score, o: o, fc: fc, fcc: fcc, around: around };
    }
    (function rec(k) {
      if (k === n) { evalO(orders.slice()); return; }
      var prev = -1, j; for (j = k - 1; j >= 0; j--) if (lkey(ligs[j]) === lkey(ligs[k])) { prev = j; break; }
      var top = prev >= 0 ? Math.min(ordMax[k], orders[prev]) : ordMax[k];
      for (var o = 1; o <= top; o++) { orders.push(o); rec(k + 1); orders.pop(); }
    })(0);
    if (!best || best.score[0] > 4 + Math.abs(Q)) return null;
    var atoms = [{ s: cs, q: best.fcc }], bonds = [];
    ligs.forEach(function (l, i) {
      var idx = atoms.length; atoms.push({ s: l.oh ? 'O' : l.s, q: best.fc[i] }); bonds.push({ a: 0, b: idx, o: best.o[i] });
      if (l.oh) { atoms.push({ s: 'H', q: 0 }); bonds.push({ a: idx, b: atoms.length - 1, o: 1 }); }
    });
    return { atoms: atoms, bonds: bonds, auto: true, sep: Q === 0 && best.score[0] > 0, dblock: E.isMetal(c) && c.c === 'transition' };
  }

  var OXO = { Cl: 1, Br: 1, I: 1, S: 1, Se: 1, N: 1, P: 1, As: 1, C: 1, B: 1, Si: 1 };
  /* candidate skeletons for a composition (central atom must be present once; least electronegative first) */
  function skeletons(comp, q) {
    var els = Object.keys(comp), out = [];
    function ligList(X, rest) { var l = [], i; els.forEach(function (e) { if (e === X) return; for (i = 0; i < rest[e]; i++) l.push({ s: e }); }); return l; }
    if (els.length === 2 && comp.S === 2 && comp.O === 3) out.push({ c: 'S', ligs: [{ s: 'O' }, { s: 'O' }, { s: 'O' }, { s: 'S' }], hyp: true });   // thiosulfate: S–SO₃
    var cand = els.filter(function (e) { var x = E.el(e); return comp[e] === 1 && e !== 'H' && x && x.g >= 2 && E.en(x) !== null; });
    cand.sort(function (a, b) { return E.en(E.el(a)) - E.en(E.el(b)); });
    cand.forEach(function (X) {
      var rest = {}, i; els.forEach(function (e) { rest[e] = comp[e]; }); rest[X] = 0;
      var nO = rest.O || 0, nH = rest.H || 0, onlyXOH = els.every(function (e) { return e === X || e === 'O' || e === 'H'; });
      var ligs = [];
      if (X === 'P' && onlyXOH && nO > 0 && nH >= nO) {                  // H₃PO₃, H₃PO₂: P–H bonds, one P=O
        for (i = 0; i < 1; i++) ligs.push({ s: 'O' });
        for (i = 0; i < nO - 1; i++) ligs.push({ s: 'O', oh: true });
        for (i = 0; i < nH - (nO - 1); i++) ligs.push({ s: 'H' });
        out.push({ c: X, ligs: ligs, oxo: true }); return;
      }
      if (OXO[X] && onlyXOH && nH > 0 && nO > 0 && nH <= nO && (nO - nH >= 1 || /^(Cl|Br|I|B|Si|As)$/.test(X))) {
        for (i = 0; i < nO - nH; i++) ligs.push({ s: 'O' });
        for (i = 0; i < nH; i++) ligs.push({ s: 'O', oh: true });
        out.push({ c: X, ligs: ligs, oxo: true }); return;
      }
      out.push({ c: X, ligs: ligList(X, rest) });
    });
    out.forEach(function (sp) { sp.ligs.sort(function (a, b) { return lkey(a) < lkey(b) ? -1 : lkey(a) > lkey(b) ? 1 : 0; }); });
    return out;
  }

  /* curated skeletons that are not "one central atom": [typed formula, charge, SMILES-lite, [en, el, es] | null, category] */
  var CURATED = [
    ['H2O2', 0, 'OO', nm3('Hydrogen peroxide', 'Υπεροξείδιο του υδρογόνου', 'Peróxido de hidrógeno'), 'hydride'],
    ['N2H4', 0, 'NN', nm3('Hydrazine', 'Υδραζίνη', 'Hidracina'), 'hydride'],
    ['N2O4', 0, 'O=[N+]([O-])[N+](=O)[O-]', nm3('Dinitrogen tetroxide', 'Τετροξείδιο του διαζώτου', 'Tetróxido de dinitrógeno'), 'oxide'],
    ['O2', -2, '[O-][O-]', null, 'ion'],
    ['C2O4', -2, '[O-]C(=O)C(=O)[O-]', null, 'ion'],
    ['CH3COO', -1, 'CC(=O)[O-]', null, 'ion'],
    ['SCN', -1, '[S-]C#N', null, 'ion'],
    ['Cr2O7', -2, '[O-][Cr](=O)(=O)O[Cr](=O)(=O)[O-]', null, 'ion'],
    ['N3', -1, '[N-]=[N+]=[N-]', nm3('Azide ion', 'Ανιόν αζιδίου', 'Ion azida'), 'ion']
  ];
  function curatedLookup(r) {
    var q = r.charge || 0, hit = null;
    CURATED.forEach(function (c) { if (!hit && c[0] === r.norm && c[1] === q) hit = c; });
    return hit;
  }

  /* names for polyatomic ions from the Formula Lab table (POLYATOMIC_IONS) */
  var tblSig = null;
  function ionRow(comp, q) {
    var tbl = root.POLYATOMIC_IONS; if (!tbl) return null;
    if (!tblSig) { tblSig = {}; tbl.forEach(function (t) { var a = FE().analyze(t[0]); if (a.ok) tblSig[sigOfComp(a.partCounts[0]) + '|' + t[1]] = t; }); }
    return tblSig[sigOfComp(comp) + '|' + q] || null;
  }
  function ionNames(comp, q) {
    var t = ionRow(comp, q); if (!t) return null;
    var el = t[3], sfx;
    if (q < 0) sfx = /(ικό|ώδες|ό)$/.test(el) ? ' ανιόν' : ' (ανιόν)'; else sfx = ' (κατιόν)';
    return nm3(cap(head(t[2])) + ' ion', cap(el) + sfx, 'Ion ' + head(t[4]));
  }

  /* covalent networks: the formula is only a ratio, there is no molecule (the same list the Formula Lab uses) */
  var NET = null;
  function isNetwork(comp) {
    if (!NET) { NET = {}; ['SiO2', 'SiC', 'GeO2', 'B2O3', 'BN', 'B4C', 'Si3N4'].forEach(function (f) { var a = FE().analyze(f); if (a.ok) NET[sigOfComp(a.partCounts[0])] = 1; }); }
    return !!NET[sigOfComp(comp)];
  }

  /* ================================================================= molecule / ion → Studio molecule */
  var molCache = {};
  function makeMol(graph, meta, key) {
    if (molCache[key]) return molCache[key];
    var m = E.buildGraph(graph, meta); m.id = 'fml:' + key; molCache[key] = m; return m;
  }
  /* returns {mol, via, iso?, notes[]} or {fail, p} */
  function molecularTarget(r) {
    var q = r.charge || 0, comp = r.partCounts[0], notes = [], p = { f: pretty(r) }, i, sk, lw, m;
    var L = libLookup(r);
    if (L) { if (L.iso) notes.push({ k: 'f_n_iso', p: { names: L.mol.names, name: L.mol.formula } }); return { mol: L.mol, via: 'lib', libId: L.id, notes: notes }; }
    var cu = curatedLookup(r);
    if (cu) {
      var nmC = cu[3] || ionNames(comp, q);
      m = makeMol(E.parseSMILES(cu[2]), { f: pretty(r), n: nmC, cat: cu[4] }, r.norm + '|' + q);
      return { mol: m, via: 'curated', notes: notes };
    }
    if (q === 0 && isNetwork(comp)) return { fail: 'network', p: p };
    var nAt = 0; Object.keys(comp).forEach(function (k) { nAt += comp[k]; });
    if (nAt > 24) return { fail: 'struct', p: p };                                   // nothing here is a one-central-atom species
    var ve = valenceElectrons(comp, q); if (ve % 2) { p.n = ve; return { fail: 'radical', p: p }; }
    var sks = skeletons(comp, q);
    for (i = 0; i < sks.length; i++) {
      sk = sks[i]; lw = lewisAXn(sk.c, sk.ligs, q, { hyp: sk.hyp });
      if (!lw) continue;
      var key = r.norm + '|' + q;
      m = makeMol(lw, { f: pretty(r), n: q ? ionNames(comp, q) : null, cat: q ? 'ion' : 'generated' }, key);
      notes.push({ k: 'f_n_skel', p: { c: sk.c } });
      if (lw.sep) notes.push({ k: 'f_n_sep', p: {} });
      if (lw.dblock) notes.push({ k: 'f_n_dblock', p: {} });
      return { mol: m, via: 'axn', notes: notes };
    }
    return { fail: Object.keys(comp).length === 1 ? 'form' : 'struct', p: p };
  }

  /* ================================================================= monatomic species: shells, ionisation data, verdict */
  var IE_DATA = {   /* successive ionisation energies, kJ/mol — Wikipedia "Molar ionization energies of the elements" (WEL/CRC) */
    H: [1312.0], He: [2372.3, 5250.5], Li: [520.2, 7298.1, 11815.0], Be: [899.5, 1757.1, 14848.7, 21006.6], B: [800.6, 2427.1, 3659.7, 25025.8, 32826.7],
    C: [1086.5, 2352.6, 4620.5, 6222.7, 37831, 47277.0], N: [1402.3, 2856, 4578.1, 7475.0, 9444.9, 53266.6, 64360],
    F: [1681.0, 3374.2, 6050.4, 8407.7, 11022.7, 15164.1, 17868, 92038.1, 106434.3],
    Na: [495.8, 4562, 6910.3, 9543, 13354, 16613, 20117, 25496, 28932, 141362, 159076],
    Mg: [737.7, 1450.7, 7732.7, 10542.5, 13630, 18020, 21711, 25661, 31653, 35458, 169988, 189368],
    Al: [577.5, 1816.7, 2744.8, 11577, 14842, 18379, 23326, 27465, 31853, 38473, 42647, 201266, 222316]
  };
  var NG = { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn' };
  var MAXOX = { 9: 6, 10: 6, 11: 3, 12: 2 }, MAXOX_SYM = { Hg: 4, Au: 5, Ir: 9, Ru: 8, Os: 8 };
  function maxOx(e) {
    if (e.c === 'lanthanide') return 4; if (e.c === 'actinide') return 7;
    if (e.b === 'd') return MAXOX_SYM[e.s] || MAXOX[e.g] || e.g;
    return E.valence(e);
  }
  function strongestBond() { var best = 0, key = ''; Object.keys(D.BOND).forEach(function (k) { if (D.BOND[k][0] > best) { best = D.BOND[k][0]; key = k; } }); return { v: best, txt: key.replace('#', '≡') }; }
  function shellsAfter(sh, q) {
    var a = sh.slice(), i, k;
    if (q > 0) { k = q; for (i = a.length - 1; i >= 0 && k > 0; i--) { var t = Math.min(a[i], k); a[i] -= t; k -= t; } while (a.length && a[a.length - 1] === 0) a.pop(); }
    else if (q < 0) a[a.length - 1] += -q;
    return a;
  }
  function listedCharges(e) { return D.CATIONS[e.s] || (e.c === 'alkali' || e.c === 'alkaline' || e.c === 'post' || e.c === 'lanthanide' ? E.cationCharges(e) : []); }   // transition metals and actinides: only the Studio's own table
  function anionQ(e) { var A = E.anionCharge(e); if ((A === null || A === undefined) && !E.isMetal(e) && e.g >= 15 && e.g <= 17) A = e.g - 18; return A === undefined ? null : A; }   // Te²⁻, As³⁻ … too
  function usualCharges(e) { return E.isMetal(e) ? listedCharges(e) : (anionQ(e) ? [anionQ(e)] : []); }
  function ionVerdict(e, q) {
    var Z = e.n, V = E.valence(e), metal = E.isMetal(e), k = Math.abs(q), A, common, mo;
    if (q === 0) return { code: 'neutral', tone: 'ok' };
    if (q > 0) {
      if (q > Z) return { code: 'toomany', tone: 'bad' };
      if (e.s === 'H') return { code: 'proton', tone: 'warn' };
      common = usualCharges(e);
      if (metal && common.indexOf(q) >= 0) return { code: 'common', tone: 'ok' };
      mo = maxOx(e);
      if (metal && !common.length && q <= mo && e.b !== 's' && e.b !== 'p') return { code: 'dblock', tone: 'warn', max: mo };
      if (e.b === 's' || e.b === 'p') {
        if (q > V) return { code: 'core', tone: 'bad', k: q - V, V: V };
        return metal ? { code: 'rare', tone: 'warn', V: V } : { code: 'covalent', tone: 'warn' };
      }
      return q <= mo ? { code: 'rare', tone: 'warn', V: V } : { code: 'unknown', tone: 'bad', max: mo };
    }
    if (e.s === 'H') return k === 1 ? { code: 'hydride', tone: 'ok' } : { code: 'dianion', tone: 'bad', k: k };
    A = anionQ(e);
    if (A !== null && A !== undefined) {
      if (k === -A) return k === 1 ? { code: 'commonan', tone: 'ok' } : { code: 'lattice', tone: 'warn', k: k };
      if (k > -A) return { code: 'octet', tone: 'bad' };
      if (k === 1 && e.ea > 0) return { code: 'partial', tone: 'warn', need: -A - 1 };
      return k === 1 ? { code: 'unbound', tone: 'bad' } : { code: 'dianion', tone: 'bad', k: k };
    }
    if (e.c === 'noble') return { code: 'unbound', tone: 'bad' };
    if (k === 1) return e.ea > 0 ? { code: 'gasphase', tone: 'warn' } : { code: 'unbound', tone: 'bad' };
    return { code: 'dianion', tone: 'bad', k: k };
  }
  function species(sym, q) {
    var e = E.el(sym); if (!e) return null;
    var V = E.valence(e), sh = (e.sh || []).slice(), arr = IE_DATA[sym], sp = { sym: sym, q: q, e: e, Z: e.n, nel: e.n - q, V: V, sh: sh, shAfter: shellsAfter(sh, q), ng: NG[e.n - q] || null, ver: ionVerdict(e, q) };
    if (q > 0 && arr && arr.length >= q) { sp.ie = arr.slice(0, q); sp.cum = sp.ie.reduce(function (s, x) { return s + x; }, 0); }
    if (sp.ver.code === 'core' && arr && arr.length > V) sp.jump = { a: V, ea: arr[V - 1], b: V + 1, eb: arr[V] };
    sp.rad = q === 0 ? { r: E.covR(e) * 100, est: false, cov: true } : E.ionRadius(sym, q);
    sp.usual = [];
    if (e.s === 'H') sp.usual = [['H', 1], ['H', -1]]; else usualCharges(e).forEach(function (c) { sp.usual.push([sym, c]); });
    return sp;
  }

  /* ================================================================= names of salts (EN / ES / EL) */
  var EL_ADJ_AN = { Cl: 'χλωριούχο', Br: 'βρωμιούχο', I: 'ιωδιούχο', F: 'φθοριούχο', S: 'θειούχο', Se: 'σεληνιούχο' };
  function plainGr(s) { return s.replace(/ά/g, 'α').replace(/έ/g, 'ε').replace(/ή/g, 'η').replace(/ί/g, 'ι').replace(/ό/g, 'ο').replace(/ύ/g, 'υ').replace(/ώ/g, 'ω'); }
  function grGen(name) { var b = name.replace(/\(.*$/, ''), tail = name.slice(b.length); var g = D.EL_GEN[cap(b)] || (/ιο$/.test(b) ? plainGr(lc(b)).replace(/ιο$/, 'ίου') : null); return g ? g + tail : null; }
  function grAdj(word, masc) {
    if (!masc) return word;
    if (/ώδες$/.test(word)) return word.replace(/ες$/, 'ης');
    if (/ό$/.test(word)) return word.replace(/ό$/, 'ός');
    if (/ο$/.test(word)) return word.replace(/ο$/, 'ος');
    return word;
  }
  function saltNames(cats, ans) {
    if (cats.length !== 1 || ans.length !== 1 || !cats[0].nm || !ans[0].nm) return null;
    var C = cats[0], A = ans[0], en = null, es = null, el = null;
    var cen = C.nm.en, ces = C.nm.es, cel = C.nm.el, aen = A.nm.en, aes = A.nm.es, ael = A.nm.el;
    en = lc(head(cen)) + ' ' + lc(head(aen)); es = lc(head(aes)) + ' de ' + lc(head(ces));
    var masc = /ος$|ός$/.test(plainGr(cel.replace(/\(.*$/, ''))), cl = lc(head(cel));
    if (A.mono && EL_ADJ_AN[A.f]) el = grAdj(EL_ADJ_AN[A.f], masc) + ' ' + cl;
    else if (!A.mono && /κυανίδιο/.test(ael)) el = grAdj('κυανιούχο', masc) + ' ' + cl;
    else if (/(ό|ες)$/.test(ael.replace(/\(.*$/, '').trim())) el = ael.replace(/\(.*$/, '').trim().split(' ').map(function (w) { return grAdj(w, masc); }).join(' ') + ' ' + cl;
    else { var g = grGen(cl); el = g ? lc(head(ael)) + ' του ' + g : null; }
    return { en: en, el: el, es: es };
  }

  /* ================================================================= ionic / salt targets */
  function mostEN(comp) { var best = null, bv = -1; Object.keys(comp).forEach(function (k) { var v = E.en(E.el(k)); if (v !== null && v > bv) { bv = v; best = k; } }); return best; }
  function ionicInfo(r) {
    var io; if (Object.keys(r.partCounts[0]).length > 6) return null;      // no real salt has more than six elements; the search in the lab's engine grows quickly
    try { io = FE().ionic(r); } catch (e) { io = null; }
    if (!io) return null;
    if (io.status !== 'ok') return { ok: false, status: io.status };
    var cats = io.ions.filter(function (i) { return i.q > 0; }), ans = io.ions.filter(function (i) { return i.q < 0; });
    var prefer = true, dmin = null, high = false;
    cats.forEach(function (c) {
      if (!c.mono) return;
      var common = usualCharges(E.el(c.f)); var el = E.el(c.f);
      if (E.isMetal(el) && c.q >= 4 && common.indexOf(c.q) < 0 && el.c === 'transition') high = true;
      ans.forEach(function (a) {
        var sym = a.mono ? a.f : mostEN(analyzeComp(a.f)), cls = sym ? E.classify(c.f, sym) : null;
        if (cls && cls.known) { if (cls.type !== 'ionic') prefer = false; if (dmin === null || cls.dChi < dmin) dmin = cls.dChi; }
      });
    });
    if (high) prefer = false;
    return { ok: true, io: io, cats: cats, ans: ans, prefer: prefer, dChi: dmin, high: high };
  }
  function analyzeComp(f) { var a = FE().analyze(f); return a.ok ? a.partCounts[0] : {}; }
  function partOf(i) {
    var P = { f: i.f, q: i.q, n: i.n, mono: !!i.mono, nm: i.nm, share: i.share };
    if (i.mono) { P.sym = i.f; P.txt = ionTxt(i.f, i.q); return P; }
    var a = FE().analyze(i.f); P.txt = prettyNorm(i.f) + chargeTxt(i.q); P.pf = prettyNorm(i.f);
    if (a.ok) { a.charge = i.q; var mt = molecularTarget(a); if (mt.mol) P.mol = mt.mol; }
    return P;
  }
  function buildIonic(res, r, info) {
    var io = info.io, parts = io.ions.map(partOf), notes = res.notes;
    if (r.parts > 1) notes.push({ k: 'f_n_hydrate', p: { w: prettyNorm(r.partSrc.slice(1).join('·')) } });
    parts.forEach(function (P) {
      if (!P.mono || P.q < 0) return; var e = E.el(P.sym), common = usualCharges(e);
      if (common.indexOf(P.q) < 0 && P.q >= 2 && !(E.isMetal(e) && !D.CATIONS[e.s] && e.c === 'transition' && P.q <= 3)) notes.push({ k: 'f_n_unusual', p: { sym: P.sym, q: P.q, common: common.length ? common.map(function (c) { return c + '+'; }).join(', ') : '—' } });
    });
    res.parts = parts;
    var cats = parts.filter(function (p) { return p.q > 0; }), ans = parts.filter(function (p) { return p.q < 0; });
    if (parts.length === 2 && cats[0].mono && ans[0].mono) {
      var ic = E.ionicCompound(cats[0].sym, cats[0].q, ans[0].sym, ans[0].q); ic.names = E.ionicNames(ic);
      var fb = saltNames(cats, ans); ic.names = { en: ic.names.en || (fb && fb.en), el: ic.names.el || (fb && fb.el), es: ic.names.es || (fb && fb.es) };
      var g0 = gcd(cats[0].n, ans[0].n); if (g0 > 1) notes.push({ k: 'f_n_reduced', p: { f: ic.formula } });
      res.kind = 'ionic'; res.ic = ic; return res;
    }
    var nm = saltNames(cats, ans);
    var salt = { poly: true, formula: pretty(r), names: nm, parts: parts, nc: cats[0].n, na: ans[0].n,
      cat: cats[0].mono ? { s: cats[0].sym, q: cats[0].q } : { f: cats[0].pf, q: cats[0].q }, an: ans[0].mono ? { s: ans[0].sym, q: ans[0].q } : { f: ans[0].pf, q: ans[0].q } };
    if (cats.length + ans.length > 2) notes.push({ k: 'f_n_many', p: { n: cats.length + ans.length } });
    res.kind = 'salt'; res.salt = salt; return res;
  }

  /* LiAlH₄ and NaBH₄ are M⁺ + [XH₄]⁻, not M⁺ + X³⁺ + 4 H⁻ (what neutrality alone would give) */
  function complexHydride(r) {
    var comp = r.partCounts[0], X = ['B', 'Al', 'Ga'].filter(function (x) { return comp[x]; })[0];
    if (!X || r.parts > 1 || !comp.H || comp.H !== 4 * comp[X]) return null;
    var M = Object.keys(comp).filter(function (k) { return k !== X && k !== 'H'; }), tot = 0, ok = M.length > 0, ions = [];
    M.forEach(function (k) {
      var e = E.el(k), c = e.c === 'alkali' ? 1 : e.c === 'alkaline' ? 2 : 0; if (!c) ok = false; tot += c * comp[k];
      ions.push({ f: k, q: c, n: comp[k], mono: true, nm: nm3(lc(e.en), lc(e.el), lc(e.es)) });
    });
    if (!ok || tot !== comp[X]) return null;
    ions.push({ f: X + 'H4', q: -1, n: comp[X], mono: false, nm: null });
    return { ok: true, io: { ions: ions }, prefer: true, dChi: null };
  }

  /* ================================================================= resolve a typed text */
  var cache = {}, ncache = 0, SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function prep(t) {      // sign followed by superscript digits ("H-²", "H⁻²", "Na⁺⁵") is the same charge as "H-2" / "Na+5"
    return String(t).trim().replace(/([+\-⁺⁻])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/, function (m, sg, dg) { return (sg === '⁺' ? '+' : sg === '⁻' ? '-' : sg) + dg.split('').map(function (c) { return SUPD.indexOf(c); }).join(''); });
  }
  function resolve(text) {
    var k = prep(text == null ? '' : text); if (cache.hasOwnProperty(k)) return cache[k];
    var res; try { res = doResolve(k, true); } catch (e) { res = { text: k, notes: [], alts: [], err: { code: 'CHAR', pos: 0, info: '' }, exception: String(e && e.message || e) }; }
    if (ncache > 300) { cache = {}; ncache = 0; } cache[k] = res; ncache++; return res;
  }
  function doResolve(text, allowAlt) {
    var res = doResolve1(text);
    if (allowAlt && res.r && !/\^/.test(text)) addAlt(res, text, res.r);
    return res;
  }
  function doResolve1(text) {
    var F = FE(), r = F.analyze(text), res = { text: text, notes: [], alts: [] };
    if (!r.ok) { res.err = r.error; return res; }
    res.r = r; res.pretty = pretty(r);
    var q = r.charge || 0, nEl = r.atoms.length, comp = r.partCounts[0], mt;
    function fromMolecular(x) {
      if (x.fail) { res.fail = x.fail; res.failP = x.p; return res; }
      res.kind = x.via === 'lib' ? 'lib' : 'mol'; res.mol = x.mol; res.libId = x.libId; x.notes.forEach(function (n) { res.notes.push(n); }); return res;
    }
    if (r.parts === 1 && nEl === 1) {
      var sym = r.atoms[0].el;
      if (r.total === 1) { res.kind = 'species'; res.sym = sym; res.q = q; }
      else if (E.isMetal(E.el(sym)) && q === 0) { res.kind = 'species'; res.sym = sym; res.q = 0; res.notes.push({ k: 'f_n_elem', p: { sym: sym } }); }
      else fromMolecular(molecularTarget(r));
      return res;
    }
    if (q !== 0) { fromMolecular(molecularTarget(r)); return res; }
    var L = libLookup(r);
    if (L) return fromMolecular(molecularTarget(r));
    var ch = complexHydride(r); if (ch) return buildIonic(res, r, ch);
    var info = ionicInfo(r);
    if (info && info.ok && info.prefer) return buildIonic(res, r, info);
    mt = molecularTarget(r);
    if (mt.mol) {
      fromMolecular(mt);
      if (info && info.ok) { try { var alt = { text: text, notes: [], alts: [], r: r, pretty: res.pretty }; buildIonic(alt, r, info); if (info.dChi !== null) res.notes.push({ k: 'f_n_border', p: { d: num(info.dChi, 2, 'en') } }); alt.altLabel = true; res.alts.push(alt); } catch (e) { } }
      return res;
    }
    if (info && info.ok && info.high) { res.fail = 'struct'; res.failP = { f: res.pretty }; return res; }      // high oxidation state d-block oxide: molecular/polymeric, not a lattice of M⁷⁺ ions
    if (info && info.ok) { buildIonic(res, r, info); if (info.dChi !== null && !info.prefer) res.notes.push({ k: 'f_n_border2', p: { d: num(info.dChi, 2, 'en') } }); return res; }
    var metal = r.atoms.some(function (a) { return E.isMetal(E.el(a.el)); });
    if (metal) { res.fail = 'ionic'; res.failP = { f: res.pretty }; return res; }
    res.fail = mt.fail; res.failP = mt.p || { f: res.pretty }; return res;
  }
  /* "I3-" is I³⁻ in the Formula Lab notation and I₃⁻ in a textbook; "MnO4 2-" is only readable with the 2 as a charge:
     when a text ends in digits + sign, try the other readings (last digit = charge / all digits = subscript, charge ±1) */
  function addAlt(res, text, r) {
    var n = FE().normalize(text), m, cands = [];
    if (/\^/.test(n) || !(m = /^(.+?)(\d+)([+-])$/.exec(n))) return;
    if (/^(.+?)(\d)([+-])$/.test(n)) { var m2 = /^(.+?)(\d)([+-])$/.exec(n); cands.push(m2[1] + '^' + m2[2] + m2[3]); }
    cands.push(m[1] + m[2] + '^' + m[3]);
    var seen = {}; seen[r.norm + '|' + (r.charge || 0)] = 1;
    cands.forEach(function (c) {
      var o; try { o = doResolve(c, false); } catch (e) { return; }
      if (o.err || o.fail || !o.kind || !o.r) return;
      var k = o.r.norm + '|' + (o.r.charge || 0); if (seen[k]) return; seen[k] = 1;
      o.altLabel = true; o.text = c; res.alts.push(o);
    });
    /* the Lab's reading of "MnO4 2-" is MnO₄₂⁻ (nonsense); the real reading is a radical: say that instead */
    if (res.fail === 'struct' && !res.alts.length) cands.forEach(function (c) { var o; try { o = doResolve(c, false); } catch (e) { return; } if (o.fail === 'radical' && o.r && res.fail === 'struct') { res.fail = 'radical'; res.failP = o.failP; res.pretty = o.pretty; } });
    if (res.alts.length && res.kind) res.notes.push({ k: 'f_n_alt', p: { t: text.trim(), a: res.pretty } });
  }

  /* ================================================================= what the UI gets */
  function labelOf(res, T) {
    if (res.kind === 'lib') return T('f_k_lib');
    if (res.kind === 'mol') return res.mol.charged ? T('f_k_ionlib') : T('f_k_mol');
    if (res.kind === 'ionic') return T('f_k_ionic');
    if (res.kind === 'salt') return T('f_k_salt');
    if (res.kind === 'species') return res.q ? T('f_k_mono') : T('f_k_atom');
    return '';
  }
  function nameOf(res, lang) {
    if (res.kind === 'lib' || res.kind === 'mol') return res.mol.names ? res.mol.names[lang] || res.mol.names.en : '';
    if (res.kind === 'ionic') return res.ic.names ? res.ic.names[lang] || res.ic.names.en || '' : '';
    if (res.kind === 'salt') return res.salt.names ? res.salt.names[lang] || res.salt.names.en || '' : '';
    if (res.kind === 'species') { var e = E.el(res.sym); return e ? (e[lang] || e.en) : ''; }
    return '';
  }
  var lastCards = [];
  function garbage(x) { var c = x.r && x.r.partCounts[0], mx = 0; if (c) Object.keys(c).forEach(function (k) { mx = Math.max(mx, c[k]); }); return mx >= 10; }   // e.g. "FeO4 2-" read as FeO₄₂⁻
  function errHTML(err, T) {
    var key = 'f_err_' + err.code, msg = TX.en[key] ? T(key, { pos: err.pos === undefined ? '' : err.pos + 1, info: esc(err.info === undefined ? '' : err.info) }) : '';
    return '<div class="bs-hint bs-f-err">' + msg + ' <span class="bs-f-hint">' + T('f_hint') + '</span></div>';
  }
  function failHTML(res, T) {
    var key = { struct: 'f_no_struct', radical: 'f_no_radical', network: 'f_no_network', ionic: 'f_no_ionic', form: 'f_no_form' }[res.fail] || 'f_no_struct';
    var p = Object.assign({}, res.failP || {}); p.f = '<b>' + (p.f || res.pretty) + '</b>';
    return '<div class="bs-note bs-f-fail">' + T(key, p) + '</div>';
  }
  /* ctx = {T, lang, chip, det, fx, f1, nameOf}; lst = library hits already shown.  Returns {html (cards for the list), msg (html under it)} */
  API.list = function (q, ctx, lst) {
    var T = ctx.T, out = { html: '', msg: '', n: 0 }; q = String(q || '').trim(); lastCards = [];
    if (!q || q.length > 60) return out;
    if (!API.available) { if (/[0-9A-Z]/.test(q) && !(lst && lst.length)) out.msg = '<div class="bs-hint">' + T('f_no_lab') + '</div>'; return out; }
    var res = resolve(q);
    if (res.err) { if (!(lst && lst.length) && /[0-9()+\-^A-Z]/.test(q)) out.msg = errHTML(res.err, T); return out; }
    var list = [res].concat(res.alts);
    list.forEach(function (x) {
      if (x.fail || !x.kind) { if (x === res && !(res.alts.length && (x.fail === 'struct' || garbage(x)))) out.msg += failHTML(x, T); return; }
      if (x.kind === 'lib' && lst && lst.some(function (r) { return r.id === x.libId; }) && x === res) return;
      var i = lastCards.push(x) - 1, nm = nameOf(x, ctx.lang);
      out.html += '<button class="bs-li bs-lf' + (x.altLabel ? ' bs-lalt' : '') + '" data-act="fml" data-k="' + i + '"><b>' + x.pretty + '</b><small>' + (x.altLabel ? T('f_alt') + ' · ' : '') + labelOf(x, T) + (nm ? ' · ' + nm : '') + '</small></button>';
    });
    out.n = lastCards.length; return out;
  };
  /* what to show when a card (or Enter) is chosen */
  API.open = function (k) {
    var x = lastCards[+k]; if (!x) return null; return API.target(x);
  };
  API.target = function (x) {
    var t = { mol: null, ic: null, salt: null, sp: null, fml: { text: x.text, pretty: x.pretty, kind: x.kind, notes: x.notes.slice() } };
    if (x.kind === 'lib' || x.kind === 'mol') t.mol = x.mol;
    else if (x.kind === 'ionic') t.ic = x.ic;
    else if (x.kind === 'species') t.sp = species(x.sym, x.q);
    else if (x.kind === 'salt') {
      t.salt = x.salt; var first = x.salt.parts.filter(function (p) { return p.mol; })[0];
      if (first) t.mol = first.mol; else t.sp = species(x.salt.parts[0].sym, x.salt.parts[0].q);
    }
    return t;
  };
  API.species = species;
  API.resolve = resolve;
  API.partTarget = function (salt, i) {
    var p = salt.parts[+i]; if (!p) return null;
    if (p.mol) return { mol: p.mol, sp: null }; if (p.mono) return { mol: null, sp: species(p.sym, p.q) }; return null;
  };

  API.banner = function (fml, ctx) {
    if (!fml) return '';
    var T = ctx.T, notes = (fml.notes || []).map(function (n) { var p = Object.assign({}, n.p); if (p.names) p.name = p.names[ctx.lang] || p.names.en || p.name; return '<div class="bs-f-note">' + T(n.k, p) + '</div>'; }).join('');
    return '<div class="bs-saltcard bs-f-banner"><small>' + T('f_typed') + '</small> <b>' + fml.pretty + '</b>' + notes + '</div>';
  };
  API.saltChips = function (salt, S, ctx) {
    var T = ctx.T;
    return '<div class="bs-f-ions"><small>' + T('f_ions') + '</small><div class="bs-cats">' + salt.parts.map(function (p, i) {
      var on = (p.mol && S.mol && p.mol.id === S.mol.id) || (!p.mol && S.sp && p.mono && S.sp.sym === p.sym && S.sp.q === p.q);
      var dis = !p.mol && !p.mono;
      return '<button class="bs-cat' + (on ? ' on' : '') + '" data-act="fion" data-i="' + i + '"' + (dis ? ' disabled style="opacity:.5"' : '') + '>' + (p.n > 1 ? p.n + ' × ' : '') + p.txt + (dis ? ' · ' + T('f_n_nostruct') : '') + '</button>';
    }).join('') + '</div></div>';
  };

  /* ---------------------------------------------------------------- atom / monatomic ion card */
  API.speciesHTML = function (sp, ctx) {
    var T = ctx.T, lang = ctx.lang, e = sp.e, v = sp.ver, nmE = e[lang] || e.en, ion = ionTxt(sp.sym, sp.q), q = sp.q;
    var shTxt = function (a) { return a.join(' · ') || '0'; };
    var common = usualCharges(e).map(function (c) { return ionTxt(sp.sym, c); }).join(', ') || '—';
    var P = { ion: ion, sym: sp.sym, q: Math.abs(q), Z: sp.Z, V: sp.V, common: common, ng: sp.ng || '—', ea: e.ea === null || e.ea === undefined ? '—' : num(e.ea, 1, lang), k: v.k || Math.abs(q), max: v.max, need: v.need, full: '' };
    var V1 = sp.V === 1; P.ve = lang === 'el' ? sp.V + (V1 ? ' ηλεκτρόνιο σθένους' : ' ηλεκτρόνια σθένους') : lang === 'es' ? sp.V + (V1 ? ' electrón de valencia' : ' electrones de valencia') : sp.V + ' valence electron' + (V1 ? '' : 's');
    var text = '', jump = '';
    if (v.code === 'neutral') text = T('f_sp_neutral', { Z: sp.Z, sh: shTxt(sp.sh) });
    else {
      if (v.code === 'core') {
        var core = sp.sh.length >= 2 ? sp.sh.length - 1 : 1; P.n = core; P.cn = (e.b === 's' || e.b === 'p') && sp.sh.length >= 2 ? ' (' + sp.sh[sp.sh.length - 2] + ' e⁻)' : '';
        if (sp.jump && sp.cum) { var sb = strongestBond(); jump = T('f_v_jump', { sym: sp.sym, a: sp.jump.a, ea: num(sp.jump.ea, 1, lang), b: sp.jump.b, eb: num(sp.jump.eb, 1, lang), ratio: num(sp.jump.eb / sp.jump.ea, 1, lang), q: Math.abs(q), cum: num(sp.cum, 0, lang), x: num(sp.cum / sb.v, 0, lang), bond: sb.txt + ', ' + Math.round(sb.v) + ' kJ/mol' }); }
        P.jump = jump;
      }
      if (v.code === 'partial') { P.full = ionTxt(sp.sym, anionQ(e)); }
      if (v.code === 'dianion') { P.first = e.ea > 0 ? T('f_v_first', { sym: sp.sym, ea: num(e.ea, 1, lang) }) : ''; }
      text = T('f_v_' + v.code, P);
    }
    var cells = '<div><small>Z</small><b>' + sp.Z + '</b></div><div><small>' + T('f_sp_prot') + '</small><b>' + sp.Z + '</b></div><div><small>' + T('electrons') + '</small><b>' + sp.nel + '</b></div>' +
      '<div><small>' + T('f_sp_shells') + '</small><b>' + shTxt(sp.sh) + (q ? ' → ' + shTxt(sp.shAfter) : '') + '</b></div>' + (q && sp.ng && sp.nel > 0 ? '<div><small>' + T('f_sp_ng') + '</small><b>' + sp.ng + '</b></div>' : '') +
      '<div><small>IE₁ kJ/mol</small><b>' + (e.ie ? num(e.ie, 1, lang) : '—') + '</b></div><div><small>EA kJ/mol</small><b>' + (e.ea === null || e.ea === undefined ? '—' : num(e.ea, 1, lang)) + '</b></div>' +
      (v.tone === 'bad' ? '' : '<div><small>' + T(sp.rad.cov ? 'f_sp_cov' : 'f_sp_radius') + '</small><b>' + Math.round(sp.rad.r) + (sp.rad.est ? '*' : '') + '</b></div>') + (sp.cum && q > 0 ? '<div><small>' + T('f_sp_cum') + '</small><b>' + num(sp.cum, 0, lang) + ' kJ/mol</b></div>' : '');
    var steps = sp.ie ? '<div class="bs-f-steps"><small>' + T('f_sp_steps') + '</small><div>' + sp.ie.map(function (x, i) { return '<span class="bs-chip' + (i >= sp.V && q > 0 && v.code === 'core' ? ' neg' : '') + '">IE' + (i + 1) + ' ' + num(x, 1, lang) + '</span>'; }).join('') + '</div><div class="bs-cap">' + T('f_sp_src') + '</div></div>' : '';
    var usual = sp.usual.length ? '<div class="bs-f-ions"><small>' + T('f_sp_common') + '</small><div class="bs-cats">' + sp.usual.map(function (c) { return '<button class="bs-cat' + (c[1] === q ? ' on' : '') + '" data-act="fsp" data-s="' + c[0] + '" data-q="' + c[1] + '">' + ionTxt(c[0], c[1]) + '</button>'; }).join('') + '</div></div>' : '';
    return '<div class="bs-mhead"><div class="bs-mf">' + ion + '</div><div><div class="bs-mn">' + nmE + (q ? '' : '') + '</div><div class="bs-mb">' + ctx.chip(T(q ? 'f_k_mono' : 'f_k_atom'), q ? 'io' : '') + ctx.chip(T('cat_' + e.c)) + '</div></div></div>' +
      '<div class="bs-f-verdict bs-f-' + v.tone + '"><b>' + T('f_sp_head') + '</b><div>' + text + '</div></div><div class="bs-kv">' + cells + '</div>' + (sp.rad.est && v.tone !== 'bad' ? '<div class="bs-cap">' + T('f_sp_est') + '</div>' : '') + steps + usual;
  };

  API.verdictBox = function (sp, ctx) { var h = API.speciesHTML(sp, ctx), m = /<div class="bs-f-verdict[^>]*><b>[\s\S]*?<\/b><div>[\s\S]*?<\/div><\/div>/.exec(h); return m ? m[0] : ''; };

  /* One input for every tab: a molecule, a polyatomic ion, an atom or ANY monatomic ion (no limit on the charge).  Returns what the tab needs. */
  d('f_t_lbl', 'Πληκτρολόγηση', 'Type it', 'Escribir');
  d('f_t_ph', 'π.χ. Fe3+, H+2, H-², SO4 2-, CH4', 'e.g. Fe3+, H+2, H-², SO4 2-, CH4', 'p. ej., Fe3+, H+2, H-², SO4 2-, CH4');
  d('f_t_go', 'Δείξε', 'Show', 'Mostrar');
  d('f_t_unsup', 'Εδώ μπαίνουν άτομα, ιόντα και μόρια. Για ιοντικές ενώσεις και άλατα δες την καρτέλα «Μόριο 3D».', 'Atoms, ions and molecules go here. For ionic compounds and salts use the "3D molecule" tab.', 'Aquí van átomos, iones y moléculas. Para compuestos iónicos y sales usa la pestaña «Molécula 3D».');
  d('f_t_nostruct', 'Δεν υπάρχει αξιόπιστη δομή για αυτό το σωματίδιο από μόνο τον τύπο.', 'There is no reliable structure for this species from the formula alone.', 'No hay una estructura fiable para esta especie solo con la fórmula.');
  API.typedResolve = function (text) {
    var t = String(text || '').trim(); if (!t) return { empty: true };
    if (!API.available) return { err: 'lab' };
    var r = resolve(t); if (r.err) return { err: 'parse', e: r.err };
    if (r.fail || !r.kind) return { err: 'fail', res: r };
    if (r.kind === 'species') { var sp = species(r.sym, r.q); return r.q ? { kind: 'ion', sym: r.sym, q: r.q, sp: sp, pretty: r.pretty } : { kind: 'atom', sym: r.sym, sp: sp, pretty: r.pretty }; }
    if (r.kind === 'lib' || r.kind === 'mol') return { kind: 'mol', mol: r.mol, pretty: r.pretty, notes: r.notes };
    if (r.kind === 'salt') { var f = r.salt.parts.filter(function (p) { return p.mol; })[0]; if (f) return { kind: 'mol', mol: f.mol, pretty: f.txt, notes: [] }; }
    return { err: 'unsup' };
  };
  API.typedError = function (r, T) {
    if (!r || !r.err) return '';
    if (r.err === 'lab') return T('f_no_lab');
    if (r.err === 'parse') return errHTML(r.e, T).replace(/<span class="bs-f-hint">[\s\S]*?<\/span>/, '');
    if (r.err === 'fail') return failHTML(r.res, T);
    return '<div class="bs-hint bs-f-err">' + T('f_t_unsup') + '</div>';
  };
  /* the keyboard chip + input row; `act` is the action that reads the input with id `id` */
  API.typedRow = function (id, act, T, val, open) {
    return '<div class="bs-typed' + (open ? ' open' : '') + '"><button class="bs-cat bs-kb' + (open ? ' on' : '') + '" data-act="' + act + 'Toggle" aria-label="' + T('f_t_lbl') + '">⌨ ' + T('f_t_lbl') + '</button>' +
      (open ? '<input id="' + id + '" class="bs-typed-in" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + T('f_t_ph') + '" value="' + esc(val || '').replace(/"/g, '&quot;') + '" data-enter="' + act + '"><button class="bs-btn sm" data-act="' + act + '">' + T('f_t_go') + '</button>' : '') + '</div>';
  };

  /* ================================================================= self-checks (run with the other checks in the footer) */
  function sameStructure(a, b) {
    function sig(m) { return m.atoms.map(function (x) { return x.s + x.q; }).sort().join(',') + '|' + m.bonds.map(function (x) { return [m.atoms[x.a].s, m.atoms[x.b].s].sort().join('') + x.o; }).sort().join(','); }
    return sig(a) === sig(b);
  }
  API.checks = function (chk, near) {
    if (!API.available) return;
    var g = 'FORMULAS';
    /* the Lewis generator must rebuild the library's own structures from the bare composition (a regression test for lewisAXn) */
    var ids = ['H2O', 'NH3', 'CH4', 'H2S', 'PH3', 'SiH4', 'CO2', 'CS2', 'SO2', 'SO3', 'BF3', 'BCl3', 'BeCl2', 'NF3', 'PCl3', 'CCl4', 'SiF4', 'OF2', 'SCl2', 'Cl2O', 'XeF2', 'XeF4', 'SF4', 'SF6', 'ClF3', 'PCl5', 'BrF5', 'IF7', 'HCN', 'CH2O', 'COCl2', 'CHCl3', 'CH2Cl2', 'CH3Cl',
      'H3O+', 'NH4+', 'NO2-', 'NO3-', 'CO32-', 'SO32-', 'SO42-', 'PO43-', 'ClO4-', 'H2SO4', 'HNO3', 'H3PO4'];
    ids.forEach(function (id) {
      var m = E.fromLibrary(id); if (!m) { chk(g, 'library entry ' + id, false); return; }
      var comp = {}; m.atoms.forEach(function (a) { comp[a.s] = (comp[a.s] || 0) + 1; });
      var ok = false;
      try { skeletons(comp, m.charge).some(function (sk) { var lw = lewisAXn(sk.c, sk.ligs, m.charge, { hyp: sk.hyp }); if (!lw) return false; var gm = E.buildGraph(lw, {}); ok = sameStructure(gm, m); return ok; }); } catch (e) { ok = false; }
      chk(g, id + ' rebuilt from its formula', ok);
    });
    var r1 = resolve('Al2(SO4)3'); chk(g, 'Al₂(SO₄)₃ is a salt of Al³⁺ and SO₄²⁻', r1.kind === 'salt' && r1.salt.parts.length === 2 && r1.salt.parts[0].q === 3 && r1.salt.parts[0].n === 2 && r1.salt.parts[1].q === -2 && r1.salt.parts[1].n === 3 && !!r1.salt.parts[1].mol);
    var r2 = resolve('NaCl'); chk(g, 'NaCl is ionic (rock salt)', r2.kind === 'ionic' && r2.ic.structure === 'nacl');
    var r3 = resolve('Fe2O3'); chk(g, 'Fe₂O₃ → Fe³⁺ + O²⁻', r3.kind === 'ionic' && r3.ic.cat.q === 3 && r3.ic.formula === 'Fe₂O₃');
    var r4 = resolve('Na+5'); chk(g, 'Na⁺⁵ is read as Na with charge +5 and judged impossible', r4.kind === 'species' && r4.q === 5 && species(r4.sym, r4.q).ver.code === 'core');
    var r5 = resolve('Al-2'); chk(g, 'Al⁻² is read as Al²⁻ and is not a bound ion', r5.kind === 'species' && r5.q === -2 && species(r5.sym, r5.q).ver.code === 'dianion');
    chk(g, 'Na⁺ common · Cl⁻ common · O²⁻ lattice-only · Fe³⁺ common', species('Na', 1).ver.code === 'common' && species('Cl', -1).ver.code === 'commonan' && species('O', -2).ver.code === 'lattice' && species('Fe', 3).ver.code === 'common');
    near(g, 'Σ IE₁…IE₅ of sodium (kJ/mol)', species('Na', 5).cum, 34865.1, 0.2);
    var r6 = resolve('SO4 2-'); chk(g, 'SO₄²⁻ typed with a space is the library ion', r6.kind === 'lib' && r6.libId === 'SO42-');
    var r7 = resolve('MnO4-'); chk(g, 'MnO₄⁻ gets a tetrahedral structure with 4 resonance forms', r7.kind === 'mol' && r7.mol.resonant && r7.mol.forms.length === 4 && r7.mol.atoms[0].X === 4 && r7.mol.atoms[0].E === 0);
    var r8 = resolve('SOCl2'); chk(g, 'SOCl₂ is pyramidal (AX₃E₁)', r8.kind === 'mol' && E.vsepr(r8.mol.atoms[0]).key === 'AX3E1');
    var r9 = resolve('SiO2'); chk(g, 'SiO₂ is refused (covalent network)', r9.fail === 'network');
    var r10 = resolve('I3-'); chk(g, 'I3- offers the textbook reading I₃⁻ as an alternative', r10.alts.some(function (a) { return a.kind === 'lib' && a.libId === 'I3-'; }));
    ['H+2', 'H-²', 'H⁻²', 'H⁺²'].forEach(function (t) { var rr = resolve(t); chk(g, t + ' is read as H with charge ±2', rr.kind === 'species' && rr.sym === 'H' && Math.abs(rr.q) === 2 && (t.indexOf('-') >= 0 || t.indexOf('⁻') >= 0 ? rr.q === -2 : rr.q === 2)); });
    chk(g, 'H²⁺ cannot exist (only 1 electron) and H²⁻ is not bound', species('H', 2).ver.code === 'toomany' && species('H', -2).ver.tone === 'bad');
    var r11 = resolve('NH4NO3'); chk(g, 'NH₄NO₃ shows both polyatomic ions', r11.kind === 'salt' && r11.salt.parts.length === 2 && r11.salt.parts.every(function (p) { return !!p.mol; }));
  };

  /* test hooks (also used by the checks above) */
  API._lewisAXn = lewisAXn; API._skeletons = skeletons; API._ionVerdict = ionVerdict; API._pretty = prettyNorm;
})(typeof window !== 'undefined' ? window : globalThis);
