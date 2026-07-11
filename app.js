const icons = {
  sunny: "./assets/icons/sun.svg",
  partly: "./assets/icons/cloud-sun.svg",
  cloudy: "./assets/icons/cloud.svg",
  rain: "./assets/icons/rain.svg",
  storm: "./assets/icons/storm.svg",
  snow: "./assets/icons/snow.svg",
  fog: "./assets/icons/fog.svg"
};

let unit = "C";
let data = null;
const params = new URLSearchParams(location.search);
let city = params.get("q") || "Denver";

const $ = id => document.getElementById(id);

function weatherText(code){
  const map = {
    0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Depositing rime fog",
    51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",
    61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
    71:"Slight snow",73:"Moderate snow",75:"Heavy snow",
    80:"Rain showers",81:"Rain showers",82:"Violent rain showers",
    95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with hail"
  };
  return map[code] || "Live weather";
}

function iconFor(code){
  if(code === 0) return icons.sunny;
  if([1,2].includes(code)) return icons.partly;
  if(code === 3) return icons.cloudy;
  if([45,48].includes(code)) return icons.fog;
  if([51,53,55,61,63,65,80,81,82].includes(code)) return icons.rain;
  if([71,73,75,77,85,86].includes(code)) return icons.snow;
  if([95,96,99].includes(code)) return icons.storm;
  return icons.partly;
}

function cToF(c){
  return c * 9 / 5 + 32;
}

function temp(v){
  return unit === "F" ? cToF(v) : v;
}

function fmt(v){
  return `${Math.round(Number(v))}°`;
}

function dayName(date){
  return new Intl.DateTimeFormat("en",{weekday:"short"}).format(new Date(date+"T12:00:00"));
}

function hourLabel(iso){
  const h = new Date(iso).getHours();
  if(h === 0) return "12a";
  if(h < 12) return `${h}a`;
  if(h === 12) return "12p";
  return `${h - 12}p`;
}

async function geocode(name){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) throw new Error("Geocoding failed");
  const json = await res.json();
  if(!json.results || !json.results.length) throw new Error("City not found");
  return json.results[0];
}

async function loadWeather(nextCity){
  const card = document.querySelector(".weather-card");
  card.classList.add("loading");
  city = nextCity;

  try{
    const place = await geocode(city);

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${place.latitude}` +
      `&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&forecast_days=7` +
      `&timezone=auto`;

    const res = await fetch(url, { cache:"no-store" });
    if(!res.ok) throw new Error("Weather API failed");

    data = {
      place,
      weather: await res.json()
    };

    render();
  } finally {
    card.classList.remove("loading");
  }
}

function render(){
  const place = data.place;
  const w = data.weather;
  const current = w.current;

  $("place").textContent = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}`;
  $("temp").textContent = fmt(temp(current.temperature_2m));
  $("icon").src = iconFor(current.weather_code);
  $("icon").alt = weatherText(current.weather_code);

  $("desc").textContent =
    `${weatherText(current.weather_code)}. Feels like ${fmt(temp(current.apparent_temperature))}, humidity ${current.relative_humidity_2m}%, wind ${Math.round(current.wind_speed_10m)} km/h.`;

  $("stamp").textContent = `Live update: ${new Date().toLocaleTimeString()}`;

  $("fBtn").classList.toggle("active", unit === "F");
  $("cBtn").classList.toggle("active", unit === "C");

  $("days").innerHTML = w.daily.time.slice(0,6).map((date,i) => `
    <div class="day">
      <span>${dayName(date)}</span>
      <img src="${iconFor(w.daily.weather_code[i])}" alt="">
      <span class="hi">${fmt(temp(w.daily.temperature_2m_max[i]))}</span>
      <span class="lo">${fmt(temp(w.daily.temperature_2m_min[i]))}</span>
    </div>
  `).join("");

  drawChart();
}

function drawChart(){
  const w = data.weather;
  const now = new Date(w.current.time).getTime();

  const rows = w.hourly.time
    .map((time,i) => ({
      time,
      value: temp(w.hourly.temperature_2m[i]),
      ms: new Date(time).getTime()
    }))
    .filter(x => x.ms >= now)
    .slice(0,8);

  const points = rows.map((h,i) => ({
    x: 38 + i * 86,
    value: h.value,
    time: hourLabel(h.time)
  }));

  const min = Math.min(...points.map(p => p.value));
  const max = Math.max(...points.map(p => p.value));
  const range = Math.max(1, max - min);

  points.forEach(p => p.y = 92 - ((p.value - min) / range) * 54);

  $("line").setAttribute("d", points.map((p,i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "));
  $("dots").innerHTML = points.map(p => `<circle class="dot" cx="${p.x}" cy="${p.y}" r="6"></circle>`).join("");
  $("labels").innerHTML = points.map(p => `
    <text class="chart-temp" x="${p.x}" y="${p.y - 18}">${fmt(p.value)}</text>
    <text class="chart-time" x="${p.x}" y="166">${p.time}</text>
  `).join("");
}

$("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  const next = $("cityInput").value.trim();
  if(next) loadWeather(next).catch(showError);
});

$("fBtn").onclick = () => { unit = "F"; if(data) render(); };
$("cBtn").onclick = () => { unit = "C"; if(data) render(); };

function showError(err){
  $("place").textContent = "Weather unavailable";
  $("temp").textContent = "--";
  $("desc").textContent = err.message || "Live weather failed to load.";
  console.error(err);
}

if ($("cityInput")) $("cityInput").value = city;
loadWeather(city).catch(showError);
setInterval(() => loadWeather(city).catch(console.error), 5 * 60 * 1000);
