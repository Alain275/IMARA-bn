/**
 * Enhanced PDF Report Generation Service
 * Creates professional multi-page reports with AI insights
 */
import PDFDocument from 'pdfkit';
import { generateLineChart, prepareSensorChartData } from './chartService.js';

/**
 * Generate AI insights based on sensor data
 */
function generateAIInsights(data, kpis) {
  const insights = [];

  // Temperature insights
  if (kpis.avgTemperature > 30) {
    insights.push({
      type: 'warning',
      category: 'Temperature',
      message: `High average temperature detected (${kpis.avgTemperature.toFixed(1)}°C). Consider providing shade or increasing ventilation to prevent heat stress on crops.`,
      recommendation: 'Install shade nets or increase irrigation frequency during peak heat hours.'
    });
  } else if (kpis.avgTemperature < 15) {
    insights.push({
      type: 'warning',
      category: 'Temperature',
      message: `Low average temperature detected (${kpis.avgTemperature.toFixed(1)}°C). Cold temperatures may slow crop growth.`,
      recommendation: 'Consider using row covers or greenhouse protection during cold periods.'
    });
  } else {
    insights.push({
      type: 'success',
      category: 'Temperature',
      message: `Temperature is optimal (${kpis.avgTemperature.toFixed(1)}°C). Current conditions are favorable for crop growth.`,
      recommendation: 'Maintain current practices.'
    });
  }

  // Soil moisture insights
  if (kpis.avgSoilMoisture < 30) {
    insights.push({
      type: 'critical',
      category: 'Soil Moisture',
      message: `Soil moisture is critically low (${kpis.avgSoilMoisture.toFixed(1)}%). Crops are likely experiencing water stress.`,
      recommendation: 'Immediate irrigation required. Consider installing drip irrigation for consistent moisture levels.'
    });
  } else if (kpis.avgSoilMoisture < 50) {
    insights.push({
      type: 'warning',
      category: 'Soil Moisture',
      message: `Soil moisture is below optimal levels (${kpis.avgSoilMoisture.toFixed(1)}%). Increase irrigation frequency.`,
      recommendation: 'Water crops more frequently and consider mulching to retain moisture.'
    });
  } else if (kpis.avgSoilMoisture > 80) {
    insights.push({
      type: 'warning',
      category: 'Soil Moisture',
      message: `Soil moisture is very high (${kpis.avgSoilMoisture.toFixed(1)}%). Risk of root rot and fungal diseases.`,
      recommendation: 'Reduce irrigation frequency and ensure proper drainage.'
    });
  } else {
    insights.push({
      type: 'success',
      category: 'Soil Moisture',
      message: `Soil moisture is optimal (${kpis.avgSoilMoisture.toFixed(1)}%). Crops are receiving adequate water.`,
      recommendation: 'Continue current irrigation schedule.'
    });
  }

  // Humidity insights
  if (kpis.avgHumidity > 80) {
    insights.push({
      type: 'warning',
      category: 'Humidity',
      message: `High humidity detected (${kpis.avgHumidity.toFixed(1)}%). Increased risk of fungal diseases.`,
      recommendation: 'Improve air circulation and consider fungicide application as preventive measure.'
    });
  } else if (kpis.avgHumidity < 40) {
    insights.push({
      type: 'info',
      category: 'Humidity',
      message: `Low humidity detected (${kpis.avgHumidity.toFixed(1)}%). May increase water requirements.`,
      recommendation: 'Monitor soil moisture closely and adjust irrigation as needed.'
    });
  }

  // Irrigation performance
  if (kpis.irrigationEvents > 0) {
    const efficiency = (kpis.irrigationEvents / (data.length / 24)) * 100;
    if (efficiency > 50) {
      insights.push({
        type: 'info',
        category: 'Irrigation',
        message: `High irrigation frequency detected (${kpis.irrigationEvents} events). This may indicate inefficient water use.`,
        recommendation: 'Consider installing soil moisture sensors for precision irrigation.'
      });
    } else {
      insights.push({
        type: 'success',
        category: 'Irrigation',
        message: `Irrigation schedule appears efficient (${kpis.irrigationEvents} events).`,
        recommendation: 'Continue monitoring and adjust based on crop needs.'
      });
    }
  }

  return insights;
}

/**
 * Create enhanced PDF report with multiple pages and AI insights
 */
export async function createEnhancedPdfReport(deviceId, data, kpis, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page 1: Cover Page
      doc.fontSize(28).font('Helvetica-Bold')
         .text('SmartFarmX', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(20).font('Helvetica')
         .text('Farm Analytics Report', { align: 'center' });
      
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica')
         .text(`Device: ${deviceId}`, { align: 'center' })
         .text(`Report Period: ${options.period || 'Last 24 Hours'}`, { align: 'center' })
         .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.moveDown(3);
      
      // Executive Summary Box
      doc.rect(50, doc.y, 495, 150).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Executive Summary', 60, doc.y);
      
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
         .text(`Total Data Points: ${data.length}`, 60)
         .text(`Average Temperature: ${kpis.avgTemperature?.toFixed(1) || 'N/A'}°C`, 60)
         .text(`Average Humidity: ${kpis.avgHumidity?.toFixed(1) || 'N/A'}%`, 60)
         .text(`Average Soil Moisture: ${kpis.avgSoilMoisture?.toFixed(1) || 'N/A'}%`, 60)
         .text(`Irrigation Events: ${kpis.irrigationEvents || 0}`, 60);

      // Page 2: Key Performance Indicators
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold')
         .text('Key Performance Indicators', 50, 50);
      
      doc.moveDown(1);
      
      // KPI Cards
      const kpiY = doc.y;
      const cardWidth = 230;
      const cardHeight = 80;
      const gap = 15;

      // Temperature KPI
      doc.rect(50, kpiY, cardWidth, cardHeight).stroke();
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Temperature', 60, kpiY + 10);
      doc.fontSize(20).font('Helvetica')
         .text(`${kpis.avgTemperature?.toFixed(1) || 'N/A'}°C`, 60, kpiY + 30);
      doc.fontSize(9).font('Helvetica')
         .text(`Min: ${kpis.minTemperature?.toFixed(1) || 'N/A'}°C | Max: ${kpis.maxTemperature?.toFixed(1) || 'N/A'}°C`, 60, kpiY + 60);

      // Humidity KPI
      doc.rect(50 + cardWidth + gap, kpiY, cardWidth, cardHeight).stroke();
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Humidity', 60 + cardWidth + gap, kpiY + 10);
      doc.fontSize(20).font('Helvetica')
         .text(`${kpis.avgHumidity?.toFixed(1) || 'N/A'}%`, 60 + cardWidth + gap, kpiY + 30);
      doc.fontSize(9).font('Helvetica')
         .text(`Min: ${kpis.minHumidity?.toFixed(1) || 'N/A'}% | Max: ${kpis.maxHumidity?.toFixed(1) || 'N/A'}%`, 60 + cardWidth + gap, kpiY + 60);

      // Soil Moisture KPI
      doc.rect(50, kpiY + cardHeight + gap, cardWidth, cardHeight).stroke();
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Soil Moisture', 60, kpiY + cardHeight + gap + 10);
      doc.fontSize(20).font('Helvetica')
         .text(`${kpis.avgSoilMoisture?.toFixed(1) || 'N/A'}%`, 60, kpiY + cardHeight + gap + 30);
      doc.fontSize(9).font('Helvetica')
         .text(`Min: ${kpis.minSoilMoisture?.toFixed(1) || 'N/A'}% | Max: ${kpis.maxSoilMoisture?.toFixed(1) || 'N/A'}%`, 60, kpiY + cardHeight + gap + 60);

      // Water Level KPI
      doc.rect(50 + cardWidth + gap, kpiY + cardHeight + gap, cardWidth, cardHeight).stroke();
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Water Level', 60 + cardWidth + gap, kpiY + cardHeight + gap + 10);
      doc.fontSize(20).font('Helvetica')
         .text(`${kpis.avgWaterLevel?.toFixed(1) || 'N/A'} cm`, 60 + cardWidth + gap, kpiY + cardHeight + gap + 30);
      doc.fontSize(9).font('Helvetica')
         .text(`Min: ${kpis.minWaterLevel?.toFixed(1) || 'N/A'} | Max: ${kpis.maxWaterLevel?.toFixed(1) || 'N/A'}`, 60 + cardWidth + gap, kpiY + cardHeight + gap + 60);

      // Page 3: AI Insights and Recommendations
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold')
         .text('AI-Powered Insights & Recommendations', 50, 50);
      
      doc.moveDown(1);

      const insights = generateAIInsights(data, kpis);
      
      insights.forEach((insight, index) => {
        // Insight box
        const boxY = doc.y;
        const boxHeight = 90;
        
        // Color based on type
        let color = '#3498db'; // info
        if (insight.type === 'success') color = '#27ae60';
        if (insight.type === 'warning') color = '#f39c12';
        if (insight.type === 'critical') color = '#e74c3c';

        doc.rect(50, boxY, 495, boxHeight).stroke();
        
        // Category header with color
        doc.fillColor(color)
           .fontSize(12).font('Helvetica-Bold')
           .text(insight.category, 60, boxY + 10);
        
        // Message
        doc.fillColor('black')
           .fontSize(10).font('Helvetica')
           .text(insight.message, 60, boxY + 30, { width: 475 });
        
        // Recommendation
        doc.fontSize(9).font('Helvetica-Bold')
           .text('Recommendation: ', 60, boxY + 60);
        doc.font('Helvetica')
           .text(insight.recommendation, 140, boxY + 60, { width: 395 });

        doc.moveDown(2);
      });

      // Page 4: Data Trends (text-based since charts may not be available)
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold')
         .text('Data Trends Analysis', 50, 50);
      
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica')
         .text('Temperature Trend:', 50)
         .fontSize(10)
         .text(`The temperature ranged from ${kpis.minTemperature?.toFixed(1)}°C to ${kpis.maxTemperature?.toFixed(1)}°C with an average of ${kpis.avgTemperature?.toFixed(1)}°C. `, 50, doc.y, { width: 495 });
      
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica')
         .text('Soil Moisture Trend:', 50)
         .fontSize(10)
         .text(`Soil moisture levels varied between ${kpis.minSoilMoisture?.toFixed(1)}% and ${kpis.maxSoilMoisture?.toFixed(1)}%, averaging ${kpis.avgSoilMoisture?.toFixed(1)}%. ${kpis.avgSoilMoisture < 50 ? 'Irrigation may be needed to maintain optimal moisture levels.' : 'Moisture levels are generally adequate.'}`, 50, doc.y, { width: 495 });

      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica')
         .text('Irrigation Performance:', 50)
         .fontSize(10)
         .text(`${kpis.irrigationEvents || 0} irrigation events were recorded during this period. ${kpis.irrigationEvents > 5 ? 'High irrigation frequency may indicate dry conditions or inefficient water use.' : 'Irrigation frequency appears normal for the conditions.'}`, 50, doc.y, { width: 495 });

      // Footer on last page
      doc.fontSize(8).font('Helvetica')
         .text('Generated by SmartFarmX Analytics Engine', 50, 750, { align: 'center' })
         .text('For support, contact: support@smartfarmx.com', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
