/* Shared weather logic: API calls, rain prediction, formatting, rain/snow animation.
   Loaded as a normal <script>, exposes window.WeatherCore. Used by both the vanilla and React versions. */
(function (global) {
  "use strict";

  const BASE = "https://api.openweathermap.org/data/2.5";
  const WET = ["Rain", "Drizzle", "Thunderstorm", "Snow"];

  /* ---------- small helpers ---------- */
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const iconUrl = (code, size = "@2x") => `https://openweathermap.org/img/wn/${code}${size}.png`;
  const pct = (p) => Math.round(p * 100);
  const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  /* ---------- city-local time ----------
     OpenWeather gives UTC timestamps plus the city's UTC offset in seconds.
     Shifting by the offset and reading the UTC fields gives the city's local clock. */
  const shifted = (dt, tz) => new Date((dt + tz) * 1000);
  const fmtHour = (dt, tz) => shifted(dt, tz).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });
  const fmtClock = (dt, tz) => {
    const d = shifted(dt, tz);
    return (
      d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) + ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    );
  };

  /* ---------- network ---------- */
  async function getJSON(url) {
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      const err = new Error("network");
      err.network = true;
      throw err;
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }
    if (!res.ok) {
      const err = new Error(data.message || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function fetchWeather(query, units, key) {
    const loc = query.type === "city" ? `q=${encodeURIComponent(query.city)}` : `lat=${query.lat}&lon=${query.lon}`;
    const tail = `&units=${units}&appid=${encodeURIComponent(key)}`;
    const [current, forecast] = await Promise.all([
      getJSON(`${BASE}/weather?${loc}${tail}`),
      getJSON(`${BASE}/forecast?${loc}${tail}`),
    ]);
    return { current, forecast };
  }

  function friendlyError(err) {
    if (err.network) return "Couldn't reach OpenWeather. Check your internet connection and try again.";
    if (err.status === 401) return "OpenWeather rejected this API key. Check it for typos, or wait a little: new keys can take up to two hours to activate.";
    if (err.status === 404) return "No city matches that search. Check the spelling or try a larger nearby city.";
    if (err.status === 429) return "This API key has made too many requests. Wait a minute and try again.";
    return err.message || "Something went wrong while loading the weather.";
  }

  /* ---------- sky theme + precipitation effect ---------- */
  function skyFor(w) {
    const id = w.id;
    const when = w.icon.endsWith("n") ? "night" : "day";
    let kind;
    if (id >= 200 && id < 300) kind = "storm";
    else if (id < 600) kind = "rain";
    else if (id < 700) kind = "snow";
    else if (id < 800) kind = "mist";
    else if (id <= 801) kind = "clear";
    else kind = "clouds";
    return `${kind}-${when}`;
  }

  function precipFor(w) {
    const id = w.id;
    if (id >= 200 && id < 300) return { mode: "rain", intensity: 1.7 };
    if (id >= 300 && id < 400) return { mode: "rain", intensity: 0.45 };
    if (id >= 500 && id < 600) {
      const i = id === 500 ? 0.6 : id === 501 ? 1 : id <= 504 ? 1.5 : id === 511 ? 0.9 : id === 520 ? 0.7 : id === 521 ? 1 : 1.4;
      return { mode: "rain", intensity: i };
    }
    if (id >= 600 && id < 700) return { mode: "snow", intensity: id <= 601 ? 0.7 : 1.2 };
    return { mode: "none", intensity: 0 };
  }

  /* ---------- rain prediction ----------
     The forecast endpoint returns 3-hour steps. Each has `pop` (probability of precipitation, 0 to 1)
     and, when wet, `rain["3h"]` / `snow["3h"]` in mm. We look at the next 8 steps (24 hours). */
  function rainOutlook(current, list, tz) {
    const slots = list.slice(0, 8).map((i) => ({
      dt: i.dt,
      pop: i.pop || 0,
      mm: ((i.rain && i.rain["3h"]) || 0) + ((i.snow && i.snow["3h"]) || 0),
      temp: i.main.temp,
      icon: i.weather[0].icon,
      main: i.weather[0].main,
    }));

    const w = current.weather[0];
    const nowWet = WET.includes(w.main);
    const total = slots.reduce((sum, s) => sum + s.mm, 0);
    const maxPop = Math.max(...slots.map((s) => s.pop));
    const peakIndex = maxPop >= 0.3 ? slots.findIndex((s) => s.pop === maxPop) : -1;
    const hourOf = (i) => fmtHour(slots[i].dt, tz);

    let headline;
    if (nowWet) {
      const noun = w.main === "Snow" ? "Snow" : "Rain";
      const end = slots.findIndex((s) => s.pop < 0.3);
      if (end === -1) headline = `${noun} continues through the next 24 hours`;
      else if (end === 0) headline = `${noun} should ease within 3 hours`;
      else headline = `${noun} easing around ${hourOf(end)}`;
    } else {
      const likely = slots.findIndex((s) => s.pop >= 0.5);
      const maybe = slots.findIndex((s) => s.pop >= 0.3);
      if (likely === 0) headline = `${slots[0].main === "Snow" ? "Snow" : "Rain"} likely within 3 hours`;
      else if (likely > 0) headline = `${slots[likely].main === "Snow" ? "Snow" : "Rain"} likely around ${hourOf(likely)}`;
      else if (maybe === 0) headline = "Chance of showers within 3 hours";
      else if (maybe > 0) headline = `Chance of ${slots[maybe].main === "Snow" ? "snow" : "showers"} around ${hourOf(maybe)}`;
      else headline = "No rain expected in the next 24 hours";
    }

    let detail;
    if (total < 0.1 && maxPop < 0.3 && !nowWet) {
      detail = `The highest chance is ${pct(maxPop)}%. No umbrella needed.`;
    } else {
      detail = total >= 0.1
        ? `About ${total.toFixed(1)} mm expected over the next 24 hours.`
        : "Little to no accumulation expected over the next 24 hours.";
      if (maxPop >= 0.5) detail += " Take an umbrella.";
      else if (maxPop >= 0.3) detail += " An umbrella is worth packing.";
    }

    return { headline, detail, slots, total, maxPop, peakIndex };
  }

  /* Group the 3-hour steps into one row per local calendar day. */
  function dailySummary(list, tz, nowDt) {
    const dayKey = (dt) => shifted(dt, tz).toISOString().slice(0, 10);
    const todayKey = dayKey(nowDt);
    const groups = new Map();
    list.forEach((item) => {
      const k = dayKey(item.dt);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(item);
    });

    // Late in the evening "today" has only one or two steps left, which makes a poor row. Skip it.
    let entries = [...groups.entries()];
    if (entries.length && entries[0][1].length < 3) entries = entries.slice(1);

    return entries.slice(0, 5).map(([key, items]) => {
      const noon = items.reduce((best, it) => {
        const dist = (x) => Math.abs(shifted(x.dt, tz).getUTCHours() - 12);
        return dist(it) < dist(best) ? it : best;
      });
      return {
        key,
        label: key === todayKey ? "Today" : shifted(noon.dt, tz).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        icon: noon.weather[0].icon.replace("n", "d"),
        hi: Math.max(...items.map((i) => i.main.temp_max)),
        lo: Math.min(...items.map((i) => i.main.temp_min)),
        pop: Math.max(...items.map((i) => i.pop || 0)),
      };
    });
  }

  /* Highest and lowest temperature over the next 24 hours, including right now. */
  function range24(current, list) {
    const temps = list.slice(0, 8).flatMap((i) => [i.main.temp_max, i.main.temp_min]);
    temps.push(current.main.temp);
    return { hi: Math.max(...temps), lo: Math.min(...temps) };
  }

  /* Smooth SVG path through the rain-chance values. One point per 100 units of width,
     centred in its column, so the curve lines up with the HTML columns above and below it. */
  function curve(pops) {
    const n = pops.length, W = n * 100, top = 8, base = 96;
    const r = (v) => +v.toFixed(1);
    const pts = pops.map((p, i) => [i * 100 + 50, base - (base - top) * Math.min(1, p)]);
    let d = `M0 ${r(pts[0][1])} L${pts[0][0]} ${r(pts[0][1])}`;
    for (let i = 1; i < n; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], mx = (ax + bx) / 2;
      d += ` C${mx} ${r(ay)} ${mx} ${r(by)} ${bx} ${r(by)}`;
    }
    d += ` L${W} ${r(pts[n - 1][1])}`;
    return { W, line: d, area: `${d} L${W} 100 L0 100 Z` };
  }

  /* ---------- falling rain / snow on a full-screen canvas ---------- */
  function createFX(canvas) {
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, parts = [], mode = "none", intensity = 0, raf = 0, last = 0;
    const rand = (a, b) => a + Math.random() * (b - a);

    function spawn(anywhere) {
      const x = rand(-60, w + 60);
      const y = anywhere ? rand(0, h) : rand(-60, 0);
      return mode === "rain"
        ? { x, y, len: rand(10, 24), v: rand(900, 1400), a: rand(0.15, 0.4) }
        : { x, y, r: rand(1, 3), v: rand(30, 80), ph: rand(0, 6.28), a: rand(0.4, 0.9) };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = mode === "rain" ? 7000 : 12000;
      const count = mode === "none" ? 0 : Math.round(Math.min(260, (w * h) / density) * intensity);
      parts = Array.from({ length: count }, () => spawn(true));
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      if (mode === "rain") {
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        for (const p of parts) {
          ctx.strokeStyle = `rgba(200,225,255,${p.a})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.18, p.y - p.len);
          ctx.stroke();
          p.y += p.v * dt;
          p.x -= p.v * dt * 0.18;
          if (p.y - p.len > h) Object.assign(p, spawn(false));
        }
      } else {
        for (const p of parts) {
          ctx.fillStyle = `rgba(255,255,255,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fill();
          p.y += p.v * dt;
          p.x += Math.sin(t / 1000 + p.ph) * 20 * dt;
          if (p.y - p.r > h) Object.assign(p, spawn(false));
        }
      }
      raf = requestAnimationFrame(frame);
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    return {
      set(nextMode, nextIntensity) {
        mode = nextMode;
        intensity = nextIntensity;
        cancelAnimationFrame(raf);
        resize();
        ctx.clearRect(0, 0, w, h);
        if (mode === "none" || reduce.matches) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
    };
  }

  global.WeatherCore = {
    esc, iconUrl, pct, compass, store,
    fmtHour, fmtClock, fetchWeather, friendlyError,
    skyFor, precipFor, rainOutlook, dailySummary, range24, curve, createFX,
  };
})(window);