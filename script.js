// 1. Get a free key at https://home.openweathermap.org/api_keys and paste it here.
const API_KEY = "cc43ba69009c31161202dfcc15594f47";
const BASE = "https://api.openweathermap.org/data/2.5";

let units = "metric"; // "metric" = °C, "imperial" = °F
let lastQuery = null; // remembers the last search so the unit toggle can refetch

const $ = (id) => document.getElementById(id);
const form = $("search-form");
const cityInput = $("city-input");
const statusEl = $("status");

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (isError ? " error" : "");
  statusEl.hidden = false;
}
const hideStatus = () => (statusEl.hidden = true);

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

function buildUrls(query) {
  const base = query.type === "city" ? `q=${encodeURIComponent(query.city)}` : `lat=${query.lat}&lon=${query.lon}`;
  const common = `&units=${units}&appid=${API_KEY}`;
  return {
    current: `${BASE}/weather?${base}${common}`,
    forecast: `${BASE}/forecast?${base}${common}`,
  };
}

async function loadWeather(query) {
  if (API_KEY === "YOUR_API_KEY_HERE") {
    showStatus("Add your OpenWeather API key in script.js first.", true);
    return;
  }
  lastQuery = query;
  showStatus("Loading...");
  try {
    const urls = buildUrls(query);
    const [current, forecast] = await Promise.all([getJSON(urls.current), getJSON(urls.forecast)]);
    renderCurrent(current);
    renderForecast(forecast);
    hideStatus();
  } catch (err) {
    $("current").hidden = true;
    $("forecast-wrap").hidden = true;
    showStatus(`Error: ${err.message}`, true);
  }
}

function renderCurrent(d) {
  const unitSymbol = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "m/s" : "mph";
  $("city-name").textContent = `${d.name}, ${d.sys.country}`;
  $("description").textContent = d.weather[0].description;
  $("icon").src = `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`;
  $("temp").textContent = `${Math.round(d.main.temp)}${unitSymbol}`;
  $("feels").textContent = `${Math.round(d.main.feels_like)}${unitSymbol}`;
  $("humidity").textContent = `${d.main.humidity}%`;
  $("wind").textContent = `${d.wind.speed} ${windUnit}`;
  $("pressure").textContent = `${d.main.pressure} hPa`;
  $("current").hidden = false;
}

function renderForecast(data) {
  const unitSymbol = units === "metric" ? "°C" : "°F";
  // The API returns 3-hour steps; group by day and take the entry closest to noon.
  const byDay = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    const hour = Number(item.dt_txt.split(" ")[1].slice(0, 2));
    const diff = Math.abs(hour - 12);
    if (!byDay[date] || diff < byDay[date].diff) byDay[date] = { item, diff };
  });

  const days = Object.values(byDay).slice(0, 5);
  $("forecast").innerHTML = days
    .map(({ item }) => {
      const name = new Date(item.dt * 1000).toLocaleDateString(undefined, { weekday: "short" });
      return `
        <div class="day">
          <div class="d">${name}</div>
          <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}" />
          <div class="t">${Math.round(item.main.temp)}${unitSymbol}</div>
        </div>`;
    })
    .join("");
  $("forecast-wrap").hidden = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) loadWeather({ type: "city", city });
});

$("locate-btn").addEventListener("click", () => {
  if (!navigator.geolocation) return showStatus("Geolocation is not supported by your browser.", true);
  showStatus("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather({ type: "coords", lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => showStatus("Location access denied.", true)
  );
});

$("unit-btn").addEventListener("click", () => {
  units = units === "metric" ? "imperial" : "metric";
  $("unit-btn").textContent = units === "metric" ? "Switch to °F" : "Switch to °C";
  if (lastQuery) loadWeather(lastQuery);
});

// Default city on first load
loadWeather({ type: "city", city: "Raipur" });