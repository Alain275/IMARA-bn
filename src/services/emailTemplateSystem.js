const BRAND = {
  appName: process.env.EMAIL_BRAND_NAME || 'IMARA',
  appTagline: process.env.EMAIL_BRAND_TAGLINE || 'AI-powered agriculture platform',
  supportEmail: process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@imara.co.rw',
  appUrl: process.env.APP_BASE_URL || 'https://imara.co.rw',
  logoUrl: process.env.EMAIL_LOGO_URL || `${process.env.APP_BASE_URL || 'https://imara.co.rw'}/assets/RGMA_logo.png`,
  companyLine: process.env.EMAIL_COMPANY_LINE || 'IMARA • Smart agriculture operating platform',
};

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ctaButton(label, url, tone = 'primary') {
  const bg = tone === 'danger' ? '#b42318' : tone === 'warning' ? '#b54708' : '#0f766e';
  return `<a href="${esc(url)}" style="display:inline-block;background:${bg};color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${esc(label)}</a>`;
}

function infoRow(label, value) {
  return `<tr><td style="padding:6px 0;color:#475467;font-size:13px;">${esc(label)}</td><td style="padding:6px 0;color:#101828;font-size:13px;font-weight:600;text-align:right;">${esc(value)}</td></tr>`;
}

function card(title, content) {
  return `<div style="border:1px solid #e4e7ec;border-radius:12px;padding:14px 16px;margin:14px 0;background:#ffffff;">
    <div style="font-size:14px;font-weight:700;color:#101828;margin-bottom:8px;">${esc(title)}</div>
    <div style="font-size:13px;color:#344054;line-height:1.55;">${content}</div>
  </div>`;
}

function alertBox(content, type = 'info') {
  const styles =
    type === 'warning'
      ? { bg: '#fffaeb', bd: '#fedf89', tx: '#7a2e0e' }
      : type === 'danger'
        ? { bg: '#fef3f2', bd: '#fecdca', tx: '#b42318' }
        : { bg: '#ecfdf3', bd: '#abefc6', tx: '#067647' };
  return `<div style="border:1px solid ${styles.bd};background:${styles.bg};border-radius:10px;padding:12px 14px;color:${styles.tx};font-size:13px;line-height:1.5;margin:12px 0;">${content}</div>`;
}

function layout({ title, preheader, contentHtml, footerNote }) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader || title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #eaecf0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#065f46 0%, #0f766e 70%, #0f9d84 100%);padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${esc(BRAND.logoUrl)}" alt="${esc(BRAND.appName)} logo" width="36" height="36" style="display:block;border-radius:8px;background:#fff;padding:2px;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:0.1px;">${esc(BRAND.appName)}</div>
                    <div style="font-size:12px;color:#d1fae5;">${esc(BRAND.appTagline)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 10px 24px;">
              <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.2;color:#101828;">${esc(title)}</h1>
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 24px 24px;border-top:1px solid #f2f4f7;background:#fcfcfd;">
              <p style="margin:0 0 8px 0;color:#667085;font-size:12px;line-height:1.5;">${esc(footerNote || BRAND.companyLine)}</p>
              <p style="margin:0;color:#98a2b3;font-size:12px;line-height:1.5;">
                Need help? <a href="mailto:${esc(BRAND.supportEmail)}" style="color:#0f766e;text-decoration:none;">${esc(BRAND.supportEmail)}</a> •
                <a href="${esc(BRAND.appUrl)}/privacy" style="color:#0f766e;text-decoration:none;">Privacy</a> •
                <a href="${esc(BRAND.appUrl)}/terms" style="color:#0f766e;text-decoration:none;">Terms</a>
              </p>
              <p style="margin:8px 0 0 0;color:#98a2b3;font-size:11px;">&copy; ${year} ${esc(BRAND.appName)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const templates = {
  welcome: ({ userName = 'Farmer', dashboardUrl = `${BRAND.appUrl}/dashboard` }) =>
    layout({
      title: `Welcome to ${BRAND.appName}`,
      preheader: 'Your smart agriculture workspace is ready.',
      contentHtml: `
        <p style="margin:0 0 14px 0;font-size:14px;color:#344054;line-height:1.65;">Hello ${esc(userName)}, your account is now active. You can start monitoring devices, using AI disease diagnosis, and tracking reports.</p>
        ${card('Get started quickly', `<ul style="margin:0;padding-left:18px;"><li>Connect your first greenhouse device</li><li>Run an AI plant health scan</li><li>Open your dashboard analytics</li></ul>`)}
        ${ctaButton('Open Dashboard', dashboardUrl)}
      `,
    }),
  login_alert: ({ userName = 'User', at = new Date().toISOString(), ip = 'unknown', settingsUrl = `${BRAND.appUrl}/settings` }) =>
    layout({
      title: 'New account sign-in',
      preheader: 'Security notification for your account.',
      contentHtml: `
        <p style="margin:0 0 10px 0;font-size:14px;color:#344054;line-height:1.65;">Hi ${esc(userName)}, we detected a successful sign-in to your ${esc(BRAND.appName)} account.</p>
        ${card('Sign-in details', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${infoRow('Time (UTC)', at)}${infoRow('IP Address', ip)}</table>`)}
        ${alertBox('If this was not you, reset your password immediately and review your active sessions.', 'warning')}
        ${ctaButton('Review Account Security', settingsUrl)}
      `,
    }),
  password_reset: ({ userName = 'User', resetUrl = `${BRAND.appUrl}/reset-password` }) =>
    layout({
      title: 'Reset your password',
      preheader: 'Use this secure link to reset your IMARA password.',
      contentHtml: `
        <p style="margin:0 0 14px 0;font-size:14px;color:#344054;line-height:1.65;">Hello ${esc(userName)}, we received a password reset request. Use the secure button below.</p>
        ${ctaButton('Reset Password', resetUrl)}
        <p style="margin:14px 0 0 0;font-size:12px;color:#667085;">If you did not request this, you can safely ignore this email.</p>
      `,
    }),
  email_verification: ({ userName = 'User', verifyUrl = `${BRAND.appUrl}` }) =>
    layout({
      title: 'Verify your email',
      preheader: 'Confirm your email to secure your account.',
      contentHtml: `
        <p style="margin:0 0 14px 0;font-size:14px;color:#344054;line-height:1.65;">Hi ${esc(userName)}, verify your email address to complete account setup.</p>
        ${ctaButton('Verify Email Address', verifyUrl)}
      `,
    }),
  prediction_complete: ({ userName = 'Farmer', diseaseName = 'Unknown', confidence = 'N/A', dashboardUrl = `${BRAND.appUrl}/plant-health` }) =>
    layout({
      title: 'AI prediction completed',
      preheader: 'Your plant health analysis is ready.',
      contentHtml: `
        <p style="margin:0 0 12px 0;font-size:14px;color:#344054;">Hello ${esc(userName)}, your latest scan has been processed.</p>
        ${card('Result summary', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${infoRow('Detected condition', diseaseName)}${infoRow('Confidence', confidence)}</table>`)}
        ${ctaButton('Review Recommendations', dashboardUrl)}
      `,
    }),
  device_offline: ({ userName = 'User', deviceName = 'Device', lastSeen = 'N/A', devicesUrl = `${BRAND.appUrl}/devices` }) =>
    layout({
      title: 'Device offline alert',
      preheader: 'A connected device has gone offline.',
      contentHtml: `
        <p style="margin:0 0 12px 0;font-size:14px;color:#344054;">Hi ${esc(userName)}, one of your IoT devices appears offline.</p>
        ${alertBox(`<strong>${esc(deviceName)}</strong> has not checked in since ${esc(lastSeen)}.`, 'danger')}
        ${ctaButton('Open Device Center', devicesUrl, 'warning')}
      `,
    }),
  admin_announcement: ({ title = 'Platform update', message = '', ctaLabel, ctaUrl }) =>
    layout({
      title,
      preheader: title,
      contentHtml: `
        <p style="margin:0 0 12px 0;font-size:14px;color:#344054;line-height:1.65;">${esc(message)}</p>
        ${ctaLabel && ctaUrl ? ctaButton(ctaLabel, ctaUrl) : ''}
      `,
    }),
  maintenance: ({ window = 'TBD', message = 'Scheduled maintenance will occur.', statusUrl = `${BRAND.appUrl}/status` }) =>
    layout({
      title: 'Scheduled maintenance notice',
      preheader: 'Upcoming maintenance window for platform services.',
      contentHtml: `
        ${alertBox(`Maintenance window: <strong>${esc(window)}</strong>`, 'warning')}
        <p style="margin:0 0 12px 0;font-size:14px;color:#344054;">${esc(message)}</p>
        ${ctaButton('System Status', statusUrl)}
      `,
    }),
};

export const templateCatalog = [
  { key: 'welcome', label: 'Welcome Email', category: 'account' },
  { key: 'password_reset', label: 'Password Reset', category: 'account' },
  { key: 'email_verification', label: 'Email Verification', category: 'account' },
  { key: 'login_alert', label: 'Login Alert', category: 'security' },
  { key: 'prediction_complete', label: 'AI Prediction Completed', category: 'ai_notifications' },
  { key: 'device_offline', label: 'Device Offline Alert', category: 'alerts' },
  { key: 'admin_announcement', label: 'Admin Announcement', category: 'marketing' },
  { key: 'maintenance', label: 'Maintenance Notification', category: 'system' },
];

export function hasEmailTemplate(templateKey) {
  return typeof templates[templateKey] === 'function';
}

export function renderEmailTemplateByKey(templateKey, variables = {}) {
  const fn = templates[templateKey];
  if (!fn) throw new Error(`Unknown email template: ${templateKey}`);
  return fn(variables);
}
