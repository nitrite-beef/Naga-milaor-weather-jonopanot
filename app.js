const LOCS = {
  naga:   { n: 'Naga City', lat: 13.6218, lon: 123.1948 },
  milaor: { n: 'Milaor',    lat: 13.5917, lon: 123.1739 }
};
const VARS = 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl,cloud_cover';
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const store = (k, v) => v === undefined ? JSON.parse(localStorage.getItem(k) || 'null') : localStorage.setItem(k, JSON.stringify(v));
const nums = a => a.filter(v => v != null);
const avg = a => { a = nums(a); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };
const sum = a => { a = nums(a); return a.length ? a.reduce((s, v) => s + v, 0) : null; };
const max = a => { a = nums(a); return a.length ? Math.max(...a) : null; };
const min = a => { a = nums(a); return a.length ? Math.min(...a) : null; };
const fmt = v => v == null ? '–' : Math.round(v * 10) / 10;
let DATA = null, charts = {};

/* ---------- Historical viewer ---------- */
function init() {
  $('loc').innerHTML = Object.entries(LOCS).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join('');
  $('month').innerHTML = MON.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  const now = new Date(), prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let ys = ''; for (let y = now.getFullYear(); y >= 1990; y--) ys += `<option>${y}</option>`;
  $('year').innerHTML = ys;
  $('month').value = prev.getMonth(); $('year').value = prev.getFullYear();
  $('time').innerHTML = '<option value="">All hours</option>' +
    [...Array(24).keys()].map(h => `<option value="${pad(h)}">${pad(h)}:00</option>`).join('');
  ['loc', 'month', 'year'].forEach(i => $(i).onchange = load);
  ['day', 'time'].forEach(i => $(i).onchange = render);
  $('csvBtn').onclick = () => DATA && download(`weather-${$('loc').value}-${$('year').value}-${pad(+$('month').value + 1)}.csv`,
    toCsv(DATA.rows, ['date', 'h', 'temp', 'hum', 'rain', 'wind', 'pres', 'cloud']));
  load(); initRecorder();
}

async function load() {
  const L = LOCS[$('loc').value], y = +$('year').value, m = +$('month').value;
  const last = new Date(y, m + 1, 0).getDate(), cur = $('day').value;
  $('day').innerHTML = '<option value="">Whole month</option>' +
    Array.from({ length: last }, (_, i) => `<option value="${pad(i + 1)}">${i + 1}</option>`).join('');
  if (cur && +cur <= last) $('day').value = cur;
  const start = `${y}-${pad(m + 1)}-01`;
  let end = `${y}-${pad(m + 1)}-${pad(last)}`;
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (end > yest) end = yest;
  DATA = null;
  if (start > end) { $('status').textContent = 'No archive data yet for that month.'; render(); return; }
  $('status').textContent = 'Loading…';
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${L.lat}&longitude=${L.lon}` +
      `&start_date=${start}&end_date=${end}&hourly=${VARS}&timezone=Asia%2FManila`;
    const res = await fetch(url); const j = await res.json();
    if (j.error) throw new Error(j.reason);
    const h = j.hourly;
    DATA = { rows: h.time.map((t, i) => ({ date: t.slice(0, 10), d: t.slice(8, 10), h: t.slice(11, 13),
      temp: h.temperature_2m[i], hum: h.relative_humidity_2m[i], rain: h.precipitation[i],
      wind: h.wind_speed_10m[i], pres: h.pressure_msl[i], cloud: h.cloud_cover[i] })) };
    $('status').textContent = `Source: Open-Meteo Historical Weather API (ERA5 reanalysis) · data through ${end} · Philippine Time`;
  } catch (e) { $('status').textContent = 'Could not load data: ' + e.message; }
  render();
}

function agg(rows, key) { const g = {}; rows.forEach(r => (g[key(r)] ??= []).push(r)); return g; }

function render() {
  if (!DATA) { $('cards').innerHTML = ''; $('stamp').textContent = ''; return; }
  const d = $('day').value, t = $('time').value, y = +$('year').value, m = +$('month').value;
  const dayRows = d ? DATA.rows.filter(r => r.d === d) : DATA.rows;
  const sel = t ? dayRows.filter(r => r.h === t) : dayRows;
  $('stamp').textContent = LOCS[$('loc').value].n + ' · ' + (d
    ? new Date(y, m, +d).toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${MON[m]} ${y}`) + (t ? ` · ${t}:00` : '');
  if (!sel.length) { $('cards').innerHTML = '<p class="sub">No data for this selection (it may be past the latest archived day).</p>'; return; }
  const c = k => sel.map(r => r[k]);
  const cards = [['Avg temp', avg(c('temp')), '°C'], ['Highest', max(c('temp')), '°C'], ['Lowest', min(c('temp')), '°C'],
    ['Rainfall', sum(c('rain')), 'mm'], ['Humidity', avg(c('hum')), '%'], ['Avg wind', avg(c('wind')), 'km/h'],
    ['Max wind', max(c('wind')), 'km/h'], ['Pressure', avg(c('pres')), 'hPa'], ['Cloud cover', avg(c('cloud')), '%']];
  if (!d) {
    const g = agg(DATA.rows, r => r.d);
    cards.push(['Rainy days (≥1 mm)', Object.values(g).filter(x => sum(x.map(r => r.rain)) >= 1).length, 'days']);
  }
  $('cards').innerHTML = cards.map(([l, v, u]) => `<div class="card"><span>${l}</span><b>${fmt(v)} <small>${u}</small></b></div>`).join('');

  let labels, T, Tmax, Tmin, R, H, W;
  if (d) {
    labels = dayRows.map(r => r.h + ':00');
    T = dayRows.map(r => r.temp); R = dayRows.map(r => r.rain);
    H = dayRows.map(r => r.hum); W = dayRows.map(r => r.wind);
  } else {
    const g = agg(DATA.rows, r => r.d); labels = Object.keys(g).map(Number);
    const col = k => Object.values(g).map(x => x.map(r => r[k]));
    T = col('temp').map(avg); Tmax = col('temp').map(max); Tmin = col('temp').map(min);
    R = col('rain').map(sum); H = col('hum').map(avg); W = col('wind').map(avg);
  }
  const line = (label, data, color, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, tension: .3, pointRadius: 2, ...extra });
  mk('cTemp', 'line', 'Temperature (°C)', labels, d ? [line('Temp', T, '#e5484d')]
    : [line('Max', Tmax, '#e5484d'), line('Mean', T, '#f59f00'), line('Min', Tmin, '#0b6bcb')]);
  mk('cRain', 'bar', 'Rainfall (mm)', labels, [{ label: 'Rain', data: R, backgroundColor: '#0b6bcb' }]);
  mk('cHW', 'line', 'Humidity (%) & wind (km/h)', labels,
    [line('Humidity', H, '#12a594', { yAxisID: 'y' }), line('Wind', W, '#8e4ec6', { yAxisID: 'y1' })],
    { y1: { position: 'right', grid: { drawOnChartArea: false } } });
}

function mk(id, type, title, labels, datasets, scales = {}) {
  charts[id]?.destroy();
  charts[id] = new Chart($(id), { type, data: { labels, datasets },
    options: { responsive: true, plugins: { title: { display: true, text: title } }, scales } });
}

/* ---------- Helpers ---------- */
function toCsv(rows, cols) { return [cols.join(','), ...rows.map(r => cols.map(c => r[c] ?? '').join(','))].join('\n'); }
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click();
}
function ph() { // current Philippine time parts
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
}

/* ---------- Auto recorder ---------- */
const sched = () => store('sched') || { days: ['Wed', 'Fri'], times: ['09:00', '15:00'], locs: ['naga', 'milaor'] };
let cloud = [];

function initRecorder() {
  drawSched();
  $('saveBtn').onclick = saveSched; $('nowBtn').onclick = recordNow;
  $('recCsv').onclick = () => download('recorded-weather.csv', toCsv(allRecs(), ['at', 'loc', 'temp', 'hum', 'rain', 'wind', 'pres', 'cloud', 'src']));
  $('recClr').onclick = () => { store('recs', []); drawRecs(); };
  fetch('data/records.json?' + Date.now()).then(r => r.json()).then(j => { cloud = j; drawRecs(); }).catch(() => {});
  drawRecs();
  setInterval(() => {
    const p = ph(), s = sched(), hm = `${p.hour}:${p.minute}`, key = `${p.year}-${p.month}-${p.day} ${hm}`;
    if (s.days.includes(p.weekday) && s.times.includes(hm) && localStorage.getItem('lastRec') !== key) {
      localStorage.setItem('lastRec', key); recordNow();
    }
  }, 20000);
}
function drawSched() {
  const s = sched();
  $('days').innerHTML = DAYS.map(d => `<label class="chk"><input type="checkbox" value="${d}" ${s.days.includes(d) ? 'checked' : ''}>${d}</label>`).join('');
  $('locs').innerHTML = Object.entries(LOCS).map(([k, v]) => `<label class="chk"><input type="checkbox" value="${k}" ${s.locs.includes(k) ? 'checked' : ''}>${v.n}</label>`).join('');
  $('times').value = s.times.join(', ');
  $('json').value = JSON.stringify(s, null, 2);
}
function saveSched() {
  const s = {
    days: [...document.querySelectorAll('#days input:checked')].map(i => i.value),
    times: $('times').value.split(',').map(x => x.trim()).filter(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)),
    locs: [...document.querySelectorAll('#locs input:checked')].map(i => i.value)
  };
  store('sched', s); drawSched();
  $('msg').textContent = 'Saved. Keep this tab open for browser recording, or copy the JSON below into schedule.json for GitHub Actions.';
}
async function recordNow() {
  const p = ph(), at = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`, out = [];
  for (const k of sched().locs) {
    const L = LOCS[k];
    try {
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&current=${VARS}&timezone=Asia%2FManila`)).json();
      const c = j.current;
      out.push({ at, loc: L.n, temp: c.temperature_2m, hum: c.relative_humidity_2m, rain: c.precipitation,
        wind: c.wind_speed_10m, pres: c.pressure_msl, cloud: c.cloud_cover, src: 'browser' });
    } catch (e) { $('msg').textContent = 'Record failed: ' + e.message; }
  }
  store('recs', [...(store('recs') || []), ...out]); drawRecs();
}
const allRecs = () => [...cloud, ...(store('recs') || [])].sort((a, b) => b.at.localeCompare(a.at));
function drawRecs() {
  const rows = allRecs().slice(0, 200);
  $('recs').innerHTML = '<tr><th>Time</th><th>Place</th><th>°C</th><th>%</th><th>mm</th><th>km/h</th><th>Src</th></tr>' +
    rows.map(r => `<tr><td>${r.at}</td><td>${r.loc}</td><td>${r.temp}</td><td>${r.hum}</td><td>${r.rain}</td><td>${r.wind}</td><td>${r.src}</td></tr>`).join('');
}
init();
