import nodemailer, { Transporter } from 'nodemailer';
import { UserAttributes } from '../models/User';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password from .env
      },
    });
  }

  /**
   * Send email with OTP
   */
  async sendOTP(user: Partial<UserAttributes>, otp: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email!,
      subject: 'Your IMARA Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; margin: 20px 0; border-radius: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 IMARA Platform</h1>
              <p>Smart Agriculture for Rwanda</p>
            </div>
            <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>Welcome to IMARA! Please use the following OTP to verify your email address:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in ${process.env.OTP_EXPIRES_IN || '10'} minutes.</strong></p>
              <p>If you didn't request this code, please ignore this email.</p>
              <p>Best regards,<br>The IMARA Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} IMARA Platform. All rights reserved.</p>
              <p>Smart Agricultural Advisory System for Rwandan Farmers</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✉️ OTP sent to ${user.email}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send verification link email
   */
  async sendVerificationEmail(user: Partial<UserAttributes>, token: string): Promise<void> {
    const verifyURL = `${process.env.BACKEND_URL}/api/auth/verify-email/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email!,
      subject: 'Verify Your IMARA Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0 0 8px; font-size: 28px; }
            .header p { margin: 0; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .content h2 { color: #1f2937; margin-top: 0; }
            .btn-wrap { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981, #22c55e); color: white !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
            .url-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; word-break: break-all; font-size: 13px; color: #6b7280; margin-top: 16px; }
            .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 IMARA Platform</h1>
              <p>Smart Agriculture for Rwanda</p>
            </div>
            <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>Thank you for registering on IMARA! Please verify your email address to activate your account.</p>
              <div class="btn-wrap">
                <a href="${verifyURL}" class="btn">✅ Verify My Email</a>
              </div>
              <p style="color:#6b7280; font-size:13px;">Or copy and paste this link in your browser:</p>
              <div class="url-box">${verifyURL}</div>
              <p style="margin-top:24px;"><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>Best regards,<br>The IMARA Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} IMARA Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✉️ Verification email sent to ${user.email}`);
    } catch (error) {
      console.error('Verification email failed:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(user: Partial<UserAttributes>): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email!,
      subject: 'Welcome to IMARA Platform!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .feature { margin: 10px 0; padding-left: 25px; position: relative; }
            .feature:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to IMARA!</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>Your email has been successfully verified! You now have full access to IMARA's smart agricultural advisory system.</p>
              
              <div class="features">
                <h3>What you can do now:</h3>
                <div class="feature">Get AI-powered crop recommendations</div>
                <div class="feature">Detect plant diseases instantly</div>
                <div class="feature">Access real-time weather forecasts</div>
                <div class="feature">Analyze your soil health</div>
                <div class="feature">View market prices and trends</div>
                <div class="feature">Learn from expert training courses</div>
              </div>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              </center>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy farming!<br>The IMARA Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: Partial<UserAttributes>, resetToken: string): Promise<void> {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email!,
      subject: 'Reset Your IMARA Password',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <p style="text-align: center;">
              <a href="${resetURL}" style="display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px;">
                Reset Password
              </a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The IMARA Team</p>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export default new EmailService();
