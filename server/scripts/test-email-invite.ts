import { sendInviteEmail } from "../services/emailService";

/**
 * Test script to verify email invite functionality
 * Run with: npm run tsx server/scripts/test-email-invite.ts
 */
async function testEmailInvite() {
  console.log("🧪 Testing Email Invite Functionality\n");

  const testData = {
    to: "nodemonkstech@gmail.com", // Your email
    fullName: "Test User",
    inviteLink: "http://localhost:5000/invite/accept?token=test-token-12345",
    orgName: "PantryPal Test Store",
  };

  console.log("📧 Sending test invitation email to:", testData.to);
  console.log("👤 Recipient name:", testData.fullName);
  console.log("🔗 Invite link:", testData.inviteLink);
  console.log("🏢 Organization:", testData.orgName);
  console.log("\n⏳ Sending email...\n");

  try {
    await sendInviteEmail(
      testData.to,
      testData.fullName,
      testData.inviteLink,
      testData.orgName
    );

    console.log("✅ Email sent successfully!");
    console.log("\n📬 Check your inbox at:", testData.to);
    console.log("💡 Check spam folder if not in inbox");
  } catch (error: any) {
    console.error("❌ Failed to send email:", error.message);
    console.error("\n🔍 Troubleshooting tips:");
    console.error("  1. Verify SMTP credentials in .env file");
    console.error("  2. Check Gmail App Password is correct");
    console.error("  3. Ensure 2FA is enabled on Gmail account");
    console.error("  4. Try regenerating App Password");
  }
}

testEmailInvite();
