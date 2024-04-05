// fetch("your_endpoint_url_here")
//   .then(response => {
//     if (!response.ok) {
//       throw new Error('Network response was not ok');
//     }
//     return response.text();
//   })
//   .then(data => {
//     console.log(data); // Do something with the response data
//   })
//   .catch(error => {
//     console.error('There was a problem with the fetch operation:', error);
//   });


const data = {
    labels: [
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30"
      ],
      datasets: [
        {
          name: "battery",
          chartType: "line",
          values: [25, 40, 100, 35, 8, 52, 17, 0]
        },
        {
          name: "moisture_1",
          chartType: "line",
          values: [25, 50, 10, 15, 18, 32, 27, 99]
        },
        {
          name: "moisture_2",
          chartType: "line",
          values: [15, 20, 3, 15, 58, 80, 17, 37]
        }
      ],

      // yMarkers: [{ label: "Marker", value: 70, options: { labelPos: "left" } }],
      // yRegions: [
      //   { label: "Region", start: -10, end: 50, options: { labelPos: "right" } }
      // ]
}

const chart = new frappe.Chart("#chart", {  // or a DOM element,
                                            // new Chart() in case of ES6 module with above usage
    title: "My Awesome Chart",
    data: data,
    type: 'axis-mixed', // or 'bar', 'line', 'scatter', 'pie', 'percentage'
    height: 600,
    // valuesOverPoints: 1,
    truncateLegends: true,
    colors: ["#7AA2E3", "#97E7E1", "#6AD4DD"],
    axisOptions: {
      xAxisMode: "tick",
      xIsSeries: true
      
    },
    lineOptions: {
        // dotSize: 8, // default: 4
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