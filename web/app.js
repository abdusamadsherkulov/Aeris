/* ===== helpers ===== */
const $ = (s) => document.querySelector(s);
const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const state = {
  units: store.get('units', 'metric'),
  city: store.get('city', 'Tashkent'),
  recent: JSON.parse(store.get('recent', '[]')),
  shownTemp: 0,
};
const SURPRISE = ['Tokyo', 'Reykjavik', 'Dubai', 'Samarkand', 'Vancouver', 'Cairo', 'Singapore', 'Oslo',
  'Buenos Aires', 'Mumbai', 'Sydney', 'Istanbul', 'Nairobi', 'Lima', 'Seoul', 'Anchorage'];

/* ===== sky effects (canvas) ===== */
const fx = (() => {
  const cv = $('#fx'), c = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, kind = 'clear', night = false;
  let drops = [], flakes = [], stars = [], clouds = [], flash = 0, bolt = null, t = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    const rainN = { rain: 260, thunder: 340, drizzle: 110 }[kind] || 0;
    drops = Array.from({ length: rainN }, () => ({
      x: rnd(0, W), y: rnd(0, H), l: rnd(10, 26), a: rnd(.25, .6),
      v: (kind === 'drizzle' ? 9 : 16) + rnd(0, 10),
    }));
    flakes = kind === 'snow' ? Array.from({ length: 150 }, () => ({
      x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3.4), v: rnd(.5, 1.6), p: rnd(0, 6.28), s: rnd(.4, 1),
    })) : [];
    const starN = night && (kind === 'clear' || kind === 'clouds') ? (kind === 'clear' ? 150 : 60) : 0;
    stars = Array.from({ length: starN }, () => ({ x: rnd(0, W), y: rnd(0, H * .7), r: rnd(.4, 1.6), p: rnd(0, 6.28) }));
    const cn = { clear: 3, clouds: 9, rain: 9, drizzle: 8, thunder: 11, snow: 7, mist: 4 }[kind];
    clouds = Array.from({ length: cn }, () => ({
      x: rnd(-.2 * W, 1.2 * W), y: rnd(-20, H * .5), r: rnd(140, 320), v: rnd(.08, .3),
    }));
    if (reduce) frame();
  }

  function cloudRGB() {
    if (night) return '130,145,185';
    return (kind === 'rain' || kind === 'thunder' || kind === 'drizzle') ? '35,48,62' : '255,255,255';
  }
  const cloudA = () => ({ clear: .10, clouds: .22, rain: .30, drizzle: .26, thunder: .34, snow: .2, mist: .14 }[kind]);

  function glow(x, y, r, color) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }

  function makeBolt() {
    let x = rnd(W * .2, W * .8), y = 0; const pts = [[x, y]];
    while (y < H * .7) { x += rnd(-40, 40); y += rnd(20, 50); pts.push([x, y]); }
    bolt = pts;
  }

  function frame() {
    t += reduce ? 0 : 1;
    c.clearRect(0, 0, W, H);

    // sun / moon
    if ((kind === 'clear' || kind === 'clouds') && !night) {
      glow(W * .82, H * .16, kind === 'clear' ? 420 : 260, 'rgba(255,214,120,.55)');
      if (kind === 'clear') glow(W * .82, H * .16, 70, 'rgba(255,248,220,.95)');
    } else if (night && (kind === 'clear' || kind === 'clouds')) {
      glow(W * .82, H * .16, 220, 'rgba(180,200,255,.28)');
      glow(W * .82, H * .16, 46, 'rgba(240,244,255,.95)');
    }

    // stars
    for (const s of stars) {
      c.globalAlpha = .45 + .5 * Math.sin(t * .03 + s.p);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;

    // clouds
    const rgb = cloudRGB(), a = cloudA();
    for (const cl of clouds) {
      cl.x += cl.v; if (cl.x - cl.r * 1.8 > W) cl.x = -cl.r * 1.8;
      c.save(); c.translate(cl.x, cl.y); c.scale(1.9, 1);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, cl.r);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, cl.r, 0, 6.283); c.fill(); c.restore();
    }

    // mist bands
    if (kind === 'mist') {
      for (let i = 0; i < 5; i++) {
        const y = H * (.25 + i * .15), off = Math.sin(t * .004 + i) * 80;
        const g = c.createLinearGradient(0, y - 60, 0, y + 60);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${night ? .06 : .14})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(off - 100, y - 60, W + 200, 120);
      }
    }

    // rain
    c.lineCap = 'round';
    for (const d of drops) {
      d.y += d.v; d.x -= d.v * .12;
      if (d.y > H) { d.y = -d.l; d.x = rnd(0, W + 100); }
      c.strokeStyle = `rgba(190,215,255,${d.a})`; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * .12, d.y - d.l); c.stroke();
    }

    // snow
    c.fillStyle = '#fff';
    for (const f of flakes) {
      f.y += f.v; f.p += .02; f.x += Math.sin(f.p) * f.s;
      if (f.y > H + 5) { f.y = -5; f.x = rnd(0, W); }
      c.globalAlpha = .85; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;

    // lightning
    if (kind === 'thunder') {
      if (!reduce && Math.random() < .004) { flash = 1; makeBolt(); }
      if (flash > .02) {
        c.fillStyle = `rgba(220,225,255,${flash * .3})`; c.fillRect(0, 0, W, H);
        if (bolt) {
          c.strokeStyle = `rgba(255,255,255,${flash})`; c.lineWidth = 2.5;
          c.shadowColor = '#b8c4ff'; c.shadowBlur = 24;
          c.beginPath(); bolt.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
          c.shadowBlur = 0;
        }
        flash *= .88;
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  let started = false;
  return {
    set(k, n) { kind = k; night = n; resize(); if (!started && !reduce) { started = true; requestAnimationFrame(frame); } },
  };
})();

/* ===== mapping weather -> scene ===== */
function sceneOf(main, isNight) {
  const m = (main || '').toLowerCase();
  const kind = m === 'clear' ? 'clear' : m === 'clouds' ? 'clouds' : m === 'rain' ? 'rain'
    : m === 'drizzle' ? 'drizzle' : m === 'thunderstorm' ? 'thunder' : m === 'snow' ? 'snow' : 'mist';
  let theme = kind === 'drizzle' ? 'rain' : kind;
  if (kind !== 'thunder') theme += isNight ? '-night' : '-day';
  return { kind, theme };
}

function vibe(d, units) {
  const m = d.weather_main.toLowerCase();
  const c = units === 'imperial' ? (d.temp - 32) * 5 / 9 : d.temp;
  if (m === 'thunderstorm') return '⚡ Storm brewing. Stay in, charge everything, and call it a movie night.';
  if (m === 'rain' || m === 'drizzle') return '☔ Umbrella day. Great excuse for a hot drink and a long playlist.';
  if (m === 'snow') return '❄️ Snow! Layer up — and maybe build something ridiculous.';
  if (['mist', 'fog', 'haze', 'smoke', 'dust', 'sand'].includes(m)) return '🌫️ Low visibility out there. Take it slow if you’re heading out.';
  if (c >= 35) return '🔥 Scorching. Water, shade, and absolutely no heavy plans.';
  if (c >= 27) return '😎 Properly warm. Sunglasses on, hydrate often.';
  if (c >= 17) return '🌿 Lovely out there. This is the “go for a walk” kind of weather.';
  if (c >= 8) return '🧥 Light-jacket weather. Fresh, but fine.';
  if (c >= 0) return '🧣 Chilly. Scarf recommended.';
  return '🥶 Freezing. Seriously, wear the big coat.';
}

/* ===== time helpers (city-local, via API timezone offset) ===== */
const shifted = (unix, tz) => new Date((unix + tz) * 1000);           // read with getUTC*
const hhmm = (d) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
const cardinal = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

/* ===== render ===== */
function countTo(el, to) {
  const from = state.shownTemp, start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / 700, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step); else state.shownTemp = to;
  };
  requestAnimationFrame(step);
}

function render({ current: d, forecast }) {
  const u = state.units, tz = d.timezone || 0;
  const now = Math.floor(Date.now() / 1000);
  const isNight = d.icon.endsWith('n');
  const { kind, theme } = sceneOf(d.weather_main, isNight);
  document.body.dataset.theme = theme;
  fx.set(kind, isNight);

  const [name, country] = d.city.split(',');
  $('#city').textContent = name;
  $('#country').textContent = country || '';
  const local = shifted(now, tz);
  $('#clock').textContent = local.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) + ' · ' + hhmm(local);

  $('#icon').src = `https://openweathermap.org/img/wn/${d.icon}@4x.png`;
  $('#icon').alt = d.description;
  countTo($('#temp'), Math.round(d.temp));
  $('#unitLbl').textContent = u === 'metric' ? '°C' : '°F';
  $('#desc').textContent = d.description;
  $('#hi').textContent = Math.round(d.temp_max) + '°';
  $('#lo').textContent = Math.round(d.temp_min) + '°';
  $('#feels').textContent = Math.round(d.feels_like) + '°';
  $('#vibe').textContent = vibe(d, u);

  // tiles
  $('#humTxt').textContent = d.humidity + '%';
  $('#humRing').style.strokeDashoffset = 251.3 * (1 - d.humidity / 100);

  const spd = u === 'metric' ? `${d.wind_speed.toFixed(1)} m/s` : `${d.wind_speed.toFixed(1)} mph`;
  $('#wind').textContent = d.wind_deg != null ? `${spd} · ${cardinal(d.wind_deg)}` : spd;
  $('#arrow').style.transform = `rotate(${(d.wind_deg ?? 0) + 180}deg)`;

  $('#press').textContent = d.pressure + ' hPa';
  $('#pressBar').style.width = Math.max(0, Math.min(100, (d.pressure - 970) / 80 * 100)) + '%';
  $('#pressLbl').textContent = d.pressure < 1000 ? 'Low — unsettled' : d.pressure > 1020 ? 'High — stable' : 'Normal';

  if (d.visibility != null) {
    $('#vis').textContent = u === 'metric' ? `${(d.visibility / 1000).toFixed(1)} km` : `${(d.visibility / 1609).toFixed(1)} mi`;
  } else $('#vis').textContent = '—';
  $('#cloudLbl').textContent = d.clouds != null ? `${d.clouds}% cloud cover` : '';

  // sun arc
  if (d.sunrise && d.sunset) {
    $('#rise').textContent = hhmm(shifted(d.sunrise, tz));
    $('#set').textContent = hhmm(shifted(d.sunset, tz));
    const p = Math.max(0, Math.min(1, (now - d.sunrise) / (d.sunset - d.sunrise)));
    const dot = $('#sunDot');
    dot.setAttribute('cx', 100 - 90 * Math.cos(Math.PI * p));
    dot.setAttribute('cy', 95 - 90 * Math.sin(Math.PI * p));
    document.querySelector('.sun').classList.toggle('night', now < d.sunrise || now > d.sunset);
  }

  // forecast
  const today = local.toISOString().slice(0, 10);
  const lo = Math.min(...forecast.map((f) => f.temp_min)), hi = Math.max(...forecast.map((f) => f.temp_max));
  $('#forecast').innerHTML = forecast.map((f) => {
    const label = f.date === today ? 'Today'
      : new Date(f.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const left = ((f.temp_min - lo) / (hi - lo || 1)) * 100, width = Math.max(8, ((f.temp_max - f.temp_min) / (hi - lo || 1)) * 100);
    return `<div class="day">
      <div class="dn">${label}</div>
      <img src="https://openweathermap.org/img/wn/${f.icon}@2x.png" alt="">
      <div class="dd">${f.description}</div>
      <div class="t">${Math.round(f.temp_max)}° <span>${Math.round(f.temp_min)}°</span></div>
      <div class="range"><i style="left:${left}%;width:${width}%"></i></div>
    </div>`;
  }).join('');

  document.title = `${Math.round(d.temp)}° ${name} — Aeris`;
}

/* ===== data ===== */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 3500);
}

async function load(city) {
  const view = $('#view');
  view.classList.add('loading');
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}&units=${state.units}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Something went wrong.');
    state.city = city; store.set('city', city);
    state.recent = [json.current.city.split(',')[0], ...state.recent.filter((c) => c.toLowerCase() !== json.current.city.split(',')[0].toLowerCase())].slice(0, 5);
    store.set('recent', JSON.stringify(state.recent));
    renderRecent();
    render(json);
  } catch (e) {
    toast(e.message === 'Failed to fetch' ? 'Can’t reach the server. Is server.py running?' : e.message);
  } finally {
    view.classList.remove('loading');
  }
}

function renderRecent() {
  $('#recent').innerHTML = state.recent.map((c) => `<button type="button">${c}</button>`).join('');
}

/* ===== events ===== */
$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#cityInput').value.trim();
  if (v) { load(v); $('#cityInput').blur(); }
});
$('#recent').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') load(e.target.textContent); });
$('#surprise').addEventListener('click', () => load(SURPRISE[Math.floor(Math.random() * SURPRISE.length)]));
document.querySelectorAll('.seg button').forEach((b) => {
  b.addEventListener('click', () => { state.units = b.dataset.u; store.set('units', state.units); syncUnits(); load(state.city); });
});
function syncUnits() { document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.u === state.units)); }

syncUnits(); renderRecent(); load(state.city);
