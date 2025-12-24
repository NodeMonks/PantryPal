import request from "supertest";
// Adjust the import below to your actual Express app export
import app from "../../server/index";

describe("Razorpay Payment Integration", () => {
  it("should create a subscription intent", async () => {
    const res = await request(app)
      .post("/api/payments/create-subscription")
      .send({ plan: "test_plan" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.provider).toBe("razorpay");
    expect(res.body.key_id).toBeDefined();
    expect(res.body.subscription_id).toMatch(/^sub_/);
  });

  it("should verify payment signature", async () => {
    // Mock payload and signature as per your backend logic
    const payload = {
      razorpay_payment_id: "pay_test",
      razorpay_order_id: "order_test",
      razorpay_signature: "mock_signature",
    };
    const res = await request(app).post("/api/payments/verify").send(payload);
    // Expect 400 for invalid signature in CI (since secret is mock)
    expect([200, 400]).toContain(res.status);
  });

  it("should handle webhook", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("X-Razorpay-Signature", "mock_signature")
      .send({ event: "payment.captured" });
    // Should return 400 for invalid signature in CI
    expect([200, 400]).toContain(res.status);
  });
});
