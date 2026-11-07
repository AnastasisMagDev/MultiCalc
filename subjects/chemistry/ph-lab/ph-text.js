/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-text.js  (v2)
   This module's own dictionary. Every entry is d(key, el, en, es), so a key can never exist in
   one language only. {name} = placeholder (must be identical in all three languages).
   Terminology — EL: ρυθμιστικό διάλυμα, ογκομέτρηση, ενεργότητα, ιοντική ισχύς, ισοζύγιο μάζας/φορτίου,
   συνθήκη πρωτονίων · ES: disolución tampón, valoración, actividad, fuerza iónica, balance de masa/carga,
   condición protónica · formulas, numbers and units are language-neutral and built in code.
   ========================================================================== */
(function (root) {
  'use strict';
  var TEXT = { el: {}, en: {}, es: {} };
  function d(k, el, en, es) { TEXT.el[k] = el; TEXT.en[k] = en; TEXT.es[k] = es; }

  /* ---------- shell ---------- */
  d('title', 'Εργαστήριο Οξέων, Βάσεων & pH', 'Acids, Bases & pH Lab', 'Laboratorio de Ácidos, Bases y pH');
  d('subtitle', 'Ακριβής υπολογισμός pH, ρυθμιστικά διαλύματα και ογκομέτρηση — με γενική και αναλυτική λύση',
    'Exact pH, buffer solutions and titration — with general and detailed solutions',
    'pH exacto, disoluciones tampón y valoración, con solución general y detallada');
  d('back', 'Πίσω', 'Back', 'Atrás');
  d('tabSol', 'Διάλυμα', 'Solution', 'Disolución');
  d('tabBuf', 'Ρυθμιστικό', 'Buffer', 'Tampón');
  d('tabTit', 'Ογκομέτρηση', 'Titration', 'Valoración');
  d('tabScale', 'Κλίμακα pH', 'pH scale', 'Escala de pH');
  d('stageUniv', 'Καθολικός δείκτης', 'Universal indicator', 'Indicador universal');
  d('stageIons', 'Ιόντα σε λογαριθμική κλίμακα', 'Ions on a log scale', 'Iones en escala logarítmica');
  d('clsStrongAcid', 'Πολύ όξινο', 'Very acidic', 'Muy ácido');
  d('clsWeakAcid', 'Όξινο', 'Acidic', 'Ácido');
  d('clsNeutral', 'Ουδέτερο', 'Neutral', 'Neutro');
  d('clsWeakBase', 'Βασικό', 'Basic', 'Básico');
  d('clsStrongBase', 'Πολύ βασικό', 'Very basic', 'Muy básico');
  d('assume', 'Θερμοκρασία 25 °C. Το pH προκύπτει από το πλήρες ισοζύγιο φορτίου, χωρίς προσεγγίσεις· στο «Ιδανικό» μοντέλο η ενεργότητα ισούται με τη συγκέντρωση, στο «Πραγματικό» εφαρμόζεται η εξίσωση Davies.',
    'Temperature 25 °C. pH comes from the full charge balance, with no approximations; the "Ideal" model sets activity equal to concentration, the "Real" model applies the Davies equation.',
    'Temperatura 25 °C. El pH sale del balance de carga completo, sin aproximaciones; el modelo «Ideal» iguala actividad y concentración, el «Real» aplica la ecuación de Davies.');
  d('invalid', 'Δώσε έναν θετικό αριθμό, π.χ. 0,1 ή 1e-3.', 'Enter a positive number, e.g. 0.1 or 1e-3.', 'Introduce un número positivo, p. ej. 0,1 o 1e-3.');
  d('modelLabel', 'Μοντέλο', 'Model', 'Modelo');
  d('modelIdeal', 'Ιδανικό', 'Ideal', 'Ideal');
  d('modelReal', 'Πραγματικό', 'Real', 'Real');
  d('modelStatusIdeal', 'Ενεργότητα = συγκέντρωση', 'Activity = concentration', 'Actividad = concentración');
  d('modelStatusReal', 'I = {i} M · γ(±1) = {g}', 'I = {i} M · γ(±1) = {g}', 'I = {i} M · γ(±1) = {g}');
  d('lvlGeneral', 'Γενική', 'General', 'General');
  d('lvlDetailed', 'Αναλυτική', 'Detailed', 'Detallada');
  d('lvlHint', 'Γενική: η σύντομη λύση. Αναλυτική: τι είναι η ουσία, ποια σωματίδια υπάρχουν, εξισώσεις, επίλυση, έλεγχος και ερμηνεία.',
    'General: the short worked solution. Detailed: what the substance is, which species exist, equations, solving, checking and interpretation.',
    'General: la solución breve. Detallada: qué es la sustancia, qué especies hay, ecuaciones, resolución, comprobación e interpretación.');

  /* ---------- section headings (numbered = reading order) ---------- */
  d('hCompound', 'Ένωση', 'Compound', 'Compuesto');
  d('hConc', 'Συγκέντρωση', 'Concentration', 'Concentración');
  d('hResults', 'Αποτελέσματα', 'Results', 'Resultados');
  d('hPlots', 'Διαγράμματα', 'Diagrams', 'Diagramas');
  d('hSteps', 'Λύση βήμα-βήμα', 'Step-by-step solution', 'Solución paso a paso');
  d('hPair', 'Ζεύγος ρυθμιστικού', 'Buffer pair', 'Par del tampón');
  d('hComposition', 'Σύσταση', 'Composition', 'Composición');
  d('hAdd', 'Προσθήκη ισχυρού οξέος ή βάσης', 'Adding a strong acid or base', 'Adición de un ácido o base fuertes');
  d('hAnalyte', 'Αναλυόμενη ουσία και συνθήκες', 'Analyte and conditions', 'Analito y condiciones');
  d('hIndicator', 'Δείκτης', 'Indicator', 'Indicador');
  d('hCurve', 'Καμπύλη ογκομέτρησης', 'Titration curve', 'Curva de valoración');
  d('hKeyPoints', 'Βασικά σημεία', 'Key points', 'Puntos clave');
  d('hPoint', 'Λύση στο τρέχον σημείο', 'Solution at the current point', 'Solución en el punto actual');
  d('hFacts', 'Ποσοτικά στοιχεία', 'Quantities', 'Datos cuantitativos');
  d('hKw', 'Ουδέτερο pH και θερμοκρασία', 'Neutral pH and temperature', 'pH neutro y temperatura');
  d('hValidation', 'Επικύρωση με πρότυπα διαλύματα', 'Validation against standard solutions', 'Validación con disoluciones patrón');
  d('hEveryday', 'Καθημερινά υγρά (τυπικές τιμές) — άγγιξε για να δεις', 'Everyday liquids (typical values) — tap to see', 'Líquidos cotidianos (valores típicos): toca para ver');
  d('hConverter', 'Γρήγορος μετατροπέας', 'Quick converter', 'Conversor rápido');

  /* ---------- solution tab ---------- */
  d('catSa', 'Ισχυρά οξέα', 'Strong acids', 'Ácidos fuertes');
  d('catWa', 'Ασθενή οξέα', 'Weak acids', 'Ácidos débiles');
  d('catSb', 'Ισχυρές βάσεις', 'Strong bases', 'Bases fuertes');
  d('catWb', 'Ασθενείς βάσεις', 'Weak bases', 'Bases débiles');
  d('catSalt', 'Άλατα', 'Salts', 'Sales');
  d('catBio', 'Βιολογικά', 'Biological', 'Biológicos');
  d('catCustom', 'Δικό μου', 'Custom', 'Personalizado');
  d('lblCompound', 'Ένωση', 'Compound', 'Compuesto');
  d('lblConc', 'Συγκέντρωση (mol/L)', 'Concentration (mol/L)', 'Concentración (mol/L)');
  d('lblCustomType', 'Είδος', 'Type', 'Tipo');
  d('optCustomAcid', 'Ασθενές οξύ', 'Weak acid', 'Ácido débil');
  d('optCustomBase', 'Ασθενής βάση', 'Weak base', 'Base débil');
  d('lblCustomMode', 'Δίνω', 'I know', 'Conozco');
  d('lblCustomValue', 'Τιμή', 'Value', 'Valor');
  d('resIonize', 'Βαθμός ιοντισμού', 'Degree of ionization', 'Grado de ionización');
  d('resHydro', 'Βαθμός υδρόλυσης', 'Degree of hydrolysis', 'Grado de hidrólisis');
  d('resI', 'Ιοντική ισχύς I', 'Ionic strength I', 'Fuerza iónica I');
  d('resGamma', 'Συντελεστής ενεργότητας γ(±1)', 'Activity coefficient γ(±1)', 'Coeficiente de actividad γ(±1)');
  d('resDelta', 'Πραγματικό − ιδανικό (ΔpH)', 'Real − ideal (ΔpH)', 'Real − ideal (ΔpH)');
  d('metaPKa', 'pKa = {p} · Ka = {k}', 'pKa = {p} · Ka = {k}', 'pKa = {p} · Ka = {k}');
  d('metaPKb', 'pKb = {p} · Kb = {k}', 'pKb = {p} · Kb = {k}', 'pKb = {p} · Kb = {k}');
  d('metaPoly', 'pKa: {list}', 'pKa: {list}', 'pKa: {list}');
  d('metaStrongAcid', 'Ιοντίζεται πλήρως', 'Ionizes completely', 'Se ioniza por completo');
  d('metaStrongBase', 'Διίσταται πλήρως', 'Dissociates completely', 'Se disocia por completo');
  d('metaNeutral', 'Δεν αντιδρά με το νερό', 'Does not react with water', 'No reacciona con el agua');
  d('speciesTitle', 'Κατανομή μορφών', 'Species distribution', 'Distribución de especies');
  d('stepsCount', '{n} βήματα', '{n} steps', '{n} pasos');
  d('warnSol', 'Πάνω από ≈ {c} M το {f} δεν διαλύεται πλήρως — το αποτέλεσμα είναι θεωρητικό.',
    'Above ≈ {c} M, {f} does not fully dissolve — the result is theoretical.',
    'Por encima de ≈ {c} M, el {f} no se disuelve por completo: el resultado es teórico.');
  d('warnConc', 'Πάνω από περίπου 1 M οι ενεργότητες αποκλίνουν σημαντικά· στο «Ιδανικό» μοντέλο το pH διαφέρει από το πραγματικό.',
    'Above about 1 M activities deviate strongly; the "Ideal" model then differs from the real pH.',
    'Por encima de ~1 M las actividades se desvían mucho; el modelo «Ideal» se aparta del pH real.');
  d('noteDilute', 'Σε πολύ αραιά διαλύματα (< 10⁻⁶ M) μετράει και ο αυτοϊονισμός του νερού — περιλαμβάνεται αυτόματα.',
    'In very dilute solutions (< 10⁻⁶ M) the autoionization of water matters too — it is included automatically.',
    'En disoluciones muy diluidas (< 10⁻⁶ M) también cuenta la autoionización del agua; se incluye automáticamente.');

  /* ---------- diagrams ---------- */
  d('pmDist', 'Κατανομή α–pH', 'Distribution α–pH', 'Distribución α–pH');
  d('pmSillen', 'Sillén log c–pH', 'Sillén log c–pH', 'Sillén log c–pH');
  d('pmPhC', 'pH–log c', 'pH–log c', 'pH–log c');
  d('pmBeta', 'Ικανότητα β–pH', 'Capacity β–pH', 'Capacidad β–pH');
  d('pmResp', 'Απόκριση pH', 'pH response', 'Respuesta del pH');
  d('pmPH', 'pH', 'pH', 'pH');
  d('pmDer', 'dpH/dV', 'dpH/dV', 'dpH/dV');
  d('pmSpecies', 'Μορφές', 'Species', 'Especies');
  d('ptDist', 'Κλάσμα κάθε μορφής σε συνάρτηση με το pH. Οι διαδοχικές καμπύλες τέμνονται στο pH = pKa (στο 50 %). Η κάθετη γραμμή δείχνει το τρέχον pH.',
    'Fraction of each form versus pH. Neighbouring curves cross at pH = pKa (at 50 %). The vertical line marks the current pH.',
    'Fracción de cada forma frente al pH. Las curvas contiguas se cruzan en pH = pKa (al 50 %). La línea vertical marca el pH actual.');
  d('ptSillen', 'Διάγραμμα Sillén: log της συγκέντρωσης κάθε μορφής (και των H₃O⁺, OH⁻) συναρτήσει του pH για την τρέχουσα συγκέντρωση. Το pH του διαλύματος είναι εκεί όπου ικανοποιείται η συνθήκη πρωτονίων.',
    'Sillén diagram: log of the concentration of every form (and of H₃O⁺, OH⁻) versus pH at the current concentration. The solution pH is where the proton condition is satisfied.',
    'Diagrama de Sillén: log de la concentración de cada forma (y de H₃O⁺, OH⁻) frente al pH a la concentración actual. El pH de la disolución es donde se cumple la condición protónica.');
  d('ptPhC', 'pH συναρτήσει της συγκέντρωσης: ακριβής λύση έναντι του τύπου του εγχειριδίου. Η απόκλιση φαίνεται στις πολύ αραιές συγκεντρώσεις (νερό) και στις μεγάλες (ενεργότητες).',
    'pH versus concentration: exact solution against the textbook formula. The gap shows at very low concentrations (water) and at high ones (activities).',
    'pH frente a la concentración: solución exacta frente a la fórmula de los libros. La diferencia aparece a concentraciones muy bajas (agua) y altas (actividades).');
  d('ptBeta', 'Ρυθμιστική ικανότητα β σε συνάρτηση με το pH στην ολική συγκέντρωση του ρυθμιστικού: κορυφή σε κάθε pKa, και οι απότομες αυξήσεις στα άκρα προέρχονται από το νερό.',
    'Buffer capacity β versus pH at the total concentration of the buffer: a peak at every pKa; the steep rises at the ends come from water.',
    'Capacidad tampón β frente al pH a la concentración total: un máximo en cada pKa; los aumentos bruscos en los extremos proceden del agua.');
  d('ptResp', 'pH του ρυθμιστικού και του καθαρού νερού καθώς προστίθεται ισχυρή βάση (+) ή οξύ (−). Το ρυθμιστικό «επιπεδώνει» την καμπύλη γύρω από το αρχικό pH.',
    'pH of the buffer and of pure water as a strong base (+) or acid (−) is added. The buffer flattens the curve around the starting pH.',
    'pH del tampón y del agua pura al añadir una base fuerte (+) o un ácido (−). El tampón aplana la curva en torno al pH inicial.');
  d('ptTit', 'Καμπύλη ογκομέτρησης pH–V. Σύρε τον δείκτη ή άγγιξε το διάγραμμα· οι κάθετες διακεκομμένες δείχνουν τα ισοδύναμα σημεία.',
    'Titration curve pH–V. Drag the marker or tap the chart; dashed verticals mark the equivalence points.',
    'Curva de valoración pH–V. Arrastra el marcador o toca el gráfico; las verticales discontinuas marcan los puntos de equivalencia.');
  d('ptDer', 'Μέτρο της πρώτης παραγώγου |dpH/dV| σε λογαριθμικό άξονα: κάθε κορυφή είναι ένα ισοδύναμο σημείο (σημείο καμπής της pH–V). Το πρόσημο φαίνεται στο tooltip: θετικό όταν το pH ανεβαίνει (οξύ + NaOH), αρνητικό όταν πέφτει (βάση + HCl).',
    'Magnitude of the first derivative |dpH/dV| on a log axis: every peak is an equivalence point (the inflection of the pH–V curve). The sign is shown in the tooltip: positive when pH rises (acid + NaOH), negative when it falls (base + HCl).',
    'Módulo de la primera derivada |dpH/dV| en eje logarítmico: cada máximo es un punto de equivalencia (inflexión de la curva pH–V). El signo se ve en el tooltip: positivo si el pH sube (ácido + NaOH), negativo si baja (base + HCl).');
  d('ptSpecies', 'Κλάσμα κάθε μορφής του αναλυόμενου κατά την ογκομέτρηση. Στο ισοδύναμο σημείο κυριαρχεί η επόμενη μορφή· στο ημι-ισοδύναμο τέμνονται οι δύο γειτονικές.',
    'Fraction of each form of the analyte during the titration. At an equivalence point the next form dominates; at a half-equivalence point the two neighbours cross.',
    'Fracción de cada forma del analito durante la valoración. En el punto de equivalencia domina la forma siguiente; en el de semiequivalencia se cruzan las dos vecinas.');
  d('axLogC', 'log c', 'log c', 'log c');
  d('axAlpha', 'α', 'α', 'α');
  d('axBeta', 'β (mol/(L·pH))', 'β (mol/(L·pH))', 'β (mol/(L·pH))');
  d('axAdded', 'mmol (+ βάση / − οξύ)', 'mmol (+ base / − acid)', 'mmol (+ base / − ácido)');
  d('axDer', 'log₁₀ dpH/dV', 'log₁₀ dpH/dV', 'log₁₀ dpH/dV');
  d('axPH', 'pH', 'pH', 'pH');
  d('axV', 'Όγκος {t} (mL)', '{t} volume (mL)', 'Volumen de {t} (mL)');
  d('lgExact', 'Ακριβής λύση', 'Exact solution', 'Solución exacta');
  d('lgNaive', 'Τύπος εγχειριδίου', 'Textbook formula', 'Fórmula de los libros');
  d('lgBuffer', 'Ρυθμιστικό', 'Buffer', 'Tampón');
  d('lgWater', 'Καθαρό νερό', 'Pure water', 'Agua pura');
  d('lgNow', 'Τρέχον', 'Current', 'Actual');
  d('lgH', 'H₃O⁺', 'H₃O⁺', 'H₃O⁺');
  d('lgOH', 'OH⁻', 'OH⁻', 'OH⁻');
  d('lgTotal', 'Ολικό', 'Total', 'Total');
  d('lgPoint', 'Σημείο', 'Point', 'Punto');
  d('eqShort', 'ΙΣ', 'EP', 'PE');
  d('halfShort', '½ΙΣ', '½EP', '½PE');

  /* ---------- buffer tab ---------- */
  d('modeFind', 'Υπολογισμός pH', 'Find pH', 'Calcular pH');
  d('modeDesign', 'Σχεδίαση ρυθμιστικού', 'Design a buffer', 'Diseñar un tampón');
  d('lblPair', 'Ζεύγος ρυθμιστικού', 'Buffer pair', 'Par del tampón');
  d('lblAcidForm', 'Όξινη μορφή (mol/L)', 'Acid form (mol/L)', 'Forma ácida (mol/L)');
  d('lblBaseForm', 'Βασική μορφή (mol/L)', 'Base form (mol/L)', 'Forma básica (mol/L)');
  d('lblTarget', 'Στόχος pH', 'Target pH', 'pH objetivo');
  d('lblTotal', 'Ολική συγκέντρωση (mol/L)', 'Total concentration (mol/L)', 'Concentración total (mol/L)');
  d('lblVolume', 'Όγκος (mL)', 'Volume (mL)', 'Volumen (mL)');
  d('resExact', 'pH (ακριβές)', 'pH (exact)', 'pH (exacto)');
  d('resHH', 'pH κατά Henderson–Hasselbalch', 'pH by Henderson–Hasselbalch', 'pH por Henderson–Hasselbalch');
  d('resRatio', 'Λόγος βάση/οξύ', 'Base/acid ratio', 'Relación base/ácido');
  d('resBeta', 'Ρυθμιστική ικανότητα β', 'Buffer capacity β', 'Capacidad tampón β');
  d('bufEffective', 'Αποτελεσματικό ρυθμιστικό (pKa ± 1)', 'Effective buffer (pKa ± 1)', 'Tampón efectivo (pKa ± 1)');
  d('bufWeak', 'Αδύναμο ρυθμιστικό — εκτός pKa ± 1', 'Weak buffer — outside pKa ± 1', 'Tampón débil: fuera de pKa ± 1');
  d('bufRecipe', 'Συνταγή για {v} mL', 'Recipe for {v} mL', 'Receta para {v} mL');
  d('bufUnreach', 'Αυτό το pH δεν επιτυγχάνεται με αυτό το ζεύγος και αυτή τη συγκέντρωση (εύρος {a} – {b}).',
    'This pH cannot be reached with this pair and concentration (range {a} – {b}).',
    'Este pH no se alcanza con este par y esta concentración (rango {a} – {b}).');
  d('addAcid', 'Οξύ (HCl)', 'Acid (HCl)', 'Ácido (HCl)');
  d('addBase', 'Βάση (NaOH)', 'Base (NaOH)', 'Base (NaOH)');
  d('lblAmount', 'Ποσότητα (mmol)', 'Amount (mmol)', 'Cantidad (mmol)');
  d('lblBefore', 'Πριν', 'Before', 'Antes');
  d('lblAfter', 'Μετά', 'After', 'Después');
  d('lblDelta', 'Μεταβολή pH', 'Change in pH', 'Cambio de pH');
  d('lblWater', 'Ίδια προσθήκη σε καθαρό νερό', 'Same addition to pure water', 'La misma adición en agua pura');
  d('noteVol', 'Η μεταβολή όγκου αγνοείται.', 'Volume change is neglected.', 'Se desprecia el cambio de volumen.');
  d('bufOver', 'Η προσθήκη ξεπερνά τη ρυθμιστική ικανότητα — το ρυθμιστικό εξαντλήθηκε.', 'The addition exceeds the buffer capacity — the buffer is used up.', 'La adición supera la capacidad del tampón: se ha agotado.');
  d('grpAcids', 'Οξέα και συζυγείς βάσεις', 'Acids and conjugate bases', 'Ácidos y bases conjugadas');
  d('grpBases', 'Βάσεις και συζυγή οξέα', 'Bases and conjugate acids', 'Bases y ácidos conjugados');

  /* ---------- titration tab ---------- */
  d('lblAnalyte', 'Αναλυόμενη ουσία', 'Analyte', 'Analito');
  d('lblConcA', 'Συγκέντρωση (mol/L)', 'Concentration (mol/L)', 'Concentración (mol/L)');
  d('lblVolA', 'Όγκος (mL)', 'Volume (mL)', 'Volumen (mL)');
  d('lblConcT', 'Συγκέντρωση {t} (mol/L)', '{t} concentration (mol/L)', 'Concentración de {t} (mol/L)');
  d('lblIndicator', 'Δείκτης', 'Indicator', 'Indicador');
  d('lblTitrant', 'Πρότυπο διάλυμα', 'Titrant', 'Valorante');
  d('indAuto', 'Αυτόματη επιλογή', 'Auto-select', 'Selección automática');
  d('indNone', 'Χωρίς δείκτη', 'No indicator', 'Sin indicador');
  d('indUniv', 'Καθολικός δείκτης', 'Universal indicator', 'Indicador universal');
  d('tAdded', 'Όγκος {t} που προστέθηκε', '{t} added', '{t} añadido');
  d('tPlay', 'Αυτόματη ογκομέτρηση', 'Auto-titrate', 'Valoración automática');
  d('tPause', 'Παύση', 'Pause', 'Pausa');
  d('tRestart', 'Από την αρχή', 'Restart', 'Reiniciar');
  d('tEqN', 'Ισοδύναμο σημείο {k}', 'Equivalence point {k}', 'Punto de equivalencia {k}');
  d('tEqLine', 'V = {v} mL · pH = {p}', 'V = {v} mL · pH = {p}', 'V = {v} mL · pH = {p}');
  d('tJump', 'pH στο ±0,1 % του ισοδύναμου: {a} – {b}', 'pH within ±0.1 % of equivalence: {a} – {b}', 'pH a ±0,1 % de la equivalencia: {a} – {b}');
  d('tSuit', 'κατάλληλοι δείκτες: {list}', 'suitable indicators: {list}', 'indicadores adecuados: {list}');
  d('tNoSuit', 'κανένας δείκτης δεν αλλάζει καθαρά μέσα σε ±0,1 % — προτίμησε πεχάμετρο', 'no indicator changes sharply within ±0.1 % — prefer a pH meter', 'ningún indicador cambia con nitidez dentro de ±0,1 %: es preferible un pH-metro');
  d('tHalf', 'Ημι-ισοδύναμο σημείο {k}: pH = {p} (pKa = {pk})', 'Half-equivalence point {k}: pH = {p} (pKa = {pk})', 'Punto de semiequivalencia {k}: pH = {p} (pKa = {pk})');
  d('tPct', '{x} % του ισοδύναμου', '{x} % of equivalence', '{x} % de la equivalencia');
  d('tHint', 'Σύρε τον δρομέα ή άγγιξε το διάγραμμα.', 'Drag the slider or tap the chart.', 'Arrastra el deslizador o toca el gráfico.');
  d('grpAcidsT', 'Οξέα — με NaOH', 'Acids — with NaOH', 'Ácidos — con NaOH');
  d('grpBasesT', 'Βάσεις — με HCl', 'Bases — with HCl', 'Bases — con HCl');
  d('grpSaltsT', 'Άλατα και αμφιπρωτικά — με NaOH ή HCl', 'Salts and amphiprotic species — with NaOH or HCl', 'Sales y especies anfipróticas — con NaOH o HCl');
  d('dirAcid', 'Με NaOH', 'With NaOH', 'Con NaOH');
  d('dirBase', 'Με HCl', 'With HCl', 'Con HCl');

  /* ---------- pH scale tab ---------- */
  d('lblPHslider', 'pH του διαλύματος', 'Solution pH', 'pH de la disolución');
  d('sInd', 'Δείκτες στο pH {p}', 'Indicators at pH {p}', 'Indicadores a pH {p}');
  d('sConvNote', 'Στους 25 °C: pH + pOH = 14.', 'At 25 °C: pH + pOH = 14.', 'A 25 °C: pH + pOH = 14.');
  d('factH', 'Συγκέντρωση H₃O⁺', 'H₃O⁺ concentration', 'Concentración de H₃O⁺');
  d('factOH', 'Συγκέντρωση OH⁻', 'OH⁻ concentration', 'Concentración de OH⁻');
  d('factIons', 'Ιόντα H₃O⁺ ανά λίτρο', 'H₃O⁺ ions per litre', 'Iones H₃O⁺ por litro');
  d('factRelAcid', 'φορές πιο όξινο από το ουδέτερο', 'times more acidic than neutral', 'veces más ácido que el neutro');
  d('factRelBase', 'φορές πιο βασικό από το ουδέτερο', 'times more basic than neutral', 'veces más básico que el neutro');
  d('colTemp', 'Θερμοκρασία (°C)', 'Temperature (°C)', 'Temperatura (°C)');
  d('colPKw', 'pKw', 'pKw', 'pKw');
  d('colNeutral', 'Ουδέτερο pH', 'Neutral pH', 'pH neutro');
  d('kwNote', 'Το ουδέτερο pH είναι pKw/2. Στους 37 °C είναι 6,81, άρα το αίμα (7,4) είναι ελαφρώς βασικό. Η εφαρμογή χρησιμοποιεί Kw = 1,0×10⁻¹⁴ (25 °C).',
    'Neutral pH is pKw/2. At 37 °C it is 6.81, so blood (7.4) is slightly basic. The app uses Kw = 1.0×10⁻¹⁴ (25 °C).',
    'El pH neutro es pKw/2. A 37 °C vale 6,81, así que la sangre (7,4) es ligeramente básica. La aplicación usa Kw = 1,0×10⁻¹⁴ (25 °C).');
  d('colStd', 'Πρότυπο διάλυμα', 'Standard solution', 'Disolución patrón');
  d('colCert', 'Πιστοποιημένο pH', 'Certified pH', 'pH certificado');
  d('colIdealS', 'Ιδανικό', 'Ideal', 'Ideal');
  d('colRealS', 'Πραγματικό', 'Real', 'Real');
  d('colDevS', 'Απόκλιση', 'Deviation', 'Desviación');
  d('stdKHP', 'Όξινο φθαλικό κάλιο 0,05 M', 'Potassium hydrogen phthalate 0.05 M', 'Ftalato ácido de potasio 0,05 M');
  d('stdPhos', 'Φωσφορικά 0,025 M + 0,025 M', 'Phosphate 0.025 M + 0.025 M', 'Fosfato 0,025 M + 0,025 M');
  d('stdCarb', 'Ανθρακικά 0,025 M + 0,025 M', 'Carbonate 0.025 M + 0.025 M', 'Carbonato 0,025 M + 0,025 M');
  d('valNote', 'Τα πιστοποιημένα pH (πρότυπα NIST/IUPAC, 25 °C) είναι τιμές αναφοράς· το μοντέλο Davies πλησιάζει στο δεύτερο δεκαδικό, ενώ το ιδανικό αποκλίνει πολύ περισσότερο.',
    'Certified pH values (NIST/IUPAC standards, 25 °C) are the reference; the Davies model gets close to the second decimal, while the ideal model is far off.',
    'Los pH certificados (patrones NIST/IUPAC, 25 °C) son la referencia; el modelo de Davies se acerca al segundo decimal, mientras que el ideal se desvía mucho más.');

  /* ---------- tutor: shared labels ---------- */
  d('secIdent', 'Α. Τι διαλύεται και τι συμβαίνει', 'A. What is dissolved and what happens', 'A. Qué se disuelve y qué ocurre');
  d('secConst', 'Β. Σταθερές', 'B. Constants', 'B. Constantes');
  d('secSystem', 'Γ. Το σύστημα των εξισώσεων', 'C. The system of equations', 'C. El sistema de ecuaciones');
  d('secSolve', 'Δ. Επίλυση', 'D. Solving', 'D. Resolución');
  d('secResult', 'Ε. Αποτέλεσμα', 'E. Result', 'E. Resultado');
  d('secVerify', 'ΣΤ. Επαλήθευση', 'F. Verification', 'F. Verificación');
  d('secInterpret', 'Ζ. Ερμηνεία', 'G. Interpretation', 'G. Interpretación');
  d('secReal', 'Η. Πραγματικό διάλυμα (ενεργότητες)', 'H. Real solution (activities)', 'H. Disolución real (actividades)');
  d('secBufTheory', 'Α. Θεωρία του ρυθμιστικού', 'A. Buffer theory', 'A. Teoría del tampón');
  d('secBufReal', 'Β. Πραγματικό διάλυμα', 'B. Real solution', 'B. Disolución real');
  d('secTitPoint', 'Α. Το σημείο της καμπύλης', 'A. The point on the curve', 'A. El punto de la curva');
  d('secTitVerify', 'Β. Επαλήθευση και πραγματικό διάλυμα', 'B. Verification and real solution', 'B. Verificación y disolución real');
  d('colMethod', 'Μέθοδος', 'Method', 'Método');
  d('colFormula', 'Τύπος', 'Formula', 'Fórmula');
  d('colSpecies', 'Σωματίδιο', 'Species', 'Especie');
  d('colConc', 'Συγκέντρωση (M)', 'Concentration (M)', 'Concentración (M)');
  d('colFrac', 'Κλάσμα', 'Fraction', 'Fracción');
  d('colCheck', 'Έλεγχος', 'Check', 'Comprobación');
  d('colObsTh', 'Υπολογισμένο έναντι θεωρητικού', 'Computed vs theoretical', 'Calculado frente a teórico');
  d('colRel', 'Σχετικό σφάλμα', 'Relative error', 'Error relativo');
  d('iceI', 'Αρχ.', 'Initial', 'Inicial');
  d('iceC', 'Μεταβ.', 'Change', 'Cambio');
  d('iceE', 'Ισορρ.', 'Equil.', 'Equil.');
  d('iceF', 'Τελικά', 'Final', 'Final');
  d('lblAbsent', 'Απουσιάζει', 'Absent', 'Ausente');
  d('lblAcidSide', 'ως οξύ', 'as an acid', 'como ácido');
  d('lblBaseSide', 'ως βάση', 'as a base', 'como base');
  d('lblAnalyteS', 'αναλυόμενο', 'analyte', 'analito');
  d('lblBaseAdded', 'βάσης', 'base', 'base');
  d('lblBetaMax', 'β μέγιστο', 'β maximum', 'β máxima');
  d('lblBuffer', 'ρυθμιστικό', 'buffer', 'tampón');
  d('lblCharge', 'Ισοζύγιο φορτίου', 'Charge balance', 'Balance de carga');
  d('lblChargeSum', 'Σύνολο θετικών έναντι αρνητικών φορτίων', 'Total positive vs negative charge', 'Carga positiva total frente a negativa');
  d('lblConcInVol', 'Συγκέντρωση στον τελικό όγκο', 'Concentration in the final volume', 'Concentración en el volumen final');
  d('lblConjOf', 'συζυγής βάση του', 'conjugate base of', 'base conjugada del');
  d('lblConjPair', 'Συζυγές ζεύγος', 'Conjugate pair', 'Par conjugado');
  d('lblConsumed', 'Αντέδρασαν', 'Reacted', 'Reaccionaron');
  d('lblCount', 'Πλήθος', 'Count', 'Número');
  d('lblDegree', 'Βαθμός', 'Degree', 'Grado');
  d('lblDilution', 'Αραίωση', 'Dilution', 'Dilución');
  d('lblDominant', 'Κυρίαρχη μορφή', 'Dominant form', 'Forma dominante');
  d('lblEquivalents', 'Ισοδύναμα που προστέθηκαν', 'Equivalents added', 'Equivalentes añadidos');
  d('lblFromPBE', 'από τη συνθήκη πρωτονίων', 'from the proton condition', 'de la condición protónica');
  d('lblIdeal', 'ιδανικό', 'ideal', 'ideal');
  d('lblIgnore2', 'αγνοείται το 2ο στάδιο', 'second stage ignored', 'se ignora la 2.ª etapa');
  d('lblInH', 'ως προς h', 'in h', 'en h');
  d('lblIonsPerL', 'Αριθμός ιόντων', 'Number of ions', 'Número de iones');
  d('lblMass', 'Ισοζύγιο μάζας', 'Mass balance', 'Balance de masa');
  d('lblModel', 'Μοντέλο', 'Model', 'Modelo');
  d('lblN', 'n', 'n', 'n');
  d('lblNoK', 'Η αντίδραση είναι πλήρης: δεν υπάρχει σταθερά ισορροπίας.', 'The reaction goes to completion: there is no equilibrium constant.', 'La reacción es completa: no hay constante de equilibrio.');
  d('lblOnlySpecies', 'Μόνη μορφή', 'Only form', 'Única forma');
  d('lblPresent', 'Παρόντα σωματίδια', 'Species present', 'Especies presentes');
  d('lblProtonsLost', 'j = πρωτόνια που έχουν χαθεί', 'j = protons lost', 'j = protones perdidos');
  d('lblProtonsTransferred', 'Πρωτόνια που μεταφέρθηκαν ανά μόριο', 'Protons transferred per molecule', 'Protones transferidos por molécula');
  d('lblReal', 'πραγματικό', 'real', 'real');
  d('lblRegion', 'Περιοχή', 'Region', 'Región');
  d('lblSeeSolution', 'Υπολογισμός όπως στην καρτέλα «Διάλυμα».', 'Calculated as on the "Solution" tab.', 'Se calcula como en la pestaña «Disolución».');
  d('lblSpec', 'Ισοζύγιο θεατή', 'Spectator balance', 'Balance del espectador');
  d('lblSpecAn', 'ανιόν-θεατής', 'spectator anion', 'anión espectador');
  d('lblSpecCat', 'κατιόν-θεατής', 'spectator cation', 'catión espectador');
  d('lblStoich', 'Στοιχειομετρία (mmol)', 'Stoichiometry (mmol)', 'Estequiometría (mmol)');
  d('lblStrong', 'ισχυρό', 'strong', 'fuerte');
  d('lblThermo', 'θερμοδυναμικό', 'thermodynamic', 'termodinámico');
  d('lblUndiss', 'δεν παραμένει αδιάστατο', 'does not survive undissociated', 'no queda sin disociar');
  d('lblWaterShort', 'καθαρό νερό', 'pure water', 'agua pura');
  d('lblWeak', 'ασθενές', 'weak', 'débil');
  d('mExact', 'Ακριβής λύση', 'Exact solution', 'Solución exacta');
  d('mFull', 'Πλήρες ισοζύγιο φορτίου', 'Full charge balance', 'Balance de carga completo');
  d('mCubic', 'Κυβική εξίσωση, χωρίς παραδοχές', 'Cubic equation, no assumptions', 'Ecuación cúbica, sin suposiciones');
  d('mQuad', 'Χωρίς το νερό (δευτεροβάθμια)', 'Water neglected (quadratic)', 'Sin el agua (cuadrática)');
  d('mSqrt', 'Και x ≪ C (τετραγωνική ρίζα)', 'And x ≪ C (square root)', 'Y x ≪ C (raíz cuadrada)');
  d('mSimple', 'Απλοποίηση του εγχειριδίου', 'Textbook shortcut', 'Atajo de los libros');
  d('mTwoStage', 'Δύο στάδια', 'Two stages', 'Dos etapas');
  d('mStage1', 'Μόνο το 1ο στάδιο', 'First stage only', 'Solo la 1.ª etapa');
  d('mAmphFull', 'Τύπος αμφιπρωτικού με Kw', 'Amphiprotic formula with Kw', 'Fórmula anfiprótica con Kw');
  d('mAmphSimple', 'Απλός τύπος ½(pK₁ + pK₂)', 'Simple formula ½(pK₁ + pK₂)', 'Fórmula simple ½(pK₁ + pK₂)');
  d('mHH', 'Henderson–Hasselbalch', 'Henderson–Hasselbalch', 'Henderson–Hasselbalch');
  d('mHHcorr', 'HH με διόρθωση h', 'HH with h correction', 'HH con corrección de h');
  d('mStoich', 'Στοιχειομετρία + HH', 'Stoichiometry + HH', 'Estequiometría + HH');
  d('mLinear', 'Γραμμική εκτίμηση Δn/(V·β)', 'Linear estimate Δn/(V·β)', 'Estimación lineal Δn/(V·β)');
  d('regInitial', 'αρχικό διάλυμα', 'initial solution', 'disolución inicial');
  d('regEquiv', 'ισοδύναμο σημείο', 'equivalence point', 'punto de equivalencia');
  d('regExcess', 'περίσσεια πρότυπου διαλύματος', 'excess titrant', 'exceso de valorante');
  d('regBuffer', 'ρυθμιστική περιοχή', 'buffer region', 'región tampón');
  d('regBeforeEq', 'πριν το ισοδύναμο (περίσσεια αναλυόμενου)', 'before equivalence (excess analyte)', 'antes de la equivalencia (exceso de analito)');

  /* ---------- tutor: general solution (short) ---------- */
  d('stSaDiss', 'Πλήρης ιοντισμός', 'Complete ionization', 'Ionización completa');
  d('stSbDiss', 'Πλήρης διάσταση', 'Complete dissociation', 'Disociación completa');
  d('stConcH', 'Συγκέντρωση H₃O⁺', 'Concentration of H₃O⁺', 'Concentración de H₃O⁺');
  d('stConcOH', 'Συγκέντρωση OH⁻', 'Concentration of OH⁻', 'Concentración de OH⁻');
  d('stPH', 'Υπολογισμός pH', 'Calculate pH', 'Calcular el pH');
  d('stPHbase', 'pOH και pH', 'pOH and pH', 'pOH y pH');
  d('stWater', 'Διόρθωση για το νερό', 'Correction for water', 'Corrección por el agua');
  d('stEq', 'Ισορροπία και σταθερά', 'Equilibrium and constant', 'Equilibrio y constante');
  d('stIce', 'Πίνακας αρχικά – μεταβολή – ισορροπία', 'ICE table', 'Tabla ICE');
  d('stExpr', 'Έκφραση της σταθεράς', 'Equilibrium expression', 'Expresión de la constante');
  d('stApprox', 'Προσέγγιση x ≪ C και έλεγχος', 'Approximation x ≪ C and check', 'Aproximación x ≪ C y comprobación');
  d('stQuad', 'Ακριβής λύση (δευτεροβάθμια)', 'Exact solution (quadratic)', 'Solución exacta (cuadrática)');
  d('stExact', 'Έλεγχος με πλήρες ισοζύγιο φορτίου', 'Check with the full charge balance', 'Comprobación con el balance de carga completo');
  d('stStage1', 'Πρώτο στάδιο', 'First stage', 'Primera etapa');
  d('stStage2', 'Έλεγχος δεύτερου σταδίου', 'Check the second stage', 'Comprobar la segunda etapa');
  d('stSaltIons', 'Ιόντα του άλατος', 'Ions of the salt', 'Iones de la sal');
  d('stSaltBehave', 'Ποιο ιόν αντιδρά με το νερό;', 'Which ion reacts with water?', '¿Qué ion reacciona con el agua?');
  d('stHydrolysis', 'Υδρόλυση', 'Hydrolysis', 'Hidrólisis');
  d('stAmph', 'Αμφιπρωτικό ιόν', 'Amphiprotic ion', 'Ion anfiprótico');
  d('stNeutral', 'Ουδέτερο άλας', 'Neutral salt', 'Sal neutra');
  d('stFirstH', 'Πρώτο H⁺ — πλήρης ιοντισμός', 'First H⁺ — complete ionization', 'Primer H⁺: ionización completa');
  d('stSecondH', 'Δεύτερο H⁺ — ασθενές', 'Second H⁺ — weak', 'Segundo H⁺: débil');
  d('stKconv', 'Μετατροπή Ka ↔ Kb', 'Convert Ka ↔ Kb', 'Convertir Ka ↔ Kb');
  d('stRealResult', 'Πραγματικό έναντι ιδανικού pH', 'Real versus ideal pH', 'pH real frente a ideal');
  d('nApproxOk', 'x/C = {r} % < 5 % — η προσέγγιση ισχύει.', 'x/C = {r} % < 5 % — the approximation holds.', 'x/C = {r} % < 5 %: la aproximación es válida.');
  d('nApproxBad', 'x/C = {r} % ≥ 5 % — η προσέγγιση δεν ισχύει· χρησιμοποίησε την ακριβή (δευτεροβάθμια) λύση.', 'x/C = {r} % ≥ 5 % — the approximation fails; use the exact (quadratic) solution.', 'x/C = {r} % ≥ 5 %: la aproximación no es válida; usa la solución exacta (cuadrática).');
  d('nExactSame', 'Το πλήρες ισοζύγιο φορτίου δίνει pH = {p} — επιβεβαιώνει το αποτέλεσμα.', 'The full charge balance gives pH = {p} — it confirms the result.', 'El balance de carga completo da pH = {p}: confirma el resultado.');
  d('nExactDiff', 'Το πλήρες ισοζύγιο φορτίου (νερό και όλες οι μορφές) δίνει pH = {p}, διαφορά {d} από τη λύση με x. Η εφαρμογή δείχνει αυτήν την τιμή.', 'The full charge balance (water and all species) gives pH = {p}, {d} away from the x-method. The app shows this value.', 'El balance de carga completo (agua y todas las especies) da pH = {p}, a {d} del método con x. La aplicación muestra este valor.');
  d('nWaterDil', 'Σε τόσο αραιό διάλυμα το νερό προσφέρει ιόντα της ίδιας τάξης (10⁻⁷ M). Χωρίς τη διόρθωση θα έβγαινε λάθος τιμή: {bad}.', 'In such a dilute solution water contributes ions of the same order (10⁻⁷ M). Without the correction the value would be wrong: {bad}.', 'En una disolución tan diluida el agua aporta iones del mismo orden (10⁻⁷ M). Sin la corrección saldría un valor erróneo: {bad}.');
  d('nStageDom', 'Ka₁/Ka₂ = {r} ≥ 10³ — το πρώτο στάδιο κυριαρχεί.', 'Ka₁/Ka₂ = {r} ≥ 10³ — the first stage dominates.', 'Ka₁/Ka₂ = {r} ≥ 10³: la primera etapa domina.');
  d('nStageOverlap', 'Ka₁/Ka₂ = {r} < 10³ — τα στάδια επικαλύπτονται· η μέθοδος ενός σταδίου είναι μόνο προσέγγιση.', 'Ka₁/Ka₂ = {r} < 10³ — the stages overlap; the one-stage method is only an approximation.', 'Ka₁/Ka₂ = {r} < 10³: las etapas se solapan; el método de una etapa es solo una aproximación.');
  d('nStage2Small', 'Το δεύτερο στάδιο προσθέτει μόλις ≈ {y} M H₃O⁺ — αμελητέο.', 'The second stage adds only ≈ {y} M H₃O⁺ — negligible.', 'La segunda etapa aporta solo ≈ {y} M de H₃O⁺: despreciable.');
  d('nStage2Big', 'Το δεύτερο στάδιο προσθέτει ≈ {y} M H₃O⁺ — δεν είναι αμελητέο.', 'The second stage adds ≈ {y} M H₃O⁺ — not negligible.', 'La segunda etapa aporta ≈ {y} M de H₃O⁺: no es despreciable.');
  d('nSpectCat', 'Το κατιόν προέρχεται από ισχυρή βάση — θεατής, δεν αντιδρά με το νερό.', 'The cation comes from a strong base — a spectator, it does not react with water.', 'El catión procede de una base fuerte: es un espectador y no reacciona con el agua.');
  d('nSpectAn', 'Το ανιόν προέρχεται από ισχυρό οξύ — θεατής, δεν αντιδρά με το νερό.', 'The anion comes from a strong acid — a spectator, it does not react with water.', 'El anión procede de un ácido fuerte: es un espectador y no reacciona con el agua.');
  d('nIonAcid', 'Το {ion} είναι το συζυγές οξύ μιας ασθενούς βάσης — δρα ως οξύ.', '{ion} is the conjugate acid of a weak base — it acts as an acid.', 'El {ion} es el ácido conjugado de una base débil: actúa como ácido.');
  d('nIonBase', 'Το {ion} είναι η συζυγής βάση ενός ασθενούς οξέος — δρα ως βάση.', '{ion} is the conjugate base of a weak acid — it acts as a base.', 'El {ion} es la base conjugada de un ácido débil: actúa como base.');
  d('nIonAmph', 'Το {ion} μπορεί και να δώσει και να πάρει H⁺ (αμφιπρωτικό).', '{ion} can both donate and accept H⁺ (amphiprotic).', 'El {ion} puede ceder y aceptar H⁺ (anfiprótico).');
  d('nNeutralSalt', 'Κανένα ιόν δεν αντιδρά με το νερό: το pH είναι 7,00 (στους 25 °C).', 'Neither ion reacts with water: pH is 7.00 (at 25 °C).', 'Ningún ion reacciona con el agua: el pH es 7,00 (a 25 °C).');
  d('nAmphFormula', 'Για αμφιπρωτικό ιόν ισχύει pH ≈ ½(pKa₁ + pKa₂) — δεν εξαρτάται από τη συγκέντρωση.', 'For an amphiprotic ion pH ≈ ½(pKa₁ + pKa₂) — it does not depend on concentration.', 'Para un ion anfiprótico, pH ≈ ½(pKa₁ + pKa₂); no depende de la concentración.');
  d('nKconv', 'Για ζεύγος οξέος – συζυγούς βάσης ισχύει Ka · Kb = Kw = 10⁻¹⁴.', 'For an acid–conjugate base pair, Ka · Kb = Kw = 10⁻¹⁴.', 'Para un par ácido–base conjugada, Ka · Kb = Kw = 10⁻¹⁴.');

  /* ---------- tutor: detailed solution ---------- */
  d('stIdent', 'Ταυτοποίηση της ουσίας', 'Identifying the substance', 'Identificación de la sustancia');
  d('stSpecies', 'Ποια σωματίδια υπάρχουν', 'Which species are present', 'Qué especies hay');
  d('stReactions', 'Αντιδράσεις με το νερό', 'Reactions with water', 'Reacciones con el agua');
  d('stConsts', 'Σταθερές ισορροπίας', 'Equilibrium constants', 'Constantes de equilibrio');
  d('stUnknowns', 'Άγνωστοι', 'Unknowns', 'Incógnitas');
  d('stEquations', 'Εξισώσεις του συστήματος', 'Equations of the system', 'Ecuaciones del sistema');
  d('stPBE', 'Συνθήκη πρωτονίων (PBE)', 'Proton condition (PBE)', 'Condición protónica (PBE)');
  d('stCombine', 'Συνδυασμός σε μία εξίσωση', 'Combining into one equation', 'Combinación en una sola ecuación');
  d('stSimplify', 'Απλοποιήσεις και πότε ισχύουν', 'Simplifications and when they hold', 'Simplificaciones y cuándo valen');
  d('stSolveNum', 'Αριθμητική επίλυση', 'Numerical solution', 'Resolución numérica');
  d('stFractions', 'Κλάσματα κατανομής', 'Distribution fractions', 'Fracciones de distribución');
  d('stResultAll', 'Αποτέλεσμα: όλα τα σωματίδια', 'Result: every species', 'Resultado: todas las especies');
  d('stVerify', 'Επαλήθευση με αντικατάσταση', 'Verification by substitution', 'Verificación por sustitución');
  d('stMeaning', 'Τι σημαίνει το αποτέλεσμα', 'What the result means', 'Qué significa el resultado');
  d('stDilute', 'Επίδραση της αραίωσης και της συγκέντρωσης', 'Effect of dilution and concentration', 'Efecto de la dilución y la concentración');
  d('stRealIons', 'Ιοντική ισχύς', 'Ionic strength', 'Fuerza iónica');
  d('stGamma', 'Συντελεστές ενεργότητας (Davies)', 'Activity coefficients (Davies)', 'Coeficientes de actividad (Davies)');
  d('stCondK', 'Σταθερές διορθωμένες για την ενεργότητα', 'Constants corrected for activity', 'Constantes corregidas por la actividad');
  d('nLevel', 'Στο νερό κάθε οξύ ισχυρότερο από το H₃O⁺ ιοντίζεται πλήρως και φαίνεται εξίσου ισχυρό (επίπεδο ισχύος του νερού): το ισχυρότερο οξύ που υπάρχει στο νερό είναι το H₃O⁺.',
    'In water every acid stronger than H₃O⁺ ionizes completely and looks equally strong (leveling effect): the strongest acid that exists in water is H₃O⁺.',
    'En agua todo ácido más fuerte que el H₃O⁺ se ioniza por completo y parece igual de fuerte (efecto nivelador): el ácido más fuerte que existe en agua es el H₃O⁺.');
  d('nSulfuric', 'Το πρώτο H⁺ του H₂SO₄ ιοντίζεται πλήρως· το HSO₄⁻ που προκύπτει είναι ασθενές οξύ (pKa₂ = 1,99) και ιοντίζεται μερικώς.',
    'The first H⁺ of H₂SO₄ ionizes completely; the HSO₄⁻ formed is a weak acid (pKa₂ = 1.99) and ionizes only partly.',
    'El primer H⁺ del H₂SO₄ se ioniza por completo; el HSO₄⁻ resultante es un ácido débil (pKa₂ = 1,99) y se ioniza solo en parte.');
  d('nStrongBase', 'Το ιοντικό υδροξείδιο διίσταται πλήρως στο νερό· η ισχύς του περιορίζεται μόνο από τη διαλυτότητά του.',
    'The ionic hydroxide dissociates completely in water; its strength is limited only by its solubility.',
    'El hidróxido iónico se disocia por completo en agua; su fuerza solo está limitada por su solubilidad.');
  d('nWeakAcid', 'Το pKa βρίσκεται ανάμεσα στο pKa του H₃O⁺ (−1,74) και του νερού (15,74): το οξύ ιοντίζεται μόνο μερικώς και αποκαθίσταται ισορροπία.',
    'The pKa lies between that of H₃O⁺ (−1.74) and of water (15.74): the acid ionizes only partly and an equilibrium is set up.',
    'El pKa está entre el del H₃O⁺ (−1,74) y el del agua (15,74): el ácido se ioniza solo en parte y se establece un equilibrio.');
  d('nWeakBase', 'Η βάση δέχεται πρωτόνιο από το νερό μόνο μερικώς· η ισχύς της μετριέται με το Kb = Kw/Ka του συζυγούς οξέος.',
    'The base accepts a proton from water only partly; its strength is measured by Kb = Kw/Ka of the conjugate acid.',
    'La base acepta un protón del agua solo en parte; su fuerza se mide con Kb = Kw/Ka del ácido conjugado.');
  d('nNeutralIons', 'Και τα δύο ιόντα προέρχονται από ισχυρό οξύ και ισχυρή βάση· δεν αντιδρούν με το νερό και το διάλυμα μένει ουδέτερο.',
    'Both ions come from a strong acid and a strong base; they do not react with water and the solution stays neutral.',
    'Ambos iones proceden de un ácido y una base fuertes; no reaccionan con el agua y la disolución sigue neutra.');
  d('nConstsBasis', 'Οι σταθερές αναφέρονται σε 25 °C και στο όριο μηδενικής ιοντικής ισχύος (θερμοδυναμικές σταθερές).',
    'The constants are for 25 °C and zero ionic strength (thermodynamic constants).',
    'Las constantes son a 25 °C y fuerza iónica cero (constantes termodinámicas).');
  d('nUnknowns', 'Κάθε σωματίδιο του διαλύματος είναι ένας άγνωστος· χρειαζόμαστε τόσες ανεξάρτητες εξισώσεις όσοι είναι οι άγνωστοι.',
    'Every species in the solution is an unknown; we need as many independent equations as unknowns.',
    'Cada especie de la disolución es una incógnita; necesitamos tantas ecuaciones independientes como incógnitas.');
  d('nEqCount', 'Άγνωστοι: {u} · εξισώσεις: {k} — ίσος αριθμός, άρα το σύστημα λύνεται.',
    'Unknowns: {u} · equations: {k} — equal numbers, so the system can be solved.',
    'Incógnitas: {u} · ecuaciones: {k}: números iguales, así que el sistema se puede resolver.');
  d('nPBE', 'Η συνθήκη πρωτονίων προκύπτει από το ισοζύγιο φορτίου και τα ισοζύγια μάζας: τα σωματίδια με περίσσεια πρωτονίων σε σχέση με το επίπεδο αναφοράς (το διαλυμένο σώμα και το H₂O) ισούνται με αυτά που έχουν έλλειμμα.',
    'The proton condition follows from the charge balance and the mass balances: species with an excess of protons relative to the reference level (the dissolved substance and H₂O) equal those with a deficit.',
    'La condición protónica sale del balance de carga y de los balances de masa: las especies con exceso de protones respecto al nivel de referencia (la sustancia disuelta y el H₂O) igualan a las que tienen déficit.');
  d('nCubic', 'Αντικαθιστώντας τις συγκεντρώσεις στη σταθερά ισορροπίας προκύπτει κυβική εξίσωση. Έχει μία θετική ρίζα και επιλύεται αριθμητικά, χωρίς καμία παραδοχή.',
    'Substituting the concentrations into the equilibrium constant gives a cubic equation. It has one positive root and is solved numerically, with no assumption.',
    'Al sustituir las concentraciones en la constante de equilibrio sale una ecuación cúbica. Tiene una raíz positiva y se resuelve numéricamente, sin ninguna suposición.');
  d('nNumeric', 'Η ρίζα βρίσκεται με διχοτόμηση του log h με ακρίβεια 10⁻¹² μονάδες pH — πολύ πέρα από τα σημαντικά ψηφία των pKa.',
    'The root is found by bisection on log h to 10⁻¹² pH units — far beyond the significant figures of the pKa values.',
    'La raíz se halla por bisección sobre log h con precisión de 10⁻¹² unidades de pH, mucho más allá de las cifras significativas de los pKa.');
  d('nApproxSummary', 'Οι απλοποιήσεις του εγχειριδίου ισχύουν μόνο όταν πληρούνται οι συνθήκες· ο πίνακας δείχνει πόσο αποκλίνει το καθένα από το ακριβές αποτέλεσμα.',
    'Textbook shortcuts hold only when their conditions are met; the table shows how far each one is from the exact result.',
    'Los atajos de los libros solo valen si se cumplen sus condiciones; la tabla muestra cuánto se aparta cada uno del resultado exacto.');
  d('nStrongQuad', 'Για ισχυρό οξύ ή βάση η εξίσωση είναι δευτεροβάθμια: το νερό δίνει H₃O⁺ ή OH⁻ και μετράει όταν η συγκέντρωση πλησιάζει τα 10⁻⁷ M.',
    'For a strong acid or base the equation is quadratic: water supplies H₃O⁺ or OH⁻ and matters when the concentration nears 10⁻⁷ M.',
    'Para un ácido o base fuertes la ecuación es cuadrática: el agua aporta H₃O⁺ u OH⁻ y cuenta cuando la concentración se acerca a 10⁻⁷ M.');
  d('nSulfuricSolve', 'Το πρώτο H⁺ δίνει C· το δεύτερο στάδιο προσθέτει y από μια δευτεροβάθμια με Ka₂.',
    'The first H⁺ gives C; the second stage adds y from a quadratic in Ka₂.',
    'El primer H⁺ da C; la segunda etapa añade y mediante una cuadrática en Ka₂.');
  d('nAmphDerive', 'Για αμφιπρωτικό ιόν η συνθήκη πρωτονίων συνδέει τα δύο γειτονικά είδη· με αντικατάσταση των K₁, K₂ προκύπτει κλειστός τύπος.',
    'For an amphiprotic ion the proton condition links the two neighbouring species; substituting K₁ and K₂ gives a closed formula.',
    'Para un ion anfiprótico la condición protónica une las dos especies vecinas; al sustituir K₁ y K₂ sale una fórmula cerrada.');
  d('nIsoelectric', 'Για αμινοξύ αυτό το pH είναι το ισοηλεκτρικό σημείο pI, όπου το μέσο φορτίο του μορίου είναι μηδέν.',
    'For an amino acid this pH is the isoelectric point pI, where the average charge of the molecule is zero.',
    'En un aminoácido este pH es el punto isoeléctrico pI, donde la carga media de la molécula es cero.');
  d('nFractions', 'Το κλάσμα α_j κάθε μορφής εξαρτάται μόνο από το pH και τα pKa· είναι οι καμπύλες του διαγράμματος κατανομής.',
    'The fraction α_j of every form depends only on pH and the pKa values; these are the curves of the distribution diagram.',
    'La fracción α_j de cada forma depende solo del pH y de los pKa; son las curvas del diagrama de distribución.');
  d('nPolyNumeric', 'Η συνθήκη πρωτονίων δίνει εξίσωση βαθμού n+2 ως προς h· το αριστερό μέλος αυξάνει μονότονα με το h, άρα υπάρχει μία μόνο θετική ρίζα.',
    'The proton condition gives an equation of degree n+2 in h; its left side rises monotonically with h, so there is exactly one positive root.',
    'La condición protónica da una ecuación de grado n+2 en h; su primer miembro crece de forma monótona con h, así que hay una única raíz positiva.');
  d('nVerify', 'Αντικαθιστούμε τις υπολογισμένες συγκεντρώσεις πίσω στις εξισώσεις· τα υπόλοιπα πρέπει να είναι της τάξης της αριθμητικής ακρίβειας.',
    'We substitute the computed concentrations back into the equations; the residuals must be at the level of numerical precision.',
    'Sustituimos las concentraciones calculadas en las ecuaciones; los residuos deben ser del orden de la precisión numérica.');
  d('nMeaning', 'Κάθε μονάδα pH είναι παράγοντας 10 στη συγκέντρωση H₃O⁺. Ένα λίτρο νερού έχει 3,3×10²⁵ μόρια H₂O· στο pH 7 περιέχει μόλις 6×10¹⁶ ιόντα H₃O⁺.',
    'Each pH unit is a factor of 10 in the H₃O⁺ concentration. A litre of water holds 3.3×10²⁵ H₂O molecules; at pH 7 it contains only 6×10¹⁶ H₃O⁺ ions.',
    'Cada unidad de pH es un factor 10 en la concentración de H₃O⁺. Un litro de agua tiene 3,3×10²⁵ moléculas de H₂O; a pH 7 contiene solo 6×10¹⁶ iones H₃O⁺.');
  d('nDiluteStrong', 'Ισχυρό οξύ ή βάση: κάθε αραίωση ×10 μετακινεί το pH κατά 1 μονάδα, μέχρι να παρέμβει το νερό κοντά στο pH 7.',
    'Strong acid or base: every ×10 dilution moves pH by 1 unit, until water intervenes near pH 7.',
    'Ácido o base fuertes: cada dilución ×10 mueve el pH 1 unidad, hasta que interviene el agua cerca de pH 7.');
  d('nDiluteWeak', 'Ασθενές οξύ ή βάση: κάθε αραίωση ×10 μετακινεί το pH μόνο κατά ≈ 0,5 μονάδα, γιατί ο βαθμός ιοντισμού μεγαλώνει (νόμος αραίωσης του Ostwald, α ≈ √(K/C)).',
    'Weak acid or base: every ×10 dilution moves pH by only ≈ 0.5 unit, because the degree of ionization grows (Ostwald dilution law, α ≈ √(K/C)).',
    'Ácido o base débiles: cada dilución ×10 mueve el pH solo ≈ 0,5 unidades, porque crece el grado de ionización (ley de dilución de Ostwald, α ≈ √(K/C)).');
  d('nDiluteAmph', 'Αμφιπρωτικό ιόν ή ουδέτερο άλας: το pH σχεδόν δεν εξαρτάται από τη συγκέντρωση.',
    'Amphiprotic ion or neutral salt: the pH hardly depends on concentration.',
    'Ion anfiprótico o sal neutra: el pH casi no depende de la concentración.');
  d('nIonic', 'Η ιοντική ισχύς I = ½Σc·z² μετρά το ιοντικό περιβάλλον· τα ιόντα με μεγαλύτερο φορτίο συνεισφέρουν με το τετράγωνο του φορτίου.',
    'Ionic strength I = ½Σc·z² measures the ionic environment; ions with larger charge contribute with the square of the charge.',
    'La fuerza iónica I = ½Σc·z² mide el entorno iónico; los iones con más carga contribuyen con el cuadrado de la carga.');
  d('nDavies', 'Η εξίσωση Davies δίνει τον συντελεστή ενεργότητας από την ιοντική ισχύ· ισχύει αξιόπιστα έως περίπου I = 0,5 M.',
    'The Davies equation gives the activity coefficient from the ionic strength; it is reliable up to about I = 0.5 M.',
    'La ecuación de Davies da el coeficiente de actividad a partir de la fuerza iónica; es fiable hasta I ≈ 0,5 M.');
  d('nDaviesLimit', 'Προσοχή: I > 0,5 M — η εξίσωση Davies είναι εκτός ορίου ισχύος και το αποτέλεσμα είναι μόνο ενδεικτικό.',
    'Caution: I > 0.5 M — the Davies equation is outside its range and the result is only indicative.',
    'Atención: I > 0,5 M; la ecuación de Davies está fuera de su rango y el resultado es solo orientativo.');
  d('nCondK', 'Οι σταθερές εκφράζονται σε συγκεντρώσεις (Ka′) διορθωμένες με τους συντελεστές ενεργότητας· το ίδιο και το Kw′.',
    'The constants are expressed in concentrations (Ka′) corrected with the activity coefficients; so is Kw′.',
    'Las constantes se expresan en concentraciones (Ka′) corregidas con los coeficientes de actividad; igual que Kw′.');
  d('nOperational', 'Το pH ορίζεται ως −log a(H⁺) — αυτό μετρά το ηλεκτρόδιο γυαλιού. Σε μικρή ιοντική ισχύ η διαφορά από το ιδανικό είναι μικρή, σε μεγάλη ξεπερνά τις 0,1 μονάδες.',
    'pH is defined as −log a(H⁺) — what a glass electrode reads. At low ionic strength the difference from ideal is small; at high strength it exceeds 0.1 unit.',
    'El pH se define como −log a(H⁺), lo que mide el electrodo de vidrio. Con fuerza iónica baja la diferencia con el ideal es pequeña; con fuerza alta supera 0,1 unidades.');

  /* ---------- tutor: buffer ---------- */
  d('stBufPair', 'Ζεύγος και λόγος', 'Pair and ratio', 'Par y relación');
  d('stHH', 'Εξίσωση Henderson–Hasselbalch', 'Henderson–Hasselbalch equation', 'Ecuación de Henderson–Hasselbalch');
  d('stBufAdd', 'Προσθήκη ισχυρού οξέος ή βάσης', 'Adding a strong acid or base', 'Adición de un ácido o base fuertes');
  d('stBufDerive', 'Εξαγωγή της εξίσωσης Henderson–Hasselbalch', 'Deriving Henderson–Hasselbalch', 'Deducción de Henderson–Hasselbalch');
  d('stBufAssume', 'Παραδοχή της εξίσωσης', 'Assumption behind it', 'Suposición de la ecuación');
  d('stBufExactEq', 'Διορθωμένη εξίσωση', 'Corrected equation', 'Ecuación corregida');
  d('stBufCapacity', 'Ρυθμιστική ικανότητα', 'Buffer capacity', 'Capacidad tampón');
  d('stBufRange', 'Περιοχή αποτελεσματικότητας', 'Effective range', 'Intervalo de eficacia');
  d('stBufDilute', 'Επίδραση της αραίωσης', 'Effect of dilution', 'Efecto de la dilución');
  d('stBufAddDetail', 'Στοιχειομετρία της προσθήκης', 'Stoichiometry of the addition', 'Estequiometría de la adición');
  d('nHHundef', 'Η εξίσωση Henderson–Hasselbalch χρειάζεται και τις δύο μορφές (λόγος βάσης/οξέος).', 'Henderson–Hasselbalch needs both forms (a base/acid ratio).', 'Henderson–Hasselbalch necesita ambas formas (una relación base/ácido).');
  d('nBufWhy', 'Το ρυθμιστικό δεσμεύει την προστιθέμενη ουσία με την αντίστοιχη μορφή του και αλλάζει μόνο τον λόγο [A⁻]/[HA]· το καθαρό νερό δεν έχει τίποτα να την δεσμεύσει.',
    'The buffer consumes the added reagent with its matching form and changes only the ratio [A⁻]/[HA]; pure water has nothing to absorb it.',
    'El tampón consume el reactivo añadido con su forma correspondiente y solo cambia la relación [A⁻]/[HA]; el agua pura no tiene nada que lo absorba.');
  d('nHHderive', 'Λύνουμε τη σταθερά Ka ως προς [H₃O⁺] και παίρνουμε λογάριθμο. Ο τύπος είναι ακριβής μόνο αν οι [HA] και [A⁻] ισούνται με τις αναλυτικές τους συγκεντρώσεις.',
    'We solve Ka for [H₃O⁺] and take logarithms. The formula is exact only if [HA] and [A⁻] equal their analytical concentrations.',
    'Despejamos [H₃O⁺] de Ka y tomamos logaritmos. La fórmula es exacta solo si [HA] y [A⁻] igualan sus concentraciones analíticas.');
  d('nBufAssume', 'Η παραδοχή ισχύει όταν το h είναι αμελητέο μπροστά στις συγκεντρώσεις των δύο μορφών.', 'The assumption holds when h is negligible next to the concentrations of both forms.', 'La suposición vale cuando h es despreciable frente a las concentraciones de ambas formas.');
  d('nBufCorrection', 'Η διόρθωση προσθέτει ή αφαιρεί το h − Kw/h που προέρχεται από την ισορροπία του οξέος και του νερού.', 'The correction adds or subtracts h − Kw/h, which comes from the acid and water equilibria.', 'La corrección suma o resta h − Kw/h, que viene de los equilibrios del ácido y del agua.');
  d('nBufCapacity', 'Η β είναι τα mol ισχυρής βάσης ανά λίτρο που αλλάζουν το pH κατά μία μονάδα. Γίνεται μέγιστη όταν pH = pKa και πέφτει απότομα έξω από το pKa ± 1.',
    'β is the moles of strong base per litre that shift the pH by one unit. It is maximal at pH = pKa and falls sharply outside pKa ± 1.',
    'β son los moles de base fuerte por litro que desplazan el pH una unidad. Es máxima en pH = pKa y cae bruscamente fuera de pKa ± 1.');
  d('nBufDilute', 'Η αραίωση δεν αλλάζει τον λόγο, άρα ούτε το pH κατά HH· μειώνει όμως ανάλογα την β και, σε πολύ μικρές συγκεντρώσεις, αρχίζει να μετράει το νερό.',
    'Dilution does not change the ratio, so HH pH stays; it lowers β in proportion and, at very low concentrations, water starts to matter.',
    'La dilución no cambia la relación, así que el pH de HH se mantiene; reduce β proporcionalmente y, a concentraciones muy bajas, el agua empieza a contar.');
  d('nBufAddDetail', 'Η στοιχειομετρική λύση (HH με τα νέα mmol) και η γραμμική εκτίμηση Δn/(V·β) συγκρίνονται με την ακριβή τιμή.', 'The stoichiometric solution (HH with the new mmol) and the linear estimate Δn/(V·β) are compared with the exact value.', 'La solución estequiométrica (HH con los nuevos mmol) y la estimación lineal Δn/(V·β) se comparan con el valor exacto.');
  d('lblDilutionTbl', 'Αραίωση', 'Dilution', 'Dilución');

  /* ---------- tutor: titration point ---------- */
  d('stTitPoint', 'Το τρέχον σημείο', 'The current point', 'El punto actual');
  d('stInitialPH', 'Αρχικό pH', 'Initial pH', 'pH inicial');
  d('stExcessAnalyte', 'Περίσσεια αναλυόμενου', 'Excess analyte', 'Exceso de analito');
  d('stEquivStrong', 'Ισοδύναμο σημείο (ισχυρό–ισχυρό)', 'Equivalence point (strong–strong)', 'Punto de equivalencia (fuerte–fuerte)');
  d('stEquivWeak', 'Ισοδύναμο σημείο', 'Equivalence point', 'Punto de equivalencia');
  d('stExcessTitrant', 'Περίσσεια πρότυπου διαλύματος', 'Excess titrant', 'Exceso de valorante');
  d('stBufferRegion', 'Ρυθμιστική περιοχή', 'Buffer region', 'Región tampón');
  d('stTitStoich', 'Στοιχειομετρία', 'Stoichiometry', 'Estequiometría');
  d('stTitSpecies', 'Σωματίδια στο σημείο', 'Species at this point', 'Especies en este punto');
  d('stTitGeneral', 'Συνοπτικά', 'In short', 'En resumen');
  d('stTitDilution', 'Αραίωση από την προσθήκη', 'Dilution by the addition', 'Dilución por la adición');
  d('nTitRegionExplain', 'Η καμπύλη χωρίζεται σε περιοχές: αρχικό διάλυμα, ρυθμιστική περιοχή πριν από κάθε ισοδύναμο σημείο, ισοδύναμο σημείο και περίσσεια πρότυπου διαλύματος. Σε κάθε περιοχή ισχύει άλλος τρόπος υπολογισμού.',
    'The curve splits into regions: initial solution, a buffer region before each equivalence point, the equivalence point and excess titrant. Each region has its own way of calculating.',
    'La curva se divide en regiones: disolución inicial, una región tampón antes de cada punto de equivalencia, el punto de equivalencia y el exceso de valorante. Cada región se calcula de otra manera.');
  d('nTitInitial', 'Στην αρχή δεν έχει προστεθεί τίποτα: το pH είναι αυτό του αρχικού διαλύματος (δες την καρτέλα «Διάλυμα»).', 'Nothing has been added yet: the pH is that of the starting solution (see the "Solution" tab).', 'Aún no se ha añadido nada: el pH es el de la disolución inicial (véase la pestaña «Disolución»).');
  d('nTitEquiv', 'Στο ισοδύναμο σημείο όλο το αναλυόμενο έχει μετατραπεί στη συζυγή του μορφή· το pH καθορίζεται από την αντίδρασή της με το νερό.', 'At the equivalence point all the analyte has become its conjugate form; the pH is set by that form reacting with water.', 'En el punto de equivalencia todo el analito se ha convertido en su forma conjugada; el pH lo fija su reacción con el agua.');
  d('nTitBuffer', 'Πριν από το ισοδύναμο υπάρχουν και οι δύο μορφές του ζεύγους — ρυθμιστικό διάλυμα· ισχύει η Henderson–Hasselbalch με τα mmol της στοιχειομετρίας.', 'Before equivalence both forms of the pair are present — a buffer; Henderson–Hasselbalch applies with the mmol from the stoichiometry.', 'Antes de la equivalencia están presentes ambas formas del par: un tampón; vale Henderson–Hasselbalch con los mmol de la estequiometría.');
  d('nTitExcessWeak', 'Μετά το τελευταίο ισοδύναμο το pH καθορίζεται από την περίσσεια του ισχυρού πρότυπου διαλύματος.', 'After the last equivalence point the pH is set by the excess of strong titrant.', 'Tras el último punto de equivalencia el pH lo fija el exceso de valorante fuerte.');
  d('nTitStoich', 'Η αντίδραση με το πρότυπο διάλυμα είναι πρακτικά πλήρης· τα mmol που αντέδρασαν προκύπτουν από τη στοιχειομετρία, πριν χρησιμοποιηθεί οποιαδήποτε σταθερά ισορροπίας.', 'The reaction with the titrant is practically complete; the mmol reacted follow from stoichiometry, before any equilibrium constant is used.', 'La reacción con el valorante es prácticamente completa; los mmol que reaccionan salen de la estequiometría, antes de usar ninguna constante de equilibrio.');
  d('nTitHHnote', 'Σύγκριση του τύπου HH με την ακριβή τιμή· η διαφορά οφείλεται στο h και στις δευτερεύουσες ισορροπίες.', 'HH compared with the exact value; the gap comes from h and the secondary equilibria.', 'HH frente al valor exacto; la diferencia viene de h y de los equilibrios secundarios.');
  d('nTitGeneral', 'Εφαρμόζεται ο τύπος της περιοχής στην οποία βρίσκεται το σημείο.', 'The formula of the region the point lies in is applied.', 'Se aplica la fórmula de la región en que está el punto.');
  d('nTitDilution', 'Μετά την προσθήκη, η ποσότητα ύλης μοιράζεται σε μεγαλύτερο όγκο· οι συγκεντρώσεις υπολογίζονται με V = Va + Vt.', 'After the addition the amount of substance is spread over a larger volume; concentrations use V = Va + Vt.', 'Tras la adición la cantidad de sustancia se reparte en un volumen mayor; las concentraciones usan V = Va + Vt.');
  d('nTitExactBasis', 'Η ακριβής τιμή προκύπτει από το πλήρες ισοζύγιο φορτίου με Na⁺ (ή Cl⁻) από το πρότυπο διάλυμα· δεν χρησιμοποιεί περιοχές ή προσεγγίσεις.', 'The exact value comes from the full charge balance including Na⁺ (or Cl⁻) from the titrant; it uses no regions or approximations.', 'El valor exacto sale del balance de carga completo con Na⁺ (o Cl⁻) del valorante; no usa regiones ni aproximaciones.');
  d('nTitNeutralEq', 'Ισχυρό οξύ με ισχυρή βάση: το άλας δεν υδρολύεται και το pH στο ισοδύναμο είναι 7,00.', 'Strong acid with strong base: the salt does not hydrolyse and the pH at equivalence is 7.00.', 'Ácido fuerte con base fuerte: la sal no se hidroliza y el pH en la equivalencia es 7,00.');
  d('nTitH2SO4', 'Το H₂SO₄ δίνει δύο ισοδύναμα σε ένα άλμα· το ισοδύναμο σημείο είναι στα 2·n(οξέος).', 'H₂SO₄ gives two equivalents in one jump; the equivalence point is at 2·n(acid).', 'El H₂SO₄ da dos equivalentes en un salto; el punto de equivalencia está en 2·n(ácido).');

  /* ---------- loading screen ---------- */
  d('bootTitle', 'Φόρτωση εργαστηρίου pH', 'Loading the pH lab', 'Cargando el laboratorio de pH');
  d('bootAcidic', 'Όξινο', 'Acidic', 'Ácido');
  d('bootNeutral', 'Ουδέτερο', 'Neutral', 'Neutro');
  d('bootBasic', 'Βασικό', 'Basic', 'Básico');
  d('bootChecks', 'Εσωτερικοί έλεγχοι συνέπειας: {ok} / {n} πέρασαν', 'Internal consistency checks: {ok} / {n} passed', 'Comprobaciones internas de coherencia: {ok} / {n} superadas');
  d('bootReady', 'Έτοιμο', 'Ready', 'Listo');
  d('bootFail', 'Προσοχή: {k} έλεγχοι απέτυχαν — δες την κονσόλα.', 'Warning: {k} checks failed — see the console.', 'Atención: {k} comprobaciones fallaron; mira la consola.');
  d('bootFailNames', 'Απέτυχαν: {names}', 'Failed: {names}', 'Fallaron: {names}');
  d('bootReadyWarn', 'Έτοιμο — αλλά {k} έλεγχοι απέτυχαν', 'Ready — but {k} checks failed', 'Listo, pero {k} comprobaciones fallaron');
  d('bootPerf', 'Χρόνος εκκίνησης {t} s · βαρύτερο βήμα {m} ms', 'Start-up {t} s · heaviest step {m} ms', 'Arranque {t} s · paso más pesado {m} ms');
  d('failBadge', 'Προσοχή: {k} εσωτερικοί έλεγχοι απέτυχαν στην εκκίνηση. Μην θεωρείς τα αποτελέσματα επαληθευμένα.',
    'Warning: {k} internal checks failed at start-up. Do not treat the results as verified.',
    'Atención: {k} comprobaciones internas fallaron al arrancar. No consideres verificados los resultados.');
  d('b0', 'Έλεγχος δεδομένων: ενώσεις και σταθερές', 'Checking data: compounds and constants', 'Comprobando datos: compuestos y constantes');
  d('b1', 'Έλεγχος λεξικών: ελληνικά · αγγλικά · ισπανικά', 'Checking dictionaries: Greek · English · Spanish', 'Comprobando diccionarios: griego · inglés · español');
  d('b2', 'Έλεγχος ακρίβειας: ισχυρά οξέα και βάσεις', 'Accuracy check: strong acids and bases', 'Comprobación de exactitud: ácidos y bases fuertes');
  d('b3', 'Έλεγχος ακρίβειας: ασθενή οξέα και βάσεις', 'Accuracy check: weak acids and bases', 'Comprobación de exactitud: ácidos y bases débiles');
  d('b4', 'Έλεγχος ισοζυγίων φορτίου και μάζας, όλες οι ενώσεις', 'Checking charge and mass balances, every compound', 'Comprobando balances de carga y masa, todos los compuestos');
  d('b5', 'Έλεγχος μοντέλου Davies και προτύπων διαλυμάτων', 'Checking the Davies model and standard solutions', 'Comprobando el modelo de Davies y las disoluciones patrón');
  d('b6', 'Πίνακες pH–log c: ισχυρά οξέα και βάσεις (ιδανικό)', 'pH–log c tables: strong acids and bases (ideal)', 'Tablas pH–log c: ácidos y bases fuertes (ideal)');
  d('b7', 'Πίνακες pH–log c: ασθενή οξέα (ιδανικό)', 'pH–log c tables: weak acids (ideal)', 'Tablas pH–log c: ácidos débiles (ideal)');
  d('b8', 'Πίνακες pH–log c: βάσεις, άλατα, βιολογικά (ιδανικό)', 'pH–log c tables: bases, salts, biological (ideal)', 'Tablas pH–log c: bases, sales, biológicos (ideal)');
  d('b9', 'Πίνακες pH–log c: ισχυρά οξέα και βάσεις (ενεργότητες)', 'pH–log c tables: strong acids and bases (activities)', 'Tablas pH–log c: ácidos y bases fuertes (actividades)');
  d('b10', 'Πίνακες pH–log c: ασθενή οξέα (ενεργότητες)', 'pH–log c tables: weak acids (activities)', 'Tablas pH–log c: ácidos débiles (actividades)');
  d('b11', 'Πίνακες pH–log c: βάσεις, άλατα, βιολογικά (ενεργότητες)', 'pH–log c tables: bases, salts, biological (activities)', 'Tablas pH–log c: bases, sales, biológicos (actividades)');
  d('b12', 'Καμπύλες κατανομής και Sillén για κάθε οικογένεια οξέων', 'Distribution and Sillén curves for every acid family', 'Curvas de distribución y de Sillén de cada familia de ácidos');
  d('b13', 'Καμπύλες ρυθμιστικής ικανότητας για κάθε ζεύγος', 'Buffer-capacity curves for every pair', 'Curvas de capacidad tampón de cada par');
  d('b14', 'Καμπύλες ογκομέτρησης αναφοράς για κάθε ουσία', 'Reference titration curves for every substance', 'Curvas de valoración de referencia de cada sustancia');

  /* ---------- v3: ion ledger, model-consistent capacity, scope notes ---------- */
  d('nSulfuricIons', 'Στο H₂SO₄ το H⁺ της πρώτης πλήρους διάστασης περιλαμβάνεται ήδη στο [H₃O⁺]· δεν υπάρχει ξεχωριστό κατιόν-θεατής και το ίδιο φορτίο δεν μετράται δεύτερη φορά στην ιοντική ισχύ.',
    'For H₂SO₄ the H⁺ from the complete first dissociation is already part of [H₃O⁺]; there is no separate spectator cation, and the same charge is not counted a second time in the ionic strength.',
    'En el H₂SO₄ el H⁺ de la primera disociación completa ya forma parte de [H₃O⁺]; no hay un catión espectador aparte y esa misma carga no se cuenta dos veces en la fuerza iónica.');
  d('lblILedger', 'Άθροισμα καταλόγου ιόντων I', 'Ion-ledger sum I', 'Suma del registro de iones I');
  d('lblIUsed', 'I στους συντελεστές γ', 'I used for γ', 'I usada para γ');
  d('nIonicLedger', 'Ο πίνακας είναι ο κατάλογος των πραγματικών ιόντων που χρησιμοποιεί ο solver· το άθροισμα της στήλης ½·c·z² είναι ακριβώς το I του Real μοντέλου.',
    'The table is the list of real ions the solver uses; the ½·c·z² column adds up exactly to the I of the Real model.',
    'La tabla es la lista de iones reales que usa el solver; la columna ½·c·z² suma exactamente la I del modelo Real.');
  d('lblBetaNum', 'αριθμητική παράγωγος με τον ίδιο Real solver', 'numerical derivative with the same Real solver', 'derivada numérica con el mismo solver Real');
  d('lblReference', 'αναφορά', 'reference', 'referencia');
  d('nBufCapacityReal', 'Στο Real μοντέλο η β είναι το dB/dpH με pH = −log a(H⁺) και αυτοσυνεπή ιοντική ισχύ· ο ιδανικός τύπος εμφανίζεται μόνο ως τιμή αναφοράς.',
    'In the Real model β is dB/dpH with pH = −log a(H⁺) and a self-consistent ionic strength; the ideal formula is shown only as a reference value.',
    'En el modelo Real, β es dB/dpH con pH = −log a(H⁺) y fuerza iónica autoconsistente; la fórmula ideal solo se muestra como valor de referencia.');
  d('ptBetaReal', 'Ρυθμιστική ικανότητα β(pH) στο Real μοντέλο (Davies): β = dB/dpH με pH = −log a(H⁺) και αυτοσυνεπή ιοντική ισχύ, για ολική συγκέντρωση C της πλήρως πρωτονιωμένης μορφής που τιτλοδοτείται με ισχυρή βάση/οξύ. Η διακεκομμένη καμπύλη είναι η ιδανική αναφορά. Ο αριθμός β στα αποτελέσματα αφορά τη σύσταση που έδωσες και μπορεί να διαφέρει λίγο από την καμπύλη, επειδή τα ιόντα του διαλύματος (άρα η ιοντική ισχύς) δεν είναι ακριβώς τα ίδια.',
    'Buffer capacity β(pH) in the Real (Davies) model: β = dB/dpH with pH = −log a(H⁺) and a self-consistent ionic strength, for total concentration C of the fully protonated form titrated with strong base/acid. The dashed curve is the ideal reference. The β number in the results is for the exact composition you entered and can differ slightly from the curve, because the ions present (hence the ionic strength) are not exactly the same.',
    'Capacidad tampón β(pH) en el modelo Real (Davies): β = dB/dpH con pH = −log a(H⁺) y fuerza iónica autoconsistente, para la concentración total C de la forma totalmente protonada valorada con base/ácido fuerte. La curva discontinua es la referencia ideal. El número β de los resultados corresponde a la composición exacta introducida y puede diferir algo de la curva, porque los iones presentes (y por tanto la fuerza iónica) no son exactamente los mismos.');
  d('lgBetaReal', 'β Real (Davies)', 'β Real (Davies)', 'β Real (Davies)');
  d('lgBetaIdealRef', 'β Ιδανικό (αναφορά)', 'β Ideal (reference)', 'β Ideal (referencia)');
  d('lgBetaIdeal', 'β Ιδανικό', 'β Ideal', 'β Ideal');
  d('tempNote', 'Οι υπολογισμοί του Lab ισχύουν στους 25 °C· ο πίνακας θερμοκρασίας στην «Κλίμακα pH» είναι πληροφοριακός.',
    'The Lab\u2019s calculations are valid at 25 °C; the temperature table on the pH scale tab is for information.',
    'Los cálculos del Lab son válidos a 25 °C; la tabla de temperatura de la escala de pH es informativa.');
  d('pkwNote', 'Πληροφοριακές τιμές (Bandura & Lvov, IAPWS) — δεν αλλάζουν τους υπολογισμούς. Οι υπολογισμοί χρησιμοποιούν τη σύμβαση 25 °C: Kw = 1,0×10⁻¹⁴ (pKw = 14,00, ουδέτερο pH 7,00). Ο πίνακας δίνει στους 25 °C την ακριβέστερη βιβλιογραφική τιμή 13,995 (ουδέτερο 6,9975)· η διαφορά 0,005 είναι συνειδητή στρογγυλοποίηση.',
    'Reference values (Bandura & Lvov, IAPWS) — they do not change the calculations. The calculations use the 25 °C convention: Kw = 1.0×10⁻¹⁴ (pKw = 14.00, neutral pH 7.00). At 25 °C the table lists the more precise literature value 13.995 (neutral 6.9975); the 0.005 difference is a deliberate rounding.',
    'Valores de referencia (Bandura & Lvov, IAPWS): no cambian los cálculos. Los cálculos usan la convención de 25 °C: Kw = 1,0×10⁻¹⁴ (pKw = 14,00, pH neutro 7,00). A 25 °C la tabla da el valor bibliográfico más preciso 13,995 (neutro 6,9975); la diferencia de 0,005 es un redondeo deliberado.');
  d('warnHighIIdeal', 'Η ιοντική ισχύς είναι I ≈ {i} M (> 0,5 M): οι ενεργότητες διαφέρουν αισθητά από τις συγκεντρώσεις, οπότε το «Ιδανικό» pH μπορεί να αποκλίνει από το πραγματικό. Και η εξίσωση Davies είναι εκεί μόνο ενδεικτική.',
    'The ionic strength is I ≈ {i} M (> 0.5 M): activities differ noticeably from concentrations, so the \"Ideal\" pH may deviate from the real one. The Davies equation is only indicative there as well.',
    'La fuerza iónica es I ≈ {i} M (> 0,5 M): las actividades difieren claramente de las concentraciones, así que el pH «Ideal» puede apartarse del real. La ecuación de Davies también es solo orientativa en ese rango.');
  d('warnHighIReal', 'Σε κάποιο σημείο της καμπύλης I ≈ {i} M (> 0,5 M): η εξίσωση Davies είναι εκεί εκτός ορίου ισχύος και το αποτέλεσμα είναι μόνο ενδεικτικό.',
    'At some points of the curve I ≈ {i} M (> 0.5 M): the Davies equation is outside its range there and the result is only indicative.',
    'En algunos puntos de la curva I ≈ {i} M (> 0,5 M): la ecuación de Davies está allí fuera de su rango y el resultado es solo orientativo.');
  d('invalidExtreme', 'Η τιμή είναι εκτός του υποστηριζόμενου εύρους (έως {max})· δώσε αριθμό μέσα σε αυτό.',
    'The value is outside the supported range (up to {max}); enter a number inside it.',
    'El valor está fuera del rango admitido (hasta {max}); introduce un número dentro de él.');

  d('invalidRange', 'Δώσε αριθμό από {a} έως {b}.', 'Enter a number from {a} to {b}.', 'Introduce un número de {a} a {b}.');
  d('invalidNum', 'Δώσε έναν αριθμό.', 'Enter a number.', 'Introduce un número.');
  d('warnNoConv', 'Ο αριθμητικός επιλύτης δεν συγκλίνει σε αυτές τις συνθήκες (πολύ υψηλή ιοντική ισχύς)· η τιμή δεν είναι αξιόπιστη.',
    'The numerical solver does not converge under these conditions (very high ionic strength); the value is not reliable.',
    'El solver numérico no converge en estas condiciones (fuerza iónica muy alta); el valor no es fiable.');
  root.PHLabText = TEXT;
})(typeof window !== 'undefined' ? window : globalThis);
