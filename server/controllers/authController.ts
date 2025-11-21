import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser"; // only for types here; middleware is applied in index
import { z } from "zod";
import { db } from "../db";
import { audit_logs, roles as rolesTable } from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  signup as svcSignup,
  login as svcLogin,
  rotateRefreshToken,
  logoutByToken,
  createInvite,
  acceptInvite,
} from "../services/authService";
import {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookieName,
} from "../utils/jwt";
import { sendInviteEmail } from "../services/emailService";
import { sendInviteSMS } from "../services/smsService";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

const signupBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional(),
});
const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const inviteBody = z.object({
  org_id: z.string().uuid(),
  email: z.string().email(),
  role_id: z.number().int(),
  store_id: z.string().uuid().optional(),
  expires_in_hours: z.number().int().min(1).max(168).optional(),
  full_name: z.string().min(2),
  phone: z.string().min(6),
});
const acceptInviteBody = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  full_name: z.string().optional(),
});

export async function signup(req: Request, res: Response) {
  const parsed = signupBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });
  const { email, password, full_name } = parsed.data;
  const { user, org, accessToken, refreshToken } = await svcSignup(
    email,
    password,
    full_name
  );
  setRefreshCookie(res, refreshToken);
  await db.insert(audit_logs).values({
    user_id: user.id,
    org_id: org.id,
    action: "auth:signup",
    details: `email=${email}`,
  });
  return res.json({
    access_token: accessToken,
    user: { id: user.id, email: user.email, full_name: user.full_name },
    org,
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });
  const { email, password } = parsed.data;
  const ua = req.headers["user-agent"] as string | undefined;
  const ip = req.ip;
  try {
    const { user, accessToken, refreshToken, orgId } = await svcLogin(
      email,
      password,
      ua,
      ip
    );
    setRefreshCookie(res, refreshToken);
    await db.insert(audit_logs).values({
      user_id: user.id,
      org_id: (orgId as any) ?? (null as any),
      action: "auth:login",
    });
    return res.json({
      access_token: accessToken,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      orgId,
    });
  } catch (e: any) {
    return res.status(401).json({ error: e.message || "Invalid credentials" });
  }
}

export async function refresh(req: Request, res: Response) {
  const name = getRefreshCookieName();
  const rt = req.cookies?.[name];
  if (!rt) return res.status(401).json({ error: "Missing refresh token" });
  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(rt);
    setRefreshCookie(res, refreshToken);
    return res.json({ access_token: accessToken });
  } catch (e: any) {
    clearRefreshCookie(res);
    return res
      .status(401)
      .json({ error: e.message || "Invalid refresh token" });
  }
}

export async function logout(req: Request, res: Response) {
  const name = getRefreshCookieName();
  const rt = req.cookies?.[name];
  if (rt) await logoutByToken(rt);
  clearRefreshCookie(res);
  await db.insert(audit_logs).values({
    user_id: req.ctx?.userId as any,
    org_id: req.ctx?.orgId as any,
    action: "auth:logout",
  });
  return res.json({ message: "Logged out" });
}

export async function orgInvite(req: Request, res: Response) {
  const parsed = inviteBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });
  // Enforce org scope and allowed role assignment
  const ctx = req.ctx;
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (ctx.orgId && ctx.orgId !== parsed.data.org_id) {
    return res.status(403).json({ error: "Forbidden: cross-org invite" });
  }
  // Determine role name for requested role_id
  const [targetRole] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, parsed.data.role_id))
    .limit(1);
  if (!targetRole) return res.status(400).json({ error: "Invalid role" });
  // Allowed mapping
  const inviterRoles = ctx.roles || [];
  console.log("🔍 DEBUG - Inviter roles:", inviterRoles);
  console.log("🔍 DEBUG - Target role:", targetRole.name);
  const isAdmin = inviterRoles.includes("admin");
  const isStoreOwner = inviterRoles.includes("store_owner");
  const isStoreMgr = inviterRoles.includes("store_manager");
  const allowedForAdmin = ["store_manager", "inventory_manager", "cashier"];
  const allowedForStoreOwner = [
    "store_manager",
    "inventory_manager",
    "cashier",
  ];
  const allowedForStoreMgr = ["inventory_manager", "cashier"];
  const allowed =
    isAdmin || isStoreOwner
      ? allowedForStoreOwner
      : isStoreMgr
      ? allowedForStoreMgr
      : [];
  console.log("✅ DEBUG - Allowed roles:", allowed);
  if (!allowed.includes(targetRole.name)) {
    return res.status(403).json({ error: "Forbidden: role not assignable" });
  }

  const data = await createInvite(parsed.data as any);
  await db.insert(audit_logs).values({
    user_id: req.ctx?.userId as any,
    org_id: parsed.data.org_id,
    action: "org:invite",
    details: `email=${parsed.data.email}`,
  });
  // Build the invite link
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
  const link = `${baseUrl}/invite/accept?token=${data.token}`;

  // Send email and SMS in parallel (non-blocking if services not configured)
  const sendPromises = [
    sendInviteEmail(
      parsed.data.email,
      parsed.data.full_name,
      link,
      "PantryPal"
    ).catch((err) => console.error("Email send error:", err.message)),
    sendInviteSMS(
      parsed.data.phone,
      parsed.data.full_name,
      link,
      "PantryPal"
    ).catch((err) => console.error("SMS send error:", err.message)),
  ];

  // Simulate verification delay (5 seconds) while messages are being sent
  await Promise.all([
    ...sendPromises,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);

  return res.status(201).json({
    invite: data.invite,
    link,
    message: "Invitation sent via email and SMS",
  });
}

export async function inviteAccept(req: Request, res: Response) {
  const parsed = acceptInviteBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });
  const result = await acceptInvite(
    parsed.data.token,
    parsed.data.password,
    parsed.data.full_name
  );
  await db.insert(audit_logs).values({
    user_id: result.user_id,
    org_id: result.org_id,
    action: "invite:accept",
  });
  return res.json({ message: "Invite accepted", ...result });
}
