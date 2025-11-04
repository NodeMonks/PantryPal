import { config } from "dotenv";
config();

const BASE = process.env.APP_BASE_URL || "http://localhost:5000";

async function testInvite() {
  console.log("🔐 Step 1: Login as admin to get JWT token...");
  console.log(`🌐 Using BASE_URL: ${BASE}`);

  // First, we need to login to get a JWT access token
  let loginRes;
  try {
    loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin1@example.com", // Using the seeded admin from seed-test-users
        password: "Passw0rd!",
      }),
    });
  } catch (err) {
    console.error(
      `❌ Fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    console.error(`Stack: ${err instanceof Error ? err.stack : "N/A"}`);
    process.exit(1);
  }

  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error(`❌ Login failed: ${err}`);
    process.exit(1);
  }

  const loginData = await loginRes.json();
  const accessToken = loginData.access_token;
  const orgId = loginData.orgId;

  console.log("✅ Logged in successfully");
  console.log("   Org ID:", orgId);

  // Step 2: Get available roles
  console.log("\n📋 Step 2: Fetching available roles...");
  const rolesRes = await fetch(`${BASE}/rbac/roles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!rolesRes.ok) {
    const err = await rolesRes.text();
    console.error("❌ Failed to fetch roles:", err);
    process.exit(1);
  }

  const roles = await rolesRes.json();
  console.log(
    "✅ Available roles:",
    roles.map((r: any) => `${r.name} (id: ${r.id})`).join(", ")
  );

  // Find store_manager role
  const storeMgrRole = roles.find((r: any) => r.name === "store_manager");
  if (!storeMgrRole) {
    console.error("❌ store_manager role not found");
    process.exit(1);
  }

  // Step 3: Send invite
  console.log("\n📤 Step 3: Sending invite...");
  const inviteRes = await fetch(`${BASE}/org/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      org_id: orgId,
      email: "shubhshrivastavawork@gmail.com",
      role_id: storeMgrRole.id,
      full_name: "Shubh Shrivastava",
      phone: "8109008747",
      expires_in_hours: 48,
    }),
  });

  if (!inviteRes.ok) {
    const err = await inviteRes.json();
    console.error("❌ Invite failed:", err);
    process.exit(1);
  }

  const inviteData = await inviteRes.json();
  console.log("✅ Invite sent successfully!");
  console.log("\n📧 Invite Details:");
  console.log("   Email:", "shubhshrivastavawork@gmail.com");
  console.log("   Phone:", "8109008747");
  console.log("   Role:", storeMgrRole.name);
  console.log("   Full Name:", "Shubh Shrivastava");
  console.log("\n🔗 Invitation Link:");
  console.log("   ", inviteData.link);
  console.log(
    "\n💡 Note: Copy the link above and open it in a browser to accept the invite."
  );
}

testInvite().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
