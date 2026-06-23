const API_URL = "https://foj972s0id.execute-api.eu-central-1.amazonaws.com/prod/stats4";

const THEME = {
  font: "'Hanken Grotesk',sans-serif",
  moisture: '#5fd2e6',
  temp: '#f4a45e',
  battery: '#8fd16f',
  water: '#7fd4ff',
  sub: 'rgba(196,219,160,.5)',
  grid: 'rgba(168,198,134,.12)',
  areaTop: 'rgba(95,210,230,.34)',
  areaBot: 'rgba(95,210,230,.01)',
  avail: 'rgba(120,200,150,.12)',
  empty: 'rgba(224,138,94,.18)',
  tip: 'rgba(20,36,26,.94)',
  tipText: '#eaf3df'
};

// Temperature brackets, coldest to hottest, mirroring the watering-frequency
// brackets in the firmware (calculateSecondsBetweenWateringFromMaxRecentTemperature).
const TEMP_BRACKETS = [
  { min: -Infinity, color: '#5fb0e6' }, // < 10, cold blue
  { min: 10, color: '#5fd2c0' },
  { min: 15, color: '#a8c686' },
  { min: 19, color: '#e6c65f' },
  { min: 25, color: '#f4a45e' },
  { min: 29, color: '#e0524a' } // hot red
];

function tempColor(tempC) {
  let color = TEMP_BRACKETS[0].color;
  for (const bracket of TEMP_BRACKETS) {
    if (tempC >= bracket.min) color = bracket.color;
  }
  return color;
}

// Mirrors firmware's calculateSecondsBetweenWateringFromMaxRecentTemperature().
function secondsBetweenWateringFromMaxRecentTemperature(maxRecentTemperature) {
  if (maxRecentTemperature >= 29) return 3600 * 6;
  if (maxRecentTemperature >= 25) return 3600 * 15;
  if (maxRecentTemperature >= 19) return 3600 * 24 * 2;
  if (maxRecentTemperature >= 15) return 3600 * 24 * 3;
  if (maxRecentTemperature >= 10) return 3600 * 24 * 4;
  return 3600 * 24 * 5;
}

// Next local occurrence of `hour:00` at or after `fromMs`.
function nextOccurrenceOfHour(fromMs, hour) {
  const d = new Date(fromMs);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() < fromMs) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// Mirrors firmware's shouldWater(): watering happens at 8:00, or at 15:00 if
// the max recent temperature was hot enough, once enough time has passed
// since the last watering for the current max recent temperature bracket.
function computeNextWatering(lastWateredMs, maxRecentTemperature) {
  const earliestMs = lastWateredMs + secondsBetweenWateringFromMaxRecentTemperature(maxRecentTemperature) * 1000;
  const candidates = [nextOccurrenceOfHour(earliestMs, 8)];
  if (maxRecentTemperature >= 29) candidates.push(nextOccurrenceOfHour(earliestMs, 15));
  return Math.min(...candidates);
}

const STORAGE_KEY = 'garden-bot-filters';

function loadStoredFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveStoredFilters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days: state.days, device: state.device }));
  } catch (e) {
    // ignore (e.g. storage disabled)
  }
}

const stored = loadStoredFilters();
const state = {
  days: (stored && stored.days) || 3,
  device: (stored && stored.device) || 'cherry-3-pot',
  deviceOpen: false
};

let mainChart = null;
let stripChart = null;

function pad(n) {
  return ('' + n).padStart(2, '0');
}

function fmt(ts) {
  const x = new Date(ts);
  return pad(x.getHours()) + ':' + pad(x.getMinutes()) + ' ' + pad(x.getDate()) + '.' + pad(x.getMonth() + 1);
}

function relativeTime(ts) {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return diffSec + 's ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour + 'h ago';
  return Math.floor(diffHour / 24) + 'd ago';
}

function mapNumRange(num, inMin, inMax, outMin, outMax) {
  if (num < inMin) return outMin;
  if (num > inMax) return outMax;
  return Math.round(((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
}

async function fetchDataJSON(daysAgo, deviceName) {
  console.log("Fetching: daysAgo=" + daysAgo + ", device=" + deviceName);
  const response = await fetch(API_URL + "?daysago=" + daysAgo + "&device=" + deviceName, {
    method: "GET",
    origin: "*",
  });
  if (!response.ok) {
    throw new Error("An error has occured: " + response.status);
  }
  return response.json();
}

// Combine the per-metric arrays returned by the API (index-aligned, one
// entry per poll cycle) into one array of points usable by the charts.
function toPoints(dataObj) {
  const battery = dataObj.data.battery || [];
  const moisture = dataObj.data.moisture || [];
  const waterAvailable = dataObj.data.water_available || [];
  const watered = dataObj.data.watered || [];
  const temp = dataObj.data.temp || [];

  const n = battery.length;
  const points = [];
  for (let i = 0; i < n; i++) {
    let tempVal = temp[i] ? temp[i].value : 0;
    if (tempVal === -127) tempVal = 0;
    points.push({
      t: battery[i].time,
      battery: mapNumRange(battery[i].value, 3300, 4200, 0, 100),
      moisture: moisture[i] ? moisture[i].value : 0,
      temp: tempVal,
      watered: !!(watered[i] && watered[i].value),
      water: !!(waterAvailable[i] && waterAvailable[i].value)
    });
  }
  return points;
}

const DELAYED_AFTER_MS = 35 * 60 * 1000;
const OFFLINE_AFTER_MS = 6 * 60 * 60 * 1000;

// Device publishes roughly every PUBLISH_INTERVAL_MS (matches firmware's
// SECONDS_TO_SLEEP). Schedule the next fetch for just after the next
// publish is expected, with a margin for lateness. If the last update is
// already older than one full interval, give up auto-refreshing.
const PUBLISH_INTERVAL_MS = 30 * 60 * 1000;
const REFRESH_MARGIN_MS = 60 * 1000;
let refreshTimer = null;

function scheduleNextFetch(lastUpdateMs) {
  clearTimeout(refreshTimer);
  const age = Date.now() - lastUpdateMs;
  if (age > PUBLISH_INTERVAL_MS) {
    console.log('Last update is more than 30 minutes old; pausing auto-refresh.');
    return;
  }
  const delay = Math.max(0, PUBLISH_INTERVAL_MS - age) + REFRESH_MARGIN_MS;
  refreshTimer = setTimeout(fetchAndRender, delay);
}

function getLiveStatus(lastUpdateMs) {
  const age = Date.now() - lastUpdateMs;
  if (age > OFFLINE_AFTER_MS) return { status: 'offline', label: 'offline' };
  if (age > DELAYED_AFTER_MS) return { status: 'delayed', label: 'delayed' };
  return { status: 'live', label: 'live' };
}

function computeStats(points) {
  const last = points[points.length - 1];
  const wateredEvents = points.filter(p => p.watered);
  const lastWateredMs = wateredEvents.length ? wateredEvents[wateredEvents.length - 1].t : null;
  const recentPoints = lastWateredMs ? points.filter(p => p.t > lastWateredMs) : points;
  const maxRecentTemp = recentPoints.length ? Math.max(...recentPoints.map(p => p.temp)) : last.temp;
  const maxTemp = Math.max(...points.map(p => p.temp));
  return {
    curMoisture: last.moisture,
    curBattery: last.battery,
    curTemp: last.temp,
    tempPct: Math.round(Math.max(0, Math.min(40, last.temp)) / 40 * 100),
    waterLabel: last.water ? 'available' : 'empty',
    waterColor: last.water ? '#7fd49b' : '#e08a5e',
    lastUpdateMs: last.t,
    lastUpdate: fmt(last.t),
    lastWateredMs,
    lastWatered: lastWateredMs ? fmt(lastWateredMs) : '—',
    nextWatering: lastWateredMs ? fmt(computeNextWatering(lastWateredMs, maxRecentTemp)) : '—',
    maxTemp,
    maxTempColor: tempColor(maxTemp)
  };
}

function setGaugeRing(ringEl, pct, color) {
  ringEl.style.background = 'conic-gradient(' + color + ' ' + (pct * 3.6) + 'deg,rgba(168,198,134,.12) 0)';
}

function unskeleton(...elements) {
  elements.forEach(el => el.classList.remove('skeleton'));
}

const relativeTimes = { lastUpdateMs: null, lastWateredMs: null };

function renderRelativeTimes() {
  document.getElementById('last-updated-relative').textContent =
    relativeTimes.lastUpdateMs ? relativeTime(relativeTimes.lastUpdateMs) : '';
  document.getElementById('last-watered-relative').textContent =
    relativeTimes.lastWateredMs ? relativeTime(relativeTimes.lastWateredMs) : '';
}

setInterval(renderRelativeTimes, 15 * 1000);

function renderStats(points) {
  const s = computeStats(points);

  document.getElementById('moisture').innerHTML = s.curMoisture + '<span class="gauge-unit">%</span>';
  document.getElementById('battery-percent').innerHTML = s.curBattery + '<span class="gauge-unit">%</span>';
  document.getElementById('temperature').innerHTML = s.curTemp + '<span class="gauge-unit">°</span>';
  unskeleton(
    document.getElementById('moisture'),
    document.getElementById('battery-percent'),
    document.getElementById('temperature')
  );

  setGaugeRing(document.getElementById('gauge-moisture-ring'), s.curMoisture, THEME.moisture);
  setGaugeRing(document.getElementById('gauge-battery-ring'), s.curBattery, THEME.battery);
  setGaugeRing(document.getElementById('gauge-temp-ring'), s.tempPct, THEME.temp);

  document.getElementById('last-updated-time').textContent = s.lastUpdate;
  document.getElementById('last-watered-time').textContent = s.lastWatered;
  document.getElementById('next-watering-time').textContent = s.nextWatering;
  unskeleton(
    document.getElementById('last-updated-time'),
    document.getElementById('last-watered-time'),
    document.getElementById('next-watering-time')
  );

  relativeTimes.lastUpdateMs = s.lastUpdateMs;
  relativeTimes.lastWateredMs = s.lastWateredMs;
  renderRelativeTimes();

  const waterStatusWord = document.getElementById('water-status-word');
  waterStatusWord.textContent = s.waterLabel;
  waterStatusWord.style.color = s.waterColor;

  const maxTemperatureEl = document.getElementById('max-temperature');
  maxTemperatureEl.textContent = s.maxTemp + '°C';
  maxTemperatureEl.style.color = s.maxTempColor;

  const live = getLiveStatus(s.lastUpdateMs);
  const liveBadge = document.getElementById('live-badge');
  const liveDot = document.getElementById('live-dot');
  liveBadge.classList.remove('status-delayed', 'status-offline');
  liveDot.classList.remove('status-delayed', 'status-offline');
  if (live.status !== 'live') {
    liveBadge.classList.add('status-' + live.status);
    liveDot.classList.add('status-' + live.status);
  }
  document.getElementById('live-label').textContent = live.label;
}

function buildMainOption(points) {
  const t = THEME;
  const moist = points.map(p => [p.t, p.moisture]);
  const temp = points.map(p => [p.t, p.temp]);
  const batt = points.map(p => [p.t, p.battery]);
  return {
    animationDuration: 600,
    textStyle: { fontFamily: t.font, color: t.sub },
    grid: { left: 34, right: 36, top: 14, bottom: 24 },
    tooltip: {
      trigger: 'axis', backgroundColor: t.tip, borderWidth: 0, padding: [7, 10],
      textStyle: { color: t.tipText, fontFamily: t.font, fontSize: 11 },
      axisPointer: {
        type: 'line', lineStyle: { color: t.sub, width: 1, type: 'dashed' },
        label: { show: true, backgroundColor: '#0f1f15', color: '#eaf3df', fontFamily: t.font, fontSize: 10, formatter: p => fmt(p.value) }
      },
      formatter: ps => {
        if (!ps || !ps.length) return '';
        let s = '<div style="font-weight:700;margin-bottom:3px">' + fmt(ps[0].value[0]) + '</div>';
        ps.forEach(p => {
          const u = p.seriesName === 'temp' ? '°C' : '%';
          s += '<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + p.color + '"></span>' + p.seriesName + '<b style="margin-left:auto">' + p.value[1] + u + '</b></div>';
        });
        return s;
      }
    },
    xAxis: { type: 'time', min: points[0].t, max: points[points.length - 1].t, axisLabel: { color: t.sub, fontSize: 9, hideOverlap: true }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: [
      { type: 'value', min: 0, max: 100, position: 'left', axisLabel: { color: t.sub, fontSize: 9 }, splitLine: { show: true, lineStyle: { color: t.grid } }, axisLine: { show: false }, axisTick: { show: false } },
      { type: 'value', min: 0, max: 40, position: 'right', axisLabel: { color: t.temp, fontSize: 9, formatter: '{value}°' }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } }
    ],
    series: [
      { name: 'moisture', type: 'line', smooth: 0.35, showSymbol: false, data: moist, yAxisIndex: 0, z: 3, lineStyle: { width: 2.4, color: t.moisture, shadowBlur: 12, shadowColor: t.moisture }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: t.areaTop }, { offset: 1, color: t.areaBot }]) } },
      { name: 'battery', type: 'line', smooth: 0.35, showSymbol: false, data: batt, yAxisIndex: 0, z: 2, lineStyle: { width: 2.4, color: t.battery, shadowBlur: 8, shadowColor: t.battery } },
      { name: 'temp', type: 'line', smooth: 0.35, showSymbol: false, data: temp, yAxisIndex: 1, z: 2, lineStyle: { width: 2.4, color: t.temp, shadowBlur: 8, shadowColor: t.temp }, markLine: { symbol: 'none', silent: true, data: [{ yAxis: 30 }], lineStyle: { color: t.temp, type: 'dashed', width: 1, opacity: 0.5 }, label: { formatter: '30°', color: t.temp, fontSize: 9, position: 'insideEndTop' } } }
    ]
  };
}

function buildStripOption(points) {
  const t = THEME;
  const wp = points.filter(p => p.watered).map(p => [p.t, 0.5]);
  const segs = [];
  let cur = null;
  points.forEach(p => {
    if (!cur || cur.water !== p.water) { cur = { s: p.t, e: p.t, water: p.water }; segs.push(cur); }
    else cur.e = p.t;
  });
  const ma = segs.map(s => [{ xAxis: s.s, itemStyle: { color: s.water ? t.avail : t.empty } }, { xAxis: s.e }]);
  const drop = 'path://M16 1 C16 1 29 15 29 22 A13 13 0 1 1 3 22 C3 15 16 1 16 1 Z';
  return {
    animationDuration: 600,
    textStyle: { fontFamily: t.font, color: t.sub },
    grid: { left: 34, right: 36, top: 8, bottom: 20 },
    tooltip: {
      trigger: 'item', backgroundColor: t.tip, borderWidth: 0, padding: [6, 9],
      textStyle: { color: t.tipText, fontFamily: t.font, fontSize: 11 },
      formatter: p => 'watered · ' + fmt(p.value[0])
    },
    xAxis: { type: 'time', min: points[0].t, max: points[points.length - 1].t, axisLabel: { color: t.sub, fontSize: 9, hideOverlap: true }, axisLine: { lineStyle: { color: t.grid } }, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 1, show: false },
    series: [
      { type: 'line', data: [], markArea: { silent: true, data: ma } },
      { name: 'watered', type: 'scatter', data: wp, symbol: drop, symbolSize: 16, itemStyle: { color: t.water, shadowBlur: 10, shadowColor: t.water, opacity: 0.95 }, z: 5 }
    ]
  };
}

function renderCharts(points) {
  const chartEl = document.getElementById('chart');
  const stripEl = document.getElementById('strip');
  unskeleton(chartEl, stripEl);
  if (!mainChart) mainChart = echarts.init(chartEl);
  if (!stripChart) stripChart = echarts.init(stripEl);
  mainChart.setOption(buildMainOption(points), true);
  stripChart.setOption(buildStripOption(points), true);
}

function renderFilterUI() {
  document.querySelectorAll('#range-pills .pill').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.days) === state.days);
  });
  document.querySelectorAll('#device-menu .device-option').forEach(el => {
    el.classList.toggle('active', el.dataset.device === state.device);
  });
  document.getElementById('device-label').textContent = state.device;
  document.getElementById('device-menu').hidden = !state.deviceOpen;
}

let fetchInFlight = false;
let hasLoadedOnce = false;

function showError(message) {
  document.getElementById('error-message').textContent = message;
  document.getElementById('error-banner').hidden = false;
}

function hideError() {
  document.getElementById('error-banner').hidden = true;
}

function setEmptyState(isEmpty) {
  document.getElementById('chart-section').hidden = isEmpty;
  document.getElementById('empty-state').hidden = !isEmpty;
}

function fetchAndRender() {
  if (fetchInFlight) return;
  fetchInFlight = true;
  document.getElementById('live-badge').classList.add('status-refreshing');
  fetchDataJSON(state.days, state.device)
    .then(dataObj => {
      const points = toPoints(dataObj);
      hideError();
      if (!points.length) {
        setEmptyState(true);
        hasLoadedOnce = true;
        return;
      }
      setEmptyState(false);
      renderStats(points);
      renderCharts(points);
      scheduleNextFetch(points[points.length - 1].t);
      hasLoadedOnce = true;
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
      showError(hasLoadedOnce ? "Couldn't refresh — showing last known data." : "Couldn't reach the garden bot.");
    })
    .finally(() => {
      fetchInFlight = false;
      document.getElementById('live-badge').classList.remove('status-refreshing');
    });
}

document.getElementById('range-pills').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  state.days = Number(pill.dataset.days);
  saveStoredFilters();
  renderFilterUI();
  fetchAndRender();
});

document.getElementById('device-toggle').addEventListener('click', e => {
  e.stopPropagation();
  state.deviceOpen = !state.deviceOpen;
  renderFilterUI();
});

document.getElementById('device-menu').addEventListener('click', e => {
  const opt = e.target.closest('.device-option');
  if (!opt) return;
  e.stopPropagation();
  state.device = opt.dataset.device;
  state.deviceOpen = false;
  saveStoredFilters();
  renderFilterUI();
  fetchAndRender();
});

document.getElementById('live-badge').addEventListener('click', () => {
  fetchAndRender();
});

document.getElementById('error-retry').addEventListener('click', () => {
  fetchAndRender();
});

document.addEventListener('click', () => {
  if (state.deviceOpen) {
    state.deviceOpen = false;
    renderFilterUI();
  }
});

window.addEventListener('resize', () => {
  if (mainChart) mainChart.resize();
  if (stripChart) stripChart.resize();
});

renderFilterUI();
fetchAndRender();
