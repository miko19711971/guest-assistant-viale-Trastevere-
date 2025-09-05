// index.js — Guest Assistant (Viale Trastevere 108) — Multilingual + Native Voices + Feedback->Google Sheets

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // static (logo, favicon)

// ---------- Feedback webhook (Google Apps Script Web App) ----------
const FEEDBACK_WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL || ''; // <-- IMPOSTA QUI su Render

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
    wifi_note: 'Near the TV there is a WHITE router. Turn it around to see the label with SSID & password.',
    wifi_ssid: 'See router label',
    wifi_password: 'See router label',
    water_note: 'Tap water is safe to drink. Hot water is always on.',
    ac_note: 'Please turn OFF the air conditioning when you leave the apartment.',
    bathroom_amenities: 'Toilet paper, hand soap, bath mat, hairdryer.',
    towels_note: 'Per guest: 1 large + 1 medium towel. Beds are prepared on arrival.',
    bathroom_notice: 'IMPORTANT (bathroom between the bedrooms): use ONLY the toilet paper provided. Do NOT flush anything else or the system will clog and overflow. Unclogging costs €100.',
    bedrooms_note: 'Two bedrooms + a double sofa bed. Keys are on the table on arrival.',
    gas_steps: 'Gas handle (left of the meter): DOWN = CLOSED • HORIZONTAL = OPEN. To cook: 1) choose burner, 2) push knob down and turn, 3) keep pressed a few seconds until the flame is steady, 4) release.',
    kitchen_note: 'The kitchen is fully stocked and ready to use.',
    intercom_note: '—',
    main_door_hours: 'Building door accessible with the key provided.',
    concierge: 'Concierge: Massimo — desk hours 08:30–13:00 and 15:30–18:30.',
    registration_note: 'Please send your passports via WhatsApp to the host for mandatory guest registration.',
    supermarkets: 'Mini-market on Viale Trastevere near 108 • Fresh produce at Largo/Piazza San Cosimato (mornings).',
    pharmacies: 'Pharmacy at Piazza Trilussa • Other options along Viale Trastevere.',
    luggage: 'Radical Storage — Piazza Mastai (≈5 min).',
    laundry: 'Self-service laundry — Viale Trastevere 150.',
    hospital: 'Ospedale Nuovo Regina Margherita — Via Emilio Morosini 30.',
    atms: 'ATMs along Viale Trastevere (BNL, Unicredit, Intesa).',
    sims: 'Vodafone (Viale Trastevere 143) • TIM (Piazza San Cosimato 70).',
    transport: 'Tram 8 → Largo Argentina / Piazza Venezia. Tram 3 nearby. Bus H → Termini. Taxi: +39 06 3570 or FreeNow app.',
    airports: 'Fiumicino: Tram 8 → Trastevere Station → FL1 train (~45 min). Ciampino: bus to Termini then Tram 8. Private transfer: Welcome Pickups.',
    emergency: 'EU Emergency 112 • Police 113 • Ambulance 118 • Fire 115 • English-speaking doctor +39 06 488 2371 • 24h vet +39 06 660 681',
    eat: 'Da Enzo al 29; Osteria der Belli; Tonnarello; Trattoria Da Teo; Spirito di Vino; Pianostrada; Trapizzino.',
    drink: 'Enoteca Ferrara; Freni e Frizioni; L’Angolo Divino; Mimì e Cocò; La Prosciutteria Trastevere.',
    shop: 'Porta Portese Market (Sun); artisanal bakeries & delis along Viale Trastevere; Via della Lungaretta boutiques.',
    visit: 'Santa Maria in Trastevere; Santa Cecilia; Museo di Roma in Trastevere; Orto Botanico; Villa Farnesina; Piazza Trilussa; walk over Ponte Sisto to Campo de’ Fiori.',
    experiences: 'Evening walk: Viale Trastevere → Piazza Trilussa → Santa Maria → alleys → Tiber waterfront → Campo de’ Fiori. Aperitivo at Freni e Frizioni; church tour (S. Maria & S. Cecilia); sunset at Gianicolo.',
    romantic_walk: 'Start: Viale Trastevere 108 → Piazza S. Maria in Trastevere → Gianicolo Terrace → Orto Botanico → Gelateria del Viale → Biscottificio Innocenti → back to Viale Trastevere 108.',
    daytrips: 'Ostia Antica (~40 min) • Tivoli (Villa d’Este & Hadrian’s Villa ~1h) • Castelli Romani (villages & wine).',
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
  fr: { /* ...come sopra... */ },
  de: { /* ...come sopra... */ },
  es: { /* ...come sopra... */ }
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
  it: { /* ...come sopra... */ },
  fr: { /* ...come sopra... */ },
  de: { /* ...come sopra... */ },
  es: { /* ...come sopra... */ }
};

// ---------------- Intent matching (keyword EN) ----------------
const INTENTS = [
  { key:'wifi', utter:['wifi','wi-fi','internet','password','router'] },
  { key:'checkin', utter:['check in','arrival','access','self check-in','entrance','intercom','doorbell'] },
  { key:'checkout', utter:['check out','leave','departure'] },
  { key:'water', utter:['water','hot water','drinkable','tap'] },
  { key:'ac', utter:['ac','air conditioning','aircon','air'] },
  { key:'bathroom', utter:['bathroom','hairdryer','soap','towels','toilet','notice'] },
  { key:'kitchen', utter:['kitchen','cook','cooking','stove','gas'] },
  { key:'building', utter:['building','elevator','door','hours','concierge'] },
  { key:'services', utter:['services','pharmacy','hospital','atm','sim','laundry','luggage','supermarket','groceries'] },
  { key:'transport', utter:['transport','tram','bus','taxi','airport','train','metro'] },
  { key:'eat', utter:['eat','restaurant','dinner','lunch','food'] },
  { key:'drink', utter:['drink','bar','wine','cocktail','aperitivo'] },
  { key:'shop', utter:['shop','market','shopping','bakeries'] },
  { key:'visit', utter:['visit','what to visit','see','sight','attraction','museum'] },
  { key:'experience', utter:['experience','walk','tour','itinerary','sunset','romantic'] },
  { key:'daytrips', utter:['day trips','day trip','tivoli','ostia','castelli','excursion','bracciano'] },
  { key:'emergency', utter:['emergency','police','ambulance','fire','doctor','vet'] }
];

function norm(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function detectIntent(msg){
  const t = norm(msg); let best=null, scoreBest=0;
  for(const it of INTENTS){ let s=0; for(const u of it.utter){ if(t.includes(norm(u))) s++; } if(s>scoreBest){best=it; scoreBest=s;} }
  return best?.key || null;
}
function fill(tpl, dict){ return tpl.replace(/\{(\w+)\}/g,(_,k)=>dict[k] ?? `{${k}}`); }

// -------- OpenAI opzionale --------
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

// ---- Feedback proxy -> Google Sheets (webhook) ----
app.post('/api/feedback', async (req, res) => {
  try {
    const payload = req.body || {};
    payload.server_ts = new Date().toISOString();
    payload.apartment_id = payload.apartment_id || base.apartment_id;

    if (FEEDBACK_WEBHOOK_URL) {
      const r = await fetch(FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      return res.json({ ok: r.ok, forwarded: true });
    } else {
      return res.json({ ok: true, forwarded: false, note: 'FEEDBACK_WEBHOOK_URL not set' });
    }
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
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
         fb_like:'Helpful', fb_dislike:'Not helpful' },
    it:{ welcome:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante per una risposta rapida.',
         placeholder:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante — oppure scrivi qui…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'acqua','AC':'aria condizionata','bathroom':'bagno','kitchen':'cucina','building':'edificio',
           eat:'mangiare', drink:'bere', shop:'shopping', visit:'visitare', experience:'esperienze', 'day trips':'gite di un giorno',
           transport:'trasporti', services:'servizi', emergency:'emergenza' },
         voice_on:'🔊 Voce: On', voice_off:'🔇 Voce: Off', apt_label: base.apt_label.it,
         fb_like:'Utile', fb_dislike:'Non utile' },
    fr:{ welcome:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton pour une réponse rapide.',
         placeholder:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton — ou écrivez ici…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'eau','AC':'climatisation','bathroom':'salle de bain','kitchen':'cuisine','building':'immeuble',
           eat:'manger', drink:'boire', shop:'shopping', visit:'visiter', experience:'expériences', 'day trips':'excursions',
           transport:'transports', services:'services', emergency:'urgence' },
         voice_on:'🔊 Voix : Activée', voice_off:'🔇 Voix : Désactivée', apt_label: base.apt_label.fr,
         fb_like:'Utile', fb_dislike:'Peu utile' },
    de:{ welcome:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button für eine schnelle Antwort.',
         placeholder:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button — oder schreibe hier…',
         buttons:{ wifi:'WLAN','check in':'check in','check out':'check out','water':'Wasser','AC':'Klimaanlage','bathroom':'Bad','kitchen':'Küche','building':'Gebäude',
           eat:'Essen', drink:'Trinken', shop:'Shopping', visit:'Sehenswürdigkeiten', experience:'Erlebnisse', 'day trips':'Tagesausflüge',
           transport:'Verkehr', services:'Services', emergency:'Notfall' },
         voice_on:'🔊 Stimme: An', voice_off:'🔇 Stimme: Aus', apt_label: base.apt_label.de,
         fb_like:'Hilfreich', fb_dislike:'Nicht hilfreich' },
    es:{ welcome:'Hola, soy Samantha, tu guía virtual. Toca un botón para una respuesta rápida.',
         placeholder:'Hola, soy Samantha, tu guía virtual. Toca un botón — o escribe aquí…',
         buttons:{ wifi:'wifi','check in':'check in','check out':'check out','water':'agua','AC':'aire acondicionado','bathroom':'baño','kitchen':'cocina','building':'edificio',
           eat:'comer', drink:'beber', shop:'compras', visit:'visitar', experience:'experiencias', 'day trips':'excursiones',
           transport:'transporte', services:'servicios', emergency:'emergencia' },
         voice_on:'🔊 Voz: Activada', voice_off:'🔇 Voz: Desactivada', apt_label: base.apt_label.es,
         fb_like:'Útil', fb_dislike:'Poco útil' }
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
footer{position:sticky;bottom:0;background:#fff;display:flex;gap:8px;padding:10px;border-top:1px solid #e0e0e0}
input{flex:1;padding:12px;border:1px solid #cbd5e1;border-radius:10px;outline:none}
#sendBtn{padding:12px 14px;border:1px solid #2b2118;background:#2b2118;color:#fff;border-radius:10px;cursor:pointer}
.fb{display:flex;gap:8px;margin:6px 0 0 0}
.fb button{border:1px solid #ddd;background:#fff;padding:4px 8px;border-radius:10px;cursor:pointer;font-size:12px}
.fb button:disabled{opacity:.6;cursor:default}
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
const UI_I18N = ${JSON.stringify({
  en:{welcome:'Hi, I am Samantha, your virtual guide. Tap a button to get a quick answer.',placeholder:'Hi, I am Samantha, your virtual guide. Tap a button for a quick answer — or type here…',buttons:{wifi:'wifi','check in':'check in','check out':'check out',water:'water',AC:'AC',bathroom:'bathroom',kitchen:'kitchen',building:'building',eat:'eat',drink:'drink',shop:'shop',visit:'visit',experience:'experience','day trips':'day trips',transport:'transport',services:'services',emergency:'emergency'},voice_on:'🔊 Voice: On',voice_off:'🔇 Voice: Off',apt_label:base.apt_label.en,fb_like:'Helpful',fb_dislike:'Not helpful'},
  it:{welcome:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante per una risposta rapida.',placeholder:'Ciao, sono Samantha, la tua guida virtuale. Tocca un pulsante — oppure scrivi qui…',buttons:{wifi:'wifi','check in':'check in','check out':'check out',water:'acqua',AC:'aria condizionata',bathroom:'bagno',kitchen:'cucina',building:'edificio',eat:'mangiare',drink:'bere',shop:'shopping',visit:'visitare',experience:'esperienze','day trips':'gite di un giorno',transport:'trasporti',services:'servizi',emergency:'emergenza'},voice_on:'🔊 Voce: On',voice_off:'🔇 Voce: Off',apt_label:base.apt_label.it,fb_like:'Utile',fb_dislike:'Non utile'},
  fr:{welcome:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton pour une réponse rapide.',placeholder:'Bonjour, je suis Samantha, votre guide virtuel. Touchez un bouton — ou écrivez ici…',buttons:{wifi:'wifi','check in':'check in','check out':'check out',water:'eau',AC:'climatisation',bathroom:'salle de bain',kitchen:'cuisine',building:'immeuble',eat:'manger',drink:'boire',shop:'shopping',visit:'visiter',experience:'expériences','day trips':'excursions',transport:'transports',services:'services',emergency:'urgence'},voice_on:'🔊 Voix : Activée',voice_off:'🔇 Voix : Désactivée',apt_label:base.apt_label.fr,fb_like:'Utile',fb_dislike:'Peu utile'},
  de:{welcome:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button für eine schnelle Antwort.',placeholder:'Hallo, ich bin Samantha, dein virtueller Guide. Tippe auf einen Button — oder schreibe hier…',buttons:{wifi:'WLAN','check in':'check in','check out':'check out',water:'Wasser',AC:'Klimaanlage',bathroom:'Bad',kitchen:'Küche',building:'Gebäude',eat:'Essen',drink:'Trinken',shop:'Shopping',visit:'Sehenswürdigkeiten',experience:'Erlebnisse','day trips':'Tagesausflüge',transport:'Verkehr',services:'Services',emergency:'Notfall'},voice_on:'🔊 Stimme: An',voice_off:'🔇 Stimme: Aus',apt_label:base.apt_label.de,fb_like:'Hilfreich',fb_dislike:'Nicht hilfreich'},
  es:{welcome:'Hola, soy Samantha, tu guía virtual. Toca un botón para una respuesta rápida.',placeholder:'Hola, soy Samantha, tu guía virtual. Toca un botón — o escribe aquí…',buttons:{wifi:'wifi','check in':'check in','check out':'check out',water:'agua',AC:'aire acondicionado',bathroom:'baño',kitchen:'cocina',building:'edificio',eat:'comer',drink:'beber',shop:'compras',visit:'visitar',experience:'experiencias','day trips':'excursiones',transport:'transporte',services:'servicios',emergency:'emergencia'},voice_on:'🔊 Voz: Activada',voice_off:'🔇 Voz: Desactivada',apt_label:base.apt_label.es,fb_like:'Útil',fb_dislike:'Poco útil'}
})};
const BUTTON_KEYS = ${JSON.stringify(['wifi','check in','check out','water','AC','bathroom','kitchen','building','eat','drink','shop','visit','experience','day trips','transport','services','emergency'])};
const APARTMENT_ID = ${JSON.stringify(base.apartment_id)};

const chatEl = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

// Lang init (?lang -> localStorage -> navigator)
const url = new URL(location);
let lang = (url.searchParams.get('lang') || localStorage.getItem('lang') || (navigator.language||'en').slice(0,2)).toLowerCase();
if(!UI_I18N[lang]) lang='en';
url.searchParams.set('lang', lang); history.replaceState(null,'',url);
localStorage.setItem('lang', lang);

// ---------- TTS ----------
let voiceOn = false, pick = null;
const VOICE_PREFS = { en:['Samantha','Google US English'], it:['Alice','Eloisa','Google italiano'], fr:['Amelie','Thomas','Google français'], de:['Anna','Markus','Google Deutsch'], es:['Monica','Jorge','Paulina','Google español'] };
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
if('speechSynthesis' in window){ refreshVoice(); speechSynthesis.onvoiceschanged = refreshVoice; }
function warm(){ if(!('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const dot=new SpeechSynthesisUtterance('.'); dot.volume=0.01; if(pick) dot.voice=pick; dot.lang=pick?.lang||lang; speechSynthesis.speak(dot);}catch{} }
function speak(t){ if(!voiceOn||!('speechSynthesis'in window))return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); if(pick) u.voice=pick; u.lang=pick?.lang||lang; speechSynthesis.speak(u);}catch{} }

document.getElementById('voiceBtn').addEventListener('click',e=>{
  voiceOn=!voiceOn; e.currentTarget.setAttribute('aria-pressed',String(voiceOn));
  applyUI(); if(voiceOn) warm();
});
document.querySelector('.lang').addEventListener('click',e=>{
  const btn=e.target.closest('[data-lang]'); if(!btn) return;
  lang=btn.getAttribute('data-lang'); localStorage.setItem('lang',lang);
  const u=new URL(location); u.searchParams.set('lang',lang); history.replaceState(null,'',u);
  refreshVoice(); applyUI(); chatEl.innerHTML=''; welcome(); if(voiceOn) warm();
});

function applyUI(){
  const t=UI_I18N[lang]||UI_I18N.en;
  document.getElementById('aptLabel').textContent=t.apt_label;
  document.getElementById('voiceBtn').textContent=voiceOn?t.voice_on:t.voice_off;
  input.placeholder=t.placeholder;
  document.querySelectorAll('.lang [data-lang]').forEach(b=>b.setAttribute('aria-current', b.getAttribute('data-lang')===lang?'true':'false'));
}

function add(type, txt){
  const d=document.createElement('div');
  d.className='msg '+(type==='me'?'me':'wd');
  d.textContent=txt; chatEl.appendChild(d); chatEl.scrollTop=chatEl.scrollHeight; return d;
}

// --- blocco bot con Like/Dislike + POST /api/feedback ---
function addBotWithFeedback(botText, intent, userText){
  const node = add('wd', botText);
  const t = UI_I18N[lang] || UI_I18N.en;
  const bar=document.createElement('div'); bar.className='fb';
  const like=document.createElement('button'); like.textContent='👍 '+t.fb_like;
  const dislike=document.createElement('button'); dislike.textContent='👎 '+t.fb_dislike;
  function disable(){ like.disabled=true; dislike.disabled=true; }
  async function sendVote(vote){
    try{
      await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        apartment_id: APARTMENT_ID, lang, intent: intent||null, user_text: userText||null, bot_text: botText, vote, userAgent: navigator.userAgent||'', ts:new Date().toISOString()
      })});
    }catch{} disable();
  }
  like.onclick = ()=>sendVote('up'); dislike.onclick=()=>sendVote('down');
  bar.appendChild(like); bar.appendChild(dislike); node.appendChild(bar);
}

function welcome(){
  const t=UI_I18N[lang]||UI_I18N.en;
  add('wd', t.welcome);
  const q=document.createElement('div'); q.className='quick';
  for(const key of BUTTON_KEYS){
    const label=t.buttons[key]||key; const b=document.createElement('button'); b.textContent=label;
    b.onclick=()=>{ input.value=key; send(); }; q.appendChild(b);
  }
  chatEl.appendChild(q);
}

async function send(){
  const text=(input.value||'').trim(); if(!text) return;
  add('me', text); input.value='';
  try{
    const r=await fetch('/api/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text, lang})});
    const data=await r.json(); const bot=data.text||'Sorry, something went wrong.';
    addBotWithFeedback(bot, data.intent||null, text); speak(bot);
  }catch{ add('wd','Network error. Please try again.'); }
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
