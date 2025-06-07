var timeLabels = [0, 0];
var batteryValues = [0, 0];
var moisture1Values = [0, 0];
var moisture2Values = [0, 0];
var wateredValues = [0, 0];

async function fetchDataJSON() {
  const daysAgo = document.getElementById("days-select").value;
  const deviceName = document.getElementById("device-select").value;
  console.log("Fetching: daysAgo=" + daysAgo + ", device=" + deviceName);
  const responseBody = await fetch("https://foj972s0id.execute-api.eu-central-1.amazonaws.com/prod/stats4?daysago=" + daysAgo + "&device=" + deviceName, { 
      method: "GET",
      // mode: "cors", // cors, no-cors, same-origin
      origin: "*", // * or specific origin
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
  moisture1Values = dataObj.data.moisture_1.map((item) => item.value);
  moisture2Values = dataObj.data.moisture_2.map((item) => item.value);
  wateredValues = dataObj.data.watered.map((item) => item.value ? 100 : 0);
  tempValues = dataObj.data.temp.map((item) => item.value);
  tempValues = tempValues.map((item) => item == -127 ? 0 : item);

  // if all arrays are empty, return
  if (batteryValues.length === 0 && moisture1Values.length === 0 && moisture2Values.length === 0 && wateredValues.length === 0 && tempValues.length === 0) {
    document.getElementById("chart").innerHTML = "No data";
    return;
  }

  renderLastUpdatesTime();
  getLastMoistureData();
  getLastBatteryData();
  getLastTemperature();

  // frappe line chart
  const graphData = {
    labels: timeLabels,
    datasets: [
      {
        name: "battery",
        chartType: "line",
        values: batteryValues
      },
      {
        name: "moisture_1",
        chartType: "line",
        values: moisture1Values
      },
      {
        name: "moisture_2",
        chartType: "line",
        values: moisture2Values
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
      }
    ],
    yMarkers: [{ label: "30°C", value: 30, options: { labelPos: "left" } }],
    // yRegions: [
    //   { label: "Region", start: -10, end: 50, options: { labelPos: "right" } }
    // ]
  }

  const chart = new frappe.Chart("#chart", {  // or a DOM element,
    // new Chart() in case of ES6 module with above usage
    title: "Humidity and Battery Level",
    data: graphData,
    type: 'axis-mixed', // or 'bar', 'line', 'scatter', 'pie', 'percentage'
    height: 600,
    // valuesOverPoints: 1,
    truncateLegends: true,
    colors: ["#30b455", "#97E7E1", "#6AD4DD", "#0000FF", "#FF7700"],
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
      dotSize: 2, // default: 4
      spline: 1, // default: 0
      // heatline: 1
    },
    barOptions: {
      // stacked: true,
      spaceRatio: 0.95
    },
    tooltipOptions: {
      formatTooltipX: (d) => (d + "").toUpperCase(),
      formatTooltipY: (d) => d + "%"
    }
  })

  function getLastMoistureData() {
    var lastMoisture1 = moisture1Values[moisture1Values.length - 1];
    var lastMoisture2 = moisture2Values[moisture2Values.length - 1];

    document.getElementById("moisture_1").innerHTML = lastMoisture1 + "%";
    document.getElementById("moisture_2").innerHTML = lastMoisture2 + "%";

    document.getElementById("moisture_1_emoji").innerHTML = getMoistureEmoji(lastMoisture1);
    document.getElementById("moisture_2_emoji").innerHTML = getMoistureEmoji(lastMoisture2);
  }

  function renderLastUpdatesTime() {
    // set last updated time
    if (dataObj.data.battery.length === 0) {
      document.getElementById("last-updated-time").innerHTML = "no data";
      return;
    }
    var lastBatteryTime = dataObj.data.battery[dataObj.data.battery.length - 1].time;
    document.getElementById("last-updated-time").innerHTML = timestampMillisToCurrentTime(lastBatteryTime);

    // set last watered
    const lastWateredIndex = wateredValues.lastIndexOf(100);
    if (lastWateredIndex !== -1) {
      const lastWateredTime = timeLabels[lastWateredIndex];
      document.getElementById("last-watered-time").innerHTML = lastWateredTime;
    } else {
      document.getElementById("last-watered-time").innerHTML = "no data";
    }
  
    // Set the max temperature value
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

fetchAndUpdateChart(); // do the first fetch
// setup fetch on change
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
  //conver date time like '1717326306266' to ISO8601 format
  var localeDateTime = new Date(dateTime);

  // Extract hours, minutes, day, and month
  var hours = localeDateTime.getHours().toString().padStart(2, '0'); // Ensure 2 digits
  var minutes = localeDateTime.getMinutes().toString().padStart(2, '0'); // Ensure 2 digits
  var day = localeDateTime.getDate().toString().padStart(2, '0'); // Ensure 2 digits
  var month = (localeDateTime.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based

  // Format as HH:MM DD.MM
  return `${hours}:${minutes} ${day}.${month}`;

  // return new Date(dateTime).toTimeString().substring(0, 5); // get only first 5 characters
}

function getMoistureEmoji(value) {
  if (value < 25) return "🏜️"; // Very dry
  if (value < 70) return "💧"; // Moderately dry
  if (value < 90) return "💦"; // Good moisture
  return "🌊"; // High moisture
}