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
        "⚠️  Email service not configured: SMTP_USER and SMTP_PASS required"
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
  orgName: string = "PantryPal"
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
