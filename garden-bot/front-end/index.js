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
        "12am-3am",
        "3am-6am",
        "6am-9am",
        "9am-12pm",
        "12pm-3pm",
        "3pm-6pm",
        "6pm-9pm",
        "9pm-12am"
      ],
      datasets: [
        {
          name: "Some Data",
          chartType: "line",
          values: [25, 40, 30, 35, 8, 52, 17, -4]
        },
        {
          name: "Another Set",
          chartType: "line",
          values: [25, 50, -10, 15, 18, 32, 27, 14]
        },
        {
          name: "Yet Another",
          chartType: "line",
          values: [15, 20, -3, -15, 58, 12, -17, 37]
        }
      ],

      yMarkers: [{ label: "Marker", value: 70, options: { labelPos: "left" } }],
      yRegions: [
        { label: "Region", start: -10, end: 50, options: { labelPos: "right" } }
      ]
}

const chart = new frappe.Chart("#chart", {  // or a DOM element,
                                            // new Chart() in case of ES6 module with above usage
    title: "My Awesome Chart",
    data: data,
    type: 'axis-mixed', // or 'bar', 'line', 'scatter', 'pie', 'percentage'
    height: 600,
    valuesOverPoints: 1,
    truncateLegends: true,
    colors: ["purple", "#ffa3ef", "light-blue"],
    axisOptions: {
      xAxisMode: "tick",
      xIsSeries: true
      
    },
    lineOptions: {
        dotSize: 8, // default: 4
        spline: 1, // default: 0
        heatline: 1
    },
    // barOptions: {
    //   stacked: true,
    //   spaceRatio: 0.5
    // },
    tooltipOptions: {
      formatTooltipX: (d) => (d + "").toUpperCase(),
      formatTooltipY: (d) => d + " pts"
    }
})