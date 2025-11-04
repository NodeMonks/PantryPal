// Script to create the first admin user
// Run this with: npx tsx scripts/create-admin.ts

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  console.log("\n🔐 Create First Admin User\n");

  const username = await question("Username: ");
  const email = await question("Email: ");
  const password = await question("Password: ");
  const fullName = await question("Full Name: ");

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("\n❌ User already exists!");
      rl.close();
      process.exit(1);
    }

    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      console.log("\n❌ Email already exists!");
      rl.close();
      process.exit(1);
    }

    // Create admin user
    // Note: In production, password should be hashed with bcrypt
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        password, // In production, use: await bcrypt.hash(password, 10)
        role: "admin",
        full_name: fullName,
        is_active: true,
      })
      .returning();

    console.log("\n✅ Admin user created successfully!\n");
    console.log("User Details:");
    console.log("  ID:", newUser.id);
    console.log("  Username:", newUser.username);
    console.log("  Email:", newUser.email);
    console.log("  Role:", newUser.role);
    console.log("  Full Name:", newUser.full_name);
    console.log(
      "\n⚠️  IMPORTANT: In production, use bcrypt to hash passwords!\n"
    );

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
