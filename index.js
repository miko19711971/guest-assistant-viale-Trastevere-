// index.js — Guest Assistant (Viale Trastevere 108) — EN + Samantha voice

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (logo, favicon, etc.)
app.use(express.static('.'));

// ---------- Apartment data ----------
const apartment = {
  apartment_id: 'VIALETRASTEVERE108',
  name: 'Viale Trastevere 108',
  address: 'Viale Trastevere 108, Rome, Italy',
  checkin_time: '15:00',
  checkout_time: '11:00',

  // Wi-Fi
  wifi_note: 'Router on the shelf near the TV. Turn it to see SSID & password.',
  wifi_ssid: 'See router label',
  wifi_password: 'See router label',

  // Water / AC / Bathroom
  water_note: 'Tap water is safe to drink. Hot water is always available.',
  ac_note: 'Please turn off the air conditioning when you leave the apartment.',
  bathroom_amenities: 'Toilet paper, hand soap, bath mat, hairdryer.',
  towels_note: 'Per guest: 1 large + 1 medium towel. Bed is prepared before arrival.',

  // Gas / kitchen
  gas_steps:
    'Gas valve: horizontal=open, vertical=closed. Choose burner. Light a match/lighter, press and turn the black knob until the flame is steady.',

  // Building
  intercom_code: 'B3',
  elevator_note: 'Elevator available. Use the key in the apartment for access.',
  main_door_hours: 'Always accessible with building key',
  concierge: 'No concierge service',

  // Services nearby
  pharmacy: 'Farmacia Trastevere, Viale Trastevere 104 — +39 06 581 0271',
  hospital: 'Fatebenefratelli Hospital, Tiber Island 1',
  atms: 'Unicredit (Viale Trastevere 110), BNL (Viale Trastevere 90), Intesa (Viale Trastevere 120)',
  sims: 'Vodafone (Viale di Trastevere 50), TIM (Piazza San Cosimato 3), Iliad (Via Goffredo Mameli 15)',
  laundry: 'Self-service laundry: Lavanderia Automatica, Viale Trastevere 150',
  luggage: 'Radical Storage, Piazza Mastai (5 min walk)',

  // Transport
  transport:
    "Tram 8 → Largo Argentina/Piazza Venezia. Bus H → Termini Station. Taxi: +39 06 3570 or FreeNow app.",
  airports:
    "Fiumicino: Tram 8 → Trastevere Station → FL1 train (~45 min). Ciampino: Bus to Termini then Tram 8. Private transfer: Welcome Pickups.",

  // Safety
  emergency:
    "EU Emergency 112 • Police 113 • Ambulance 118 • Fire 115 • English doctor +39 06 488 2371 • 24h vet +39 06 660 681",

  // Eat/Drink/See
  eat: "Da Enzo al 29; Taverna Trilussa; Nannarella; Grazia & Graziella; Antico Arco; Pizzeria ai Marmi; Otello.",
  drink: "Freni e Frizioni; Ma Che Siete Venuti a Fà; San Calisto; Bar San Calisto; Baylon Café.",
  shop: "Porta Portese Market (Sundays); local bakeries; delicatessens along Viale Trastevere.",
  visit:
    "Santa Maria in Trastevere; Gianicolo Hill; Villa Farnesina; Orto Botanico; Ponte Sisto to Campo de’ Fiori.",
  experiences:
    "Evening walk through Trastevere’s alleys; aperitivo at Freni e Frizioni; sunset from Gianicolo; Sunday Porta Portese market; night stroll to Ponte Sisto.",
  daytrips:
    "Ostia Antica (~40 min); Bracciano Lake (~1h); Tivoli (Villa d’Este & Hadrian’s Villa ~1h).",

  // Check-out
  checkout_note:
    "Before leaving: turn off lights/AC, close windows, leave keys on the table, and lock the door.",

  host_phone: '+39 335 5245756'
};

// ---------- FAQ ----------
const faqs = [
  { intent: 'wifi', utterances: ['wifi','wi-fi','internet','password','router'],
    answer_template: `Wi-Fi: {wifi_note}\nNetwork: {wifi_ssid}. Password: {wifi_password}.` },
  { intent: 'check in', utterances: ['check in','arrival','access','intercom','code'],
    answer_template: `Check-in from {checkin_time}. Intercom code: {intercom_code}. Main door hours: {main_door_hours}.` },
  { intent: 'check out', utterances: ['check out','leave','departure'],
    answer_template: `{checkout_note}` },
  { intent: 'water', utterances: ['water','hot water','drinkable','tap'],
    answer_template: `{water_note}` },
  { intent: 'ac', utterances: ['ac','air conditioning','aircon','air'],
    answer_template: `{ac_note}` },
  { intent: 'bathroom', utterances: ['bathroom','hairdryer','soap','towels'],
    answer_template: `Bathroom: {bathroom_amenities}\nTowels: {towels_note}` },
  { intent: 'gas', utterances: ['gas','kitchen','cook','flame','burner'],
    answer_template: `Gas use: {gas_steps}` },
  { intent: 'building', utterances: ['building','elevator','door','hours','concierge'],
    answer_template: `Intercom: {intercom_code}. Elevator: {elevator_note}. Main door: {main_door_hours}. Concierge: {concierge}.` },
  { intent: 'services', utterances: ['pharmacy','hospital','atm','sim','laundry','luggage'],
    answer_template: `Pharmacy: {pharmacy}\nHospital: {hospital}\nATMs: {atms}\nSIMs: {sims}\nLaundry: {laundry}\nLuggage: {luggage}` },
  { intent: 'transport', utterances: ['transport','tram','bus','taxi','airport','train'],
    answer_template: `{transport}\nAirports: {airports}` },
  { intent: 'eat', utterances: ['eat','restaurant','dinner','lunch','food'],
    answer_template: `{eat}` },
  { intent: 'drink', utterances: ['drink','bar','wine','cocktail','aperitivo'],
    answer_template: `{drink}` },
  { intent: 'shop', utterances: ['shop','market','shopping'],
    answer_template: `{shop}` },
  { intent: 'visit', utterances: ['what to visit','see','sight','attraction','museum'],
    answer_template: `{visit}` },
  { intent: 'experience', utterances: ['experience','walk','tour','itinerary','sunset'],
    answer_template: `{experiences}` },
  { intent: 'day trips', utterances: ['day trip','tivoli','ostia','bracciano','excursion'],
    answer_template: `{daytrips}` },
  { intent: 'emergency', utterances: ['emergency','police','ambulance','fire','doctor','vet'],
    answer_template: `{emergency}` }
];

// ---------- OpenAI polish ----------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const client = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function norm(s){return (s||'').toLowerCase().replace(/\s+/g,' ').trim();}
function detectIntent(msg){
  const t = norm(msg); let best=null, scoreBest=0;
  for (const f of faqs){ let s=0; for (const u of f.utterances){ if (t.includes(norm(u))) s++; }
    if (s>scoreBest){ best=f; scoreBest=s; }
  } return scoreBest>0?best:null;
}
function fill(tpl, obj){ return tpl.replace(/\{(\w+)\}/g,(_,k)=>obj[k]??`{${k}}`); }

async function polishEN(raw, userMsg){
  if (!client) return raw;
  const sys = 'You are a concise hotel/apartment assistant. ALWAYS answer in clear English. Keep facts as given; do not invent.';
  try{
    const r = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {role:'system', content: sys},
        {role:'developer', content: `Apartment data: ${JSON.stringify(apartment)}`},
        {role:'user', content: `Guest asked: ${userMsg}\nDraft answer:\n${raw}`}
      ]
    });
    return r.output_text || raw;
  }catch{ return raw; }
}

// ---------- API ----------
app.post('/api/message', async (req,res)=>{
  const { message='' } = req.body || {};
  const m = detectIntent(message);
  let raw = m ? fill(m.answer_template, apartment)
              : 'I did not find a direct answer. Try a button or use keywords (wifi, gas, transport, eat…).';
  const text = await polishEN(raw, message);
  res.json({ text, intent: m?.intent || null });
});

// ---------- UI ----------
app.get('/', (_req,res)=>{
  const buttons = [
    'wifi','check in','check out','water','AC','bathroom','gas',
    'eat','drink','shop','visit','experience','day trips',
    'transport','services','emergency'
  ];
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guest Help — Viale Trastevere 108</title>
<link rel="icon" type="image/png" href="logo.png">
<style>
*{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f6f6}
.wrap{max-width:760px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e0e0e0;padding:10px 14px}
.h-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.h-left{display:flex;align-items:center;gap:10px}
.brand{font-weight:700;color:#a33}
.apt{margin-left:auto;opacity:.75}
img.logo{height:36px;width:auto;display:block}
.controls{display:flex;gap:8px;margin-top:8px}
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
</style></head>
<body>
<div class="wrap">
  <header>
    <div class="h-row">
      <div class="h-left">
        <img class="logo" src="logo-niceflatinrome.jpg" alt="NiceFlatInRome">
        <div class="brand">niceflatinrome.com</div>
      </div>
      <div class="apt">Apartment: VIALETRASTEVERE108</div>
    </div>
    <div class="controls">
      <button id="voiceBtn" aria-pressed="false" title="Toggle voice">🔇 Voice: Off</button>
    </div>
  </header>

  <main id="chat" aria-live="polite"></main>

  <footer>
    <input id="input" placeholder="Type a message… e.g., wifi, gas, transport" autocomplete="off">
    <button id="sendBtn">Send</button>
  </footer>
</div>
<script>
const chatEl = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

let voiceOn = false, pick = null;
function pickSamantha(){
  const all = window.speechSynthesis ? (speechSynthesis.getVoices()||[]) : [];
  const en = all.filter(v=>/en-/i.test(v.lang));
  pick = en.find(v=>/samantha/i.test(v.name)) || en[0] || all[0] || null;
}
if ('speechSynthesis' in window){
  pickSamantha(); window.speechSynthesis.onvoiceschanged = pickSamantha;
}
function warm(){ try{ const u=new SpeechSynthesisUtterance('Voice enabled.'); if(pick) u.voice=pick; u.lang='en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch{} }
function speak(t){ if(!voiceOn||!('speechSynthesis'in window))return; try{ const u=new SpeechSynthesisUtterance(t); if(pick) u.voice=pick; u.lang='en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch{} }

document.getElementById('voiceBtn').addEventListener('click',e=>{
  voiceOn=!voiceOn; e.currentTarget.setAttribute('aria-pressed',String(voiceOn));
  e.currentTarget.textContent = voiceOn ? '🔊 Voice: On' : '🔇 Voice: Off';
  if (voiceOn) warm();
});

function add(type, txt){ const d=document.createElement('div'); d.className='msg '+(type==='me'?'me':'wd'); d.textContent=txt; chatEl.appendChild(d); chatEl.scrollTop=chatEl.scrollHeight; }
function welcome(){
  add('wd','Welcome! I can help with Wi-Fi, check-in/out, water/AC, bathroom, gas, restaurants & drinks, shopping, what to visit, experiences, day trips, transport, services, emergency. (English)');
  const q=document.createElement('div'); q.className='quick';
  const items=${JSON.stringify(buttons)};
  for(const it of items){ const b=document.createElement('button'); b.textContent=it; b.onclick=()=>{ input.value=it; send(); }; q.appendChild(b); }
  chatEl.appendChild(q);
}

async function send(){
  const text=(input.value||'').trim(); if(!text) return;
  add('me',text); input.value='';
  try{
    const r=await fetch('/api/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
    const data=await r.json(); const bot=data.text||'Sorry, something went wrong.';
    add('wd',bot); speak(bot);
  }catch{ add('wd','Network error. Please try again.'); }
}
sendBtn.addEventListener('click',send);
input.addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
welcome();
</script>
</body></html>`;
  res.setHeader('content-type','text/html; charset=utf-8');
  res.end(html);
});

// ---------- Start ----------
const port = process.env.PORT || 8787;
app.listen(port, ()=>console.log('Guest assistant up on http://localhost:'+port));
