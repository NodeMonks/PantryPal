// Simple script to create admin user
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function createDefaultAdmin() {
  console.log("\n🔐 Creating Default Admin User...\n");

  // Generate a secure random password
  const securePassword = "PantryPal@2025!Secure"; // Change this to your desired password
  const hashedPassword = bcrypt.hashSync(securePassword, SALT_ROUNDS);

  const adminData = {
    username: "admin",
    email: "admin@pantrypal.com",
    password: hashedPassword, // Now using bcrypt hashed password
    role: "admin" as const,
    full_name: "System Administrator",
    is_active: true,
  };

  try {
    // Check if admin already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, adminData.username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("❌ Admin user already exists!");
      console.log("\nExisting user details:");
      console.log("  ID:", existingUser[0].id);
      console.log("  Username:", existingUser[0].username);
      console.log("  Email:", existingUser[0].email);
      console.log("  Role:", existingUser[0].role);
      console.log(
        "\n⚠️  To update password, delete the user first or use password reset."
      );
      process.exit(0);
    }

    // Create admin user
    const [newUser] = await db.insert(users).values(adminData).returning();

    console.log("✅ Admin user created successfully!\n");
    console.log("Login Credentials:");
    console.log("  Username: admin");
    console.log("  Password: PantryPal@2025!Secure");
    console.log("\nUser Details:");
    console.log("  ID:", newUser.id);
    console.log("  Email:", newUser.email);
    console.log("  Role:", newUser.role);
    console.log("\n✅ Password is securely hashed with bcrypt!");
    console.log("⚠️  IMPORTANT: Change this password after first login!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createDefaultAdmin();
