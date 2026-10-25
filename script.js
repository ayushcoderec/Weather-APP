// Optional: paste your OpenWeather key here. If you leave it empty, the app asks for it on first load
// and remembers it in this browser. Get a free key at https://home.openweathermap.org/api_keys
const API_KEY = "cc43ba69009c31161202dfcc15594f47";

const { esc, iconUrl, pct, compass, store, fmtHour, fmtClock, fetchWeather, friendlyError,
        skyFor, precipFor, rainOutlook, dailySummary, range24, curve, createFX } = WeatherCore;

const $ = (id) => document.getElementById(id);
const fx = createFX($("fx"));

const state = {
  units: store.get("units") === "imperial" ? "imperial" : "metric",
  query: (() => {
    try { return JSON.parse(store.get("query")) || { type: "city", city: "Raipur" }; }
    catch (e) { return { type: "city", city: "Raipur" }; }
  })(),
};
let requestId = 0;

const getKey = () => API_KEY || store.get("owm_key") || "";

/* ---------- UI state helpers ---------- */
function showNotice(msg, isError = false) {
  const el = $("notice");
  el.textContent = msg;
  el.className = "notice" + (isError ? " is-error" : "");
  el.hidden = false;
}
const hideNotice = () => ($("notice").hidden = true);

function showSetup() {
  $("dash").hidden = true;
  $("setup").hidden = false;
  fx.set("none", 0);
}

function syncUnitButtons() {
  document.querySelectorAll(".seg button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.unit === state.units))
  );
}

/* ---------- loading ---------- */
async function load() {
  const key = getKey();
  if (!key) return showSetup();

  const mine = ++requestId;
  $("setup").hidden = true;
  hideNotice();
  $("dash").setAttribute("aria-busy", "true");

  try {
    const data = await fetchWeather(state.query, state.units, key);
    if (mine !== requestId) return; // a newer search replaced this one
    render(data);
    store.set("query", JSON.stringify(state.query));
  } catch (err) {
    if (mine !== requestId) return;
    showNotice(friendlyError(err), true);
    if (err.status === 401) showSetup();
  } finally {
    if (mine === requestId) $("dash").setAttribute("aria-busy", "false");
  }
}

/* ---------- rendering ---------- */
function render({ current, forecast }) {
  const tz = current.timezone;
  const w = current.weather[0];
  const metric = state.units === "metric";

  document.body.dataset.sky = skyFor(w);
  const p = precipFor(w);
  fx.set(p.mode, p.intensity);

  const place = current.sys && current.sys.country ? `${current.name}, ${current.sys.country}` : current.name;
  $("city-name").textContent = place;
  $("local-time").textContent = fmtClock(current.dt, tz);
  $("temp").textContent = `${Math.round(current.main.temp)}°`;
  $("icon").src = iconUrl(w.icon, "@4x");
  $("description").textContent = w.description;
  document.title = `${Math.round(current.main.temp)}° in ${current.name}`;

  const days = dailySummary(forecast.list, tz, current.dt);
  const { hi, lo } = range24(current, forecast.list);
  $("hilo").textContent = `High ${Math.round(hi)}°, low ${Math.round(lo)}° over the next 24 hours`;

  const wind = metric ? current.wind.speed * 3.6 : current.wind.speed;
  const dir = current.wind.deg != null ? ` ${compass(current.wind.deg)}` : "";
  $("feels").textContent = `${Math.round(current.main.feels_like)}°`;
  $("humidity").textContent = `${current.main.humidity}%`;
  $("wind").textContent = `${Math.round(wind)} ${metric ? "km/h" : "mph"}${dir}`;
  $("pressure").textContent = `${current.main.pressure} hPa`;
  $("visibility").textContent = current.visibility != null ? `${+(current.visibility / 1000).toFixed(1)} km` : "n/a";
  $("clouds").textContent = `${current.clouds ? current.clouds.all : 0}%`;

  renderRain(rainOutlook(current, forecast.list, tz), tz);
  renderDays(days);
  $("dash").hidden = false;
}

function renderRain(outlook, tz) {
  const { slots } = outlook;
  const c = curve(slots.map((s) => s.pop));

  $("rain-headline").textContent = outlook.headline;
  $("rain-detail").textContent = outlook.detail;
  $("chart").setAttribute("aria-label", `${outlook.headline}. ${outlook.detail}`);

  const pops = slots
    .map((s, i) => {
      const cls = i === outlook.peakIndex ? " is-peak" : s.pop < 0.05 ? " zero" : "";
      return `<span class="pop${cls}">${pct(s.pop)}%</span>`;
    })
    .join("");

  const cols = slots
    .map(
      (s) => `
      <div class="slot">
        <span class="t">${esc(fmtHour(s.dt, tz))}</span>
        <img src="${iconUrl(s.icon)}" alt="" width="36" height="36" />
        <span class="c">${Math.round(s.temp)}°</span>
        <span class="mm">${s.mm >= 0.1 ? s.mm.toFixed(1) + " mm" : ""}</span>
      </div>`
    )
    .join("");

  $("chart").innerHTML = `
    <div class="chart-inner">
      <div class="pops">${pops}</div>
      <svg class="curve" viewBox="0 0 ${c.W} 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8fdcff" stop-opacity="0.55" />
            <stop offset="1" stop-color="#8fdcff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="area" d="${c.area}" />
        <path class="line" d="${c.line}" />
      </svg>
      <div class="slots">${cols}</div>
    </div>`;
}

function renderDays(days) {
  $("days").innerHTML = days
    .map((d) => {
      const chance = pct(d.pop);
      return `
      <li>
        <span class="dn">${esc(d.label)}</span>
        <img src="${iconUrl(d.icon)}" alt="" width="36" height="36" />
        <span class="chance" aria-label="${chance}% chance of rain">
          <span class="bar"><i style="width:${chance}%"></i></span><b>${chance}%</b>
        </span>
        <span class="range"><span class="hi">${Math.round(d.hi)}°</span><span class="lo">${Math.round(d.lo)}°</span></span>
      </li>`;
    })
    .join("");
}

/* ---------- events ---------- */
$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const city = $("city-input").value.trim();
  if (!city) return;
  state.query = { type: "city", city };
  load();
});

$("locate-btn").addEventListener("click", () => {
  if (!navigator.geolocation) return showNotice("This browser can't share your location. Search for a city instead.", true);
  showNotice("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.query = { type: "coords", lat: pos.coords.latitude, lon: pos.coords.longitude };
      load();
    },
    () => showNotice("Location access is blocked. Allow it in your browser settings, or search for a city.", true)
  );
});

document.querySelectorAll(".seg button").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (state.units === btn.dataset.unit) return;
    state.units = btn.dataset.unit;
    store.set("units", state.units);
    syncUnitButtons();
    load();
  })
);

$("key-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const key = $("key-input").value.trim();
  if (!key) return;
  store.set("owm_key", key);
  load();
});

syncUnitButtons();
load();