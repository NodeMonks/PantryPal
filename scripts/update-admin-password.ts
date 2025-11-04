// Script to update admin password with bcrypt hash
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function updateAdminPassword() {
  console.log("\n🔐 Updating Admin Password with Bcrypt Hash...\n");

  const newSecurePassword = "PantryPal@2025!Secure";
  const hashedPassword = bcrypt.hashSync(newSecurePassword, SALT_ROUNDS);

  try {
    // Update admin user password
    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashedPassword,
        updated_at: new Date(),
      })
      .where(eq(users.username, "admin"))
      .returning();

    if (!updatedUser) {
      console.log("❌ Admin user not found!");
      console.log("\n💡 Run: npx tsx scripts/create-default-admin.ts");
      process.exit(1);
    }

    console.log("✅ Admin password updated successfully!\n");
    console.log("New Login Credentials:");
    console.log("  Username: admin");
    console.log("  Password: PantryPal@2025!Secure");
    console.log("\nUser Details:");
    console.log("  ID:", updatedUser.id);
    console.log("  Email:", updatedUser.email);
    console.log("  Role:", updatedUser.role);
    console.log("\n✅ Password is now securely hashed with bcrypt!");
    console.log("⚠️  IMPORTANT: Change this password after login!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error updating admin password:", error);
    process.exit(1);
  }
}

updateAdminPassword();
