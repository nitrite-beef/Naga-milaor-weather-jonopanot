// Records current weather when the Philippine-time day/hour matches schedule.json.
import fs from 'node:fs';
const S = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
const LOCS = { naga: ['Naga City', 13.6218, 123.1948], milaor: ['Milaor', 13.5917, 123.1739] };
const pad = n => String(n).padStart(2, '0');
const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
const hh = pad(now.getHours());
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const slot = S.times.find(t => t.slice(0, 2) === hh);
const force = !!process.env.FORCE;
if (!force && !(S.days.includes(day) && slot)) { console.log(`Not scheduled (${day} ${hh}:xx PHT).`); process.exit(0); }
const at = `${date} ${slot || hh + ':00'}`;
const file = 'data/records.json';
const recs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const V = 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl,cloud_cover';
for (const k of S.locs) {
  const [name, lat, lon] = LOCS[k];
  if (!force && recs.some(r => r.at === at && r.loc === name)) continue;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${V}&timezone=Asia%2FManila`);
  const c = (await res.json()).current;
  recs.push({ at, loc: name, temp: c.temperature_2m, hum: c.relative_humidity_2m, rain: c.precipitation,
    wind: c.wind_speed_10m, pres: c.pressure_msl, cloud: c.cloud_cover, src: 'actions' });
  console.log('Recorded', name, at);
}
fs.writeFileSync(file, JSON.stringify(recs, null, 1));
