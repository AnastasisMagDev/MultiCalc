/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-data.js  (v2)
   Reference data only. Values: 25 °C, thermodynamic pKa from standard tables
   (CRC Handbook / Harris / Lehninger / Good et al.). Ionic strength corrections are applied
   by the engine (Davies), the constants here are the zero-ionic-strength values.
   family   = one acid family H_nA^(z0): stepwise pKa + the label of each protonation state j (j = protons lost)
   compound = what the person dissolves (type: sa strong acid · sb strong base · wa weak acid ·
              wb weak base · salt · neutral)   cat = menu category
   ========================================================================== */
(function (root) {
  'use strict';
  var U = function (s) { return s; };
  var m = '\u2212', pm = '\u00b1';

  var FAMILIES = {
    acetic:   { pKa: [4.76],               z0: 0,  forms: ['CH<sub>3</sub>COOH', 'CH<sub>3</sub>COO<sup>' + m + '</sup>'] },
    formic:   { pKa: [3.75],               z0: 0,  forms: ['HCOOH', 'HCOO<sup>' + m + '</sup>'] },
    propanoic:{ pKa: [4.87],               z0: 0,  forms: ['C<sub>2</sub>H<sub>5</sub>COOH', 'C<sub>2</sub>H<sub>5</sub>COO<sup>' + m + '</sup>'] },
    benzoic:  { pKa: [4.20],               z0: 0,  forms: ['C<sub>6</sub>H<sub>5</sub>COOH', 'C<sub>6</sub>H<sub>5</sub>COO<sup>' + m + '</sup>'] },
    lactic:   { pKa: [3.86],               z0: 0,  forms: ['C<sub>3</sub>H<sub>6</sub>O<sub>3</sub>', 'C<sub>3</sub>H<sub>5</sub>O<sub>3</sub><sup>' + m + '</sup>'] },
    chloroacetic: { pKa: [2.87],           z0: 0,  forms: ['ClCH<sub>2</sub>COOH', 'ClCH<sub>2</sub>COO<sup>' + m + '</sup>'] },
    salicylic:{ pKa: [2.97],               z0: 0,  forms: ['C<sub>7</sub>H<sub>6</sub>O<sub>3</sub>', 'C<sub>7</sub>H<sub>5</sub>O<sub>3</sub><sup>' + m + '</sup>'] },
    hf:       { pKa: [3.17],               z0: 0,  forms: ['HF', 'F<sup>' + m + '</sup>'] },
    hno2:     { pKa: [3.15],               z0: 0,  forms: ['HNO<sub>2</sub>', 'NO<sub>2</sub><sup>' + m + '</sup>'] },
    hclo2:    { pKa: [1.96],               z0: 0,  forms: ['HClO<sub>2</sub>', 'ClO<sub>2</sub><sup>' + m + '</sup>'] },
    hocl:     { pKa: [7.53],               z0: 0,  forms: ['HOCl', 'OCl<sup>' + m + '</sup>'] },
    hcn:      { pKa: [9.21],               z0: 0,  forms: ['HCN', 'CN<sup>' + m + '</sup>'] },
    phenol:   { pKa: [9.99],               z0: 0,  forms: ['C<sub>6</sub>H<sub>5</sub>OH', 'C<sub>6</sub>H<sub>5</sub>O<sup>' + m + '</sup>'] },
    boric:    { pKa: [9.24],               z0: 0,  forms: ['B(OH)<sub>3</sub>', 'B(OH)<sub>4</sub><sup>' + m + '</sup>'] },
    carbonic: { pKa: [6.35, 10.33],        z0: 0,  forms: ['H<sub>2</sub>CO<sub>3</sub>', 'HCO<sub>3</sub><sup>' + m + '</sup>', 'CO<sub>3</sub><sup>2' + m + '</sup>'] },
    oxalic:   { pKa: [1.25, 4.27],         z0: 0,  forms: ['H<sub>2</sub>C<sub>2</sub>O<sub>4</sub>', 'HC<sub>2</sub>O<sub>4</sub><sup>' + m + '</sup>', 'C<sub>2</sub>O<sub>4</sub><sup>2' + m + '</sup>'] },
    sulfurous:{ pKa: [1.85, 7.20],         z0: 0,  forms: ['H<sub>2</sub>SO<sub>3</sub>', 'HSO<sub>3</sub><sup>' + m + '</sup>', 'SO<sub>3</sub><sup>2' + m + '</sup>'] },
    tartaric: { pKa: [2.98, 4.34],         z0: 0,  forms: ['H<sub>2</sub>Tar', 'HTar<sup>' + m + '</sup>', 'Tar<sup>2' + m + '</sup>'] },
    malic:    { pKa: [3.40, 5.20],         z0: 0,  forms: ['H<sub>2</sub>Mal', 'HMal<sup>' + m + '</sup>', 'Mal<sup>2' + m + '</sup>'] },
    succinic: { pKa: [4.21, 5.64],         z0: 0,  forms: ['H<sub>2</sub>Suc', 'HSuc<sup>' + m + '</sup>', 'Suc<sup>2' + m + '</sup>'] },
    maleic:   { pKa: [1.92, 6.27],         z0: 0,  forms: ['H<sub>2</sub>Mle', 'HMle<sup>' + m + '</sup>', 'Mle<sup>2' + m + '</sup>'] },
    phthalic: { pKa: [2.95, 5.41],         z0: 0,  forms: ['H<sub>2</sub>Ph', 'HPh<sup>' + m + '</sup>', 'Ph<sup>2' + m + '</sup>'] },
    ascorbic: { pKa: [4.10, 11.79],        z0: 0,  forms: ['H<sub>2</sub>Asc', 'HAsc<sup>' + m + '</sup>', 'Asc<sup>2' + m + '</sup>'] },
    phosphoric:{ pKa: [2.15, 7.20, 12.35], z0: 0,  forms: ['H<sub>3</sub>PO<sub>4</sub>', 'H<sub>2</sub>PO<sub>4</sub><sup>' + m + '</sup>', 'HPO<sub>4</sub><sup>2' + m + '</sup>', 'PO<sub>4</sub><sup>3' + m + '</sup>'] },
    citric:   { pKa: [3.13, 4.76, 6.40],   z0: 0,  forms: ['H<sub>3</sub>Cit', 'H<sub>2</sub>Cit<sup>' + m + '</sup>', 'HCit<sup>2' + m + '</sup>', 'Cit<sup>3' + m + '</sup>'] },
    bisulfate:{ pKa: [1.99],               z0: -1, forms: ['HSO<sub>4</sub><sup>' + m + '</sup>', 'SO<sub>4</sub><sup>2' + m + '</sup>'] },
    // amino acids and biological buffers (z0 > 0: the fully protonated form is a cation)
    glycine:  { pKa: [2.34, 9.60],         z0: 1,  forms: ['H<sub>2</sub>Gly<sup>+</sup>', 'HGly<sup>' + pm + '</sup>', 'Gly<sup>' + m + '</sup>'] },
    alanine:  { pKa: [2.34, 9.69],         z0: 1,  forms: ['H<sub>2</sub>Ala<sup>+</sup>', 'HAla<sup>' + pm + '</sup>', 'Ala<sup>' + m + '</sup>'] },
    histidine:{ pKa: [1.82, 6.00, 9.17],   z0: 2,  forms: ['H<sub>3</sub>His<sup>2+</sup>', 'H<sub>2</sub>His<sup>+</sup>', 'HHis', 'His<sup>' + m + '</sup>'] },
    hepes:    { pKa: [7.48],               z0: 0,  forms: ['HEPES', 'HEPES<sup>' + m + '</sup>'] },
    mes:      { pKa: [6.10],               z0: 0,  forms: ['MES', 'MES<sup>' + m + '</sup>'] },
    mops:     { pKa: [7.20],               z0: 0,  forms: ['MOPS', 'MOPS<sup>' + m + '</sup>'] },
    // conjugate-acid families of the weak bases (state 0 = the cation, state 1 = the neutral base)
    ammonium: { pKa: [9.25],               z0: 1,  forms: ['NH<sub>4</sub><sup>+</sup>', 'NH<sub>3</sub>'] },
    methylammonium: { pKa: [10.64],        z0: 1,  forms: ['CH<sub>3</sub>NH<sub>3</sub><sup>+</sup>', 'CH<sub>3</sub>NH<sub>2</sub>'] },
    ethylammonium: { pKa: [10.65],         z0: 1,  forms: ['C<sub>2</sub>H<sub>5</sub>NH<sub>3</sub><sup>+</sup>', 'C<sub>2</sub>H<sub>5</sub>NH<sub>2</sub>'] },
    dimethylammonium: { pKa: [10.73],      z0: 1,  forms: ['(CH<sub>3</sub>)<sub>2</sub>NH<sub>2</sub><sup>+</sup>', '(CH<sub>3</sub>)<sub>2</sub>NH'] },
    diethylammonium: { pKa: [10.98],       z0: 1,  forms: ['(C<sub>2</sub>H<sub>5</sub>)<sub>2</sub>NH<sub>2</sub><sup>+</sup>', '(C<sub>2</sub>H<sub>5</sub>)<sub>2</sub>NH'] },
    trimethylammonium: { pKa: [9.80],      z0: 1,  forms: ['(CH<sub>3</sub>)<sub>3</sub>NH<sup>+</sup>', '(CH<sub>3</sub>)<sub>3</sub>N'] },
    triethylammonium: { pKa: [10.75],      z0: 1,  forms: ['(C<sub>2</sub>H<sub>5</sub>)<sub>3</sub>NH<sup>+</sup>', '(C<sub>2</sub>H<sub>5</sub>)<sub>3</sub>N'] },
    piperidinium: { pKa: [11.12],          z0: 1,  forms: ['C<sub>5</sub>H<sub>10</sub>NH<sub>2</sub><sup>+</sup>', 'C<sub>5</sub>H<sub>10</sub>NH'] },
    pyridinium: { pKa: [5.23],             z0: 1,  forms: ['C<sub>5</sub>H<sub>5</sub>NH<sup>+</sup>', 'C<sub>5</sub>H<sub>5</sub>N'] },
    imidazolium: { pKa: [6.95],            z0: 1,  forms: ['C<sub>3</sub>H<sub>5</sub>N<sub>2</sub><sup>+</sup>', 'C<sub>3</sub>H<sub>4</sub>N<sub>2</sub>'] },
    anilinium: { pKa: [4.60],              z0: 1,  forms: ['C<sub>6</sub>H<sub>5</sub>NH<sub>3</sub><sup>+</sup>', 'C<sub>6</sub>H<sub>5</sub>NH<sub>2</sub>'] },
    hydrazinium: { pKa: [8.07],            z0: 1,  forms: ['N<sub>2</sub>H<sub>5</sub><sup>+</sup>', 'N<sub>2</sub>H<sub>4</sub>'] },
    hydroxylammonium: { pKa: [5.96],       z0: 1,  forms: ['NH<sub>3</sub>OH<sup>+</sup>', 'NH<sub>2</sub>OH'] },
    tris:     { pKa: [8.07],               z0: 1,  forms: ['TrisH<sup>+</sup>', 'Tris'] }
  };

  function N(el, en, es) { return { el: el, en: en, es: es }; }
  function C(o) { return o; }

  /* f = formula (HTML) · j = protonation state of the dissolved form · n = H⁺/OH⁻ released (strong) ·
     pKaS = pKa of a strong acid (leveling: all are "strong" below −1.74) · sol = approx. solubility limit (M) ·
     zS = charge of the spectator cation */
  var COMPOUNDS = [
    // ---- strong acids
    C({ id: 'HCl',   cat: 'sa', type: 'sa', n: 1, f: 'HCl',   pKaS: -6.3,  anion: 'Cl<sup>' + m + '</sup>',  name: N('Υδροχλωρικό οξύ', 'Hydrochloric acid', 'Ácido clorhídrico') }),
    C({ id: 'HBr',   cat: 'sa', type: 'sa', n: 1, f: 'HBr',   pKaS: -9,    anion: 'Br<sup>' + m + '</sup>',  name: N('Υδροβρωμικό οξύ', 'Hydrobromic acid', 'Ácido bromhídrico') }),
    C({ id: 'HI',    cat: 'sa', type: 'sa', n: 1, f: 'HI',    pKaS: -10,   anion: 'I<sup>' + m + '</sup>',   name: N('Υδροϊωδικό οξύ', 'Hydroiodic acid', 'Ácido yodhídrico') }),
    C({ id: 'HNO3',  cat: 'sa', type: 'sa', n: 1, f: 'HNO<sub>3</sub>',  pKaS: -1.4, anion: 'NO<sub>3</sub><sup>' + m + '</sup>', name: N('Νιτρικό οξύ', 'Nitric acid', 'Ácido nítrico') }),
    C({ id: 'HClO4', cat: 'sa', type: 'sa', n: 1, f: 'HClO<sub>4</sub>', pKaS: -10, anion: 'ClO<sub>4</sub><sup>' + m + '</sup>', name: N('Υπερχλωρικό οξύ', 'Perchloric acid', 'Ácido perclórico') }),
    C({ id: 'H2SO4', cat: 'sa', type: 'wa', fam: 'bisulfate', strongH: 1, pKaS: -3, f: 'H<sub>2</sub>SO<sub>4</sub>', name: N('Θειικό οξύ', 'Sulfuric acid', 'Ácido sulfúrico') }),
    // ---- weak acids (monoprotic)
    C({ id: 'acetic',  cat: 'wa', type: 'wa', fam: 'acetic',  f: 'CH<sub>3</sub>COOH', name: N('Οξικό οξύ (ξίδι)', 'Acetic acid (vinegar)', 'Ácido acético (vinagre)') }),
    C({ id: 'formic',  cat: 'wa', type: 'wa', fam: 'formic',  f: 'HCOOH', name: N('Μυρμηκικό οξύ', 'Formic acid', 'Ácido fórmico') }),
    C({ id: 'propanoic', cat: 'wa', type: 'wa', fam: 'propanoic', f: 'C<sub>2</sub>H<sub>5</sub>COOH', name: N('Προπανοϊκό οξύ', 'Propanoic acid', 'Ácido propanoico') }),
    C({ id: 'benzoic', cat: 'wa', type: 'wa', fam: 'benzoic', f: 'C<sub>6</sub>H<sub>5</sub>COOH', name: N('Βενζοϊκό οξύ', 'Benzoic acid', 'Ácido benzoico') }),
    C({ id: 'lactic',  cat: 'wa', type: 'wa', fam: 'lactic',  f: 'C<sub>3</sub>H<sub>6</sub>O<sub>3</sub>', name: N('Γαλακτικό οξύ', 'Lactic acid', 'Ácido láctico') }),
    C({ id: 'chloroacetic', cat: 'wa', type: 'wa', fam: 'chloroacetic', f: 'ClCH<sub>2</sub>COOH', name: N('Χλωροξικό οξύ', 'Chloroacetic acid', 'Ácido cloroacético') }),
    C({ id: 'salicylic', cat: 'wa', type: 'wa', fam: 'salicylic', f: 'C<sub>7</sub>H<sub>6</sub>O<sub>3</sub>', name: N('Σαλικυλικό οξύ', 'Salicylic acid', 'Ácido salicílico') }),
    C({ id: 'hf',      cat: 'wa', type: 'wa', fam: 'hf',      f: 'HF', name: N('Υδροφθορικό οξύ', 'Hydrofluoric acid', 'Ácido fluorhídrico') }),
    C({ id: 'hno2',    cat: 'wa', type: 'wa', fam: 'hno2',    f: 'HNO<sub>2</sub>', name: N('Νιτρώδες οξύ', 'Nitrous acid', 'Ácido nitroso') }),
    C({ id: 'hclo2',   cat: 'wa', type: 'wa', fam: 'hclo2',   f: 'HClO<sub>2</sub>', name: N('Χλωριώδες οξύ', 'Chlorous acid', 'Ácido cloroso') }),
    C({ id: 'hocl',    cat: 'wa', type: 'wa', fam: 'hocl',    f: 'HOCl', name: N('Υποχλωριώδες οξύ', 'Hypochlorous acid', 'Ácido hipocloroso') }),
    C({ id: 'hcn',     cat: 'wa', type: 'wa', fam: 'hcn',     f: 'HCN', name: N('Υδροκυανικό οξύ', 'Hydrocyanic acid', 'Ácido cianhídrico') }),
    C({ id: 'phenol',  cat: 'wa', type: 'wa', fam: 'phenol',  f: 'C<sub>6</sub>H<sub>5</sub>OH', name: N('Φαινόλη', 'Phenol', 'Fenol') }),
    C({ id: 'boric',   cat: 'wa', type: 'wa', fam: 'boric',   f: 'B(OH)<sub>3</sub>', name: N('Βορικό οξύ', 'Boric acid', 'Ácido bórico') }),
    // ---- weak acids (polyprotic)
    C({ id: 'carbonic', cat: 'wa', type: 'wa', fam: 'carbonic', f: 'H<sub>2</sub>CO<sub>3</sub>', name: N('Ανθρακικό οξύ', 'Carbonic acid', 'Ácido carbónico') }),
    C({ id: 'oxalic',   cat: 'wa', type: 'wa', fam: 'oxalic',   f: 'H<sub>2</sub>C<sub>2</sub>O<sub>4</sub>', name: N('Οξαλικό οξύ', 'Oxalic acid', 'Ácido oxálico') }),
    C({ id: 'sulfurous',cat: 'wa', type: 'wa', fam: 'sulfurous',f: 'H<sub>2</sub>SO<sub>3</sub>', name: N('Θειώδες οξύ', 'Sulfurous acid', 'Ácido sulfuroso') }),
    C({ id: 'tartaric', cat: 'wa', type: 'wa', fam: 'tartaric', f: 'H<sub>2</sub>C<sub>4</sub>H<sub>4</sub>O<sub>6</sub>', name: N('Τρυγικό οξύ', 'Tartaric acid', 'Ácido tartárico') }),
    C({ id: 'malic',    cat: 'wa', type: 'wa', fam: 'malic',    f: 'H<sub>2</sub>C<sub>4</sub>H<sub>4</sub>O<sub>5</sub>', name: N('Μηλικό οξύ', 'Malic acid', 'Ácido málico') }),
    C({ id: 'succinic', cat: 'wa', type: 'wa', fam: 'succinic', f: 'H<sub>2</sub>C<sub>4</sub>H<sub>4</sub>O<sub>4</sub>', name: N('Ηλεκτρικό οξύ', 'Succinic acid', 'Ácido succínico') }),
    C({ id: 'maleic',   cat: 'wa', type: 'wa', fam: 'maleic',   f: 'H<sub>2</sub>C<sub>4</sub>H<sub>2</sub>O<sub>4</sub>', name: N('Μηλεϊνικό οξύ', 'Maleic acid', 'Ácido maleico') }),
    C({ id: 'phthalic', cat: 'wa', type: 'wa', fam: 'phthalic', f: 'H<sub>2</sub>C<sub>8</sub>H<sub>4</sub>O<sub>4</sub>', name: N('Φθαλικό οξύ', 'Phthalic acid', 'Ácido ftálico') }),
    C({ id: 'ascorbic', cat: 'wa', type: 'wa', fam: 'ascorbic', f: 'H<sub>2</sub>C<sub>6</sub>H<sub>6</sub>O<sub>6</sub>', name: N('Ασκορβικό οξύ (βιταμίνη C)', 'Ascorbic acid (vitamin C)', 'Ácido ascórbico (vitamina C)') }),
    C({ id: 'phosphoric', cat: 'wa', type: 'wa', fam: 'phosphoric', f: 'H<sub>3</sub>PO<sub>4</sub>', name: N('Φωσφορικό οξύ', 'Phosphoric acid', 'Ácido fosfórico') }),
    C({ id: 'citric',   cat: 'wa', type: 'wa', fam: 'citric',   f: 'H<sub>3</sub>C<sub>6</sub>H<sub>5</sub>O<sub>7</sub>', name: N('Κιτρικό οξύ', 'Citric acid', 'Ácido cítrico') }),
    // ---- strong bases
    C({ id: 'LiOH',  cat: 'sb', type: 'sb', n: 1, f: 'LiOH',  cation: 'Li<sup>+</sup>', zS: 1, name: N('Υδροξείδιο του λιθίου', 'Lithium hydroxide', 'Hidróxido de litio') }),
    C({ id: 'NaOH',  cat: 'sb', type: 'sb', n: 1, f: 'NaOH',  cation: 'Na<sup>+</sup>', zS: 1, name: N('Υδροξείδιο του νατρίου', 'Sodium hydroxide', 'Hidróxido de sodio') }),
    C({ id: 'KOH',   cat: 'sb', type: 'sb', n: 1, f: 'KOH',   cation: 'K<sup>+</sup>',  zS: 1, name: N('Υδροξείδιο του καλίου', 'Potassium hydroxide', 'Hidróxido de potasio') }),
    C({ id: 'Ba(OH)2', cat: 'sb', type: 'sb', n: 2, f: 'Ba(OH)<sub>2</sub>', sol: 0.2,  cation: 'Ba<sup>2+</sup>', zS: 2, name: N('Υδροξείδιο του βαρίου', 'Barium hydroxide', 'Hidróxido de bario') }),
    C({ id: 'Ca(OH)2', cat: 'sb', type: 'sb', n: 2, f: 'Ca(OH)<sub>2</sub>', sol: 0.02, cation: 'Ca<sup>2+</sup>', zS: 2, name: N('Υδροξείδιο του ασβεστίου', 'Calcium hydroxide', 'Hidróxido de calcio') }),
    // ---- weak bases (family = conjugate acid, j = 1 = the neutral base)
    C({ id: 'nh3',  cat: 'wb', type: 'wb', fam: 'ammonium', j: 1, f: 'NH<sub>3</sub>', name: N('Αμμωνία', 'Ammonia', 'Amoníaco') }),
    C({ id: 'mea',  cat: 'wb', type: 'wb', fam: 'methylammonium', j: 1, f: 'CH<sub>3</sub>NH<sub>2</sub>', name: N('Μεθυλαμίνη', 'Methylamine', 'Metilamina') }),
    C({ id: 'ea',   cat: 'wb', type: 'wb', fam: 'ethylammonium', j: 1, f: 'C<sub>2</sub>H<sub>5</sub>NH<sub>2</sub>', name: N('Αιθυλαμίνη', 'Ethylamine', 'Etilamina') }),
    C({ id: 'dma',  cat: 'wb', type: 'wb', fam: 'dimethylammonium', j: 1, f: '(CH<sub>3</sub>)<sub>2</sub>NH', name: N('Διμεθυλαμίνη', 'Dimethylamine', 'Dimetilamina') }),
    C({ id: 'dea',  cat: 'wb', type: 'wb', fam: 'diethylammonium', j: 1, f: '(C<sub>2</sub>H<sub>5</sub>)<sub>2</sub>NH', name: N('Διαιθυλαμίνη', 'Diethylamine', 'Dietilamina') }),
    C({ id: 'tma',  cat: 'wb', type: 'wb', fam: 'trimethylammonium', j: 1, f: '(CH<sub>3</sub>)<sub>3</sub>N', name: N('Τριμεθυλαμίνη', 'Trimethylamine', 'Trimetilamina') }),
    C({ id: 'tea',  cat: 'wb', type: 'wb', fam: 'triethylammonium', j: 1, f: '(C<sub>2</sub>H<sub>5</sub>)<sub>3</sub>N', name: N('Τριαιθυλαμίνη', 'Triethylamine', 'Trietilamina') }),
    C({ id: 'pip',  cat: 'wb', type: 'wb', fam: 'piperidinium', j: 1, f: 'C<sub>5</sub>H<sub>10</sub>NH', name: N('Πιπεριδίνη', 'Piperidine', 'Piperidina') }),
    C({ id: 'pyr',  cat: 'wb', type: 'wb', fam: 'pyridinium', j: 1, f: 'C<sub>5</sub>H<sub>5</sub>N', name: N('Πυριδίνη', 'Pyridine', 'Piridina') }),
    C({ id: 'imd',  cat: 'wb', type: 'wb', fam: 'imidazolium', j: 1, f: 'C<sub>3</sub>H<sub>4</sub>N<sub>2</sub>', name: N('Ιμιδαζόλιο', 'Imidazole', 'Imidazol') }),
    C({ id: 'ani',  cat: 'wb', type: 'wb', fam: 'anilinium', j: 1, f: 'C<sub>6</sub>H<sub>5</sub>NH<sub>2</sub>', name: N('Ανιλίνη', 'Aniline', 'Anilina') }),
    C({ id: 'hyd',  cat: 'wb', type: 'wb', fam: 'hydrazinium', j: 1, f: 'N<sub>2</sub>H<sub>4</sub>', name: N('Υδραζίνη', 'Hydrazine', 'Hidrazina') }),
    C({ id: 'hya',  cat: 'wb', type: 'wb', fam: 'hydroxylammonium', j: 1, f: 'NH<sub>2</sub>OH', name: N('Υδροξυλαμίνη', 'Hydroxylamine', 'Hidroxilamina') }),
    // ---- salts (diss = dissociation equation; the role is derived: j = 0 with z0>0 → acidic cation, j = n → basic anion, in between → amphiprotic)
    C({ id: 'NaCl',   cat: 'salt', type: 'neutral', f: 'NaCl', diss: 'NaCl \u2192 Na<sup>+</sup> + Cl<sup>' + m + '</sup>', name: N('Χλωριούχο νάτριο', 'Sodium chloride', 'Cloruro de sodio') }),
    C({ id: 'NaAc',   cat: 'salt', type: 'salt', fam: 'acetic', j: 1, f: 'CH<sub>3</sub>COONa', diss: 'CH<sub>3</sub>COONa \u2192 CH<sub>3</sub>COO<sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Οξικό νάτριο', 'Sodium acetate', 'Acetato de sodio') }),
    C({ id: 'NaFo',   cat: 'salt', type: 'salt', fam: 'formic', j: 1, f: 'HCOONa', diss: 'HCOONa \u2192 HCOO<sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Μυρμηκικό νάτριο', 'Sodium formate', 'Formiato de sodio') }),
    C({ id: 'NaBz',   cat: 'salt', type: 'salt', fam: 'benzoic', j: 1, f: 'C<sub>6</sub>H<sub>5</sub>COONa', diss: 'C<sub>6</sub>H<sub>5</sub>COONa \u2192 C<sub>6</sub>H<sub>5</sub>COO<sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Βενζοϊκό νάτριο', 'Sodium benzoate', 'Benzoato de sodio') }),
    C({ id: 'NaF',    cat: 'salt', type: 'salt', fam: 'hf', j: 1, f: 'NaF', diss: 'NaF \u2192 F<sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Φθοριούχο νάτριο', 'Sodium fluoride', 'Fluoruro de sodio') }),
    C({ id: 'KCN',    cat: 'salt', type: 'salt', fam: 'hcn', j: 1, f: 'KCN', diss: 'KCN \u2192 CN<sup>' + m + '</sup> + K<sup>+</sup>', name: N('Κυανιούχο κάλιο', 'Potassium cyanide', 'Cianuro de potasio') }),
    C({ id: 'NaOCl',  cat: 'salt', type: 'salt', fam: 'hocl', j: 1, f: 'NaOCl', diss: 'NaOCl \u2192 OCl<sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Υποχλωριώδες νάτριο (χλωρίνη)', 'Sodium hypochlorite (bleach)', 'Hipoclorito de sodio (lejía)') }),
    C({ id: 'NaNO2',  cat: 'salt', type: 'salt', fam: 'hno2', j: 1, f: 'NaNO<sub>2</sub>', diss: 'NaNO<sub>2</sub> \u2192 NO<sub>2</sub><sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Νιτρώδες νάτριο', 'Sodium nitrite', 'Nitrito de sodio') }),
    C({ id: 'NH4Cl',  cat: 'salt', type: 'salt', fam: 'ammonium', j: 0, f: 'NH<sub>4</sub>Cl', diss: 'NH<sub>4</sub>Cl \u2192 NH<sub>4</sub><sup>+</sup> + Cl<sup>' + m + '</sup>', name: N('Χλωριούχο αμμώνιο', 'Ammonium chloride', 'Cloruro de amonio') }),
    C({ id: 'NaHSO4', cat: 'salt', type: 'salt', fam: 'bisulfate', j: 0, f: 'NaHSO<sub>4</sub>', diss: 'NaHSO<sub>4</sub> \u2192 HSO<sub>4</sub><sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Όξινο θειικό νάτριο', 'Sodium bisulfate', 'Bisulfato de sodio') }),
    C({ id: 'Na2SO4', cat: 'salt', type: 'salt', fam: 'bisulfate', j: 1, f: 'Na<sub>2</sub>SO<sub>4</sub>', diss: 'Na<sub>2</sub>SO<sub>4</sub> \u2192 SO<sub>4</sub><sup>2' + m + '</sup> + 2 Na<sup>+</sup>', name: N('Θειικό νάτριο', 'Sodium sulfate', 'Sulfato de sodio') }),
    C({ id: 'NaHCO3', cat: 'salt', type: 'salt', fam: 'carbonic', j: 1, f: 'NaHCO<sub>3</sub>', diss: 'NaHCO<sub>3</sub> \u2192 HCO<sub>3</sub><sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Όξινο ανθρακικό νάτριο (σόδα)', 'Sodium bicarbonate (baking soda)', 'Bicarbonato de sodio') }),
    C({ id: 'Na2CO3', cat: 'salt', type: 'salt', fam: 'carbonic', j: 2, f: 'Na<sub>2</sub>CO<sub>3</sub>', diss: 'Na<sub>2</sub>CO<sub>3</sub> \u2192 CO<sub>3</sub><sup>2' + m + '</sup> + 2 Na<sup>+</sup>', name: N('Ανθρακικό νάτριο', 'Sodium carbonate', 'Carbonato de sodio') }),
    C({ id: 'Na2SO3', cat: 'salt', type: 'salt', fam: 'sulfurous', j: 2, f: 'Na<sub>2</sub>SO<sub>3</sub>', diss: 'Na<sub>2</sub>SO<sub>3</sub> \u2192 SO<sub>3</sub><sup>2' + m + '</sup> + 2 Na<sup>+</sup>', name: N('Θειώδες νάτριο', 'Sodium sulfite', 'Sulfito de sodio') }),
    C({ id: 'KHP',    cat: 'salt', type: 'salt', fam: 'phthalic', j: 1, f: 'KHC<sub>8</sub>H<sub>4</sub>O<sub>4</sub>', diss: 'KHP \u2192 HPh<sup>' + m + '</sup> + K<sup>+</sup>', name: N('Όξινο φθαλικό κάλιο (KHP)', 'Potassium hydrogen phthalate (KHP)', 'Ftalato ácido de potasio (KHP)') }),
    C({ id: 'NaH2PO4',cat: 'salt', type: 'salt', fam: 'phosphoric', j: 1, f: 'NaH<sub>2</sub>PO<sub>4</sub>', diss: 'NaH<sub>2</sub>PO<sub>4</sub> \u2192 H<sub>2</sub>PO<sub>4</sub><sup>' + m + '</sup> + Na<sup>+</sup>', name: N('Διόξινο φωσφορικό νάτριο', 'Sodium dihydrogen phosphate', 'Dihidrogenofosfato de sodio') }),
    C({ id: 'Na2HPO4',cat: 'salt', type: 'salt', fam: 'phosphoric', j: 2, f: 'Na<sub>2</sub>HPO<sub>4</sub>', diss: 'Na<sub>2</sub>HPO<sub>4</sub> \u2192 HPO<sub>4</sub><sup>2' + m + '</sup> + 2 Na<sup>+</sup>', name: N('Όξινο φωσφορικό νάτριο', 'Disodium hydrogen phosphate', 'Hidrogenofosfato de disodio') }),
    C({ id: 'Na3PO4', cat: 'salt', type: 'salt', fam: 'phosphoric', j: 3, f: 'Na<sub>3</sub>PO<sub>4</sub>', diss: 'Na<sub>3</sub>PO<sub>4</sub> \u2192 PO<sub>4</sub><sup>3' + m + '</sup> + 3 Na<sup>+</sup>', name: N('Φωσφορικό νάτριο', 'Trisodium phosphate', 'Fosfato de trisodio') }),
    C({ id: 'Na3Cit', cat: 'salt', type: 'salt', fam: 'citric', j: 3, f: 'Na<sub>3</sub>C<sub>6</sub>H<sub>5</sub>O<sub>7</sub>', diss: 'Na<sub>3</sub>Cit \u2192 Cit<sup>3' + m + '</sup> + 3 Na<sup>+</sup>', name: N('Κιτρικό νάτριο', 'Trisodium citrate', 'Citrato de trisodio') }),
    // ---- biological: amino acids and Good's buffers
    C({ id: 'gly',   cat: 'bio', type: 'salt', fam: 'glycine', j: 1, f: 'HGly<sup>' + pm + '</sup>', diss: 'HGly<sup>' + pm + '</sup> (zwitterion)', name: N('Γλυκίνη', 'Glycine', 'Glicina') }),
    C({ id: 'ala',   cat: 'bio', type: 'salt', fam: 'alanine', j: 1, f: 'HAla<sup>' + pm + '</sup>', diss: 'HAla<sup>' + pm + '</sup> (zwitterion)', name: N('Αλανίνη', 'Alanine', 'Alanina') }),
    C({ id: 'his',   cat: 'bio', type: 'salt', fam: 'histidine', j: 2, f: 'HHis', diss: 'HHis (neutral)', name: N('Ιστιδίνη', 'Histidine', 'Histidina') }),
    C({ id: 'tris',  cat: 'bio', type: 'wb', fam: 'tris', j: 1, f: 'Tris', name: N('Tris (τρις-υδροξυμεθυλ-αμινομεθάνιο)', 'Tris (tris-hydroxymethyl-aminomethane)', 'Tris (trishidroximetil-aminometano)') }),
    C({ id: 'trisHCl',cat: 'bio', type: 'salt', fam: 'tris', j: 0, f: 'Tris\u00b7HCl', diss: 'Tris\u00b7HCl \u2192 TrisH<sup>+</sup> + Cl<sup>' + m + '</sup>', name: N('Tris-HCl', 'Tris-HCl', 'Tris-HCl') }),
    C({ id: 'hepes', cat: 'bio', type: 'wa', fam: 'hepes', f: 'HEPES', name: N('HEPES (ρυθμιστικό Good)', 'HEPES (Good\u2019s buffer)', 'HEPES (tampón de Good)') }),
    C({ id: 'mes',   cat: 'bio', type: 'wa', fam: 'mes', f: 'MES', name: N('MES (ρυθμιστικό Good)', 'MES (Good\u2019s buffer)', 'MES (tampón de Good)') }),
    C({ id: 'mops',  cat: 'bio', type: 'wa', fam: 'mops', f: 'MOPS', name: N('MOPS (ρυθμιστικό Good)', 'MOPS (Good\u2019s buffer)', 'MOPS (tampón de Good)') })
  ];

  var CATEGORIES = ['sa', 'wa', 'sb', 'wb', 'salt', 'bio'];

  // Indicators: acid / mid / base colours [r,g,b,a]; pK = midpoint; range = pK ± 1 (visual transition).
  var INDICATORS = [
    { id: 'mo',   pK: 3.47, acid: [226, 56, 50, 1],  mid: [240, 128, 40, 1],  base: [248, 202, 40, 1],  name: N('Μεθυλοπορτοκαλί', 'Methyl orange', 'Naranja de metilo') },
    { id: 'bpb',  pK: 4.00, acid: [244, 214, 52, 1], mid: [90, 164, 128, 1],  base: [84, 72, 168, 1],   name: N('Βρωμοφαινόλη μπλε', 'Bromophenol blue', 'Azul de bromofenol') },
    { id: 'bcg',  pK: 4.70, acid: [240, 214, 52, 1], mid: [88, 172, 104, 1],  base: [38, 116, 196, 1],  name: N('Βρωμοκρεσόλη πράσινο', 'Bromocresol green', 'Verde de bromocresol') },
    { id: 'mr',   pK: 5.00, acid: [224, 50, 56, 1],  mid: [238, 118, 40, 1],  base: [246, 208, 44, 1],  name: N('Μεθυλέρυθρο', 'Methyl red', 'Rojo de metilo') },
    { id: 'lit',  pK: 6.50, acid: [226, 66, 84, 1],  mid: [152, 72, 164, 1],  base: [86, 92, 208, 1],   name: N('Βάμμα ηλιοτροπίου', 'Litmus', 'Tornasol') },
    { id: 'bb',   pK: 7.10, acid: [246, 214, 52, 1], mid: [80, 172, 108, 1],  base: [44, 106, 204, 1],  name: N('Βρωμοθυμόλη μπλε', 'Bromothymol blue', 'Azul de bromotimol') },
    { id: 'pr',   pK: 7.90, acid: [246, 200, 44, 1], mid: [240, 140, 48, 1],  base: [212, 34, 90, 1],   name: N('Ερυθρό της φαινόλης', 'Phenol red', 'Rojo de fenol') },
    { id: 'php',  pK: 9.40, acid: [255, 255, 255, 0], mid: [232, 90, 170, 0.55], base: [222, 40, 146, 1], name: N('Φαινολοφθαλεΐνη', 'Phenolphthalein', 'Fenolftaleína') },
    { id: 'tph',  pK: 9.90, acid: [255, 255, 255, 0], mid: [140, 150, 222, 0.55], base: [60, 80, 200, 1], name: N('Θυμολοφθαλεΐνη', 'Thymolphthalein', 'Timolftaleína') },
    { id: 'ayr',  pK: 11.2, acid: [244, 204, 60, 1], mid: [232, 132, 60, 1],  base: [196, 48, 58, 1],   name: N('Κίτρινο της αλιζαρίνης R', 'Alizarin yellow R', 'Amarillo de alizarina R') }
  ];

  // Universal indicator (stops: pH → rgb), used for the beaker colour.
  var UNIVERSAL = [
    [0, [214, 28, 36]], [2, [232, 62, 40]], [3.5, [244, 124, 38]], [5, [246, 196, 42]],
    [6.2, [168, 204, 52]], [7, [60, 176, 92]], [8, [32, 160, 170]], [9.5, [40, 104, 196]],
    [11, [76, 70, 176]], [12.5, [120, 52, 164]], [14, [150, 40, 150]]
  ];

  // Everyday reference points (approximate typical values).
  var EVERYDAY = [
    { pH: 1.5,  name: N('Γαστρικό υγρό', 'Gastric acid', 'Jugo gástrico') },
    { pH: 2.2,  name: N('Χυμός λεμονιού', 'Lemon juice', 'Jugo de limón') },
    { pH: 2.5,  name: N('Κόλα', 'Cola', 'Refresco de cola') },
    { pH: 3.0,  name: N('Ξίδι', 'Vinegar', 'Vinagre') },
    { pH: 3.5,  name: N('Χυμός πορτοκαλιού', 'Orange juice', 'Jugo de naranja') },
    { pH: 5.0,  name: N('Μαύρος καφές', 'Black coffee', 'Café negro') },
    { pH: 5.6,  name: N('Βρόχινο νερό', 'Rainwater', 'Agua de lluvia') },
    { pH: 6.6,  name: N('Γάλα', 'Milk', 'Leche') },
    { pH: 7.0,  name: N('Καθαρό νερό', 'Pure water', 'Agua pura') },
    { pH: 7.4,  name: N('Ανθρώπινο αίμα', 'Human blood', 'Sangre humana') },
    { pH: 8.1,  name: N('Θαλασσινό νερό', 'Seawater', 'Agua de mar') },
    { pH: 8.3,  name: N('Διάλυμα σόδας', 'Baking soda solution', 'Solución de bicarbonato') },
    { pH: 9.5,  name: N('Σαπούνι χεριών', 'Hand soap', 'Jabón de manos') },
    { pH: 10.5, name: N('Γάλα μαγνησίας', 'Milk of magnesia', 'Leche de magnesia') },
    { pH: 11.5, name: N('Οικιακή αμμωνία', 'Household ammonia', 'Amoníaco doméstico') },
    { pH: 12.6, name: N('Χλωρίνη', 'Bleach', 'Lejía') }
  ];

  // pKw of water vs temperature (Bandura & Lvov 2006, IAPWS) — the pH of neutral water is pKw/2.
  var PKW_T = [[0, 14.94], [10, 14.53], [20, 14.17], [25, 13.995], [30, 13.83], [37, 13.62], [40, 13.53], [50, 13.26], [60, 13.02], [80, 12.60], [100, 12.26]];

  root.PHLabData = { FAMILIES: FAMILIES, COMPOUNDS: COMPOUNDS, CATEGORIES: CATEGORIES, INDICATORS: INDICATORS, UNIVERSAL: UNIVERSAL, EVERYDAY: EVERYDAY, PKW_T: PKW_T };
})(typeof window !== 'undefined' ? window : globalThis);
