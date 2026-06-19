const API_URL = "https://foj972s0id.execute-api.eu-central-1.amazonaws.com/prod/stats4";

const THEME = {
  font: "'Hanken Grotesk',sans-serif",
  moisture: '#5fd2e6',
  temp: '#f4a45e',
  battery: '#ecd87a',
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

const state = {
  days: 3,
  device: 'cherry-3-pot',
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

function computeStats(points) {
  const last = points[points.length - 1];
  const wateredEvents = points.filter(p => p.watered);
  const lastWatered = wateredEvents.length ? wateredEvents[wateredEvents.length - 1].t : null;
  return {
    curMoisture: last.moisture,
    curBattery: last.battery,
    curTemp: last.temp,
    tempPct: Math.round(Math.max(0, Math.min(40, last.temp)) / 40 * 100),
    waterLabel: last.water ? 'available' : 'empty',
    waterColor: last.water ? '#7fd49b' : '#e08a5e',
    lastUpdate: fmt(last.t),
    lastWatered: lastWatered ? fmt(lastWatered) : '—',
    maxTemp: Math.max(...points.map(p => p.temp))
  };
}

function setGaugeRing(ringEl, pct, color) {
  ringEl.style.background = 'conic-gradient(' + color + ' ' + (pct * 3.6) + 'deg,rgba(168,198,134,.12) 0)';
}

function renderStats(points) {
  const s = computeStats(points);

  document.getElementById('moisture').innerHTML = s.curMoisture + '<span class="gauge-unit">%</span>';
  document.getElementById('battery-percent').innerHTML = s.curBattery + '<span class="gauge-unit">%</span>';
  document.getElementById('temperature').innerHTML = s.curTemp + '<span class="gauge-unit">°</span>';

  setGaugeRing(document.getElementById('gauge-moisture-ring'), s.curMoisture, '#5fd2e6');
  setGaugeRing(document.getElementById('gauge-battery-ring'), s.curBattery, '#ecd87a');
  setGaugeRing(document.getElementById('gauge-temp-ring'), s.tempPct, '#f4a45e');

  document.getElementById('last-updated-time').textContent = s.lastUpdate;
  document.getElementById('last-watered-time').textContent = s.lastWatered;
  document.getElementById('tank-label').textContent = s.waterLabel;
  document.getElementById('tank-dot').style.background = s.waterColor;
  document.getElementById('max-temperature').textContent = 'max ' + s.maxTemp + '°C';
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
  if (!mainChart) mainChart = echarts.init(document.getElementById('chart'));
  if (!stripChart) stripChart = echarts.init(document.getElementById('strip'));
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

function fetchAndRender() {
  fetchDataJSON(state.days, state.device)
    .then(dataObj => {
      const points = toPoints(dataObj);
      if (!points.length) {
        document.getElementById('chart').innerHTML = 'No data';
        return;
      }
      renderStats(points);
      renderCharts(points);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
}

document.getElementById('range-pills').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  state.days = Number(pill.dataset.days);
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
  renderFilterUI();
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
