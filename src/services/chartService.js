/**
 * Chart generation service for PDF reports
 * Generates chart images that can be embedded in PDFs
 */

/**
 * Generate a line chart as base64 image
 * Note: chartjs-node-canvas requires native compilation on Windows
 * This is a fallback implementation using ASCII art for now
 * For production, use chartjs-node-canvas or an external service
 */
export async function generateLineChart(data, options = {}) {
  const {
    title = 'Chart',
    xLabel = 'Time',
    yLabel = 'Value',
    width = 600,
    height = 400,
  } = options;

  // Try to use chartjs-node-canvas if available
  try {
    const { ChartJSNodeCanvas } = await import('chartjs-node-canvas');
    
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width, 
      height,
      backgroundColour: 'white'
    });

    const configuration = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color || 'rgb(75, 192, 192)',
          backgroundColor: ds.backgroundColor || 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        }))
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16 }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: xLabel
            }
          },
          y: {
            title: {
              display: true,
              text: yLabel
            }
          }
        }
      }
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return buffer;
  } catch (error) {
    console.log('chartjs-node-canvas not available, using fallback');
    // Return null to indicate chart generation is not available
    return null;
  }
}

/**
 * Generate a bar chart as base64 image
 */
export async function generateBarChart(data, options = {}) {
  const {
    title = 'Chart',
    xLabel = 'Category',
    yLabel = 'Value',
    width = 600,
    height = 400,
  } = options;

  try {
    const { ChartJSNodeCanvas } = await import('chartjs-node-canvas');
    
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width, 
      height,
      backgroundColour: 'white'
    });

    const configuration = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: data.datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.color || 'rgba(54, 162, 235, 0.5)',
          borderColor: ds.borderColor || 'rgb(54, 162, 235)',
          borderWidth: 1,
        }))
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16 }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: xLabel
            }
          },
          y: {
            title: {
              display: true,
              text: yLabel
            },
            beginAtZero: true
          }
        }
      }
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return buffer;
  } catch (error) {
    console.log('chartjs-node-canvas not available, using fallback');
    return null;
  }
}

/**
 * Prepare chart data from sensor readings
 */
export function prepareSensorChartData(sensorData) {
  const labels = sensorData.map(d => {
    const date = new Date(d.timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  });

  return {
    temperature: {
      labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: sensorData.map(d => d.temperature),
        color: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }]
    },
    humidity: {
      labels,
      datasets: [{
        label: 'Humidity (%)',
        data: sensorData.map(d => d.humidity),
        color: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      }]
    },
    soilMoisture: {
      labels,
      datasets: [{
        label: 'Soil Moisture (%)',
        data: sensorData.map(d => d.soilMoisture),
        color: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }]
    },
    waterLevel: {
      labels,
      datasets: [{
        label: 'Water Level (cm)',
        data: sensorData.map(d => d.waterLevel),
        color: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
      }]
    }
  };
}

/**
 * Generate summary statistics chart
 */
export async function generateSummaryChart(stats, options = {}) {
  const data = {
    labels: ['Avg Temp', 'Avg Humidity', 'Avg Soil Moisture', 'Avg Water Level'],
    datasets: [{
      label: 'Average Values',
      data: [
        stats.avgTemperature || 0,
        stats.avgHumidity || 0,
        stats.avgSoilMoisture || 0,
        stats.avgWaterLevel || 0,
      ],
      color: 'rgba(75, 192, 192, 0.6)',
    }]
  };

  return generateBarChart(data, {
    title: 'Sensor Averages',
    xLabel: 'Metric',
    yLabel: 'Value',
    ...options
  });
}
