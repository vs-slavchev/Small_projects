var timeLabels = [0, 0];
var batteryValues = [0, 0];
var moisture1Values = [0, 0];
var moisture2Values = [0, 0];
var wateredValues = [0, 0];

async function fetchDataJSON() {
  const response = await fetch("https://foj972s0id.execute-api.eu-central-1.amazonaws.com/prod/stats")
    .then(response => {
      if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
      }
      return response.text();
    });
  return response;
}

fetchDataJSON()
  .then(responseData => {
    console.log(responseData);
    // split on whitespace and take next 5 chars
    var dataObj = JSON.parse(responseData);
    timeLabels = dataObj.data.battery.map((item) => timestampMillisToCurrentTime(item.time));

    batteryValues = dataObj.data.battery.map((item) => mapNumRange(item.value, 3000, 4200, 0, 100));
    moisture1Values = dataObj.data.moisture_1.map((item) => item.value);
    moisture2Values = dataObj.data.moisture_2.map((item) => item.value);
    wateredValues = dataObj.data.watered.map((item) => item.value ? 100 : 0);
    tempValues = dataObj.data.temp.map((item) => item.value);
    tempValues = tempValues.map((item) => item == -127 ? 0 : item);

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
      // yMarkers: [{ label: "water", value: 75, options: { labelPos: "left" } }],
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
        hideDots: 1,
        // dotSize: 3, // default: 4
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

    function getLastBatteryData() {
      var currentBatteryPercent = batteryValues[batteryValues.length - 1];
      document.getElementById("battery-percent").innerHTML = currentBatteryPercent + "%";
      document.getElementById("battery-emoji").innerHTML = "🔋" + getBatteryEmoji(currentBatteryPercent);

      var lastBatteryTime = dataObj.data.battery[dataObj.data.battery.length - 1].time;
      document.getElementById("last-updated-time").innerHTML = timestampMillisToCurrentTime(lastBatteryTime);
    }

    function getLastTemperature() {
      var currentTemperature = tempValues[tempValues.length - 1];
      document.getElementById("temperature").innerHTML = `${currentTemperature}°C`;
      document.getElementById("temperature-emoji").innerHTML = `🌡️${getTemperatureEmoji(currentTemperature)}`;
    }
  })
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });

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
  var localeDateTime = new Date(dateTime).toTimeString();
  // get only first 5 characters
  return localeDateTime.substring(0, 5);
}

function getMoistureEmoji(value) {
  if (value < 25) return "🏜️"; // Very dry
  if (value < 70) return "💧"; // Moderately dry
  if (value < 90) return "💦"; // Good moisture
  return "🌊"; // High moisture
}

function getBatteryEmoji(value) {
  if (value < 20) return "🔴"; // Critical
  if (value < 50) return "🟠"; // Low
  if (value < 80) return "🟡"; // Moderate
  if (value < 95) return "🟢"; // Good
  return "⚡"; // Full
}

function getTemperatureEmoji(value) {
  if (value < -10) return "🥶";
  if (value < 0) return "❄️"; // Freezing
  if (value < 15) return "🌤️"; // Cold
  if (value < 30) return "☀️"; // Comfortable
  return "🔥"; // Hot
}