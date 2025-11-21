import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { setupAuthRoutes } from "../../server/authRoutes";
import { setupAuth } from "../../server/auth";

describe("Auth API Endpoints", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Setup auth with app (includes session + passport)
    setupAuth(app);

    // Setup auth routes
    setupAuthRoutes(app);
  });

  it("GET /api/auth/me - should return 401 when not authenticated", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("POST /api/auth/register - should validate required fields", async () => {
    const response = await request(app).post("/api/auth/register").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
