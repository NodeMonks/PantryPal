import { getTransporter } from "./emailService";
import qrcode from "qrcode";

export async function sendBillEmail({
  to,
  customerName,
  billNumber,
  billDetails,
  qrData,
  orgName = "PantryPal",
}: {
  to: string;
  customerName: string;
  billNumber: string;
  billDetails: string;
  qrData: string;
  orgName?: string;
}) {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`⚠️  Email not sent to ${to} - service not configured`);
    return;
  }

  // Generate QR code image
  const qrImage = await qrcode.toDataURL(qrData);

  const subject = `Your Bill from ${orgName} - ${billNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="background: #4F46E5; color: white; padding: 16px; border-radius: 8px 8px 0 0;">${orgName} Bill</h2>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hi ${customerName},</p>
        <p>Thank you for your purchase! Your bill number is <strong>${billNumber}</strong>.</p>
        <div style="margin: 16px 0;">${billDetails}</div>
        <p>Scan the QR code below to add these products to your PantryPal mobile app:</p>
        <div style="text-align: center; margin: 24px 0;">
          <img src="${qrImage}" alt="Bill QR Code" style="width: 180px; height: 180px;" />
        </div>
        <p style="font-size: 12px; color: #666;">If you have any questions, reply to this email.</p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        © ${new Date().getFullYear()} ${orgName}. All rights reserved.
      </div>
    </div>
  `;

  try {
    await transport.sendMail({
      from: `${orgName} <noreply@pantrypal.com>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Bill email sent to ${to}`);
  } catch (error: any) {
    console.error(`❌ Failed to send bill email to ${to}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
