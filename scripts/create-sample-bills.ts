/**
 * Create Sample Bills Script
 * Generates test bills with current dates for analytics testing
 */

import { db } from "../server/db";
import { bills, bill_items, products, customers } from "../shared/schema";
import { eq } from "drizzle-orm";

const ORG_ID = "d545b0fc-700b-4323-89e3-6ea86a3ea853"; // From your logs
const STORE_ID = "ac1de9cf-cbb9-4489-8443-762e26ea7a40"; // From your logs
const USER_ID = 1; // Admin user

async function createSampleBills() {
  console.log("🎯 Creating sample bills for analytics...");

  // Get existing products
  const existingProducts = await db
    .select()
    .from(products)
    .where(eq(products.org_id, ORG_ID))
    .limit(10);

  if (existingProducts.length === 0) {
    console.log("❌ No products found. Please create products first.");
    return;
  }

  console.log(`✅ Found ${existingProducts.length} products`);

  // Get existing customers
  const existingCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.org_id, ORG_ID))
    .limit(5);

  console.log(`✅ Found ${existingCustomers.length} customers`);

  // Payment methods
  const paymentMethods = ["cash", "card", "upi"];

  // Create 20 sample bills over the last 30 days
  const billsToCreate = 20;
  const createdBills = [];

  for (let i = 0; i < billsToCreate; i++) {
    // Random date within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const billDate = new Date();
    billDate.setDate(billDate.getDate() - daysAgo);
    billDate.setHours(billDate.getHours() - hoursAgo);

    // Random customer or walk-in
    const customerId =
      existingCustomers.length > 0 && Math.random() > 0.3
        ? existingCustomers[
            Math.floor(Math.random() * existingCustomers.length)
          ].id
        : null;

    // Random number of items (1-5)
    const numItems = Math.floor(Math.random() * 5) + 1;
    const billItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product =
        existingProducts[Math.floor(Math.random() * existingProducts.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const price = Number(product.price);
      const itemTotal = price * quantity;

      billItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        price,
        total_price: itemTotal,
      });

      subtotal += itemTotal;
    }

    // Random discount (0-20%)
    const discountPercent =
      Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const finalAmount = subtotal - discountAmount;

    // Random payment method
    const paymentMethod =
      paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    // Generate bill number
    const billNumber = `BILL-${Date.now()}-${i}`;

    try {
      // Create bill
      const [newBill] = await db
        .insert(bills)
        .values({
          org_id: ORG_ID,
          store_id: STORE_ID,
          bill_number: billNumber,
          customer_id: customerId,
          total_amount: subtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          payment_method: paymentMethod,
          payment_status: "paid",
          created_by: USER_ID,
          created_at: billDate,
        })
        .returning();

      // Create bill items
      for (const item of billItems) {
        await db.insert(bill_items).values({
          org_id: ORG_ID,
          bill_id: newBill.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price, // Fixed: was "price", should be "unit_price"
          total_price: item.total_price,
        });
      }

      createdBills.push({
        bill_number: billNumber,
        amount: finalAmount,
        items: billItems.length,
        date: billDate.toLocaleDateString("en-IN"),
      });

      console.log(
        `✅ Created bill ${i + 1}/${billsToCreate}: ${billNumber} - ₹${finalAmount.toFixed(2)} (${billItems.length} items)`,
      );
    } catch (error) {
      console.error(`❌ Failed to create bill ${i + 1}:`, error);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`Total bills created: ${createdBills.length}`);
  console.log(
    `Total revenue: ₹${createdBills.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}`,
  );
  console.log(`Date range: Last 30 days`);
  console.log("\n✅ Sample data created successfully!");
  console.log("🔄 Refresh the Reports page to see the analytics");

  process.exit(0);
}

createSampleBills().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
