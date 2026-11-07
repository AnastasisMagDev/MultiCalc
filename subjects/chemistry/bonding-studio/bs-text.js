/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-text.js
   This module's own dictionary. Every entry is d(key, el, en, es), so a key can never exist in one language only.
   {name} = placeholder (identical in all three languages). Formulas, numbers and units are language-neutral and built in code.
   Terminology — EL: ηλεκτραρνητικότητα, ιοντικός/ομοιοπολικός/μεταλλικός δεσμός, μονήρες ζεύγος, τυπικό φορτίο, οκτάδα,
   συντονισμός, ενέργεια πλέγματος, διπολική ροπή · ES: electronegatividad, enlace iónico/covalente/metálico, par solitario,
   carga formal, octeto, resonancia, energía reticular, momento dipolar.
   ========================================================================== */
(function (root) {
  'use strict';
  var TEXT = { el: {}, en: {}, es: {} };
  function d(k, el, en, es) { TEXT.el[k] = el; TEXT.en[k] = en; TEXT.es[k] = es; }

  /* ---------- shell ---------- */
  d('title', 'Εργαστήριο Χημικών Δεσμών & Μορίων', 'Bonding & Molecule Studio', 'Estudio de Enlaces y Moléculas');
  d('subtitle', 'Δες πώς σχηματίζονται οι ιοντικοί, οι ομοιοπολικοί και οι μεταλλικοί δεσμοί — με μόρια 3D, δομές Lewis, VSEPR και πολικότητα',
    'See how ionic, covalent and metallic bonds form — with 3D molecules, Lewis structures, VSEPR and polarity',
    'Descubre cómo se forman los enlaces iónico, covalente y metálico: moléculas 3D, estructuras de Lewis, RPECV y polaridad');
  d('tabBuild', 'Στοιχεία → Ενώσεις', 'Elements → Compounds', 'Elementos → Compuestos');
  d('tabMol', 'Μόριο 3D', 'Molecule 3D', 'Molécula 3D');
  d('tabBond', 'Εργαστήριο δεσμού', 'Bond lab', 'Laboratorio de enlace');
  d('checksLabel', '{ok}/{n} έλεγχοι αναφοράς πέρασαν', '{ok}/{n} reference checks passed', '{ok}/{n} comprobaciones de referencia superadas');
  d('checksTitle', 'Έλεγχοι έναντι τιμών αναφοράς (Lewis, γεωμετρία, δεσμοί, πλέγμα, ενέργεια, ενώσεις)', 'Checks against reference values (Lewis, geometry, bonds, lattice, energy, compounds)', 'Comprobaciones con valores de referencia (Lewis, geometría, enlaces, red, energía, compuestos)');

  /* ---------- tab 1: elements → compounds ---------- */
  d('ptHint', 'Διάλεξε 1 έως 3 στοιχεία από τον Περιοδικό Πίνακα — θα δεις ποιες ενώσεις μπορούν να σχηματίσουν.', 'Pick 1 to 3 elements from the Periodic Table — you will see which compounds they can form.', 'Elige de 1 a 3 elementos de la Tabla Periódica: verás qué compuestos pueden formar.');
  d('pickNone', 'Πάτησε ένα στοιχείο για να ξεκινήσεις· δοκίμασε Na + Cl, H + O, C + H ή S + O.', 'Tap an element to start; try Na + Cl, H + O, C + H or S + O.', 'Toca un elemento para empezar; prueba Na + Cl, H + O, C + H o S + O.');
  d('clear', 'Καθαρισμός', 'Clear', 'Borrar');
  d('valence', 'Ηλ. σθένους', 'Valence e⁻', 'e⁻ de valencia');
  d('ions', 'Τυπικά ιόντα', 'Typical ions', 'Iones típicos');
  d('borderline', 'οριακός δεσμός', 'borderline bond', 'enlace límite');
  d('ionicPct', 'Ιοντικός χαρακτήρας', 'Ionic character', 'Carácter iónico');
  d('openLab', 'Άνοιγμα στο εργαστήριο δεσμού →', 'Open in the bond lab →', 'Abrir en el laboratorio de enlace →');
  d('resMetallic', 'Μεταλλικός δεσμός', 'Metallic bonding', 'Enlace metálico');
  d('metallicNote', 'Τα μέταλλα μεταξύ τους δεν σχηματίζουν μόρια αλλά κρυστάλλους (ή κράματα) που συγκρατούνται από μια «θάλασσα» ηλεκτρονίων.', 'Metals do not form molecules with each other but crystals (or alloys) held together by a “sea” of electrons.', 'Los metales no forman moléculas entre sí, sino cristales (o aleaciones) unidos por un «mar» de electrones.');
  d('resIonic', 'Ιοντικές ενώσεις', 'Ionic compounds', 'Compuestos iónicos');
  d('resPoly', 'Άλατα με πολυατομικά ιόντα', 'Salts with polyatomic ions', 'Sales con iones poliatómicos');
  d('resMolecular', 'Μοριακές (ομοιοπολικές) ενώσεις', 'Molecular (covalent) compounds', 'Compuestos moleculares (covalentes)');
  d('resIons', 'Πολυατομικά ιόντα', 'Polyatomic ions', 'Iones poliatómicos');
  d('resNone', 'Δεν προέκυψαν σταθερές ενώσεις για αυτόν τον συνδυασμό (π.χ. τα ευγενή αέρια σχεδόν δεν αντιδρούν).', 'No stable compounds came out for this combination (e.g. noble gases barely react).', 'No resultaron compuestos estables para esta combinación (p. ej., los gases nobles casi no reaccionan).');
  d('noName', 'χωρίς καθιερωμένο όνομα', 'no common name', 'sin nombre común');
  d('known', 'γνωστή', 'known', 'conocido');
  d('predicted', 'πρόβλεψη (οκτάδα)', 'predicted (octet rule)', 'predicho (regla del octeto)');
  d('ion', 'ιόν', 'ion', 'ion');
  d('polar', 'πολικό', 'polar', 'polar');
  d('nonpolar', 'μη πολικό', 'non-polar', 'apolar');
  d('polyIon', 'πολυατομικό ιόν', 'polyatomic ion', 'ion poliatómico');
  d('ionic', 'ιοντική', 'ionic', 'iónico');

  /* ---------- tab 2: studio ---------- */
  d('searchPh', 'Αναζήτηση: τύπος ή όνομα (π.χ. H2O, αμμωνία, Al2(SO4)3, Fe3+)', 'Search: formula or name (e.g. H2O, ammonia, Al2(SO4)3, Fe3+)', 'Buscar: fórmula o nombre (p. ej., H2O, amoníaco, Al2(SO4)3, Fe3+)');
  d('noResults', 'Δεν βρέθηκε μόριο.', 'No molecule found.', 'No se encontró ninguna molécula.');
  d('sBall', 'Μπάλες–ράβδοι', 'Ball & stick', 'Bolas y varillas'); d('sStick', 'Ράβδοι', 'Sticks', 'Varillas'); d('sSpace', 'Πληρωτικό', 'Space-filling', 'Compacto');
  d('tLp', 'Μονήρη ζεύγη', 'Lone pairs', 'Pares solitarios'); d('tDip', 'Δίπολο μ', 'Dipole μ', 'Dipolo μ'); d('tChg', 'Φορτία δ', 'Charges δ', 'Cargas δ'); d('tLab', 'Σύμβολα', 'Labels', 'Etiquetas');
  d('cells', 'Κελιά', 'Cells', 'Celdas');
  d('formation', 'Σχηματισμός', 'Formation', 'Formación'); d('grow', 'Ανάπτυξη κρυστάλλου', 'Grow crystal', 'Crecer cristal');
  d('resetView', 'Επαναφορά', 'Reset view', 'Restablecer'); d('autoRot', 'Περιστροφή', 'Rotate', 'Girar');
  d('radical', 'ρίζα', 'radical', 'radical'); d('resonance', 'συντονισμός', 'resonance', 'resonancia');
  d('ionsShown', '{n} ιόντα στην εικόνα — σύρε για περιστροφή, τσίμπημα για ζουμ', '{n} ions shown — drag to rotate, pinch to zoom', '{n} iones mostrados: arrastra para girar, pellizca para ampliar');
  d('saltNote', 'Εμφανίζεται το πολυατομικό ιόν του άλατος.', 'The polyatomic ion of the salt is shown.', 'Se muestra el ion poliatómico de la sal.');
  d('pLewis', 'Δομή Lewis|πώς μοιράζονται τα ηλεκτρόνια σθένους', 'Lewis structure|how the valence electrons are shared', 'Estructura de Lewis|cómo se reparten los electrones de valencia');
  d('pGeom', 'Γεωμετρία (VSEPR)|πώς διατάσσονται στον χώρο', 'Geometry (VSEPR)|how the electron domains arrange in space', 'Geometría (RPECV)|cómo se ordenan en el espacio');
  d('pBonds', 'Δεσμοί & πολικότητα|πώς κατανέμεται το φορτίο', 'Bonds & polarity|how charge is distributed', 'Enlaces y polaridad|cómo se distribuye la carga');
  d('pProps', 'Από τα στοιχεία στον δεσμό|γιατί οι ιδιότητές τους καθορίζουν τον δεσμό', 'From elements to bond|why element properties decide the bond type', 'De los elementos al enlace|por qué sus propiedades determinan el enlace');
  d('pSteps', 'Λύση βήμα-βήμα|ο συλλογισμός της δομής', 'Step-by-step solution|the reasoning behind the structure', 'Solución paso a paso|el razonamiento de la estructura');
  d('pIons', 'Ιόντα|ποιος δίνει και ποιος παίρνει e⁻', 'Ions|who gives and who takes e⁻', 'Iones|quién cede y quién capta e⁻'); d('pLattice', 'Κρυσταλλικό πλέγμα|πώς πακετάρονται τα ιόντα', 'Crystal lattice|how the ions pack in 3D', 'Red cristalina|cómo se empaquetan los iones'); d('pExplain', 'Γιατί σχηματίζεται;|η ενεργειακή εξήγηση', 'Why does it form?|the energy explanation', '¿Por qué se forma?|la explicación energética');
  d('lvlGeneral', 'Γενική', 'General', 'General'); d('lvlDetailed', 'Αναλυτική', 'Detailed', 'Detallada');
  d('valTotal', 'Ηλ. σθένους (σύνολο)', 'Valence e⁻ (total)', 'e⁻ de valencia (total)');
  d('bondPairs', 'Κοινά ζεύγη (δεσμοί)', 'Shared pairs (bonds)', 'Pares compartidos (enlaces)');
  d('lonePairs', 'Μονήρη ζεύγη', 'Lone pairs', 'Pares solitarios');
  d('formalSum', 'Σ|τυπικών φορτίων|', 'Σ|formal charges|', 'Σ|cargas formales|');
  d('lgLone', 'μονήρες ζεύγος', 'lone pair', 'par solitario'); d('lgBond', 'κοινό ζεύγος (δεσμός)', 'shared pair (bond)', 'par compartido (enlace)'); d('lgFormal', 'τυπικό φορτίο', 'formal charge', 'carga formal');
  d('hybridNote', '{n} ισοδύναμες δομές συντονισμού — τα ηλεκτρόνια δεν είναι εντοπισμένα σε έναν δεσμό:', '{n} equivalent resonance structures — the electrons are not localised in one bond:', '{n} estructuras de resonancia equivalentes: los electrones no están localizados en un solo enlace:');
  d('resArrows', 'οι παραπάνω δομές συντονισμού συνδέονται με το σύμβολο ↔ — δεν υπάρχει πραγματική εναλλαγή, η μία δομή περιγράφει ατελώς το σωματίδιο', 'the structures above are linked by ↔ — nothing really flips between them; each one only partly describes the species', 'las estructuras anteriores se unen con ↔: no hay un cambio real entre ellas, cada una describe solo en parte la especie');
  d('hybridCap', 'Υβρίδιο συντονισμού (διακεκομμένη γραμμή = μερικός δεσμός)', 'Resonance hybrid (dashed line = partial bond)', 'Híbrido de resonancia (línea discontinua = enlace parcial)');
  d('state_octet', 'οκτάδα', 'octet', 'octeto'); d('state_duet', 'δυάδα', 'duet', 'dueto'); d('state_expanded', 'εκτεταμένη οκτάδα', 'expanded octet', 'octeto expandido');
  d('state_deficient', 'ελλιπής οκτάδα', 'incomplete octet', 'octeto incompleto'); d('state_radical', 'μονήρες ηλεκτρόνιο', 'unpaired electron', 'electrón desapareado'); d('state_invalid', 'μη έγκυρο', 'invalid', 'no válido');
  d('atom', 'Άτομο', 'Atom', 'Átomo'); d('eGeom', 'Διάταξη e⁻', 'Electron geometry', 'Geometría electrónica'); d('shape', 'Σχήμα μορίου', 'Molecular shape', 'Forma molecular');
  d('angIdeal', 'Ιδανική γωνία', 'Ideal angle', 'Ángulo ideal'); d('angReal', 'Γωνία στο μοντέλο', 'Angle in the model', 'Ángulo en el modelo'); d('hybrid', 'Υβριδισμός', 'Hybridisation', 'Hibridación');
  d('vseprNote', 'Με απλά λόγια: τα μονήρη ζεύγη καταλαμβάνουν περισσότερο χώρο και «σφίγγουν» τις γωνίες των δεσμών. Τα μονήρη ζεύγη απωθούν ισχυρότερα από τα δεσμικά, γι’ αυτό οι γωνίες είναι μικρότερες από τις ιδανικές· όπου υπάρχει πειραματική τιμή (exp) χρησιμοποιείται αυτή.',
    'In plain words: lone pairs take up more room and squeeze the bond angles. Lone pairs repel more strongly than bonding pairs, so angles are smaller than the ideal ones; where an experimental value exists (exp) it is used.',
    'En palabras simples: los pares solitarios ocupan más espacio y cierran los ángulos de enlace. Los pares solitarios repelen más que los enlazantes, por eso los ángulos son menores que los ideales; donde existe valor experimental (exp) se usa ese.');
  d('g_linear', 'γραμμική', 'linear', 'lineal'); d('g_trigonal', 'τριγωνική επίπεδη', 'trigonal planar', 'trigonal plana'); d('g_tetra', 'τετραεδρική', 'tetrahedral', 'tetraédrica');
  d('g_tbp', 'τριγωνική διπυραμιδική', 'trigonal bipyramidal', 'bipirámide trigonal'); d('g_oct', 'οκταεδρική', 'octahedral', 'octaédrica'); d('g_pbp', 'πενταγωνική διπυραμιδική', 'pentagonal bipyramidal', 'bipirámide pentagonal');
  d('m_linear', 'γραμμικό', 'linear', 'lineal'); d('m_bent', 'γωνιακό', 'bent', 'angular'); d('m_trigonal', 'τριγωνικό επίπεδο', 'trigonal planar', 'trigonal plana');
  d('m_pyramid', 'τριγωνική πυραμίδα', 'trigonal pyramidal', 'piramidal trigonal'); d('m_tetra', 'τετραεδρικό', 'tetrahedral', 'tetraédrica'); d('m_seesaw', 'ανάκλιντρο (see-saw)', 'seesaw', 'balancín');
  d('m_tshape', 'σχήμα T', 'T-shaped', 'en forma de T'); d('m_tbp', 'τριγωνική διπυραμίδα', 'trigonal bipyramidal', 'bipirámide trigonal'); d('m_oct', 'οκταεδρικό', 'octahedral', 'octaédrica');
  d('m_sqpyr', 'τετραγωνική πυραμίδα', 'square pyramidal', 'pirámide cuadrada'); d('m_sqplanar', 'τετραγωνικό επίπεδο', 'square planar', 'plano cuadrada'); d('m_pbp', 'πενταγωνική διπυραμίδα', 'pentagonal bipyramidal', 'bipirámide pentagonal');
  d('bond', 'Δεσμός', 'Bond', 'Enlace'); d('order', 'Τάξη', 'Order', 'Orden'); d('type', 'Τύπος', 'Type', 'Tipo'); d('len', 'Μήκος', 'Length', 'Longitud'); d('energy', 'Ενέργεια', 'Energy', 'Energía');
  d('t_ionic', 'ιοντικός', 'ionic', 'iónico'); d('t_polar', 'πολικός ομοιοπολικός', 'polar covalent', 'covalente polar'); d('t_nonpolar', 'μη πολικός ομοιοπολικός', 'non-polar covalent', 'covalente apolar');
  d('t_metallic', 'μεταλλικός', 'metallic', 'metálico'); d('t_unknown', 'χωρίς δεδομένα χ', 'no χ data', 'sin datos de χ');
  d('ionicWord', 'ιοντικός χαρακτήρας', 'ionic character', 'carácter iónico');
  d('polarMol', 'Πολικό μόριο', 'Polar molecule', 'Molécula polar'); d('nonpolarMol', 'Μη πολικό μόριο', 'Non-polar molecule', 'Molécula apolar');
  d('cancel', 'οι διπολικές ροπές των δεσμών αλληλοεξουδετερώνονται λόγω συμμετρίας·', 'the bond dipoles cancel by symmetry;', 'los dipolos de enlace se anulan por simetría;');
  d('model', 'μοντέλο', 'model', 'modelo'); d('expShort', 'πειρ.', 'exp.', 'exp.');
  d('dipNote', 'Με απλά λόγια: η πολικότητα του μορίου είναι το διανυσματικό άθροισμα των πολικοτήτων των δεσμών. Το μοντέλο αθροίζει διανυσματικά τις διπολικές ροπές των δεσμών (από Δχ και μήκος) και προσθέτει έναν εμπειρικό όρο 0,5 D ανά μονήρες ζεύγος του κεντρικού ατόμου· είναι εκτίμηση — όπου υπάρχει πειραματική τιμή, η κατάταξη πολικό/μη πολικό βασίζεται σε αυτήν.',
    'In plain words: a molecule\'s polarity is the vector sum of its bond polarities. The model adds the bond dipoles as vectors (from Δχ and length) plus an empirical 0.5 D per lone pair on the central atom; it is an estimate — where an experimental value exists, the polar/non-polar verdict is based on it.',
    'En palabras simples: la polaridad de la molécula es la suma vectorial de las polaridades de sus enlaces. El modelo suma vectorialmente los dipolos de enlace (a partir de Δχ y longitud) y añade un término empírico de 0,5 D por par solitario del átomo central; es una estimación: donde hay valor experimental, el veredicto polar/apolar se basa en él.');
  d('starNote', '* ενέργεια δεσμού: εκτίμηση (όχι από τον πίνακα μέσων τιμών).', '* bond energy: estimate (not from the averaged table).', '* energía de enlace: estimación (no de la tabla de valores medios).');
  d('noBonds', 'Ένα άτομο — δεν υπάρχουν δεσμοί.', 'A single atom — no bonds.', 'Un solo átomo: no hay enlaces.');
  d('cation', 'Κατιόν', 'Cation', 'Catión'); d('anion', 'Ανιόν', 'Anion', 'Anión'); d('electrons', 'Ηλεκτρόνια', 'Electrons', 'Electrones');
  d('loses', 'χάνει {n} e⁻', 'loses {n} e⁻', 'pierde {n} e⁻'); d('gains', 'κερδίζει {n} e⁻', 'gains {n} e⁻', 'gana {n} e⁻');
  d('radius', 'Ακτίνα', 'Radius', 'Radio'); d('coord', 'Αρ. συναρμογής', 'Coordination', 'Coordinación');
  d('st_nacl', 'Δομή NaCl (κυβική εδροκεντρωμένη, συναρμογή 6:6) — λόγος ακτίνων 0,414–0,732', 'NaCl structure (face-centred cubic, 6:6 coordination) — radius ratio 0.414–0.732', 'Estructura tipo NaCl (cúbica centrada en las caras, coordinación 6:6): cociente de radios 0,414–0,732');
  d('st_cscl', 'Δομή CsCl (απλή κυβική, συναρμογή 8:8) — λόγος ακτίνων ≥ 0,732', 'CsCl structure (simple cubic, 8:8 coordination) — radius ratio ≥ 0.732', 'Estructura tipo CsCl (cúbica simple, coordinación 8:8): cociente de radios ≥ 0,732');
  d('st_zns', 'Δομή σφαλερίτη ZnS (συναρμογή 4:4) — λόγος ακτίνων 0,225–0,414', 'Zinc-blende ZnS structure (4:4 coordination) — radius ratio 0.225–0.414', 'Estructura de blenda de zinc ZnS (coordinación 4:4): cociente de radios 0,225–0,414');
  d('st_fluorite', 'Δομή φθορίτη CaF₂ (συναρμογή 8:4)', 'Fluorite CaF₂ structure (8:4 coordination)', 'Estructura de fluorita CaF₂ (coordinación 8:4)');
  d('st_antifluorite', 'Δομή αντιφθορίτη (π.χ. Li₂O, Na₂O· συναρμογή 4:8)', 'Antifluorite structure (e.g. Li₂O, Na₂O; 4:8 coordination)', 'Estructura de antifluorita (p. ej., Li₂O, Na₂O; coordinación 4:8)');
  d('st_cluster', 'Σχηματική μονάδα τύπου — το πραγματικό πλέγμα είναι πιο σύνθετο', 'Schematic formula unit — the real lattice is more complex', 'Unidad fórmula esquemática: la red real es más compleja');
  d('st_short_nacl', 'τύπου NaCl', 'NaCl type', 'tipo NaCl'); d('st_short_cscl', 'τύπου CsCl', 'CsCl type', 'tipo CsCl'); d('st_short_zns', 'τύπου ZnS', 'ZnS type', 'tipo ZnS');
  d('st_short_fluorite', 'φθορίτης', 'fluorite', 'fluorita'); d('st_short_antifluorite', 'αντιφθορίτης', 'antifluorite', 'antifluorita'); d('st_short_cluster', 'σχηματική μονάδα', 'schematic unit', 'unidad esquemática');

  /* ---------- element categories and molecule categories ---------- */
  d('cat_all', 'Όλα', 'All', 'Todos'); d('cat_diatomic', 'Διατομικά', 'Diatomic', 'Diatómicas'); d('cat_hydride', 'Υδρίδια', 'Hydrides', 'Hidruros'); d('cat_oxide', 'Οξείδια', 'Oxides', 'Óxidos');
  d('cat_halide', 'Αλογονίδια', 'Halides', 'Haluros'); d('cat_organic', 'Οργανικά', 'Organic', 'Orgánicas'); d('cat_acid', 'Οξέα', 'Acids', 'Ácidos'); d('cat_ion', 'Ιόντα', 'Ions', 'Iones');
  d('cat_generated', 'Πρόβλεψη', 'Predicted', 'Predicho'); d('cat_other', 'Άλλα', 'Other', 'Otros');
  d('cat_alkali', 'Αλκάλιο', 'Alkali metal', 'Metal alcalino'); d('cat_alkaline', 'Αλκαλική γαία', 'Alkaline earth', 'Alcalinotérreo'); d('cat_transition', 'Στοιχείο μετάπτωσης', 'Transition metal', 'Metal de transición');
  d('cat_post', 'Μέταλλο p-τομέα', 'Post-transition metal', 'Metal postransicional'); d('cat_metalloid', 'Μεταλλοειδές', 'Metalloid', 'Metaloide'); d('cat_nonmetal', 'Αμέταλλο', 'Nonmetal', 'No metal');
  d('cat_noble', 'Ευγενές αέριο', 'Noble gas', 'Gas noble'); d('cat_lanthanide', 'Λανθανίδιο', 'Lanthanide', 'Lantánido'); d('cat_actinide', 'Ακτινίδιο', 'Actinide', 'Actínido');

  /* ---------- tab 3: bond lab ---------- */
  d('replay', 'Επανάληψη', 'Replay', 'Repetir');
  d('plChar', 'Ιοντικός χαρακτήρας ως προς Δχ|από ομοιοπολικό σε ιοντικό (συνεχές)', 'Ionic character vs Δχ|from covalent to ionic (a continuum)', 'Carácter iónico frente a Δχ|de covalente a iónico (un continuo)');
  d('plKet', 'Τρίγωνο Ketelaar (van Arkel)|χάρτης των τριών τύπων δεσμού', 'Ketelaar (van Arkel) triangle|a map of the three bond types', 'Triángulo de Ketelaar (van Arkel)|mapa de los tres tipos de enlace');
  d('ketNote', 'Με απλά λόγια: διάβασε το διάγραμμα σαν χάρτη· η θέση ενός δεσμού δείχνει αν είναι μεταλλικός, ομοιοπολικός ή ιοντικός. Κάθε σημείο: στον οριζόντιο άξονα η διαφορά Δχ, στον κάθετο η μέση ηλεκτραρνητικότητα χ̄. Χαμηλό χ̄ → μεταλλικός · υψηλό χ̄ και χαμηλό Δχ → ομοιοπολικός · υψηλό Δχ → ιοντικός.',
    'In plain words: read the diagram as a map — where a bond sits tells you if it is metallic, covalent or ionic. Each point: the difference Δχ on the horizontal axis, the mean electronegativity χ̄ on the vertical axis. Low χ̄ → metallic · high χ̄ and low Δχ → covalent · high Δχ → ionic.',
    'En palabras simples: lee el diagrama como un mapa; la posición del enlace indica si es metálico, covalente o iónico. Cada punto: la diferencia Δχ en el eje horizontal y la electronegatividad media χ̄ en el vertical. χ̄ bajo → metálico · χ̄ alto y Δχ bajo → covalente · Δχ alto → iónico.');
  d('regMetal', 'μεταλλικός', 'metallic', 'metálico'); d('regCov', 'ομοιοπολικός', 'covalent', 'covalente'); d('regIonic', 'ιοντικός (Δχ ≥ 1,7)', 'ionic (Δχ ≥ 1.7)', 'iónico (Δχ ≥ 1,7)');
  d('plEnergy', 'Δυναμική ενέργεια ως προς την απόσταση|γιατί ο δεσμός έχει «ιδανικό» μήκος', 'Potential energy vs distance|why a bond has a preferred length', 'Energía potencial frente a la distancia|por qué el enlace tiene una longitud preferida');
  d('curNeutral', 'ουδέτερα άτομα', 'neutral atoms', 'átomos neutros');
  d('curIonNote', 'Με απλά λόγια: για να σχηματιστούν ιόντα απαιτείται ενέργεια· την αντισταθμίζει η έλξη Coulomb όταν τα ιόντα πλησιάσουν. Για το ζεύγος ιόντων χρειάζονται ΔE = IE − EA = {dE} kJ/mol. Για r < r* = {rs} pm η έλξη Coulomb το αντισταθμίζει· στο r₀ (άθροισμα ιοντικών ακτίνων Shannon) η ενέργεια είναι ελάχιστη. Μοντέλο Coulomb + απώθηση Born–Mayer (ρ = 34,5 pm) για ζεύγος ιόντων σε αέριο — στον κρύσταλλο οι αποστάσεις διαφέρουν.',
    'In plain words: forming ions costs energy, and the Coulomb attraction pays it back once the ions come close. Forming the ion pair costs ΔE = IE − EA = {dE} kJ/mol. For r < r* = {rs} pm the Coulomb attraction pays for it; the energy is lowest at r₀ (sum of Shannon ionic radii). Coulomb + Born–Mayer repulsion model (ρ = 34.5 pm) for a gas-phase ion pair — distances in the crystal differ.',
    'En palabras simples: formar iones cuesta energía, y la atracción de Coulomb la compensa cuando los iones se acercan. Formar el par de iones cuesta ΔE = IE − EA = {dE} kJ/mol. Para r < r* = {rs} pm la atracción de Coulomb lo compensa; la energía es mínima en r₀ (suma de radios iónicos de Shannon). Modelo de Coulomb + repulsión de Born–Mayer (ρ = 34,5 pm) para un par de iones en fase gaseosa; en el cristal las distancias son distintas.');
  d('curIonMulti', 'Η καμπύλη ζεύγους δεν δείχνεται για φορτία διαφορετικά από ±1 (χρειάζονται οι διαδοχικές ενέργειες ιοντισμού)· δες την ενέργεια πλέγματος της ένωσης.', 'The ion-pair curve is not shown for charges other than ±1 (it needs the successive ionisation energies); see the lattice energy of the compound instead.', 'La curva del par iónico no se muestra para cargas distintas de ±1 (requiere las energías de ionización sucesivas); consulta la energía reticular del compuesto.');
  d('curMetal', 'Ο μεταλλικός δεσμός δεν είναι δεσμός ζεύγους ατόμων: κάθε κατιόν αλληλεπιδρά με την κοινή «θάλασσα» ηλεκτρονίων, γι’ αυτό δεν υπάρχει καμπύλη μεταξύ δύο ατόμων.', 'Metallic bonding is not a bond between a pair of atoms: every cation interacts with the shared “sea” of electrons, so there is no two-atom curve.', 'El enlace metálico no es un enlace entre dos átomos: cada catión interactúa con el «mar» de electrones compartido, por eso no hay una curva entre dos átomos.');
  d('curCovNote', 'Με απλά λόγια: ο δεσμός έχει «ιδανικό» μήκος· πιο κοντά κυριαρχεί η άπωση των πυρήνων, πιο μακριά εξασθενεί η έλξη. Μοντέλο Morse με D από πίνακες μέσων ενεργειών δεσμού, r₀ από μέσα μήκη δεσμών και τυπικό πλάτος a = 2,0 Å⁻¹. Στο ελάχιστο εξισορροπούνται η έλξη των πυρήνων προς τα κοινά ηλεκτρόνια και η απώθηση πυρήνων–πυρήνων.',
    'In plain words: a bond has a preferred length — closer in, nuclear repulsion wins; farther out, the attraction fades. Morse model with D from average bond-energy tables, r₀ from average bond lengths and a typical width a = 2.0 Å⁻¹. At the minimum, the attraction of the nuclei to the shared electrons balances the nucleus–nucleus repulsion.',
    'En palabras simples: el enlace tiene una longitud preferida; más cerca domina la repulsión nuclear, más lejos la atracción se debilita. Modelo de Morse con D de las tablas de energías de enlace medias, r₀ de las longitudes de enlace medias y un ancho típico a = 2,0 Å⁻¹. En el mínimo se equilibran la atracción de los núcleos hacia los electrones compartidos y la repulsión núcleo–núcleo.');
  d('cap_ionic', 'Ιοντικός δεσμός: μεταφορά {n} e⁻ από το μέταλλο στο αμέταλλο — το κατιόν (μικρότερο) και το ανιόν (μεγαλύτερο) έλκονται ηλεκτροστατικά.', 'Ionic bond: {n} e⁻ move from the metal to the non-metal — the cation (smaller) and the anion (larger) attract each other electrostatically.', 'Enlace iónico: {n} e⁻ pasan del metal al no metal; el catión (más pequeño) y el anión (más grande) se atraen electrostáticamente.');
  d('cap_polar', 'Πολικός ομοιοπολικός δεσμός: το κοινό ζεύγος μετατοπίζεται προς το πιο ηλεκτραρνητικό άτομο (δ− / δ+).', 'Polar covalent bond: the shared pair is pulled toward the more electronegative atom (δ− / δ+).', 'Enlace covalente polar: el par compartido se desplaza hacia el átomo más electronegativo (δ− / δ+).');
  d('cap_nonpolar', 'Μη πολικός ομοιοπολικός δεσμός: το κοινό ζεύγος μοιράζεται ισότιμα.', 'Non-polar covalent bond: the shared pair is shared equally.', 'Enlace covalente apolar: el par compartido se reparte por igual.');
  d('cap_metallic', 'Μεταλλικός δεσμός: τα ηλεκτρόνια σθένους αποδεσμεύονται και κινούνται ελεύθερα ανάμεσα στα κατιόντα.', 'Metallic bond: the valence electrons detach and move freely between the cations.', 'Enlace metálico: los electrones de valencia se desprenden y se mueven libremente entre los cationes.');
  d('cap_unknown', 'Δεν υπάρχουν δεδομένα ηλεκτραρνητικότητας: τα ευγενή αέρια δεν σχηματίζουν δεσμούς — μόνο ασθενείς δυνάμεις van der Waals σε απόσταση περίπου ίση με το άθροισμα των ακτίνων τους.', 'There is no electronegativity data: noble gases do not form bonds — only weak van der Waals forces at about the sum of their radii.', 'No hay datos de electronegatividad: los gases nobles no forman enlaces, solo débiles fuerzas de van der Waals a una distancia cercana a la suma de sus radios.');

  /* ---------- Lewis / VSEPR / polarity solution ---------- */
  d('s1h', 'Άθροισμα ηλεκτρονίων σθένους', 'Add up the valence electrons', 'Sumar los electrones de valencia');
  d('s1', 'Σύνολο: {expr} = {total} e⁻', 'Total: {expr} = {total} e⁻', 'Total: {expr} = {total} e⁻');
  d('s1neg', 'Το ιόν έχει φορτίο {q}−, άρα προσθέτουμε {q} e⁻.', 'The ion carries a {q}− charge, so we add {q} e⁻.', 'El ion tiene carga {q}−, así que añadimos {q} e⁻.');
  d('s1pos', 'Το ιόν έχει φορτίο {q}+, άρα αφαιρούμε {q} e⁻.', 'The ion carries a {q}+ charge, so we remove {q} e⁻.', 'El ion tiene carga {q}+, así que quitamos {q} e⁻.');
  d('s1why', 'Τα ηλεκτρόνια σθένους είναι αυτά του εξωτερικού φλοιού: για τις ομάδες 1–2 ισούνται με τον αριθμό ομάδας, για τις ομάδες 13–18 με (αριθμός ομάδας − 10).', 'Valence electrons are those of the outer shell: for groups 1–2 they equal the group number, for groups 13–18 (group number − 10).', 'Los electrones de valencia son los de la capa externa: en los grupos 1–2 coinciden con el número de grupo y en los grupos 13–18 con (número de grupo − 10).');
  d('s1atom', '{sym}: ομάδα {g}, ο εξωτερικός φλοιός έχει {sh} e⁻ → {v}', '{sym}: group {g}, the outer shell holds {sh} e⁻ → {v}', '{sym}: grupo {g}, la capa externa tiene {sh} e⁻ → {v}');
  d('s2h', 'Σκελετός με απλούς δεσμούς', 'Skeleton with single bonds', 'Esqueleto con enlaces simples');
  d('s2', 'Κεντρικό άτομο: {c}. Το ενώνουμε με τα υπόλοιπα με απλούς δεσμούς: {nb} δεσμοί × 2 e⁻ = {e} e⁻.', 'Central atom: {c}. We join it to the others with single bonds: {nb} bonds × 2 e⁻ = {e} e⁻.', 'Átomo central: {c}. Lo unimos a los demás con enlaces simples: {nb} enlaces × 2 e⁻ = {e} e⁻.');
  d('s2d', 'Ενώνουμε τα δύο άτομα με έναν απλό δεσμό ({e} e⁻).', 'We join the two atoms with a single bond ({e} e⁻).', 'Unimos los dos átomos con un enlace simple ({e} e⁻).');
  d('s2c', 'Ο σκελετός προκύπτει από τη συνδεσμολογία του μορίου: {nb} δεσμοί × 2 e⁻ = {e} e⁻ (αρχικά ως απλοί δεσμοί).', 'The skeleton follows the connectivity of the molecule: {nb} bonds × 2 e⁻ = {e} e⁻ (first as single bonds).', 'El esqueleto sigue la conectividad de la molécula: {nb} enlaces × 2 e⁻ = {e} e⁻ (al principio como enlaces simples).');
  d('s2why', 'Κεντρικό γίνεται συνήθως το λιγότερο ηλεκτραρνητικό άτομο που σχηματίζει τους περισσότερους δεσμούς· το υδρογόνο (ένας δεσμός μόνο) δεν είναι ποτέ κεντρικό.', 'The central atom is usually the least electronegative one that forms the most bonds; hydrogen (only one bond) is never central.', 'El átomo central suele ser el menos electronegativo que forma más enlaces; el hidrógeno (un solo enlace) nunca es central.');
  d('s2x', '{n} γείτονες', '{n} neighbours', '{n} vecinos');
  d('s3h', 'Μονήρη ζεύγη', 'Lone pairs', 'Pares solitarios');
  d('s3', 'Απομένουν {rest} e⁻ = {pairs} ζεύγη. Συμπληρώνουμε πρώτα τα ακραία άτομα (οκτάδα· δυάδα για το H) και ό,τι περισσεύει πάει στο κεντρικό.', '{rest} e⁻ are left = {pairs} pairs. We complete the terminal atoms first (octet; duet for H) and whatever remains goes on the central atom.', 'Quedan {rest} e⁻ = {pairs} pares. Completamos primero los átomos terminales (octeto; dueto para el H) y lo que sobra va al átomo central.');
  d('s3why', 'ηλεκτρόνια που απομένουν = σύνολο σθένους − 2 × (αριθμός δεσμών).', 'electrons left = total valence − 2 × (number of bonds).', 'electrones restantes = total de valencia − 2 × (número de enlaces).');
  d('s4h', 'Πολλαπλοί δεσμοί & τυπικά φορτία', 'Multiple bonds & formal charges', 'Enlaces múltiples y cargas formales');
  d('s4m', 'Για να συμπληρωθεί η οκτάδα, μετατρέπουμε μονήρη ζεύγη σε δεσμούς: {list}.', 'To complete the octet we turn lone pairs into bonds: {list}.', 'Para completar el octeto convertimos pares solitarios en enlaces: {list}.');
  d('s4n', 'Όλα τα άτομα ικανοποιούν την οκτάδα/δυάδα με απλούς δεσμούς.', 'Every atom satisfies the octet/duet with single bonds.', 'Todos los átomos cumplen el octeto/dueto con enlaces simples.');
  d('s4x', 'Το {a} έχει {n} e⁻ γύρω του (εκτεταμένη οκτάδα — επιτρέπεται από την 3η περίοδο και μετά).', '{a} has {n} e⁻ around it (expanded octet — allowed from period 3 onwards).', 'El {a} tiene {n} e⁻ a su alrededor (octeto expandido: permitido a partir del 3.er periodo).');
  d('s4d', 'Το {a} έχει μόνο {n} e⁻ (ελλιπής οκτάδα — χαρακτηριστικό των Be, B, Al).', '{a} has only {n} e⁻ (incomplete octet — typical of Be, B, Al).', 'El {a} solo tiene {n} e⁻ (octeto incompleto: típico de Be, B, Al).');
  d('s4r', 'Το {a} έχει ένα μονήρες ηλεκτρόνιο: το σωματίδιο είναι ρίζα (περιττός αριθμός e⁻).', '{a} has an unpaired electron: the species is a radical (odd number of e⁻).', 'El {a} tiene un electrón desapareado: la especie es un radical (número impar de e⁻).');
  d('s4fc', 'Τυπικό φορτίο: FC = V − L − B (V = ηλεκτρόνια σθένους, L = ηλεκτρόνια μονήρων ζευγών, B = αριθμός δεσμών).', 'Formal charge: FC = V − L − B (V = valence electrons, L = electrons in lone pairs, B = number of bonds).', 'Carga formal: FC = V − L − B (V = electrones de valencia, L = electrones de pares solitarios, B = número de enlaces).');
  d('s4sum', 'Σ FC = {q} (ίσο με το φορτίο του σωματιδίου)· Σ|FC| = {s}. Προτιμάται η δομή με το μικρότερο Σ|FC|.', 'Σ FC = {q} (equal to the charge of the species); Σ|FC| = {s}. The structure with the smallest Σ|FC| is preferred.', 'Σ FC = {q} (igual a la carga de la especie); Σ|FC| = {s}. Se prefiere la estructura con menor Σ|FC|.');
  d('sRes', 'Υπάρχουν {n} ισοδύναμες δομές συντονισμού· η πραγματική δομή είναι το υβρίδιό τους (μέση τάξη δεσμού {o}).', 'There are {n} equivalent resonance structures; the real structure is their hybrid (average bond order {o}).', 'Hay {n} estructuras de resonancia equivalentes; la estructura real es su híbrido (orden de enlace medio {o}).');
  d('s5h', 'Έλεγχος', 'Check', 'Comprobación');
  d('s5', 'Κοινά ζεύγη {bp} + μονήρη ζεύγη {lp} → {tot} e⁻ — όσα και το σύνολο σθένους ✓', 'Shared pairs {bp} + lone pairs {lp} → {tot} e⁻ — the same as the valence total ✓', 'Pares compartidos {bp} + pares solitarios {lp} → {tot} e⁻: coincide con el total de valencia ✓');
  d('s6h', 'Γεωμετρία (VSEPR)', 'Geometry (VSEPR)', 'Geometría (RPECV)');
  d('s6', 'Στο {a}: {x} δεσμικές περιοχές + {e} μη δεσμικά ζεύγη = {sn} περιοχές → {key}: διάταξη {geo}, σχήμα {shape}.', 'At {a}: {x} bonding regions + {e} non-bonding pairs = {sn} regions → {key}: {geo} arrangement, {shape} shape.', 'En {a}: {x} regiones de enlace + {e} pares no enlazantes = {sn} regiones → {key}: disposición {geo}, forma {shape}.');
  d('s6d', 'Οι περιοχές ηλεκτρονίων απωθούνται και απομακρύνονται όσο γίνεται (ιδανικές γωνίες: {ang}, υβριδισμός {hyb}). Γωνίες στο μοντέλο: {real} ({src}).', 'Electron regions repel and move as far apart as possible (ideal angles: {ang}, hybridisation {hyb}). Angles in the model: {real} ({src}).', 'Las regiones de electrones se repelen y se alejan al máximo (ángulos ideales: {ang}, hibridación {hyb}). Ángulos en el modelo: {real} ({src}).');
  d('srcExp', 'πειραματική τιμή', 'experimental value', 'valor experimental'); d('srcModel', 'ιδανικό VSEPR με διόρθωση για μονήρη ζεύγη', 'ideal VSEPR corrected for lone pairs', 'RPECV ideal corregido por pares solitarios');
  d('s6di', 'Διατομικό μόριο ή ένα άτομο: δεν υπάρχει γωνία — το σχήμα είναι γραμμικό.', 'Diatomic molecule or a single atom: there is no angle — the shape is linear.', 'Molécula diatómica o un solo átomo: no hay ángulo; la forma es lineal.');
  d('s7h', 'Πολικότητα', 'Polarity', 'Polaridad');
  d('s7p', 'Η συνολική διπολική ροπή δεν μηδενίζεται → πολικό μόριο.', 'The net dipole moment does not cancel → polar molecule.', 'El momento dipolar neto no se anula → molécula polar.');
  d('s7n', 'Οι διπολικές ροπές των δεσμών αλληλοεξουδετερώνονται ή είναι αμελητέες → μη πολικό μόριο.', 'The bond dipoles cancel or are negligible → non-polar molecule.', 'Los dipolos de enlace se anulan o son despreciables → molécula apolar.');
  d('s7ion', 'Φορτισμένο σωματίδιο (ιόν): η πολικότητα μορίου δεν ορίζεται με τον ίδιο τρόπο.', 'Charged species (ion): molecular polarity is not defined in the same way.', 'Especie cargada (ion): la polaridad molecular no se define de la misma manera.');
  d('s7d', 'Διανυσματικό άθροισμα διπολικών ροπών: μ ≈ {mu} D ({src}).', 'Vector sum of the dipole moments: μ ≈ {mu} D ({src}).', 'Suma vectorial de los momentos dipolares: μ ≈ {mu} D ({src}).');
  d('srcModelMu', 'εκτίμηση μοντέλου', 'model estimate', 'estimación del modelo'); d('srcExpMu', 'πειραματικά μ = {mu} D', 'experimental μ = {mu} D', 'experimental μ = {mu} D');
  d('src_table', 'πίνακας μέσων ενεργειών', 'average-energy table', 'tabla de energías medias'); d('src_est', 'εκτίμηση από απλό δεσμό', 'estimate from the single bond', 'estimación a partir del enlace simple');
  d('src_pauling', 'εξίσωση Pauling', 'Pauling equation', 'ecuación de Pauling'); d('src_rough', 'πρόχειρη εκτίμηση', 'rough estimate', 'estimación aproximada');

  /* ---------- why do two elements bond like that ---------- */
  d('x_noEn', 'Δεν υπάρχουν δεδομένα ηλεκτραρνητικότητας για {a} ή {b} (π.χ. He, Ne, Ar ή υπερβαρέα στοιχεία)· η ταξινόμηση του δεσμού δεν είναι δυνατή.', 'There is no electronegativity data for {a} or {b} (e.g. He, Ne, Ar or superheavy elements); the bond cannot be classified.', 'No hay datos de electronegatividad para {a} o {b} (p. ej., He, Ne, Ar o elementos superpesados); no se puede clasificar el enlace.');
  d('x_valMetal', 'Και τα δύο είναι μέταλλα με λίγα ηλεκτρόνια σθένους ({a}: {va}, {b}: {vb}) που αποδεσμεύονται εύκολα.', 'Both are metals with few valence electrons ({a}: {va}, {b}: {vb}) that detach easily.', 'Ambos son metales con pocos electrones de valencia ({a}: {va}, {b}: {vb}) que se liberan con facilidad.');
  d('x_valIonic', 'Το μέταλλο {m} έχει {vm} ηλεκτρόνια σθένους και τα αποβάλλει εύκολα· το αμέταλλο {n} χρειάζεται {k} για οκτάδα — η μεταφορά ηλεκτρονίων συμπληρώνει και τους δύο φλοιούς.', 'The metal {m} has {vm} valence electrons and gives them up easily; the non-metal {n} needs {k} for an octet — transferring electrons completes both shells.', 'El metal {m} tiene {vm} electrones de valencia y los cede con facilidad; el no metal {n} necesita {k} para el octeto: la transferencia de electrones completa ambas capas.');
  d('x_valCov', 'Ηλεκτρόνια σθένους: {a} → {va}, {b} → {vb}. Και τα δύο χρειάζονται ηλεκτρόνια, οπότε τα μοιράζονται σε κοινά ζεύγη (οκτάδα/δυάδα).', 'Valence electrons: {a} → {va}, {b} → {vb}. Both need electrons, so they share them in common pairs (octet/duet).', 'Electrones de valencia: {a} → {va}, {b} → {vb}. Ambos necesitan electrones, así que los comparten en pares comunes (octeto/dueto).');
  d('x_en', 'Ηλεκτραρνητικότητα Pauling: χ({a}) = {ea}, χ({b}) = {eb} → Δχ = {d} → {verdict}. (Δχ < 0,4 μη πολικός · 0,4–1,7 πολικός · ≥ 1,7 ιοντικός.)', 'Pauling electronegativity: χ({a}) = {ea}, χ({b}) = {eb} → Δχ = {d} → {verdict}. (Δχ < 0.4 non-polar · 0.4–1.7 polar · ≥ 1.7 ionic.)', 'Electronegatividad de Pauling: χ({a}) = {ea}, χ({b}) = {eb} → Δχ = {d} → {verdict}. (Δχ < 0,4 apolar · 0,4–1,7 polar · ≥ 1,7 iónico.)');
  d('x_ie', 'Ενέργεια ιοντισμού του {c}: IE₁ = {ie} kJ/mol (κόστος)· συγγένεια ηλεκτρονίου του {an}: EA = {ea} kJ/mol (κέρδος).', 'Ionisation energy of {c}: IE₁ = {ie} kJ/mol (cost); electron affinity of {an}: EA = {ea} kJ/mol (gain).', 'Energía de ionización del {c}: IE₁ = {ie} kJ/mol (coste); afinidad electrónica del {an}: EA = {ea} kJ/mol (ganancia).');
  d('x_dE', 'Αέρια μεταφορά ενός e⁻: ΔE = IE − EA = {dE} kJ/mol. Η έλξη Coulomb των ιόντων το αντισταθμίζει για r < r* = {rstar} pm· η ισορροπία είναι στο r₀ ≈ {r0} pm με ενέργεια {emin} kJ/mol σε σχέση με τα ουδέτερα άτομα.', 'Gas-phase transfer of one e⁻: ΔE = IE − EA = {dE} kJ/mol. The Coulomb attraction of the ions pays for it for r < r* = {rstar} pm; equilibrium is at r₀ ≈ {r0} pm with an energy of {emin} kJ/mol relative to the neutral atoms.', 'Transferencia en fase gaseosa de un e⁻: ΔE = IE − EA = {dE} kJ/mol. La atracción de Coulomb de los iones lo compensa para r < r* = {rstar} pm; el equilibrio está en r₀ ≈ {r0} pm con una energía de {emin} kJ/mol respecto a los átomos neutros.');
  d('x_ieMetal', 'Και τα δύο μέταλλα έχουν χαμηλές IE₁ ({a}: {ia}, {b}: {ib} kJ/mol): τα ηλεκτρόνια σθένους δεν συγκρατούνται ισχυρά και σχηματίζουν κοινή «θάλασσα».', 'Both metals have low IE₁ ({a}: {ia}, {b}: {ib} kJ/mol): the valence electrons are held weakly and form a shared “sea”.', 'Ambos metales tienen IE₁ bajas ({a}: {ia}, {b}: {ib} kJ/mol): los electrones de valencia están poco retenidos y forman un «mar» compartido.');
  d('x_noble', 'Δεν συμφέρει ενεργειακά η πλήρης μεταφορά ηλεκτρονίων· τα άτομα συγκρατούνται από κοινά ηλεκτρόνια και ο δεσμός είναι ομοιοπολικός.', 'Complete electron transfer does not pay off energetically; the atoms are held together by shared electrons and the bond is covalent.', 'La transferencia completa de electrones no compensa energéticamente; los átomos se mantienen unidos por electrones compartidos y el enlace es covalente.');
  d('x_size', 'Μέγεθος: r({a}) = {ra} pm, r({b}) = {rb} pm → μήκος δεσμού ≈ {len} pm. Μικρότερα άτομα → κοντύτεροι και ισχυρότεροι δεσμοί.', 'Size: r({a}) = {ra} pm, r({b}) = {rb} pm → bond length ≈ {len} pm. Smaller atoms → shorter, stronger bonds.', 'Tamaño: r({a}) = {ra} pm, r({b}) = {rb} pm → longitud de enlace ≈ {len} pm. Átomos más pequeños → enlaces más cortos y fuertes.');
  d('x_sizeIonic', 'Μέγεθος: το {c} χάνει ηλεκτρόνια και συρρικνώνεται (r: {rc0} → {rc} pm)· το {a} τα κερδίζει και διογκώνεται ({ra0} → {ra} pm). Απόσταση ιόντων ≈ {d} pm.', 'Size: {c} loses electrons and shrinks (r: {rc0} → {rc} pm); {a} gains them and swells ({ra0} → {ra} pm). Ion–ion distance ≈ {d} pm.', 'Tamaño: el {c} pierde electrones y se encoge (r: {rc0} → {rc} pm); el {a} los gana y se hincha ({ra0} → {ra} pm). Distancia entre iones ≈ {d} pm.');
  d('x_energy', 'Ενέργεια δεσμού ≈ {e} kJ/mol ({src}). Όσο μεγαλύτερη η διαφορά ηλεκτραρνητικότητας, τόσο ισχυρότερος ο δεσμός σε σχέση με τον μέσο όρο των ομοπυρηνικών: D(A–B) ≈ ½(D<sub>AA</sub> + D<sub>BB</sub>) + 96,5·Δχ²',
    'Bond energy ≈ {e} kJ/mol ({src}). The larger the electronegativity difference, the stronger the bond compared with the mean of the homonuclear ones: D(A–B) ≈ ½(D<sub>AA</sub> + D<sub>BB</sub>) + 96.5·Δχ²',
    'Energía de enlace ≈ {e} kJ/mol ({src}). Cuanto mayor es la diferencia de electronegatividad, más fuerte es el enlace respecto a la media de los homonucleares: D(A–B) ≈ ½(D<sub>AA</sub> + D<sub>BB</sub>) + 96,5·Δχ²');
  d('x_char', 'Ιοντικός χαρακτήρας: {p1}% (Pauling) · {p2}% (Hannay–Smyth). Κανένας δεσμός δεν είναι 100% ιοντικός — ιοντικός και ομοιοπολικός είναι τα δύο άκρα ενός συνεχούς.', 'Ionic character: {p1}% (Pauling) · {p2}% (Hannay–Smyth). No bond is 100% ionic — ionic and covalent are the two ends of a continuum.', 'Carácter iónico: {p1}% (Pauling) · {p2}% (Hannay–Smyth). Ningún enlace es 100% iónico: iónico y covalente son los dos extremos de un continuo.');
  d('x_border', 'Μεταξύ μετάλλου και αμετάλλου με Δχ = {d} ο δεσμός είναι οριακός: ένα μικρό, πολύ φορτισμένο κατιόν πολώνει το ανιόν (κανόνες Fajans) και δίνει ομοιοπολικό χαρακτήρα — π.χ. τα AlCl₃, BeCl₂ είναι μοριακά, ενώ τα NaH, FeO σχηματίζουν ιοντικά πλέγματα.',
    'Between a metal and a non-metal with Δχ = {d} the bond is borderline: a small, highly charged cation polarises the anion (Fajans’ rules) and adds covalent character — e.g. AlCl₃ and BeCl₂ are molecular, while NaH and FeO form ionic lattices.',
    'Entre un metal y un no metal con Δχ = {d} el enlace es límite: un catión pequeño y muy cargado polariza el anión (reglas de Fajans) y aporta carácter covalente; por ejemplo, AlCl₃ y BeCl₂ son moleculares, mientras que NaH y FeO forman redes iónicas.');

  /* ---------- ionic compounds ---------- */
  d('i_charges', 'Φορτία από τον κανόνα της οκτάδας: {c} → {cq}+, {a} → {aq}−. Ισορροπία φορτίων: {nc} × (+{cq}) + {na} × (−{aq}) = 0 → {formula}.', 'Charges from the octet rule: {c} → {cq}+, {a} → {aq}−. Charge balance: {nc} × (+{cq}) + {na} × (−{aq}) = 0 → {formula}.', 'Cargas según la regla del octeto: {c} → {cq}+, {a} → {aq}−. Balance de cargas: {nc} × (+{cq}) + {na} × (−{aq}) = 0 → {formula}.');
  d('i_radii', 'Ακτίνες Shannon: r₊ = {rc} pm, r₋ = {ra} pm· λόγος r₊/r₋ = {ratio} → {structure}.', 'Shannon radii: r₊ = {rc} pm, r₋ = {ra} pm; ratio r₊/r₋ = {ratio} → {structure}.', 'Radios de Shannon: r₊ = {rc} pm, r₋ = {ra} pm; cociente r₊/r₋ = {ratio} → {structure}.');
  d('i_lattice', 'Ενέργεια πλέγματος (Kapustinskii) U ≈ {k} kJ/mol{bl}. Αυξάνει με το γινόμενο των φορτίων και μειώνεται όσο μεγαλώνουν τα ιόντα.', 'Lattice energy (Kapustinskii) U ≈ {k} kJ/mol{bl}. It grows with the product of the charges and falls as the ions get larger.', 'Energía reticular (Kapustinskii) U ≈ {k} kJ/mol{bl}. Aumenta con el producto de las cargas y disminuye al crecer los iones.');
  d('i_est', '* Οι ακτίνες για ιόντα που δεν υπάρχουν στον πίνακα Shannon είναι εκτιμήσεις.', '* Radii for ions missing from the Shannon table are estimates.', '* Los radios de los iones que no están en la tabla de Shannon son estimaciones.');
  d('i_props', 'Ισχυρές ηλεκτροστατικές έλξεις προς όλες τις κατευθύνσεις: σκληρός και εύθραυστος κρύσταλλος με υψηλό σημείο τήξης· άγει το ρεύμα μόνο όταν είναι τετηγμένος ή διαλυμένος (τα ιόντα κινούνται).', 'Strong electrostatic attraction in every direction: a hard, brittle crystal with a high melting point; it conducts only when molten or dissolved (the ions can move).', 'Fuertes atracciones electrostáticas en todas las direcciones: cristal duro y quebradizo con punto de fusión alto; solo conduce la corriente fundido o disuelto (los iones se mueven).');
  d('i1h', 'Ηλεκτρόνια σθένους', 'Valence electrons', 'Electrones de valencia');
  d('i1', '{c}: {vc} ηλεκτρόνια σθένους · {a}: {va}.', '{c}: {vc} valence electrons · {a}: {va}.', '{c}: {vc} electrones de valencia · {a}: {va}.');
  d('i1why', 'Διαμορφώσεις: {cfgc} · {cfga}', 'Configurations: {cfgc} · {cfga}', 'Configuraciones: {cfgc} · {cfga}');
  d('i2h', 'Μεταφορά ηλεκτρονίων', 'Electron transfer', 'Transferencia de electrones');
  d('i2', 'Το {c} χάνει {cq} e⁻ → {c}{cq}+ ({nc})· το {a} κερδίζει {aq} e⁻ → {a}{aq}− ({na}). Στα κύρια στοιχεία προκύπτει δομή ευγενούς αερίου.', '{c} loses {cq} e⁻ → {c}{cq}+ ({nc}); {a} gains {aq} e⁻ → {a}{aq}− ({na}). For main-group elements this gives a noble-gas configuration.', 'El {c} pierde {cq} e⁻ → {c}{cq}+ ({nc}); el {a} gana {aq} e⁻ → {a}{aq}− ({na}). En los elementos representativos resulta una configuración de gas noble.');
  d('i2why', 'Κόστος: IE₁ = {ie} kJ/mol· κέρδος: EA = {ea} kJ/mol. Το καθαρό ενεργειακό όφελος προέρχεται από την ενέργεια πλέγματος.', 'Cost: IE₁ = {ie} kJ/mol; gain: EA = {ea} kJ/mol. The net energetic benefit comes from the lattice energy.', 'Coste: IE₁ = {ie} kJ/mol; ganancia: EA = {ea} kJ/mol. El beneficio energético neto procede de la energía reticular.');
  d('i3h', 'Ισορροπία φορτίων → τύπος', 'Charge balance → formula', 'Balance de cargas → fórmula');
  d('i3why', 'Η ένωση είναι ουδέτερη· οι δείκτες προκύπτουν από τα φορτία με «σταυρωτό» κανόνα και απλοποίηση.', 'The compound is neutral; the subscripts follow from the charges by the “criss-cross” rule and simplification.', 'El compuesto es neutro; los subíndices salen de las cargas con la regla «cruzada» y simplificando.');
  d('i4h', 'Πλέγμα', 'Lattice', 'Red cristalina');
  d('i4', 'Τα ιόντα οργανώνονται σε κρύσταλλο ({s}) με ενέργεια πλέγματος ≈ {k} kJ/mol.', 'The ions arrange into a crystal ({s}) with a lattice energy ≈ {k} kJ/mol.', 'Los iones se ordenan en un cristal ({s}) con una energía reticular ≈ {k} kJ/mol.');
  d('i4why', 'Απόσταση r₊ + r₋ = {d} pm· λόγος ακτίνων {ratio} (κανόνας λόγου ακτίνων).', 'Distance r₊ + r₋ = {d} pm; radius ratio {ratio} (radius-ratio rule).', 'Distancia r₊ + r₋ = {d} pm; cociente de radios {ratio} (regla del cociente de radios).');

  root.BSText = TEXT;
})(typeof window !== 'undefined' ? window : globalThis);
