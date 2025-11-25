import nodemailer from 'nodemailer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENV = {
  smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || 'apikey',
  smtpPass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@herolog.com',
  fromName: process.env.FROM_NAME || 'HeroLog',
  frontendUrl: process.env.FRONTEND_URL || 'https://herolog-00c48dc89148.herokuapp.com',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// ============================================================================
// TRANSPORTER SETUP
// ============================================================================

const createTransporter = () => {
  // In development without SMTP credentials, use console logging
  if (ENV.nodeEnv === 'development' && !ENV.smtpPass) {
    console.log('⚠️ Email service: No SMTP credentials configured, using console output');
    return null;
  }

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
};

const transporter = createTransporter();

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const getPasswordResetEmailHtml = (resetLink: string, userName?: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      color: #770422;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #770422;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #5a0319;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🦸 HeroLog</div>
    </div>
    
    <div class="content">
      <h2>Password Reset Request</h2>
      
      <p>Hi${userName ? ` ${userName}` : ''},</p>
      
      <p>We received a request to reset your password for your HeroLog account. Click the button below to create a new password:</p>
      
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      
      <div class="warning">
        ⏰ This link will expire in <strong>1 hour</strong> for security reasons.
      </div>
      
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #666;">${resetLink}</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by HeroLog</p>
      <p>© ${new Date().getFullYear()} HeroLog. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const getPasswordResetEmailText = (resetLink: string, userName?: string): string => `
Password Reset Request

Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password for your HeroLog account.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} HeroLog
`;

// ============================================================================
// EMAIL SERVICE
// ============================================================================

/**
 * Send an email using the configured transporter
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  const { to, subject, html, text } = options;

  // Development fallback: log to console
  if (!transporter) {
    console.log('\n📧 ============ EMAIL (DEV MODE) ============');
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 HTML: ${html.substring(0, 200)}...`);
    console.log('📧 ==========================================\n');
    
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  try {
    const mailOptions = {
      from: `"${ENV.fromName}" <${ENV.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    console.log(`📧 Sending email to: ${to}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Email send failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  userName?: string
): Promise<EmailResult> => {
  const resetLink = `${ENV.frontendUrl}/passwordreset/${token}`;
  
  console.log(`📧 Generating password reset email for: ${email}`);
  console.log(`📧 Reset link: ${resetLink}`);

  return sendEmail({
    to: email,
    subject: 'Reset Your HeroLog Password',
    html: getPasswordResetEmailHtml(resetLink, userName),
    text: getPasswordResetEmailText(resetLink, userName),
  });
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!transporter) {
    console.log('⚠️ Email transporter not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Email service connection verified');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Email service connection failed: ${errorMessage}`);
    return false;
  }
};

export default {
  sendEmail,
  sendPasswordResetEmail,
  verifyEmailConnection,
};