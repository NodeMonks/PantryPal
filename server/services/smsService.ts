import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

function getClient() {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.warn(
        "⚠️  SMS service not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER required"
      );
      return null;
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export async function sendInviteSMS(
  to: string,
  fullName: string,
  inviteLink: string,
  orgName: string = "PantryPal"
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`⚠️  SMS not sent to ${to} - service not configured`);
    return;
  }

  // Format phone number for Twilio (ensure it has country code)
  let formattedPhone = to.trim();
  if (!formattedPhone.startsWith("+")) {
    // Assume Indian number if no country code
    formattedPhone = `+91${formattedPhone}`;
  }

  const message = `Hi ${fullName},

You've been invited to join ${orgName}!

Accept your invitation here:
${inviteLink}

Link expires in 48 hours.`;

  try {
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    console.log(`✅ Invitation SMS sent to ${formattedPhone}`);
  } catch (error: any) {
    console.error(`❌ Failed to send SMS to ${formattedPhone}:`, error.message);
    throw new Error(`SMS delivery failed: ${error.message}`);
  }
}
