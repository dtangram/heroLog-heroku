import nodemailer from 'nodemailer';

// ============================================================================
// TYPES
// ============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// CONFIG
// ============================================================================

const ENV = {
  smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || 'apikey',
  smtpPass: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@herolog.com',
  frontendUrl: process.env.FRONTEND_URL || 'https://herolog-00c48dc89148.herokuapp.com',
};

console.log('📧 Email Service Config:', {
  host: ENV.smtpHost,
  port: ENV.smtpPort,
  user: ENV.smtpUser,
  hasPassword: !!ENV.smtpPass,
  passwordLength: ENV.smtpPass?.length || 0,
  fromEmail: ENV.fromEmail,
});

// ============================================================================
// TRANSPORTER
// ============================================================================

const transporter = nodemailer.createTransport({
  host: ENV.smtpHost,
  port: ENV.smtpPort,
  secure: false,
  auth: {
    user: ENV.smtpUser,
    pass: ENV.smtpPass,
  },
});

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export const emailService = {
  send: async (options: EmailOptions): Promise<EmailResult> => {
    console.log('📧 Attempting to send email to:', options.to);
    
    try {
      const info = await transporter.sendMail({
        from: `"HeroLog" <${ENV.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      
      console.log('✅ Email sent! Message ID:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Email send error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<EmailResult> => {
  const resetLink = `${ENV.frontendUrl}/passwordreset/${token}`;
  
  console.log('📧 sendPasswordResetEmail called');
  console.log('📧 To:', email);
  console.log('📧 Reset link:', resetLink);

  return emailService.send({
    to: email,
    subject: 'Reset Your HeroLog Password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 1 hour.</p>
    `,
  });
};