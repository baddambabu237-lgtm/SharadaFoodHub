const nodemailer = require('nodemailer');

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;

  // 1. Gmail SMTP Configuration
  if (emailUser && emailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  // 2. Generic SMTP Fallback (for testing / backward compatibility)
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(port) === 465,
      auth: { user, pass }
    });
  }

  return null;
};

const sendOtpEmail = async (to, otp) => {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.log(`[EMAIL] SMTP/Gmail not configured. Falling back to development OTP console print.`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const senderUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || `"Sharadha Food Hub" <${senderUser}>`;
  
  const mailOptions = {
    from,
    to: to,
    subject: 'Password Reset OTP - Sharadha Food Hub',
    text: `Hello,

We received a request to reset your password for your Sharadha Food Hub account.

Your 6-digit OTP code is: ${otp}

This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.

Best regards,
The Sharadha Food Hub Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
        <h2 style="color: #f97316; margin-top: 0;">Sharadha Food Hub</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for your Sharadha Food Hub account.</p>
        <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #ea580c; letter-spacing: 4px;">${otp}</span>
        </div>
        <p>This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br><strong>The Sharadha Food Hub Team</strong></p>
      </div>
    `
  };

  console.log(`[EMAIL] Starting OTP email delivery to ${to}...`);
  try {
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP email delivered successfully to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL] Failed to deliver OTP email to ${to}:`, err.message);
    throw err;
  }
};

module.exports = { 
  sendOtpEmail, 
  isConfigured: () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return !!((emailUser && emailPass) || (host && user && pass));
  },
  getTransporter
};
