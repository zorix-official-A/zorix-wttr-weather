const icons = {
  sunny: "./assets/icons/sun.svg",
  partly: "./assets/icons/cloud-sun.svg",
  cloudy: "./assets/icons/cloud.svg",
  rain: "./assets/icons/rain.svg",
  storm: "./assets/icons/storm.svg",
  snow: "./assets/icons/snow.svg",
  fog: "./assets/icons/fog.svg"
};

let unit = "F";
let data = null;
let city = "Denver";

const $ = id => document.getElementById(id);

function iconFor(code){
  const n = Number(code);
  if(n === 113) return icons.sunny;
  if([116,119].includes(n)) return icons.partly;
  if(n === 122) return icons.cloudy;
  if([143,248,260].includes(n)) return icons.fog;
  if([176,263,266,281,284,293,296,299,302,305,308,311,314,353,356,359].includes(n)) return icons.rain;
  if([179,182,185,227,230,317,320,323,326,329,332,335,338,350,362,365,368,371,374,377].includes(n)) return icons.snow;
  if([200,386,389,392,395].includes(n)) return icons.storm;
  return icons.partly;
}

function textOf(x){
  return x?.weatherDesc?.[0]?.value || "Live weather";
}

function tempOf(x){
  return Number(unit === "F" ? x.tempF || x.avgtempF || x.maxtempF : x.tempC || x.avgtempC || x.maxtempC);
}

function fmt(x){
  return `${Math.round(Number(x))}°`;
}

function dayName(date){
  return new Intl.DateTimeFormat("en",{weekday:"short"}).format(new Date(date+"T12:00:00"));
}

function hourLabel(raw){
  const s = String(raw).padStart(4,"0");
  const h = Number(s.slice(0,-2) || "0");
  if(h === 0) return "12a";
  if(h < 12) return `${h}a`;
  if(h === 12) return "12p";
  return `${h - 12}p`;
}

async function loadWeather(nextCity){
  const card = document.querySelector(".weather-card");
  card.classList.add("loading");
  city = nextCity;

  const paths = [
    `https://wttr.in/${encodeURIComponent(city)}?format=j1&_=${Date.now()}`,
    `https://v2.wttr.in/${encodeURIComponent(city)}?format=j1&_=${Date.now()}`
  ];

  try {
    let lastError = null;

    for (const url of paths) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(url, {
          cache: "no-store",
          mode: "cors",
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        data = await res.json();
        render();
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("wttr.in failed");
  } finally {
    card.classList.remove("loading");
  }
}

function render(){
  const current = data.current_condition[0];
  const area = data.nearest_area?.[0];
  const weather = data.weather || [];
  const place = area?.areaName?.[0]?.value || city;
  const region = area?.region?.[0]?.value || area?.country?.[0]?.value || "";
  const nowTemp = unit === "F" ? current.temp_F : current.temp_C;

  $("place").textContent = region ? `${place}, ${region}` : place;
  $("temp").textContent = fmt(nowTemp);
  $("icon").src = iconFor(current.weatherCode);
  $("icon").alt = textOf(current);
  $("desc").textContent = `${textOf(current)}. Feels like ${fmt(unit === "F" ? current.FeelsLikeF : current.FeelsLikeC)}, humidity ${current.humidity}%, wind ${current.windspeedKmph} km/h.`;
  $("stamp").textContent = `Live wttr.in update: ${new Date().toLocaleTimeString()}`;

  $("fBtn").classList.toggle("active", unit === "F");
  $("cBtn").classList.toggle("active", unit === "C");

  $("days").innerHTML = weather.slice(0,6).map(day => {
    const mid = day.hourly?.[4] || day.hourly?.[0] || {};
    const hi = unit === "F" ? day.maxtempF : day.maxtempC;
    const lo = unit === "F" ? day.mintempF : day.mintempC;
    return `<div class="day">
      <span>${dayName(day.date)}</span>
      <img src="${iconFor(mid.weatherCode)}" alt="">
      <span class="hi">${fmt(hi)}</span>
      <span class="lo">${fmt(lo)}</span>
    </div>`;
  }).join("");

  drawChart(weather[0]?.hourly || []);
}

function drawChart(hourly){
  const points = hourly.slice(0,8).map((h,i) => ({
    x: 38 + i * 86,
    value: tempOf(h),
    time: hourLabel(h.time)
  }));

  const min = Math.min(...points.map(p => p.value));
  const max = Math.max(...points.map(p => p.value));
  const range = Math.max(1,max-min);

  points.forEach(p => p.y = 92 - ((p.value-min)/range)*54);

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
  if(next) loadWeather(next).catch(err => $("desc").textContent = err.message);
});

$("fBtn").onclick = () => { unit = "F"; render(); };
$("cBtn").onclick = () => { unit = "C"; render(); };

loadWeather(city).catch(err => {
  $("place").textContent = "Weather unavailable";
  $("temp").textContent = "--";
  $("desc").textContent = "Live weather failed to load. Try another city or refresh.";
  console.error(err);
});

setInterval(() => loadWeather(city).catch(err => console.error(err)), 5 * 60 * 1000);
