// index.js — Guest Assistant (Viale Trastevere 108) — Multilingual + Native Voices + Feedback Webhook

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // static (logo, favicon)

// ---------------- ENV (feedback) ----------------
const WEBHOOK_URL = process.env.WEBHOOK_URL || ''; // <= incolla qui la URL dell’Apps Script (env su Render)

// ---------------- Base ----------------
const base = {
  apartment_id: 'VIALETRASTEVERE108',
  name: 'Viale Trastevere 108',
  address: 'Viale Trastevere 108, Rome, Italy',
  checkin_time: '15:00',
  checkout_time: '11:00',
  host_phone: '+39 335 5245756',
  apt_label: { en:'Apartment', it:'Appartamento', fr:'Appartement', de:'Apartment', es:'Apartamento' }
};

// ---------------- Contenuti localizzati ----------------
const APT_I18N = {
  en: {
    // Wi-Fi
    wifi_note: 'Near the TV there is a WHITE router. Turn it around to see the label with SSID & password.',
    wifi_ssid: 'See router label',
    wifi_password: 'See router label',

    // Water / AC / Bathroom / Towels
    water_note: 'Tap water is safe to drink. Hot water is always on.',
    ac_note: 'Please turn OFF the air conditioning when you leave the apartment.',
    bathroom_amenities: 'Toilet paper, hand soap, bath mat, hairdryer.',
    towels_note: 'Per guest: 1 large + 1 medium towel. Beds are prepared on arrival.',
    bathroom_notice: 'IMPORTANT (bathroom between the bedrooms): use ONLY the toilet paper provided. Do NOT flush anything else or the system will clog and overflow. Unclogging costs €100.',

    // Bedrooms / keys
    bedrooms_note: 'Two bedrooms + a double sofa bed. Keys are on the table on arrival.',

    // Kitchen & Gas
    gas_steps: 'Gas handle (left of the meter): DOWN = CLOSED • HORIZONTAL = OPEN. To cook: 1) choose burner, 2) push knob down and turn, 3) keep pressed a few seconds until the flame is steady, 4) release.',
    kitchen_note: 'The kitchen is fully stocked and ready to use.',

    // Building / Access / Concierge / Registration
    intercom_note: '—',
    main_door_hours: 'Building door accessible with the key provided.',
    concierge: 'Concierge: Massimo — desk hours 08:30–13:00 and 15:30–18:30.',
    registration_note: 'Please send your passports via WhatsApp to the host for mandatory guest registration.',

    // Services nearby
    supermarkets: 'Mini-market on Viale Trastevere near 108 • Fresh produce at Largo/Piazza San Cosimato (mornings).',
    pharmacies: 'Pharmacy at Piazza Trilussa • Other options along Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 min).',
    laundry: 'Self-service laundry — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'ATMs along Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',

    // Transport
    transport: 'Tram 8 → Largo Argentina / Piazza Venezia. Tram 3 nearby. Bus H → Termini. Taxi: +39 06 3570 or FreeNow app.',
    airports: 'Fiumicino: Tram 8 → Trastevere Station → FL1 train (~45 min). Ciampino: bus to Termini then Tram 8. Private transfer: Welcome Pickups.',

    // Safety & useful numbers
    emergency: 'EU Emergency 112 • Police 113 • Ambulance 118 • Fire 115 • English-speaking doctor +39 06 488 2371 • 24h vet +39 06 660 681',

    // Eat / Drink / Shop / Visit / Experiences / Day trips
    eat: 'Da Enzo al 29; Osteria der Belli; Tonnarello; Trattoria Da Teo; Spirito di Vino; Pianostrada; Trapizzino.',
    drink: 'Enoteca Ferrara; Freni e Frizioni; L’Angolo Divino; Mimì e Cocò; La Prosciutteria Trastevere.',
    shop: 'Porta Portese Market (Sun); artisanal bakeries & delis along Viale Trastevere; Via della Lungaretta boutiques.',
    visit: 'Santa Maria in Trastevere; Santa Cecilia; Museo di Roma in Trastevere; Orto Botanico; Villa Farnesina; Piazza Trilussa; walk over Ponte Sisto to Campo de’ Fiori.',
    experiences: 'Evening walk: Viale Trastevere → Piazza Trilussa → Santa Maria → alleys → Tiber waterfront → Campo de’ Fiori. Aperitivo at Freni e Frizioni; church tour (S. Maria & S. Cecilia); sunset at Gianicolo.',
    romantic_walk: 'Start: Viale Trastevere 108 → Piazza S. Maria in Trastevere → Gianicolo Terrace → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → back to Viale Trastevere 108.',
    daytrips: 'Ostia Antica (~40 min) • Tivoli (Villa d’Este & Hadrian’s Villa ~1h) • Castelli Romani (villages & wine).',

    // Check-out
    checkout_note: 'Before leaving: turn off lights/AC, close windows, leave keys on the table, and lock the door.'
  },

  it: {
    wifi_note: 'Vicino alla TV c’è un router BIANCO. Giralo per leggere sull’etichetta SSID e password.',
    wifi_ssid: 'Vedi etichetta del router',
    wifi_password: 'Vedi etichetta del router',
    water_note: 'L’acqua del rubinetto è potabile. L’acqua calda è sempre attiva.',
    ac_note: 'Spegni l’aria condizionata quando lasci l’appartamento.',
    bathroom_amenities: 'Carta igienica, sapone mani, tappetino, asciugacapelli.',
    towels_note: 'Per ospite: 1 telo grande + 1 medio. Letti pronti all’arrivo.',
    bathroom_notice: 'IMPORTANTE (bagno tra le camere): usare SOLO la carta igienica fornita. NON gettare altro nel WC: si intasa e tracima. Sblocco €100.',
    bedrooms_note: 'Due camere da letto + divano letto matrimoniale. Le chiavi sono sul tavolo all’arrivo.',
    gas_steps: 'Manopola gas (a sinistra del contatore): IN BASSO = CHIUSO • ORIZZONTALE = APERTO. Per cucinare: 1) scegli il fuoco, 2) premi e gira la manopola, 3) tieni premuto pochi secondi finché la fiamma è stabile, 4) rilascia.',
    kitchen_note: 'Cucina completa e pronta all’uso.',
    intercom_note: '—',
    main_door_hours: 'Portone accessibile con la chiave fornita.',
    concierge: 'Portineria: Massimo — orari 08:30–13:00 e 15:30–18:30.',
    registration_note: 'Per la registrazione obbligatoria, invia i passaporti via WhatsApp all’host.',
    supermarkets: 'Mini-market su Viale Trastevere vicino al 108 • Prodotti freschi a Largo/Piazza San Cosimato (mattina).',
    pharmacies: 'Farmacia a Piazza Trilussa • Altre lungo Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 min).',
    laundry: 'Lavanderia self-service — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'Bancomat lungo Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',
    transport: 'Tram 8 → Largo Argentina / Piazza Venezia. Tram 3 vicino. Bus H → Termini. Taxi: +39 06 3570 o app FreeNow.',
    airports: 'Fiumicino: Tram 8 → Stazione Trastevere → FL1 (~45 min). Ciampino: bus per Termini poi Tram 8. Transfer privato: Welcome Pickups.',
    emergency: 'Emergenze UE 112 • Polizia 113 • Ambulanza 118 • Vigili del Fuoco 115 • Medico in inglese +39 06 488 2371 • Veterinario 24h +39 06 660 681',
    eat: 'Da Enzo al 29; Osteria der Belli; Tonnarello; Trattoria Da Teo; Spirito di Vino; Pianostrada; Trapizzino.',
    drink: 'Enoteca Ferrara; Freni e Frizioni; L’Angolo Divino; Mimì e Cocò; La Prosciutteria Trastevere.',
    shop: 'Mercato di Porta Portese (dom); forni e gastronomie artigianali su Viale Trastevere; boutique in Via della Lungaretta.',
    visit: 'Santa Maria in Trastevere; Santa Cecilia; Museo di Roma in Trastevere; Orto Botanico; Villa Farnesina; Piazza Trilussa; passeggiata su Ponte Sisto verso Campo de’ Fiori.',
    experiences: 'Passeggiata serale: Viale Trastevere → Piazza Trilussa → S. Maria → vicoli → Lungotevere → Campo de’ Fiori. Aperitivo da Freni e Frizioni; chiese (S. Maria & S. Cecilia); tramonto al Gianicolo.',
    romantic_walk: 'Partenza: Viale Trastevere 108 → Piazza S. Maria in Trastevere → Terrazza del Gianicolo → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → ritorno a Viale Trastevere 108.',
    daytrips: 'Ostia Antica (~40 min) • Tivoli (Villa d’Este & Villa Adriana ~1h) • Castelli Romani.',
    checkout_note: 'Prima di partire: spegni luci/AC, chiudi le finestre, lascia le chiavi sul tavolo e chiudi a chiave la porta.'
  },

  fr: {
    wifi_note: 'Près de la TV se trouve un routeur BLANC. Tournez-le pour lire sur l’étiquette le SSID et le mot de passe.',
    wifi_ssid: 'Voir l’étiquette du routeur',
    wifi_password: 'Voir l’étiquette du routeur',
    water_note: 'L’eau du robinet est potable. L’eau chaude est toujours disponible.',
    ac_note: 'Merci d’éteindre la climatisation en quittant l’appartement.',
    bathroom_amenities: 'Papier toilette, savon pour les mains, tapis de bain, sèche-cheveux.',
    towels_note: 'Par personne : 1 grande + 1 moyenne. Lits prêts à l’arrivée.',
    bathroom_notice: 'IMPORTANT (salle de bain entre les chambres) : n’utilisez QUE le papier toilette fourni. Ne jetez rien d’autre dans les WC, sinon risque de bouchon et de débordement. Débouchage 100 €.',
    bedrooms_note: 'Deux chambres + un canapé-lit double. Les clés sont sur la table à l’arrivée.',
    gas_steps: 'Robinet de gaz (à gauche du compteur) : BAS = FERMÉ • HORIZONTAL = OUVERT. Pour cuisiner : 1) choisir le brûleur, 2) appuyer et tourner, 3) maintenir quelques secondes jusqu’à flamme stable, 4) relâcher.',
    kitchen_note: 'Cuisine entièrement équipée, prête à l’emploi.',
    intercom_note: '—',
    main_door_hours: 'Porte d’immeuble accessible avec la clé fournie.',
    concierge: 'Concierge : Massimo — bureau 08:30–13:00 et 15:30–18:30.',
    registration_note: 'Veuillez envoyer vos passeports par WhatsApp à l’hôte (enregistrement obligatoire).',
    supermarkets: 'Mini-marché sur Viale Trastevere près du 108 • Produits frais à Largo/Piazza San Cosimato (matin).',
    pharmacies: 'Pharmacie à Piazza Trilussa • Autres options le long de Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 min).',
    laundry: 'Laverie self-service — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'DAB le long de Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',
    transport: 'Tram 8 → Largo Argentina / Piazza Venezia. Tram 3 à proximité. Bus H → Termini. Taxi : +39 06 3570 ou appli FreeNow.',
    airports: 'Fiumicino : Tram 8 → gare de Trastevere → train FL1 (~45 min). Ciampino : bus vers Termini puis Tram 8. Transfert privé : Welcome Pickups.',
    emergency: 'Urgences UE 112 • Police 113 • Ambulance 118 • Pompiers 115 • Médecin anglophone +39 06 488 2371 • Vétérinaire 24h +39 06 660 681',
    eat: 'Da Enzo al 29 ; Osteria der Belli ; Tonnarello ; Trattoria Da Teo ; Spirito di Vino ; Pianostrada ; Trapizzino.',
    drink: 'Enoteca Ferrara ; Freni e Frizioni ; L’Angolo Divino ; Mimì e Cocò ; La Prosciutteria Trastevere.',
    shop: 'Marché de Porta Portese (dim) ; boulangeries et traiteurs artisanaux le long de Viale Trastevere ; boutiques Via della Lungaretta.',
    visit: 'Santa Maria in Trastevere ; Santa Cecilia ; Musée de Rome à Trastevere ; Orto Botanico ; Villa Farnesina ; Piazza Trilussa ; promenade sur le Ponte Sisto vers Campo de’ Fiori.',
    experiences: 'Balade du soir : Viale Trastevere → Piazza Trilussa → Santa Maria → ruelles → berges du Tibre → Campo de’ Fiori. Apéritif chez Freni e Frizioni ; églises (S. Maria & S. Cecilia) ; coucher de soleil au Janicule.',
    romantic_walk: 'Départ : Viale Trastevere 108 → Piazza S. Maria in Trastevere → Terrasse du Janicule → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → retour.',
    daytrips: 'Ostia Antica (~40 min) • Tivoli (Villa d’Este & Villa d’Hadrien ~1h) • Castelli Romani.',
    checkout_note: 'Avant de partir : éteignez lumières/clim, fermez les fenêtres, laissez les clés sur la table et fermez à clé.'
  },

  de: {
    wifi_note: 'Neben dem Fernseher steht ein WEISSER Router. Umdrehen, um SSID & Passwort auf dem Etikett zu sehen.',
    wifi_ssid: 'Siehe Router-Etikett',
    wifi_password: 'Siehe Router-Etikett',
    water_note: 'Leitungswasser ist trinkbar. Warmwasser ist immer an.',
    ac_note: 'Bitte schalten Sie die Klimaanlage aus, wenn Sie die Wohnung verlassen.',
    bathroom_amenities: 'Toilettenpapier, Handseife, Badematte, Föhn.',
    towels_note: 'Pro Gast: 1 großes + 1 mittleres Handtuch. Betten bei Ankunft gemacht.',
    bathroom_notice: 'WICHTIG (Bad zwischen den Schlafzimmern): Nur die bereitgestellte Toilettenpapier verwenden. Sonst verstopft das System (100 € Entsorgung).',
    bedrooms_note: 'Zwei Schlafzimmer + ein Schlafsofa (Doppelbett). Schlüssel liegen bei Ankunft auf dem Tisch.',
    gas_steps: 'Gashahn (links vom Zähler): UNTEN = ZU • WAAGRECHT = OFFEN. Kochen: 1) Brenner wählen, 2) Knopf drücken & drehen, 3) einige Sekunden halten bis Flamme stabil, 4) loslassen.',
    kitchen_note: 'Küche vollständig ausgestattet und einsatzbereit.',
    intercom_note: '—',
    main_door_hours: 'Haustür mit bereitgestelltem Schlüssel zugänglich.',
    concierge: 'Hausmeister: Massimo — 08:30–13:00 und 15:30–18:30.',
    registration_note: 'Bitte Pässe per WhatsApp an den Gastgeber senden (gesetzliche Registrierung).',
    supermarkets: 'Mini-Market an der Viale Trastevere nahe 108 • Frischemärkte an Largo/Piazza San Cosimato (morgens).',
    pharmacies: 'Apotheke an der Piazza Trilussa • Weitere entlang der Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 Min).',
    laundry: 'Waschsalon — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'Geldautomaten entlang der Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',
    transport: 'Tram 8 → Largo Argentina / Piazza Venezia. Tram 3 in der Nähe. Bus H → Termini. Taxi: +39 06 3570 oder FreeNow-App.',
    airports: 'Fiumicino: Tram 8 → Bahnhof Trastevere → FL1 (~45 Min). Ciampino: Bus nach Termini, dann Tram 8. Privater Transfer: Welcome Pickups.',
    emergency: 'EU-Notruf 112 • Polizei 113 • Rettung 118 • Feuerwehr 115 • Englischsprachiger Arzt +39 06 488 2371 • Tierarzt 24h +39 06 660 681',
    eat: 'Da Enzo al 29; Osteria der Belli; Tonnarello; Trattoria Da Teo; Spirito di Vino; Pianostrada; Trapizzino.',
    drink: 'Enoteca Ferrara; Freni e Frizioni; L’Angolo Divino; Mimì e Cocò; La Prosciutteria Trastevere.',
    shop: 'Markt Porta Portese (So.); Bäckereien & Delis entlang der Viale Trastevere; Boutiquen in der Via della Lungaretta.',
    visit: 'Santa Maria in Trastevere; Santa Cecilia; Museo di Roma in Trastevere; Orto Botanico; Villa Farnesina; Piazza Trilussa; Spaziergang über die Ponte Sisto zum Campo de’ Fiori.',
    experiences: 'Abendrunde: Viale Trastevere → Piazza Trilussa → Santa Maria → Gassen → Tiberufer → Campo de’ Fiori. Aperitivo bei Freni e Frizioni; Kirchen (S. Maria & S. Cecilia); Sonnenuntergang am Gianicolo.',
    romantic_walk: 'Start: Viale Trastevere 108 → Piazza S. Maria in Trastevere → Gianicolo-Terrasse → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → zurück.',
    daytrips: 'Ostia Antica (~40 Min) • Tivoli (Villa d’Este & Hadriansvilla ~1h) • Castelli Romani.',
    checkout_note: 'Vor der Abreise: Licht/AC aus, Fenster schließen, Schlüssel auf dem Tisch lassen und Tür abschließen.'
  },

  es: {
    wifi_note: 'Cerca de la TV hay un router BLANCO. Gíralo para ver en la etiqueta el SSID y la contraseña.',
    wifi_ssid: 'Ver etiqueta del router',
    wifi_password: 'Ver etiqueta del router',
    water_note: 'El agua del grifo es potable. El agua caliente está siempre activa.',
    ac_note: 'Apaga el aire acondicionado al salir del apartamento.',
    bathroom_amenities: 'Papel higiénico, jabón de manos, alfombrilla, secador.',
    towels_note: 'Por huésped: 1 toalla grande + 1 mediana. Camas preparadas a la llegada.',
    bathroom_notice: 'IMPORTANTE (baño entre los dormitorios): usa SOLO el papel higiénico proporcionado. No tires nada más o el sistema se atasca (desatasco 100 €).',
    bedrooms_note: 'Dos dormitorios + sofá cama doble. Las llaves están en la mesa a la llegada.',
    gas_steps: 'Llave del gas (izquierda del contador): ABAJO = CERRADO • HORIZONTAL = ABIERTO. Para cocinar: 1) elige fogón, 2) presiona y gira la perilla, 3) mantén unos segundos hasta que la llama sea estable, 4) suelta.',
    kitchen_note: 'Cocina completamente equipada y lista para usar.',
    intercom_note: '—',
    main_door_hours: 'Puerta del edificio accesible con la llave proporcionada.',
    concierge: 'Conserje: Massimo — 08:30–13:00 y 15:30–18:30.',
    registration_note: 'Envía los pasaportes por WhatsApp al anfitrión (registro obligatorio).',
    supermarkets: 'Mini-market en Viale Trastevere cerca del 108 • Productos frescos en Largo/Piazza San Cosimato (mañanas).',
    pharmacies: 'Farmacia en Piazza Trilussa • Otras opciones a lo largo de Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 min).',
    laundry: 'Lavandería autoservicio — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'Cajeros a lo largo de Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',
    transport: 'Tranvía 8 → Largo Argentina / Piazza Venezia. Tranvía 3 cerca. Bus H → Termini. Taxi: +39 06 3570 o app FreeNow.',
    airports: 'Fiumicino: Tranvía 8 → Estación Trastevere → FL1 (~45 min). Ciampino: bus a Termini y luego Tranvía 8. Traslado privado: Welcome Pickups.',
    emergency: 'Emergencia UE 112 • Policía 113 • Ambulancia 118 • Bomberos 115 • Médico en inglés +39 06 488 2371 • Veterinario 24h +39 06 660 681',
    eat: 'Da Enzo al 29; Osteria der Belli; Tonnarello; Trattoria Da Teo; Spirito di Vino; Pianostrada; Trapizzino.',
    drink: 'Enoteca Ferrara; Freni e Frizioni; L’Angolo Divino; Mimì e Cocò; La Prosciutteria Trastevere.',
    shop: 'Mercado de Porta Portese (dom.); panaderías y charcuterías artesanales en Viale Trastevere; boutiques en Via della Lungaretta.',
    visit: 'Santa Maria in Trastevere; Santa Cecilia; Museo de Roma en Trastevere; Orto Botanico; Villa Farnesina; Piazza Trilussa; paseo por el Ponte Sisto hacia Campo de’ Fiori.',
    experiences: 'Paseo vespertino: Viale Trastevere → Piazza Trilussa → Santa Maria → callejuelas → ribera del Tíber → Campo de’ Fiori. Aperitivo en Freni e Frizioni; iglesias (S. Maria y S. Cecilia); atardecer en el Gianicolo.',
    romantic_walk: 'Inicio: Viale Trastevere 108 → Piazza S. Maria in Trastevere → Terraza del Gianicolo → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → regreso.',
    daytrips: 'Ostia Antica (~40 min) • Tivoli (Villa d’Este y Villa Adriana ~1h) • Castelli Romani.',
    checkout_note: 'Antes de salir: apaga luces/AC, cierra ventanas, deja las llaves en la mesa y cierra con llave.'
  }
};

// ---------------- Template risposte per intent ----------------
const FAQ_TPL = {
  en: {
    wifi: `Wi-Fi: {wifi_note}\nNetwork: {wifi_ssid}. Password: {wifi_password}.`,
    checkin: `Check-in from ${base.checkin_time}.\n{bedrooms_note}\n{registration_note}\n{concierge}\nNeed help? Call ${base.host_phone}.`,
    checkout: `{checkout_note}`,
    water: `{water_note}`,
    ac: `{ac_note}`,
    bathroom: `Bathrooms: {bathroom_amenities}\nTowels: {towels_note}\n{bathroom_notice}`,
    kitchen: `{kitchen_note}\nGas use: {gas_steps}`,
    building: `Door: {main_door_hours}\n{concierge}`,
    services: `Supermarkets: {supermarkets}
Pharmacies: {pharmacies}
Hospital: {hospital}
ATMs: {atms}
Laundry: {laundry}
Luggage storage: {luggage}
SIMs: {sims}`,
    transport: `{transport}
Airports: {airports}`,
    eat:`{eat}`, drink:`{drink}`, shop:`{shop}`, visit:`{visit}`,
    experience:`{experiences}\nRomantic route: {romantic_walk}`,
    daytrips:`{daytrips}`,
    emergency:`{emergency}`
  },
  it: {
    wifi: `Wi-Fi: {wifi_note}\nRete: {wifi_ssid}. Password: {wifi_password}.`,
    checkin: `Check-in dalle ${base.checkin_time}.\n{bedrooms_note}\n{registration_note}\n{concierge}\nServe aiuto? Chiama ${base.host_phone}.`,
    checkout: `{checkout_note}`,
    water: `{water_note}`,
    ac: `{ac_note}`,
    bathroom: `Bagni: {bathroom_amenities}\nAsciugamani: {towels_note}\n{bathroom_notice}`,
    kitchen: `{kitchen_note}\nUso gas: {gas_steps}`,
    building: `Portone: {main_door_hours}\n{concierge}`,
    services: `Supermercati: {supermarkets}
Farmacie: {pharmacies}
Ospedale: {hospital}
Bancomat: {atms}
Lavanderia: {laundry}
Deposito bagagli: {luggage}
SIM: {sims}`,
    transport: `{transport}
Aeroporti: {airports}`,
    eat:`{eat}`, drink:`{drink}`, shop:`{shop}`, visit:`{visit}`,
    experience:`{experiences}\nPercorso romantico: {romantic_walk}`,
    daytrips:`{daytrips}`,
    emergency:`{emergency}`
  },
  fr: {
    wifi: `Wi-Fi : {wifi_note}\nRéseau : {wifi_ssid}. Mot de passe : {wifi_password}.`,
    checkin: `Arrivée à partir de ${base.checkin_time}.\n{bedrooms_note}\n{registration_note}\n{concierge}\nBesoin d’aide ? ${base.host_phone}.`,
    checkout: `{checkout_note}`,
    water: `{water_note}`,
    ac: `{ac_note}`,
    bathroom: `Salles de bain : {bathroom_amenities}\nServiettes : {towels_note}\n{bathroom_notice}`,
    kitchen: `{kitchen_note}\nGaz : {gas_steps}`,
    building: `Porte : {main_door_hours}\n{concierge}`,
    services: `Supermarchés : {supermarkets}
Pharmacies : {pharmacies}
Hôpital : {hospital}
DAB : {atms}
Laverie : {laundry}
Consigne : {luggage}
Cartes SIM : {sims}`,
    transport: `{transport}
Aéroports : {airports}`,
    eat:`{eat}`, drink:`{drink}`, shop:`{shop}`, visit:`{visit}`,
    experience:`{experiences}\nParcours romantique : {romantic_walk}`,
    daytrips:`{daytrips}`,
    emergency:`{emergency}`
  },
  de: {
    wifi: `WLAN: {wifi_note}\nNetz: {wifi_ssid}. Passwort: {wifi_password}.`,
    checkin: `Check-in ab ${base.checkin_time} Uhr.\n{bedrooms_note}\n{registration_note}\n{concierge}\nHilfe? ${base.host_phone}.`,
    checkout: `{checkout_note}`,
    water: `{water_note}`,
    ac: `{ac_note}`,
    bathroom: `Bäder: {bathroom_amenities}\nHandtücher: {towels_note}\n{bathroom_notice}`,
    kitchen: `{kitchen_note}\nGas: {gas_steps}`,
    building: `Tür: {main_door_hours}\n{concierge}`,
    services: `Supermärkte: {supermarkets}
Apotheken: {pharmacies}
Krankenhaus: {hospital}
Geldautomaten: {atms}
Waschsalon: {laundry}
Gepäckaufbewahrung: {luggage}
SIM-Karten: {sims}`,
    transport: `{transport}
Flughäfen: {airports}`,
    eat:`{eat}`, drink:`{drink}`, shop:`{shop}`, visit:`{visit}`,
    experience:`{experiences}\nRomantische Route: {romantic_walk}`,
    daytrips:`{daytrips}`,
    emergency:`{emergency}`
  },
  es: {
    wifi: `Wi-Fi: {wifi_note}\nRed: {wifi_ssid}. Contraseña: {wifi_password}.`,
    checkin: `Check-in desde las ${base.checkin_time}.\n{bedrooms_note}\n{registration_note}\n{concierge}\n¿Necesitas ayuda? ${base.host_phone}.`,
    checkout: `{checkout_note}`,
    water: `{water_note}`,
    ac: `{ac_note}`,
    bathroom: `Baños: {bathroom_amenities}\nToallas: {towels_note}\n{bathroom_notice}`,
    kitchen: `{kitchen_note}\nUso del gas: {gas_steps}`,
    building: `{main_door_hours}\n{concierge}`,
    services: `Supermercados: {supermarkets}
Farmacias: {pharmacies}
Hospital: {hospital}
Cajeros: {atms}
Lavandería: {laundry}
Consigna: {luggage}
SIM: {sims}`,
    transport: `{transport}
Aeropuertos: {airports}`,
    eat:`{eat}`, drink:`{drink}`, shop:`{shop}`, visit:`{visit}`,
    experience:`{experiences}\nRuta romántica: {romantic_walk}`,
    daytrips:`{daytrips}`,
    emergency:`{emergency}`
  }
};

// ---------------- Intent matching (keyword EN) ----------------
const INTENTS = [
  { key:'wifi',      utter:['wifi','wi-fi','internet','password','router'] },
  { key:'checkin',   utter:['check in','arrival','access','self check-in','entrance','intercom','doorbell'] },
  { key:'checkout',  utter:['check out','leave','departure'] },
  { key:'water',     utter:['water','hot water','drinkable','tap'] },
  { key:'ac',        utter:['ac','air conditioning','aircon','air'] },
  { key:'bathroom',  utter:['bathroom','hairdryer','soap','towels','toilet','notice'] },
  { key:'kitchen',   utter:['kitchen','cook','cooking','stove','gas'] },
  { key:'building',  utter:['building','elevator','door','hours','concierge'] },
  { key:'services',  utter:['services','pharmacy','hospital','atm','sim','laundry','luggage','supermarket','groceries'] },
  { key:'transport', utter:['transport','tram','bus','taxi','airport','train','metro'] },
  { key:'eat',       utter:['eat','restaurant','dinner','lunch','food'] },
  { key:'drink',     utter:['drink','bar','wine','cocktail','aperitivo'] },
  { key:'shop',      utter:['shop','market','shopping','bakeries'] },
  { key:'visit',     utter:['visit','what to visit','see','sight','attraction','museum'] },
  { key:'experience',utter:['experience','walk','tour','itinerary','sunset','romantic'] },
  { key:'daytrips',  utter:['day trips','day trip','tivoli','ostia','castelli','excursion','bracciano'] },
  { key:'emergency', utter:['emergency','police','ambulance','fire','doctor','vet'] }
];

function norm(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function detectIntent(msg){
  const t = norm(msg); let best=null, scoreBest=0;
  for(const it of INTENTS){ let s=0; for(const u of it.utter){ if(t.includes(norm(u))) s++; } if(s>scoreBest){best=it; scoreBest=s;} }
  return best?.key || null;
}
function fill(tpl, dict){ return tpl.replace(/\{(\w+)\}/g,(_,k)=>dict[k] ?? `{${k}}`); }

// -------- OpenAI opzionale (non necessario per la localizzazione) --------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
async function polishOptional(text, lang){
  if (!client) return text;
  const sys = `You are a helpful assistant. Keep the language as: ${lang}. Do not change facts. Max ~120 words unless steps are needed.`;
  try{
    const r = await client.responses.create({
      model: OPENAI_MODEL,
      input: [{ role:'system', content: sys }, { role:'user', content: text }]
    });
    return r.output_text || text;
  }catch{ return text; }
}

// ---------------- API ----------------
app.post('/api/message', async (req,res)=>{
  const { message='', lang='en' } = req.body || {};
  const L = (APT_I18N[lang] ? lang : 'en');
  const intent = detectIntent(message);

  let out = '';
  if (intent) {
    const tpl = FAQ_TPL[L][intent];
    out = fill(tpl, APT_I18N[L]);
  } else {
    const fallback = {
      en:'I did not find a direct answer. Try a button or use keywords (wifi, kitchen, transport, visit…).',
      it:'Non ho trovato una risposta diretta. Prova un pulsante o usa parole chiave (wifi, cucina, trasporti, visitare…).',
      fr:"Je n’ai pas trouvé de réponse directe. Essayez un bouton ou des mots-clés (wifi, cuisine, transports, visiter…).",
      de:'Keine direkte Antwort gefunden. Nutze einen Button oder Stichwörter (WLAN, Küche, Verkehr, Sehenswürdigkeiten…).',
      es:'No encontré una respuesta directa. Prueba un botón o usa palabras clave (wifi, cocina, transporte, visitar…).'
    }[L];
    out = fallback;
  }
  const text = await polishOptional(out, L);
  res.json({ text, intent });
});

// ---- Feedback proxy -> Google Apps Script (webhook) ----
app.post('/api/feedback', async (req, res) => {
  const payload = req.body || {};
  if (!WEBHOOK_URL) {
    console.log('Feedback (no WEBHOOK_URL):', payload);
    return res.json({ ok: false, error: 'WEBHOOK_URL missing' });
  }
  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const ok = r.ok;
    const text = await r.text().catch(()=> '');
    return res.json({ ok, echo: text.slice(0,200) });
  } catch (e) {
    console.error('Feedback error:', e);
    return res.json({ ok: false, error: String(e?.message || e) });
  }
});

// ---------------- UI (single file) ----------------
app.get('/', (_req,res)=>{
  const BUTTON_KEYS = [
    'wifi','check in','check out','water','AC','bathroom','kitchen','building',
    'eat','drink','shop','visit','experience','day trips',
    'transport','services','emergency'
  ];

  const UI_I18N = {
    en:{ welcome:'Hi, I am Samantha, your virtual guide. Tap a button to get a quick answer.',
         placeholder:'Hi, I am Samantha, your virtual guide. Tap a button for a quick answer — or type here…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'water','AC':'AC','bathroom':'bathroom','kitchen':'kitchen','building':'building',
           eat:'eat', drink:'drink', shop:'shop', visit:'visit', experience:'experience', 'day trips':'day trips',
           transport:'transport', services:'services', emergency:'emergency' },
         voice_on:'🔊 Voice: On', voice_off:'🔇 Voice: Off', apt_label: base.apt_label.en,
         fb_label:'Was this helpful?', like:'👍 Helpful', dislike:'👎 Not helpful', thanks:'Thanks for the feedback!' },
    it:{ welcome:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante per una risposta rapida.',
         placeholder:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante — oppure scrivi qui…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'acqua','AC':'aria condizionata','bathroom':'bagno','kitchen':'cucina','building':'edificio',
           eat:'mangiare', drink:'bere', shop:'shopping', visit:'visitare', experience:'esperienze', 'day trips':'gite di un giorno',
           transport:'trasporti', services:'servizi', emergency:'emergenza' },
         voice_on:'🔊 Voce: On', voice_off:'🔇 Voce: Off', apt_label: base.apt_label.it,
         fb_label:'Ti è stata utile?', like:'👍 Utile', dislike:'👎 Non utile', thanks:'Grazie per il feedback!' },
    fr:{ welcome:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton pour une réponse rapide.',
         placeholder:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton — ou écrivez ici…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'eau','AC':'climatisation','bathroom':'salle de bain','kitchen':'cuisine','building':'immeuble',
           eat:'manger', drink:'boire', shop:'shopping', visit:'visiter', experience:'expériences', 'day trips':'excursions',
           transport:'transports', services:'services', emergency:'urgence' },
         voice_on:'🔊 Voix : Activée', voice_off:'🔇 Voix : Désactivée', apt_label: base.apt_label.fr,
         fb_label:'Cette réponse vous a aidé ?', like:'👍 Utile', dislike:'👎 Pas utile', thanks:'Merci pour votre retour !' },
    de:{ welcome:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button für eine schnelle Antwort.',
         placeholder:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button — oder schreibe hier…',
         buttons:{ wifi:'WLAN','check in':'check in','check out':'check out','water':'Wasser','AC':'Klimaanlage','bathroom':'Bad','kitchen':'Küche','building':'Gebäude',
           eat:'Essen', drink:'Trinken', shop:'Shopping', visit:'Sehenswürdigkeiten', experience:'Erlebnisse', 'day trips':'Tagesausflüge',
           transport:'Verkehr', services:'Services', emergency:'Notfall' },
         voice_on:'🔊 Stimme: An', voice_off:'🔇 Stimme: Aus', apt_label: base.apt_label.de,
         fb_label:'War das hilfreich?', like:'👍 Hilfreich', dislike:'👎 Nicht hilfreich', thanks:'Danke für das Feedback!' },
    es:{ welcome:'Hola, soy Samantha, tu guía virtual. Toca un botón para una respuesta rápida.',
         placeholder:'Hola, soy Samantha, tu guía virtual. Toca un botón — o escribe aquí…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'agua','AC':'aire acondicionado','bathroom':'baño','kitchen':'cocina','building':'edificio',
           eat:'comer', drink:'beber', shop:'compras', visit:'visitar', experience:'experiencias', 'day trips':'excursiones',
           transport:'transporte', services:'servicios', emergency:'emergencia' },
         voice_on:'🔊 Voz: Activada', voice_off:'🔇 Voz: Desactivada', apt_label: base.apt_label.es,
         fb_label:'¿Te ha sido útil?', like:'👍 Útil', dislike:'👎 No útil', thanks:'¡Gracias por tu opinión!' }
  };

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guest Help — Viale Trastevere 108</title>
<link rel="icon" type="image/png" href="logo-niceflatinrome.jpg">
<style>
*{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f6f6}
.wrap{max-width:760px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e0e0e0;padding:10px 14px}
.h-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.h-left{display:flex;align-items:center;gap:10px}
.brand{font-weight:700;color:#a33}
.apt{margin-left:auto;opacity:.75}
img.logo{height:36px;width:auto;display:block}
.controls{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}
.lang{display:flex;gap:6px;margin-left:auto}
.lang button{border:1px solid #ddd;background:#fff;padding:6px 8px;border-radius:10px;cursor:pointer;font-size:13px}
.lang button[aria-current="true"]{background:#2b2118;color:#fff;border-color:#2b2118}
#voiceBtn{padding:8px 10px;border:1px solid #ddd;background:#fff;border-radius:10px;cursor:pointer;font-size:14px}
#voiceBtn[aria-pressed="true"]{background:#2b2118;color:#fff;border-color:#2b2118}
main{flex:1;padding:12px}
.msg{max-width:85%;line-height:1.35;border-radius:12px;padding:10px 12px;margin:8px 0;white-space:pre-wrap}
.msg.wd{background:#fff;border:1px solid #e0e0e0}
.msg.me{background:#e8f0fe;border:1px solid #c5d5ff;margin-left:auto}
.quick{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.quick button{border:1px solid #d6c5b8;background:#fff;color:#333;padding:6px 10px;border-radius:12px;cursor:pointer}
.quick button:active{transform:translateY(1px)}
.fb{display:flex;align-items:center;gap:8px;margin:6px 0 0 0;font-size:13px;opacity:.9}
.fb button{border:1px solid #ddd;background:#fff;padding:4px 8px;border-radius:10px;cursor:pointer}
.fb button:disabled{opacity:.6;cursor:default}
footer{position:sticky;bottom:0;background:#fff;display:flex;gap:8px;padding:10px;border-top:1px solid #e0e0e0}
input{flex:1;padding:12px;border:1px solid #cbd5e1;border-radius:10px;outline:none}
#sendBtn{padding:12px 14px;border:1px solid #2b2118;background:#2b2118;color:#fff;border-radius:10px;cursor:pointer}
</style></head>
<body>
<div class="wrap">
  <header>
    <div class="h-row">
      <div class="h-left">
        <img class="logo" src="logo-niceflatinrome.jpg" alt="NiceFlatInRome">
        <div class="brand">niceflatinrome.com</div>
      </div>
      <div class="apt"><span id="aptLabel">${base.apt_label.en}</span>: ${base.apartment_id}</div>
    </div>
    <div class="controls">
      <button id="voiceBtn" aria-pressed="false" title="Toggle voice">🔇 Voice: Off</button>
      <nav class="lang" aria-label="Language">
        <button data-lang="en" aria-current="true">EN</button>
        <button data-lang="it">IT</button>
        <button data-lang="fr">FR</button>
        <button data-lang="de">DE</button>
        <button data-lang="es">ES</button>
      </nav>
    </div>
  </header>

  <main id="chat" aria-live="polite"></main>

  <footer>
    <input id="input" placeholder="Hi, I am Samantha, your virtual guide. Tap a button for a quick answer — or type here…" autocomplete="off">
    <button id="sendBtn">Send</button>
  </footer>
</div>
<script>
const UI_I18N = ${JSON.stringify(UI_I18N)};
const BUTTON_KEYS = ${JSON.stringify(BUTTON_KEYS)};
const APT_ID = ${JSON.stringify(base.apartment_id)};

const chatEl = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

// Lang init (?lang -> localStorage -> navigator)
const url = new URL(location);
let lang = (url.searchParams.get('lang') || localStorage.getItem('lang') || (navigator.language||'en').slice(0,2)).toLowerCase();
if(!UI_I18N[lang]) lang='en';
url.searchParams.set('lang', lang); history.replaceState(null,'',url);
localStorage.setItem('lang', lang);

// ---------- TTS con voce madrelingua ----------
let voiceOn = false, pick = null;
const VOICE_PREFS = {
  en: ['Samantha','Google US English'],
  it: ['Alice','Eloisa','Google italiano'],
  fr: ['Amelie','Thomas','Google français'],
  de: ['Anna','Markus','Google Deutsch'],
  es: ['Monica','Jorge','Paulina','Google español']
};
function selectVoice(){
  if(!('speechSynthesis' in window)) return null;
  const all = speechSynthesis.getVoices()||[];
  const prefs = VOICE_PREFS[lang]||[];
  for(const name of prefs){
    const v = all.find(v => (v.name||'').toLowerCase()===name.toLowerCase());
    if(v) return v;
  }
  const byLang = all.find(v => (v.lang||'').toLowerCase().startsWith(lang));
  return byLang || all[0] || null;
}
function refreshVoice(){ pick = selectVoice(); }
if('speechSynthesis' in window){
  refreshVoice(); speechSynthesis.onvoiceschanged = refreshVoice;
}
function warm(){
  if(!('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const dot = new SpeechSynthesisUtterance('.');
    dot.rate=1; dot.pitch=1; dot.volume=0.01;
    if(pick) dot.voice=pick;
    dot.lang = pick?.lang || lang;
    speechSynthesis.speak(dot);
  }catch{}
}
function speak(t){
  if(!voiceOn || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    if(pick) u.voice=pick;
    u.lang = pick?.lang || lang;
    speechSynthesis.speak(u);
  }catch{}
}

document.getElementById('voiceBtn').addEventListener('click',e=>{
  voiceOn = !voiceOn;
  e.currentTarget.setAttribute('aria-pressed', String(voiceOn));
  applyUI();
  if(voiceOn) warm();
});
document.querySelector('.lang').addEventListener('click',e=>{
  const btn = e.target.closest('[data-lang]'); if(!btn) return;
  lang = btn.getAttribute('data-lang');
  localStorage.setItem('lang', lang);
  const u = new URL(location); u.searchParams.set('lang', lang); history.replaceState(null,'',u);
  refreshVoice(); applyUI(); chatEl.innerHTML=''; welcome();
  if(voiceOn) warm();
});

function applyUI(){
  const t = UI_I18N[lang] || UI_I18N.en;
  document.getElementById('aptLabel').textContent = t.apt_label;
  document.getElementById('voiceBtn').textContent = voiceOn ? t.voice_on : t.voice_off;
  input.placeholder = t.placeholder;
  document.querySelectorAll('.lang [data-lang]').forEach(b=>{
    b.setAttribute('aria-current', b.getAttribute('data-lang')===lang ? 'true':'false');
  });
}

function add(type, txt, meta){
  const wrap = document.createElement('div');
  wrap.className='msg '+(type==='me'?'me':'wd');
  wrap.textContent=txt;
  chatEl.appendChild(wrap);

  // feedback solo sui messaggi del bot
  if(type!=='me'){
    const t = UI_I18N[lang] || UI_I18N.en;
    const fb = document.createElement('div');
    fb.className='fb';
    const label = document.createElement('span');
    label.textContent = t.fb_label;
    const bLike = document.createElement('button'); bLike.textContent = t.like;
    const bDis  = document.createElement('button'); bDis.textContent  = t.dislike;

    const disableBtns = (msg)=>{ bLike.disabled=true; bDis.disabled=true; label.textContent = msg || t.thanks; };

    async function sendFeedback(kind){
      try{
        const payload = {
          apartment_id: APT_ID,
          lang,
          intent: meta?.intent || null,
          rating: kind, // 'like' | 'dislike'
          text: txt,
          ts: Date.now(),
          userAgent: navigator.userAgent,
          origin: location.origin,
          path: location.pathname + location.search
        };
        await fetch('/api/feedback',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        disableBtns();
      }catch{
        disableBtns(); // anche se fallisce non disturba l'utente
      }
    }
    bLike.onclick = ()=>sendFeedback('like');
    bDis.onclick  = ()=>sendFeedback('dislike');

    fb.appendChild(label);
    fb.appendChild(bLike);
    fb.appendChild(bDis);
    chatEl.appendChild(fb);
  }

  chatEl.scrollTop=chatEl.scrollHeight;
}

function welcome(){
  const t = UI_I18N[lang] || UI_I18N.en;
  add('wd', t.welcome);
  const q=document.createElement('div'); q.className='quick';
  for(const key of BUTTON_KEYS){
    const label = t.buttons[key] || key;
    const b=document.createElement('button'); b.textContent=label;
    b.onclick=()=>{ input.value=key; send(); }; // invia keyword EN
    q.appendChild(b);
  }
  chatEl.appendChild(q);
}

async function send(){
  const text=(input.value||'').trim(); if(!text) return;
  add('me', text); input.value='';
  try{
    const r=await fetch('/api/message',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:text, lang})
    });
    const data=await r.json();
    const bot=data.text||'Sorry, something went wrong.';
    add('wd',bot,{ intent: data.intent || null });
    speak(bot);
  }catch{
    add('wd','Network error. Please try again.');
  }
}
sendBtn.addEventListener('click',send);
input.addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });

applyUI();
welcome();
</script>
</body></html>`;
  res.setHeader('content-type','text/html; charset=utf-8');
  res.end(html);
});

// ---------------- Start ----------------
const port = process.env.PORT || 8787;
app.listen(port, ()=>console.log('Guest assistant up on http://localhost:'+port));
