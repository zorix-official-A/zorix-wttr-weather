const ICONS = {
  sunny: "./assets/icons/sun.svg",
  partly: "./assets/icons/cloud-sun.svg",
  cloudy: "./assets/icons/cloud.svg",
  rain: "./assets/icons/rain.svg",
  storm: "./assets/icons/storm.svg",
  snow: "./assets/icons/snow.svg",
  fog: "./assets/icons/fog.svg"
};

const state = {
  unit: "F",
  location: "Denver",
  payload: null
};

const el = {
  city: document.querySelector("#city"),
  temp: document.querySelector("#temp"),
  summary: document.querySelector("#summary"),
  mainIcon: document.querySelector("#mainIcon"),
  forecast: document.querySelector("#forecastStrip"),
  chartLine: document.querySelector("#chartLine"),
  chartDots: document.querySelector("#chartDots"),
  chartLabels: document.querySelector("#chartLabels"),
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#locationInput"),
  unitF: document.querySelector("#unitF"),
  unitC: document.querySelector("#unitC")
};

function codeToIcon(code) {
  const n = Number(code);
  if ([113].includes(n)) return ICONS.sunny;
  if ([116, 119].includes(n)) return ICONS.partly;
  if ([122].includes(n)) return ICONS.cloudy;
  if ([143, 248, 260].includes(n)) return ICONS.fog;
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(n)) return ICONS.rain;
  if ([179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(n)) return ICONS.snow;
  if ([200, 386, 389, 392, 395].includes(n)) return ICONS.storm;
  return ICONS.partly;
}

function dayName(dateText) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(dateText + "T12:00:00"));
}

function tempValue(item, unit = state.unit) {
  return Number(unit === "F" ? item.tempF || item.avgtempF || item.maxtempF : item.tempC || item.avgtempC || item.maxtempC);
}

function fmtTemp(value) {
  return `${Math.round(Number(value))}°`;
}

function conditionText(item) {
  return item?.weatherDesc?.[0]?.value || "Live weather";
}

async function fetchWeather(location) {
  document.body.classList.add("loading");
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Weather service error");
  state.payload = await res.json();
  state.location = location;
  render();
  document.body.classList.remove("loading");
}

function render() {
  const current = state.payload.current_condition[0];
  const area = state.payload.nearest_area?.[0];
  const weather = state.payload.weather || [];
  const city = area?.areaName?.[0]?.value || state.location;
  const region = area?.region?.[0]?.value || area?.country?.[0]?.value || "";
  const code = current.weatherCode;
  const temp = state.unit === "F" ? current.temp_F : current.temp_C;

  el.city.textContent = region ? `${city}, ${region}` : city;
  el.temp.textContent = fmtTemp(temp);
  el.summary.textContent = `${conditionText(current)}. Humidity ${current.humidity}%, wind ${current.windspeedKmph} km/h, feels like ${fmtTemp(state.unit === "F" ? current.FeelsLikeF : current.FeelsLikeC)}.`;
  el.mainIcon.src = codeToIcon(code);
  el.mainIcon.alt = conditionText(current);

  el.unitF.classList.toggle("active", state.unit === "F");
  el.unitC.classList.toggle("active", state.unit === "C");
  renderForecast(weather);
  renderChart(weather[0]?.hourly || []);
}

function renderForecast(weather) {
  el.forecast.innerHTML = weather.slice(0, 6).map(day => {
    const high = state.unit === "F" ? day.maxtempF : day.maxtempC;
    const low = state.unit === "F" ? day.mintempF : day.mintempC;
    const midday = day.hourly?.[4] || day.hourly?.[0] || {};
    return `
      <div class="day">
        <span>${dayName(day.date)}</span>
        <img src="${codeToIcon(midday.weatherCode)}" alt="">
        <span class="hi">${fmtTemp(high)}</span>
        <span class="lo">${fmtTemp(low)}</span>
      </div>
    `;
  }).join("");
}

function renderChart(hourly) {
  const points = hourly.slice(0, 8).map((h, i) => ({
    x: 38 + i * 86,
    value: tempValue(h),
    label: fmtTemp(tempValue(h)),
    time: hourLabel(h.time)
  }));
  if (!points.length) return;

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  points.forEach(p => {
    p.y = 92 - ((p.value - min) / range) * 54;
  });

  el.chartLine.setAttribute("d", points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "));
  el.chartDots.innerHTML = points.map(p => `<circle class="dot" cx="${p.x}" cy="${p.y}" r="6"></circle>`).join("");
  el.chartLabels.innerHTML = points.map(p => `
    <text class="chart-text" x="${p.x}" y="${p.y - 18}">${p.label}</text>
    <text class="chart-time" x="${p.x}" y="166">${p.time}</text>
  `).join("");
}

function hourLabel(raw) {
  const n = String(raw).padStart(4, "0");
  const hour = Number(n.slice(0, -2) || "0");
  if (hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

el.form.addEventListener("submit", event => {
  event.preventDefault();
  const next = el.input.value.trim();
  if (next) fetchWeather(next).catch(showError);
});

el.unitF.addEventListener("click", () => {
  state.unit = "F";
  render();
});

el.unitC.addEventListener("click", () => {
  state.unit = "C";
  render();
});

function showError(error) {
  document.body.classList.remove("loading");
  el.city.textContent = "Weather unavailable";
  el.temp.textContent = "--";
  el.summary.textContent = `${error.message}. Try another city name.`;
}

fetchWeather(state.location).catch(showError);
