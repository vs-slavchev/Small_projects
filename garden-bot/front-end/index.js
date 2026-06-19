var timeLabels = [0, 0];
var batteryValues = [0, 0];
var moistureValues = [0, 0];
var waterAvailableValues = [0, 0];
var wateredValues = [0, 0];
var tempValues = [0, 0];

async function fetchDataJSON() {
  const daysAgo = document.getElementById("days-select").value;
  const deviceName = document.getElementById("device-select").value;
  console.log("Fetching: daysAgo=" + daysAgo + ", device=" + deviceName);
  const responseBody = await fetch("https://foj972s0id.execute-api.eu-central-1.amazonaws.com/prod/stats4?daysago=" + daysAgo + "&device=" + deviceName, {
      method: "GET",
      origin: "*",
  })
    .then(response => {
      if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
      }
      return response.text();
    });
  return responseBody;
}

function updateChart(responseData) {
  var dataObj = JSON.parse(responseData);

  timeLabels = dataObj.data.battery.map((item) => timestampMillisToCurrentTime(item.time));

  batteryValues = dataObj.data.battery.map((item) => mapNumRange(item.value, 3300, 4200, 0, 100));
  moistureValues = dataObj.data.moisture.map((item) => item.value);
  waterAvailableValues = dataObj.data.water_available.map((item) => item.value ? 100 : 0);
  wateredValues = dataObj.data.watered.map((item) => item.value ? 100 : 0);
  tempValues = dataObj.data.temp.map((item) => item.value);
  tempValues = tempValues.map((item) => item == -127 ? 0 : item);

  if (batteryValues.length === 0 && moistureValues.length === 0 && wateredValues.length === 0 && tempValues.length === 0) {
    document.getElementById("chart").innerHTML = "No data";
    return;
  }

  renderLastUpdatesTime();
  getLastMoistureData();
  getLastBatteryData();
  getLastTemperature();

  const graphData = {
    labels: timeLabels,
    datasets: [
      {
        name: "battery",
        chartType: "line",
        values: batteryValues
      },
      {
        name: "moisture",
        chartType: "line",
        values: moistureValues
      },
      {
        name: "watered",
        chartType: "bar",
        values: wateredValues
      },
      {
        name: "temp",
        chartType: "line",
        values: tempValues
      },
      {
        name: "water available",
        chartType: "bar",
        values: waterAvailableValues
      }
    ],
    yMarkers: [{ label: "30°C", value: 30, options: { labelPos: "left" } }],
  }

  const chart = new frappe.Chart("#chart", {
    title: "Humidity and Battery Level",
    data: graphData,
    type: 'axis-mixed',
    height: 600,
    truncateLegends: true,
    colors: ["#30b455", "#97E7E1", "#0000FF", "#FF7700", "#6AD4DD"],
    axisOptions: {
      xAxisMode: "tick",
      xIsSeries: true,
      yAxisMode: "span",
      yAxis: {
        min: -20,
        max: 100
      }
    },
    lineOptions: {
      hideDots: 0,
      dotSize: 2,
      spline: 1,
    },
    barOptions: {
      spaceRatio: 0.95
    },
    tooltipOptions: {
      formatTooltipX: (d) => (d + "").toUpperCase(),
      formatTooltipY: (d) => d + "%"
    }
  })

  function getLastMoistureData() {
    var lastMoisture = moistureValues[moistureValues.length - 1];
    document.getElementById("moisture").innerHTML = lastMoisture + "%";
    document.getElementById("moisture_emoji").innerHTML = getMoistureEmoji(lastMoisture);
  }

  function renderLastUpdatesTime() {
    if (dataObj.data.battery.length === 0) {
      document.getElementById("last-updated-time").innerHTML = "no data";
      return;
    }
    var lastBatteryTime = dataObj.data.battery[dataObj.data.battery.length - 1].time;
    document.getElementById("last-updated-time").innerHTML = timestampMillisToCurrentTime(lastBatteryTime);

    const lastWateredIndex = wateredValues.lastIndexOf(100);
    if (lastWateredIndex !== -1) {
      const lastWateredTime = timeLabels[lastWateredIndex];
      document.getElementById("last-watered-time").innerHTML = lastWateredTime;
    } else {
      document.getElementById("last-watered-time").innerHTML = "no data";
    }

    const maxTemperature = Math.max(...tempValues);
    document.getElementById("max-temperature").innerHTML = `${maxTemperature}°C`;
  }

  function getLastBatteryData() {
    var currentBatteryPercent = batteryValues[batteryValues.length - 1];
    document.getElementById("battery-percent").innerHTML = currentBatteryPercent + "%";
  }

  function getLastTemperature() {
    var currentTemperature = tempValues[tempValues.length - 1];
    document.getElementById("temperature").innerHTML = `${currentTemperature}°C`;
  }
}

function fetchAndUpdateChart() {
  fetchDataJSON()
  .then(responseData => updateChart(responseData))
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });
}

fetchAndUpdateChart();
document.getElementById("days-select").addEventListener("change", fetchAndUpdateChart);
document.getElementById("device-select").addEventListener("change", fetchAndUpdateChart);



// Helper functions

function mapNumRange(num, inMin, inMax, outMin, outMax) {
  if (num < inMin) {
    return outMin;
  }
  if (num > inMax) {
    return outMax;
  }
  return Math.round(((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
}

function timestampMillisToCurrentTime(dateTime) {
  var localeDateTime = new Date(dateTime);
  var hours = localeDateTime.getHours().toString().padStart(2, '0');
  var minutes = localeDateTime.getMinutes().toString().padStart(2, '0');
  var day = localeDateTime.getDate().toString().padStart(2, '0');
  var month = (localeDateTime.getMonth() + 1).toString().padStart(2, '0');
  return `${hours}:${minutes} ${day}.${month}`;
}

function getMoistureEmoji(value) {
  if (value < 25) return "🏜️";
  if (value < 70) return "💧";
  if (value < 90) return "💦";
  return "🌊";
}
