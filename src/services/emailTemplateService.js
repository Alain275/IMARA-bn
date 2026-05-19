/**
 * Email Template Service
 * Renders HTML email templates with dynamic content
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '../templates/emails');

/**
 * Simple template engine (Mustache-like)
 */
function renderTemplate(template, data) {
  let result = template;
  
  // Replace simple variables {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
  
  // Handle arrays {{#array}}...{{/array}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const array = data[key];
    if (!Array.isArray(array)) return '';
    return array.map(item => {
      if (typeof item === 'object') {
        return renderTemplate(content, item);
      }
      return content.replace(/\{\{\.\}\}/g, item);
    }).join('');
  });
  
  return result;
}

/**
 * Load and render email template
 */
export async function renderEmailTemplate(templateName, data) {
  try {
    // Load base layout
    const baseLayoutPath = path.join(TEMPLATES_DIR, 'base-layout.html');
    const baseLayout = await fs.readFile(baseLayoutPath, 'utf-8');
    
    // Load content template
    const contentPath = path.join(TEMPLATES_DIR, `${templateName}.html`);
    const content = await fs.readFile(contentPath, 'utf-8');
    
    // Render content with data
    const renderedContent = renderTemplate(content, data);
    
    // Insert content into base layout
    const finalHtml = renderTemplate(baseLayout, {
      ...data,
      content: renderedContent
    });
    
    return finalHtml;
  } catch (error) {
    console.error('Error rendering email template:', error);
    throw new Error(`Failed to render email template: ${templateName}`);
  }
}

/**
 * Generate welcome email
 */
export async function generateWelcomeEmail(user) {
  const data = {
    title: 'Welcome to SmartFarmX',
    userName: user.name,
    dashboardUrl: `${process.env.APP_BASE_URL}/dashboard`,
    unsubscribeUrl: `${process.env.APP_BASE_URL}/unsubscribe?email=${user.email}`,
  };
  
  return renderEmailTemplate('welcome', data);
}

/**
 * Generate weekly report email
 */
export async function generateWeeklyReportEmail(user, reportData) {
  const weekStart = new Date(reportData.startDate).toLocaleDateString();
  const weekEnd = new Date(reportData.endDate).toLocaleDateString();
  
  // Generate insights
  const insights = [];
  
  if (reportData.avgSoilMoisture < 40) {
    insights.push({
      type: 'warning',
      category: 'Soil Moisture',
      message: 'Soil moisture levels are below optimal range.',
      recommendation: 'Increase irrigation frequency to maintain healthy moisture levels.'
    });
  }
  
  if (reportData.avgTemp > 30) {
    insights.push({
      type: 'warning',
      category: 'Temperature',
      message: 'High temperatures detected this week.',
      recommendation: 'Consider providing shade or increasing irrigation during peak heat.'
    });
  }
  
  if (reportData.irrigationEvents < 3) {
    insights.push({
      type: 'info',
      category: 'Irrigation',
      message: 'Low irrigation activity detected.',
      recommendation: 'Ensure crops are receiving adequate water, especially during dry periods.'
    });
  }
  
  // Generate action items
  const actionItems = [];
  if (reportData.avgSoilMoisture < 50) {
    actionItems.push('Monitor soil moisture daily and adjust irrigation schedule');
  }
  if (reportData.avgTemp > 28) {
    actionItems.push('Consider heat stress mitigation strategies');
  }
  actionItems.push('Review and optimize irrigation timing for better efficiency');
  actionItems.push('Check all sensors for proper functioning');
  
  const data = {
    title: 'Your Weekly Farm Report',
    userName: user.name,
    weekStart,
    weekEnd,
    avgTemp: reportData.avgTemp?.toFixed(1) || 'N/A',
    avgHumidity: reportData.avgHumidity?.toFixed(1) || 'N/A',
    avgSoilMoisture: reportData.avgSoilMoisture?.toFixed(1) || 'N/A',
    irrigationEvents: reportData.irrigationEvents || 0,
    minTemp: reportData.minTemp?.toFixed(1) || 'N/A',
    maxTemp: reportData.maxTemp?.toFixed(1) || 'N/A',
    minSoilMoisture: reportData.minSoilMoisture?.toFixed(1) || 'N/A',
    maxSoilMoisture: reportData.maxSoilMoisture?.toFixed(1) || 'N/A',
    tempInsight: reportData.avgTemp > 30 ? 'High temperatures may stress crops.' : 'Temperature levels are within normal range.',
    soilInsight: reportData.avgSoilMoisture < 50 ? 'Consider increasing irrigation frequency.' : 'Moisture levels are adequate.',
    irrigationInsight: reportData.irrigationEvents > 0 ? `${reportData.irrigationEvents} irrigation events were recorded. System is functioning normally.` : 'No irrigation events detected. Please verify system operation.',
    insights,
    actionItems,
    reportUrl: `${process.env.APP_BASE_URL}/reports`,
    unsubscribeUrl: `${process.env.APP_BASE_URL}/unsubscribe?email=${user.email}`,
  };
  
  return renderEmailTemplate('weekly-report', data);
}

/**
 * Generate irrigation alert email
 */
export async function generateIrrigationAlertEmail(user, alertData) {
  const recommendedDuration = Math.ceil((70 - alertData.currentMoisture) * 2); // Simple calculation
  
  const data = {
    title: 'Irrigation Alert',
    userName: user.name,
    currentMoisture: alertData.currentMoisture?.toFixed(1) || 'N/A',
    deviceId: alertData.deviceId,
    timestamp: new Date(alertData.timestamp).toLocaleString(),
    alertTime: new Date(alertData.timestamp).toLocaleTimeString(),
    recommendedDuration,
    controlUrl: `${process.env.APP_BASE_URL}/devices`,
    unsubscribeUrl: `${process.env.APP_BASE_URL}/unsubscribe?email=${user.email}`,
  };
  
  return renderEmailTemplate('irrigation-alert', data);
}
