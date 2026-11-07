/* ═══════════════════════════════════════════════════════
   convert-icons.js — MODULE 03 Unit Converters
   Εικονίδια των 28 κατηγοριών (SVG, από το Icons.svg).
   Κλειδί = το όνομα της κατηγορίας στο openConverter('κλειδί').
   Φορτώνεται από το MODULE-03-UNIT-CONVERTERS.html με
   <script src="convert-icons.js"></script> (ίδιος φάκελος).
   ═══════════════════════════════════════════════════════ */
window.MC_CONVERT_ICONS = {

    /* Μήκος — code 1 */
    length: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18"/><path d="M6 4L3 7l3 3"/><path d="M18 4l3 3-3 3"/><rect x="2" y="13" width="20" height="7" rx="2"/><path d="M6 13v3.5"/><path d="M10 13v2.5"/><path d="M14 13v3.5"/><path d="M18 13v2.5"/></svg>',

    /* Επιφάνεια — code 2 */
    area: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M14 7v14"/><path d="M7 14h14"/><path d="M7 3h14"/><path d="M3 7v14"/></svg>',

    /* όγκος — code 3 */
    volume: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',

    /* Μάζα — code 4 */
    mass: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M5.5 8h13l2 11a2 2 0 0 1-2 2.3H5.5a2 2 0 0 1-2-2.3l2-11z"/><path d="M9.5 14.5h5"/></svg>',

    /* Θερμοκρασία — code 5 */
    temp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14.76V5a2.5 2.5 0 0 0-5 0v9.76a4.5 4.5 0 1 0 5 0z"/><circle cx="9.5" cy="17.5" r="1.5" fill="#ffffff" stroke="none"/><path d="M9.5 11v5"/><circle cx="18.5" cy="6.5" r="2"/></svg>',

    /* Ταχύτητα — code 6 */
    speed: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 19a9.5 9.5 0 1 0-15 0"/><circle cx="12" cy="16" r="2"/><path d="m13.4 14.6 4.1-4.1"/><path d="M12 6.5V8"/><path d="M5.5 12H7"/><path d="M17 12h1.5"/></svg>',

    /* Χρόνος — code 7 */
    time: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M10 2h4"/><path d="M12 2v3"/><path d="m18.5 5.5 1.5 1.5"/></svg>',

    /* Ενέργεια — code 8 */
    energy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',

    /* Πίεση — code 9 */
    pressure: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10"/><path d="m5 10 3 3 3-3"/><path d="M16 3v10"/><path d="m13 10 3 3 3-3"/><path d="M3 17h18"/><path d="M6 21h12"/></svg>',

    /* Αποθήκευση — code 10 */
    data: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 13h18"/><circle cx="7" cy="16" r="1" fill="#ffffff" stroke="none"/><circle cx="10.5" cy="16" r="1" fill="#ffffff" stroke="none"/><path d="M15 16h3"/></svg>',

    /* Γωνία — code 11 */
    angle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L17 6"/><path d="M4 19h16"/><path d="M13 19a9 9 0 0 0-2.6-6.4"/><circle cx="15.5" cy="10.5" r="1.2" fill="#ffffff" stroke="none"/></svg>',

    /* Συχνότητα — code 12 */
    frequency: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4"/><path d="M8 6v12"/><path d="M12 3v18"/><path d="M16 7v10"/><path d="M20 10v4"/></svg>',

    /* Δύναμη — code 13 */
    force: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="6" width="8" height="12" rx="2"/><path d="M2 18h20"/><path d="M2 12h8"/><path d="m7 8.5 3.5 3.5L7 15.5"/></svg>',

    /* Ισχύς — code 14 */
    power: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>',

    /* Κάυσιμα — code 15 */
    fuel: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h12"/><path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><rect x="6.5" y="7" width="5" height="4" rx="0.5"/><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V9l-3-3"/></svg>',

    /* Επιτάχυνση — code 16 */
    accel: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 19a9.5 9.5 0 1 0-15 0"/><circle cx="12" cy="16" r="2"/><path d="m13.4 14.6 4.1-4.1"/><path d="M19 4v4"/><path d="M17 6h4"/></svg>',

    /* Μεταφορά δεδομένων — code 17 */
    datarate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M8 8h8"/><path d="m13 5 3 3-3 3"/><path d="M16 16H8"/><path d="m11 13-3 3 3 3"/></svg>',

    /* Παροχή — code 18 */
    flow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6v12"/><path d="M21 6v12"/><path d="M3 8h18"/><path d="M3 16h18"/><path d="M7 12h10"/><path d="m14 9.5 2.5 2.5-2.5 2.5"/></svg>',

    /* ιξώδες — code 19 */
    viscosity: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v14a5 5 0 0 0 10 0V3"/><circle cx="12" cy="12" r="2.2" fill="#ffffff" stroke="none"/><path d="M7 8h10"/><path d="M7 16h10"/></svg>',

    /* Φωτισμός — code 20 */
    illuminance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8a5 5 0 0 1 10 0H7z"/><path d="M12 2v1"/><path d="m8 12-3 5"/><path d="M12 12v5"/><path d="m16 12 3 5"/><path d="M3 21h18"/></svg>',

    /* Μαγνιτική ροή — code 21 */
    magflux: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6.5"/><path d="M12 21V3"/><path d="m9 6 3-3 3 3"/></svg>',

    /* Πυκνότητα ροής — code 22 */
    magdensity: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="10" height="16" rx="2"/><path d="M2 8h20"/><path d="m19 5.5 3 2.5-3 2.5"/><path d="M2 12h20"/><path d="M2 16h20"/><path d="m19 13.5 3 2.5-3 2.5"/></svg>',

    /* Μαγνιτικό πεδίο — code 23 */
    magfield: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v5a8 8 0 0 0 16 0V9h-4v5a4 4 0 0 1-8 0V9H4z"/><path d="M4 12h4"/><path d="M16 12h4"/><path d="M8 5.5c2.2-2 5.8-2 8 0"/></svg>',

    /* Μαγνιτική Δύναμη — code 24 */
    magmmf: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15.5h2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0H22"/><path d="M4 9.5h16"/><path d="M7 5.5h10"/></svg>',

    /* φωτεινότητα — code 25 */
    luminance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 17-2.1 2.1"/></svg>',

    /* Φωτεινή ροή — code 26 */
    lumflux: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M15.5 14.2A5.5 5.5 0 1 0 8.5 14.2c.7.6 1.5 1.5 1.5 2.8h4c0-1.3.8-2.2 1.5-2.8z"/><path d="M12 2v1.5"/><path d="m4.2 5.2 1.2 1.2"/><path d="m19.8 5.2-1.2 1.2"/><path d="M2 11h1.5"/><path d="M20.5 11H22"/></svg>',

    /* Φωτεινή ένταση — code 27 */
    lumintensity: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="8" height="9" rx="1.5"/><path d="M12 10v2"/><path d="M12 3s-3 3.2-3 5.2a3 3 0 0 0 6 0C15 6.2 12 3 12 3z"/></svg>',

    /* Δόση ακτινοβολίας — code 28 */
    radiation: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><circle cx="12" cy="12" r="10.2" fill="none" stroke="#ffffff" stroke-width="1.8"/><circle cx="12" cy="12" r="1.9"/><path d="M13.85 8.8 L15.9 5.25 A7.8 7.8 0 0 1 19.8 12 L15.7 12 A3.7 3.7 0 0 0 13.85 8.8 Z"/><path d="M8.3 12 L4.2 12 A7.8 7.8 0 0 1 8.1 5.25 L10.15 8.8 A3.7 3.7 0 0 0 8.3 12 Z"/><path d="M13.85 15.2 L15.9 18.75 A7.8 7.8 0 0 1 8.1 18.75 L10.15 15.2 A3.7 3.7 0 0 0 13.85 15.2 Z"/></svg>'

};
