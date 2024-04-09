var timeLabels = [0, 0];
var batteryValues = [0, 0];
var moisture1Values = [0, 0];
var moisture2Values = [0, 0];

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
    timeLabels = dataObj.data.battery.map((item) => timestreamDateFormatToCurrentTime(item.time));

    batteryValues = dataObj.data.battery.map((item) => mapNumRange(item.value, 2420, 4200, 0, 100));
    moisture1Values = dataObj.data.moisture_1.map((item) => item.value);
    moisture2Values = dataObj.data.moisture_2.map((item) => item.value);


    var lastMoisture1 = moisture1Values[moisture1Values.length - 1];
    var lastMoisture2 = moisture2Values[moisture2Values.length - 1];

    document.getElementById("moisture_1").innerHTML = lastMoisture1 + "%";
    document.getElementById("moisture_2").innerHTML = lastMoisture2 + "%";

    var currentBatteryPercent = batteryValues[batteryValues.length - 1];
    document.getElementById("battery-percent").innerHTML = currentBatteryPercent + "%";
    document.getElementById("battery-indicator").style = "height:" + currentBatteryPercent + "%;";
    if (currentBatteryPercent < 20) {
      document.getElementById("battery-indicator").classList.add("alert");
    } else if (currentBatteryPercent < 50) {
      document.getElementById("battery-indicator").classList.add("warn");
    }



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
        }
      ],

      // yMarkers: [{ label: "Marker", value: 70, options: { labelPos: "left" } }],
      // yRegions: [
      //   { label: "Region", start: -10, end: 50, options: { labelPos: "right" } }
      // ]
    }

    const chart = new frappe.Chart("#chart", {  // or a DOM element,
      // new Chart() in case of ES6 module with above usage
      title: "Humidity and Battery Level",
      data: graphData,
      type: 'line', // or 'bar', 'line', 'scatter', 'pie', 'percentage'
      height: 600,
      // valuesOverPoints: 1,
      truncateLegends: true,
      colors: ["#30b455", "#97E7E1", "#6AD4DD"],
      axisOptions: {
        xAxisMode: "tick",
        xIsSeries: true
      },
      lineOptions: {
        hideDots: 1,
        // dotSize: 3, // default: 4
        spline: 1, // default: 0
        // heatline: 1
      },
      // barOptions: {
      //   stacked: true,
      //   spaceRatio: 0.5
      // },
      tooltipOptions: {
        formatTooltipX: (d) => (d + "").toUpperCase(),
        formatTooltipY: (d) => d + "%"
      }
    })

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

function timestreamDateFormatToCurrentTime(dateTime) {
  //conver date time like '2024-04-07 14:35:34.258000000' to ISO8601 format
  dateTime = dateTime.replace(' ', 'T');
  dateTime = dateTime + 'Z';
  var date = new Date(dateTime);
  var localeDateTime = date.toTimeString();
  // get only first 5 characters
  return localeDateTime.substring(0, 5);
}