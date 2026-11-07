/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-data.js
   Reference data that elements.js does not carry. Atomic masses, electronegativity (Pauling), ionisation energy,
   electron affinity, electron shells, CPK colours and names all come from elements.js — nothing is duplicated.
   Sources: covalent radii — Cordero et al., Dalton Trans. 2008 (pm) · van der Waals radii — Bondi 1964 / Alvarez 2013 (pm)
   · ionic radii — Shannon 1976, CN 6 unless the ion is tetrahedral (N³⁻) (pm) · average bond enthalpies and lengths — CRC Handbook /
   Atkins · Madelung/Kapustinskii constants — Kapustinskii 1956 · experimental dipoles and angles — CRC Handbook / NIST CCCBDB.
   ========================================================================== */
(function (root) {
  'use strict';

  /* covalent radii, Z = 1…96 (index = Z−1) */
  var COV = [31, 28, 128, 96, 84, 76, 71, 66, 57, 58, 166, 141, 121, 111, 107, 105, 102, 106, 203, 176, 170, 160, 153, 139, 139, 132, 126, 124, 132, 122, 122, 120, 119, 120, 120, 116,
    220, 195, 190, 175, 164, 154, 147, 146, 142, 139, 145, 144, 142, 139, 139, 138, 139, 140, 244, 215, 207, 204, 203, 201, 199, 198, 198, 196, 194, 192, 192, 189, 190, 187, 187,
    175, 170, 162, 151, 144, 141, 136, 136, 132, 145, 146, 148, 140, 150, 150, 260, 221, 215, 206, 200, 196, 190, 187, 180, 169];

  var VDW = { H: 120, He: 140, Li: 182, Be: 153, B: 192, C: 170, N: 155, O: 152, F: 147, Ne: 154, Na: 227, Mg: 173, Al: 184, Si: 210, P: 180, S: 180, Cl: 175, Ar: 188, K: 275, Ca: 231,
    Ga: 187, Ge: 211, As: 185, Se: 190, Br: 185, Kr: 202, Rb: 303, Sr: 249, In: 193, Sn: 217, Sb: 206, Te: 206, I: 198, Xe: 216, Cs: 343, Ba: 268 };

  /* Shannon effective ionic radii, pm (key = symbol + signed charge) */
  var IONR = { 'H-1': 140, 'Li+1': 76, 'Na+1': 102, 'K+1': 138, 'Rb+1': 152, 'Cs+1': 167, 'Be+2': 45, 'Mg+2': 72, 'Ca+2': 100, 'Sr+2': 118, 'Ba+2': 135, 'Al+3': 53.5, 'Ga+3': 62, 'In+3': 80,
    'Tl+1': 150, 'Sc+3': 74.5, 'Y+3': 90, 'La+3': 103.2, 'Ti+4': 60.5, 'Ti+3': 67, 'Zr+4': 72, 'V+3': 64, 'Cr+3': 61.5, 'Mn+2': 83, 'Mn+4': 53, 'Fe+2': 78, 'Fe+3': 64.5, 'Co+2': 74.5,
    'Co+3': 61, 'Ni+2': 69, 'Cu+1': 77, 'Cu+2': 73, 'Zn+2': 74, 'Ag+1': 115, 'Cd+2': 95, 'Hg+2': 102, 'Hg+1': 119, 'Sn+2': 118, 'Sn+4': 69, 'Pb+2': 119, 'Pb+4': 77.5, 'Au+1': 137, 'Au+3': 85,
    'Pt+2': 80, 'Pd+2': 86, 'Ce+3': 101, 'Ce+4': 87, 'Bi+3': 103, 'F-1': 133, 'Cl-1': 181, 'Br-1': 196, 'I-1': 220, 'O-2': 140, 'S-2': 184, 'Se-2': 198, 'N-3': 146, 'P-3': 212 };

  /* common cation charges, most common first (alkali/alkaline/p-block are rule-based in the engine when absent) */
  var CATIONS = { H: [1], Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1], Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2], Al: [3], Ga: [3], In: [3, 1], Tl: [1, 3], Sn: [2, 4], Pb: [2, 4], Bi: [3],
    Sc: [3], Y: [3], La: [3], Ce: [3, 4], Ti: [4, 3], Zr: [4], V: [3, 2, 4, 5], Cr: [3, 2], Mn: [2, 4], Fe: [3, 2], Co: [2, 3], Ni: [2], Cu: [2, 1], Zn: [2], Ag: [1], Cd: [2], Hg: [2, 1],
    Au: [3, 1], Pt: [2, 4], Pd: [2] };
  /* metals that really have several common ions → the name carries a Roman numeral */
  var MULTI = { Fe: 1, Cu: 1, Sn: 1, Pb: 1, Hg: 1, Au: 1, Co: 1, Mn: 1, Cr: 1, Ti: 1, V: 1, Tl: 1, In: 1, Pt: 1, Ce: 1 };

  /* average single/double/triple bond enthalpy (kJ/mol) and length (pm); key "A-B", "A=B", "A#B", symbols alphabetical */
  var BOND = {
    'H-H': [436, 74], 'C-H': [413, 109], 'H-N': [391, 101], 'H-O': [463, 96], 'F-H': [567, 92], 'Cl-H': [431, 127], 'Br-H': [366, 141], 'H-I': [299, 161], 'H-S': [339, 134], 'H-P': [322, 144],
    'H-Si': [318, 148], 'C-C': [347, 154], 'C-N': [305, 147], 'C-O': [358, 143], 'C-F': [485, 135], 'C-Cl': [339, 177], 'Br-C': [285, 194], 'C-I': [213, 214], 'C-S': [259, 182], 'C-Si': [301, 185],
    'N-N': [160, 145], 'N-O': [201, 140], 'F-N': [272, 136], 'Cl-N': [200, 175], 'O-O': [146, 148], 'F-O': [190, 142], 'Cl-O': [203, 170], 'F-F': [159, 143], 'Cl-Cl': [243, 199], 'Br-Br': [193, 228],
    'I-I': [151, 267], 'S-S': [266, 205], 'P-P': [200, 221], 'Si-Si': [226, 235], 'O-Si': [452, 163], 'Cl-Si': [381, 202], 'Cl-P': [326, 204], 'O-P': [335, 163], 'O-S': [265, 158], 'F-S': [327, 156],
    'Cl-S': [255, 201], 'Cl-F': [253, 163], 'B-F': [613, 130], 'B-Cl': [444, 175], 'B-H': [389, 119],
    'C=C': [614, 134], 'C=N': [615, 128], 'C=O': [799, 120], 'C=S': [573, 156], 'N=N': [418, 125], 'N=O': [607, 121], 'O=O': [498, 121], 'O=S': [523, 143], 'S=S': [425, 189], 'O=P': [544, 146],
    'C#C': [839, 120], 'C#N': [891, 116], 'C#O': [1072, 113], 'N#N': [945, 110]
  };

  /* VSEPR: key AX{n}E{m} → electron geometry, molecular shape, idealised angles (text), hybridisation */
  var VSEPR = {
    'AX1E0': ['linear', 'linear', '—', 'sp'], 'AX1E1': ['linear', 'linear', '—', 'sp'], 'AX1E2': ['linear', 'linear', '—', 'sp'], 'AX1E3': ['linear', 'linear', '—', 'sp'],
    'AX2E0': ['linear', 'linear', '180°', 'sp'], 'AX3E0': ['trigonal', 'trigonal', '120°', 'sp2'], 'AX2E1': ['trigonal', 'bent', '<120°', 'sp2'],
    'AX4E0': ['tetra', 'tetra', '109.5°', 'sp3'], 'AX3E1': ['tetra', 'pyramid', '<109.5°', 'sp3'], 'AX2E2': ['tetra', 'bent', '<109.5°', 'sp3'],
    'AX5E0': ['tbp', 'tbp', '90°, 120°, 180°', 'sp3d'], 'AX4E1': ['tbp', 'seesaw', '<90°, <120°', 'sp3d'], 'AX3E2': ['tbp', 'tshape', '<90°', 'sp3d'], 'AX2E3': ['tbp', 'linear', '180°', 'sp3d'],
    'AX6E0': ['oct', 'oct', '90°, 180°', 'sp3d2'], 'AX5E1': ['oct', 'sqpyr', '<90°', 'sp3d2'], 'AX4E2': ['oct', 'sqplanar', '90°, 180°', 'sp3d2'],
    'AX7E0': ['pbp', 'pbp', '72°, 90°, 180°', 'sp3d3']
  };

  /* normal valences for implicit hydrogens when parsing the organic subset */
  var VAL = { H: [1], B: [3], C: [4], N: [3, 5], O: [2], F: [1], P: [3, 5], S: [2, 4, 6], Cl: [1, 3, 5, 7], Br: [1, 3, 5, 7], I: [1, 3, 5, 7], Si: [4], Se: [2, 4, 6] };

  /* polyatomic ions used to build salts from 3 chosen elements: formula, charge, elements, library id */
  var POLY = [
    { f: 'NH₄', q: 1, e: ['N', 'H'], id: 'NH4+' }, { f: 'OH', q: -1, e: ['O', 'H'], id: 'OH-' }, { f: 'NO₃', q: -1, e: ['N', 'O'], id: 'NO3-' }, { f: 'NO₂', q: -1, e: ['N', 'O'], id: 'NO2-' },
    { f: 'SO₄', q: -2, e: ['S', 'O'], id: 'SO42-' }, { f: 'SO₃', q: -2, e: ['S', 'O'], id: 'SO32-' }, { f: 'CO₃', q: -2, e: ['C', 'O'], id: 'CO32-' }, { f: 'PO₄', q: -3, e: ['P', 'O'], id: 'PO43-' },
    { f: 'ClO₄', q: -1, e: ['Cl', 'O'], id: 'ClO4-' }, { f: 'CN', q: -1, e: ['C', 'N'], id: 'CN-' }
  ];

  /* Greek genitives of metal names that do not follow the regular "-ιο → -ίου" rule */
  var EL_GEN = { 'Σίδηρος': 'σιδήρου', 'Χαλκός': 'χαλκού', 'Ψευδάργυρος': 'ψευδαργύρου', 'Άργυρος': 'αργύρου', 'Κασσίτερος': 'κασσιτέρου', 'Μόλυβδος': 'μολύβδου', 'Υδράργυρος': 'υδραργύρου', 'Χρυσός': 'χρυσού', 'Λευκόχρυσος': 'λευκόχρυσου' };

  /* ---------- the molecule library ----------
     [formula, SMILES-lite, [en, el, es], category, extra]   extra: ang = experimental bond angle (°), mu = experimental dipole (D), arom = Kekulé pair */
  var LIB = [
    ['H₂', '[H][H]', ['Hydrogen', 'Υδρογόνο', 'Hidrógeno'], 'diatomic', { mu: 0 }],
    ['N₂', 'N#N', ['Nitrogen', 'Άζωτο', 'Nitrógeno'], 'diatomic', { mu: 0 }],
    ['O₂', 'O=O', ['Oxygen', 'Οξυγόνο', 'Oxígeno'], 'diatomic', { mu: 0 }],
    ['F₂', 'FF', ['Fluorine', 'Φθόριο', 'Flúor'], 'diatomic', { mu: 0 }],
    ['Cl₂', 'ClCl', ['Chlorine', 'Χλώριο', 'Cloro'], 'diatomic', { mu: 0 }],
    ['Br₂', 'BrBr', ['Bromine', 'Βρώμιο', 'Bromo'], 'diatomic', { mu: 0 }],
    ['I₂', 'II', ['Iodine', 'Ιώδιο', 'Yodo'], 'diatomic', { mu: 0 }],
    ['HF', 'F[H]', ['Hydrogen fluoride', 'Φθοριούχο υδρογόνο', 'Fluoruro de hidrógeno'], 'diatomic', { mu: 1.83 }],
    ['HCl', 'Cl[H]', ['Hydrogen chloride', 'Υδροχλώριο', 'Cloruro de hidrógeno'], 'diatomic', { mu: 1.11 }],
    ['HBr', 'Br[H]', ['Hydrogen bromide', 'Υδροβρώμιο', 'Bromuro de hidrógeno'], 'diatomic', { mu: 0.83 }],
    ['HI', 'I[H]', ['Hydrogen iodide', 'Υδροϊώδιο', 'Yoduro de hidrógeno'], 'diatomic', { mu: 0.45 }],
    ['CO', '[C-]#[O+]', ['Carbon monoxide', 'Μονοξείδιο του άνθρακα', 'Monóxido de carbono'], 'diatomic', { mu: 0.11 }],
    ['NO', '[N]=O', ['Nitric oxide', 'Μονοξείδιο του αζώτου', 'Monóxido de nitrógeno'], 'diatomic', { mu: 0.16 }],
    ['H₂O', 'O', ['Water', 'Νερό', 'Agua'], 'hydride', { ang: 104.5, mu: 1.85 }],
    ['H₂S', 'S', ['Hydrogen sulfide', 'Υδρόθειο', 'Sulfuro de hidrógeno'], 'hydride', { ang: 92.1, mu: 0.97 }],
    ['NH₃', 'N', ['Ammonia', 'Αμμωνία', 'Amoníaco'], 'hydride', { ang: 107, mu: 1.47 }],
    ['PH₃', 'P', ['Phosphine', 'Φωσφίνη', 'Fosfina'], 'hydride', { ang: 93.5, mu: 0.58 }],
    ['CH₄', 'C', ['Methane', 'Μεθάνιο', 'Metano'], 'hydride', { mu: 0 }],
    ['SiH₄', '[SiH4]', ['Silane', 'Σιλάνιο', 'Silano'], 'hydride', { mu: 0 }],
    ['CO₂', 'O=C=O', ['Carbon dioxide', 'Διοξείδιο του άνθρακα', 'Dióxido de carbono'], 'oxide', { mu: 0 }],
    ['CS₂', 'S=C=S', ['Carbon disulfide', 'Διθειάνθρακας', 'Disulfuro de carbono'], 'oxide', { mu: 0 }],
    ['SO₂', 'O=S=O', ['Sulfur dioxide', 'Διοξείδιο του θείου', 'Dióxido de azufre'], 'oxide', { ang: 119, mu: 1.63 }],
    ['SO₃', 'O=S(=O)=O', ['Sulfur trioxide', 'Τριοξείδιο του θείου', 'Trióxido de azufre'], 'oxide', { mu: 0 }],
    ['O₃', '[O-][O+]=O', ['Ozone', 'Όζον', 'Ozono'], 'oxide', { ang: 116.8, mu: 0.53 }],
    ['NO₂', 'O=N[O]', ['Nitrogen dioxide', 'Διοξείδιο του αζώτου', 'Dióxido de nitrógeno'], 'oxide', { ang: 134, mu: 0.32 }],
    ['N₂O', '[N-]=[N+]=O', ['Nitrous oxide', 'Υποξείδιο του αζώτου', 'Óxido nitroso'], 'oxide', { mu: 0.16 }],
    ['Cl₂O', 'ClOCl', ['Dichlorine monoxide', 'Μονοξείδιο του διχλωρίου', 'Monóxido de dicloro'], 'oxide', { ang: 110.9, mu: 0.78 }],
    ['OF₂', 'FOF', ['Oxygen difluoride', 'Διφθοριούχο οξυγόνο', 'Difluoruro de oxígeno'], 'halide', { ang: 103.1, mu: 0.3 }],
    ['SCl₂', 'ClSCl', ['Sulfur dichloride', 'Διχλωριούχο θείο', 'Dicloruro de azufre'], 'halide', { ang: 102.7, mu: 0.36 }],
    ['BeCl₂', 'Cl[Be]Cl', ['Beryllium chloride', 'Χλωριούχο βηρύλλιο', 'Cloruro de berilio'], 'halide', { mu: 0 }],
    ['BF₃', 'FB(F)F', ['Boron trifluoride', 'Τριφθοριούχο βόριο', 'Trifluoruro de boro'], 'halide', { mu: 0 }],
    ['BCl₃', 'ClB(Cl)Cl', ['Boron trichloride', 'Τριχλωριούχο βόριο', 'Tricloruro de boro'], 'halide', { mu: 0 }],
    ['NF₃', 'FN(F)F', ['Nitrogen trifluoride', 'Τριφθοριούχο άζωτο', 'Trifluoruro de nitrógeno'], 'halide', { ang: 102.3, mu: 0.23 }],
    ['NCl₃', 'ClN(Cl)Cl', ['Nitrogen trichloride', 'Τριχλωριούχο άζωτο', 'Tricloruro de nitrógeno'], 'halide', { ang: 107.1, mu: 0.6 }],
    ['PCl₃', 'ClP(Cl)Cl', ['Phosphorus trichloride', 'Τριχλωριούχος φώσφορος', 'Tricloruro de fósforo'], 'halide', { ang: 100.3, mu: 0.56 }],
    ['CCl₄', 'ClC(Cl)(Cl)Cl', ['Carbon tetrachloride', 'Τετραχλωράνθρακας', 'Tetracloruro de carbono'], 'halide', { mu: 0 }],
    ['SiF₄', 'F[Si](F)(F)F', ['Silicon tetrafluoride', 'Τετραφθοριούχο πυρίτιο', 'Tetrafluoruro de silicio'], 'halide', { mu: 0 }],
    ['CHCl₃', 'ClC(Cl)Cl', ['Chloroform', 'Χλωροφόρμιο', 'Cloroformo'], 'halide', { mu: 1.04 }],
    ['CH₂Cl₂', 'ClCCl', ['Dichloromethane', 'Διχλωρομεθάνιο', 'Diclorometano'], 'halide', { mu: 1.6 }],
    ['CH₃Cl', 'CCl', ['Chloromethane', 'Χλωρομεθάνιο', 'Clorometano'], 'halide', { mu: 1.87 }],
    ['XeF₂', 'F[Xe]F', ['Xenon difluoride', 'Διφθοριούχο ξένο', 'Difluoruro de xenón'], 'halide', { mu: 0 }],
    ['ClF₃', 'FCl(F)F', ['Chlorine trifluoride', 'Τριφθοριούχο χλώριο', 'Trifluoruro de cloro'], 'halide', { mu: 0.56 }],
    ['SF₄', 'FS(F)(F)F', ['Sulfur tetrafluoride', 'Τετραφθοριούχο θείο', 'Tetrafluoruro de azufre'], 'halide', { mu: 0.63 }],
    ['XeF₄', 'F[Xe](F)(F)F', ['Xenon tetrafluoride', 'Τετραφθοριούχο ξένο', 'Tetrafluoruro de xenón'], 'halide', { mu: 0 }],
    ['PCl₅', 'ClP(Cl)(Cl)(Cl)Cl', ['Phosphorus pentachloride', 'Πενταχλωριούχος φώσφορος', 'Pentacloruro de fósforo'], 'halide', { mu: 0 }],
    ['BrF₅', 'FBr(F)(F)(F)F', ['Bromine pentafluoride', 'Πενταφθοριούχο βρώμιο', 'Pentafluoruro de bromo'], 'halide', { mu: 1.51 }],
    ['SF₆', 'FS(F)(F)(F)(F)F', ['Sulfur hexafluoride', 'Εξαφθοριούχο θείο', 'Hexafluoruro de azufre'], 'halide', { mu: 0 }],
    ['IF₇', 'FI(F)(F)(F)(F)(F)F', ['Iodine heptafluoride', 'Επταφθοριούχο ιώδιο', 'Heptafluoruro de yodo'], 'halide', { mu: 0 }],
    ['HCN', 'C#N', ['Hydrogen cyanide', 'Υδροκυάνιο', 'Cianuro de hidrógeno'], 'organic', { mu: 2.98 }],
    ['CH₂O', 'C=O', ['Formaldehyde', 'Μεθανάλη (φορμαλδεΰδη)', 'Formaldehído (metanal)'], 'organic', { mu: 2.33 }],
    ['COCl₂', 'ClC(Cl)=O', ['Phosgene', 'Φωσγένιο', 'Fosgeno'], 'organic', { mu: 1.17 }],
    ['C₂H₆', 'CC', ['Ethane', 'Αιθάνιο', 'Etano'], 'organic', { mu: 0 }],
    ['C₂H₄', 'C=C', ['Ethene (ethylene)', 'Αιθένιο (αιθυλένιο)', 'Eteno (etileno)'], 'organic', { mu: 0 }],
    ['C₂H₂', 'C#C', ['Ethyne (acetylene)', 'Αιθίνιο (ακετυλένιο)', 'Etino (acetileno)'], 'organic', { mu: 0 }],
    ['CH₃OH', 'CO', ['Methanol', 'Μεθανόλη', 'Metanol'], 'organic', { mu: 1.7 }],
    ['C₂H₅OH', 'CCO', ['Ethanol', 'Αιθανόλη', 'Etanol'], 'organic', { mu: 1.69 }],
    ['CH₃NH₂', 'CN', ['Methylamine', 'Μεθυλαμίνη', 'Metilamina'], 'organic', { mu: 1.31 }],
    ['HCOOH', 'C(=O)O', ['Formic acid', 'Μεθανικό οξύ', 'Ácido fórmico (metanoico)'], 'organic', { mu: 1.41 }],
    ['CH₃COOH', 'CC(=O)O', ['Acetic acid', 'Αιθανικό οξύ (οξικό οξύ)', 'Ácido acético (etanoico)'], 'organic', { mu: 1.74 }],
    ['(CH₃)₂CO', 'CC(=O)C', ['Acetone', 'Προπανόνη (ακετόνη)', 'Acetona (propanona)'], 'organic', { mu: 2.88 }],
    ['C₆H₆', 'C1=CC=CC=C1', ['Benzene', 'Βενζόλιο', 'Benceno'], 'organic', { arom: true, mu: 0 }],
    ['HNO₃', 'O[N+](=O)[O-]', ['Nitric acid', 'Νιτρικό οξύ', 'Ácido nítrico'], 'acid', {}],
    ['H₂SO₄', 'OS(=O)(=O)O', ['Sulfuric acid', 'Θειικό οξύ', 'Ácido sulfúrico'], 'acid', {}],
    ['H₃PO₄', 'OP(=O)(O)O', ['Phosphoric acid', 'Φωσφορικό οξύ', 'Ácido fosfórico'], 'acid', {}],
    ['H₃O⁺', '[OH3+]', ['Hydronium ion', 'Ιόν υδρονίου', 'Ion hidronio'], 'ion', { ang: 113 }],
    ['NH₄⁺', '[NH4+]', ['Ammonium ion', 'Ιόν αμμωνίου', 'Ion amonio'], 'ion', {}],
    ['OH⁻', '[OH-]', ['Hydroxide ion', 'Ανιόν υδροξειδίου', 'Ion hidróxido'], 'ion', {}],
    ['CN⁻', '[C-]#N', ['Cyanide ion', 'Κυανιούχο ανιόν', 'Ion cianuro'], 'ion', {}],
    ['NO₂⁻', '[O-]N=O', ['Nitrite ion', 'Νιτρώδες ανιόν', 'Ion nitrito'], 'ion', { ang: 115 }],
    ['NO₃⁻', '[O-][N+](=O)[O-]', ['Nitrate ion', 'Νιτρικό ανιόν', 'Ion nitrato'], 'ion', {}],
    ['CO₃²⁻', '[O-]C(=O)[O-]', ['Carbonate ion', 'Ανθρακικό ανιόν', 'Ion carbonato'], 'ion', {}],
    ['SO₃²⁻', '[O-]S(=O)[O-]', ['Sulfite ion', 'Θειώδες ανιόν', 'Ion sulfito'], 'ion', {}],
    ['SO₄²⁻', '[O-]S(=O)(=O)[O-]', ['Sulfate ion', 'Θειικό ανιόν', 'Ion sulfato'], 'ion', {}],
    ['PO₄³⁻', '[O-]P(=O)([O-])[O-]', ['Phosphate ion', 'Φωσφορικό ανιόν', 'Ion fosfato'], 'ion', {}],
    ['ClO₄⁻', '[O-]Cl(=O)(=O)=O', ['Perchlorate ion', 'Υπερχλωρικό ανιόν', 'Ion perclorato'], 'ion', {}],
    ['I₃⁻', 'I[I-]I', ['Triiodide ion', 'Τριιωδιούχο ανιόν', 'Ion triyoduro'], 'ion', {}]
  ];

  root.BSData = { COV: COV, VDW: VDW, IONR: IONR, CATIONS: CATIONS, MULTI: MULTI, BOND: BOND, VSEPR: VSEPR, VAL: VAL, POLY: POLY, EL_GEN: EL_GEN, LIB: LIB };
})(typeof window !== 'undefined' ? window : globalThis);
