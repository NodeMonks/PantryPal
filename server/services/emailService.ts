import nodemailer from "nodemailer";

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@pantrypal.com";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn(
        "⚠️  Email service not configured: SMTP_USER and SMTP_PASS required",
      );
      return null;
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendInviteEmail(
  to: string,
  fullName: string,
  inviteLink: string,
  orgName: string = "PantryPal",
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`⚠️  Email not sent to ${to} - service not configured`);
    return;
  }

  const subject = `You've been invited to join ${orgName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 ${orgName} Invitation</h1>
        </div>
        <div class="content">
          <p>Hi ${fullName},</p>
          <p>You've been invited to join <strong>${orgName}</strong> grocery management system!</p>
          <p>Click the button below to accept your invitation and set up your account:</p>
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </p>
          <p style="font-size: 12px; color: #666;">
            Or copy and paste this link in your browser:<br>
            <a href="${inviteLink}">${inviteLink}</a>
          </p>
          <p><strong>Note:</strong> This invitation link will expire in 48 hours.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${fullName},

You've been invited to join ${orgName} grocery management system!

Click the link below to accept your invitation and set up your account:
${inviteLink}

Note: This invitation link will expire in 48 hours.

© ${new Date().getFullYear()} ${orgName}
  `;

  try {
    await transport.sendMail({
      from: `"${orgName}" <${EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Invitation email sent to ${to}`);
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

export async function sendUserCredentialsEmail(
  to: string,
  fullName: string,
  email: string,
  password: string,
  orgName: string = "PantryPal",
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`⚠️  Email not sent to ${to} - service not configured`);
    return;
  }

  const subject = `Welcome to ${orgName} - Your Login Credentials`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials { background: white; border: 2px solid #4F46E5; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #4F46E5; }
        .credential-value { font-family: monospace; background: #f0f0f0; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 5px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #FFF3CD; border-left: 4px solid #FFC107; padding: 12px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 Welcome to ${orgName}!</h1>
        </div>
        <div class="content">
          <p>Hi ${fullName},</p>
          <p>Your account has been created in the <strong>${orgName}</strong> system. Below are your login credentials:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Temporary Password:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Please change your password immediately after first login</li>
              <li>Do not share your credentials with anyone</li>
              <li>This is a temporary password and should be changed for security</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_BASE_URL || process.env.CLIENT_APP_URL || process.env.APP_BASE_URL || "http://localhost:5000"}/login" class="button">Login Now</a>
          </p>

          <p>If you have any questions or need assistance, please contact your administrator.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p style="color: #999; margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${fullName},

Your account has been created in the ${orgName} system.

Login Credentials:
-------------------
Email: ${email}
Temporary Password: ${password}

⚠️ IMPORTANT SECURITY NOTICE:
- Please change your password immediately after first login
- Do not share your credentials with anyone
- This is a temporary password and should be changed for security

Login URL: ${process.env.FRONTEND_BASE_URL || process.env.CLIENT_APP_URL || process.env.APP_BASE_URL || "http://localhost:5000"}/login

If you have any questions or need assistance, please contact your administrator.

© ${new Date().getFullYear()} ${orgName}
  `;

  try {
    await transport.sendMail({
      from: `"${orgName}" <${EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ User credentials email sent to ${to}`);
  } catch (error: any) {
    console.error(
      `❌ Failed to send credentials email to ${to}:`,
      error.message,
    );
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
