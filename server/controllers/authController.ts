import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser"; // only for types here; middleware is applied in index
import { z } from "zod";
import { db } from "../db";
import {
  audit_logs,
  roles as rolesTable,
  user_invites,
  roles,
  user_roles,
} from "../../shared/schema";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
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
  org_id: z.string().uuid().optional(), // Will be filled from JWT context
  email: z.string().email(),
  role_id: z.number().int(),
  store_id: z.string().uuid().optional(),
  expires_in_hours: z.number().int().min(1).max(168).optional(),
  full_name: z.string().min(2),
  phone: z.string().min(6).optional(),
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

  const ctx = req.ctx;
  if (!ctx || !ctx.userId || !ctx.orgId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Use org_id from JWT context - no manual org_id needed
  const targetOrgId = ctx.orgId;

  // Verify user has a role in their org
  const [userRoleInOrg] = await db
    .select()
    .from(user_roles)
    .where(
      and(
        eq(user_roles.user_id, ctx.userId),
        eq(user_roles.org_id, targetOrgId as any)
      )
    )
    .limit(1);

  if (!userRoleInOrg) {
    return res.status(403).json({
      error: "You don't have permission to invite users",
    });
  }

  // Get target role
  const [targetRole] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, parsed.data.role_id))
    .limit(1);
  if (!targetRole)
    return res.status(400).json({ error: "Invalid role selected" });

  // Load user's roles in this org
  const userRolesInThisOrg = await db
    .select({ name: rolesTable.name })
    .from(user_roles)
    .leftJoin(rolesTable, eq(user_roles.role_id, rolesTable.id))
    .where(
      and(
        eq(user_roles.user_id, ctx.userId),
        eq(user_roles.org_id, targetOrgId as any)
      )
    );

  const inviterRoles = userRolesInThisOrg
    .map((r) => r.name)
    .filter(Boolean) as string[];

  // Check permissions
  const isAdmin = inviterRoles.includes("admin");
  const isStoreOwner = inviterRoles.includes("store_owner");
  const isStoreMgr = inviterRoles.includes("store_manager");

  const allowed =
    isAdmin || isStoreOwner
      ? ["store_manager", "inventory_manager", "cashier"]
      : isStoreMgr
      ? ["inventory_manager", "cashier"]
      : [];

  if (!allowed.includes(targetRole.name)) {
    return res.status(403).json({
      error: `You cannot assign the ${targetRole.name} role`,
    });
  }

  // Create invite with org_id from JWT context
  const inviteData = {
    ...parsed.data,
    org_id: targetOrgId,
  };

  const data = await createInvite(inviteData as any);
  await db.insert(audit_logs).values({
    user_id: ctx.userId as any,
    org_id: targetOrgId,
    action: "org:invite",
    details: `email=${parsed.data.email}`,
  });
  // Build the invite link
  const baseUrl =
    process.env.FRONTEND_BASE_URL ||
    process.env.CLIENT_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:5000";
  const invitePath = process.env.INVITE_ACCEPT_PATH || "/invite/accept";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = invitePath.startsWith("/")
    ? invitePath
    : `/${invitePath}`;
  const link = `${normalizedBase}${normalizedPath}?token=${data.token}`;

  // Send email and SMS in background (fire-and-forget)
  // Don't wait for email/SMS - return immediately for better UX
  sendInviteEmail(
    parsed.data.email,
    parsed.data.full_name,
    link,
    "PantryPal"
  ).catch((err) => console.error("Email send error:", err.message));

  if (parsed.data.phone) {
    sendInviteSMS(
      parsed.data.phone,
      parsed.data.full_name,
      link,
      "PantryPal"
    ).catch((err) => console.error("SMS send error:", err.message));
  }

  // Return immediately - invite is created, messages sent in background
  return res.status(201).json({
    invite: data.invite,
    link,
    message: parsed.data.phone
      ? "Invitation sent via email and SMS"
      : "Invitation sent via email",
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

export async function listPendingInvites(req: Request, res: Response) {
  const ctx = req.ctx;
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get org_id from query or context
    const orgId = (req.query.org_id as string) || ctx.orgId;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    // Fetch pending invites (not accepted, not expired)
    const pending = await db
      .select({
        id: user_invites.id,
        email: user_invites.email,
        full_name: user_invites.full_name,
        phone: user_invites.phone,
        role_id: user_invites.role_id,
        store_id: user_invites.store_id,
        created_at: user_invites.created_at,
        expires_at: user_invites.expires_at,
        accepted_at: user_invites.accepted_at,
        role_name: roles.name,
      })
      .from(user_invites)
      .leftJoin(roles, eq(user_invites.role_id, roles.id))
      .where(
        and(
          eq(user_invites.org_id, orgId as any),
          isNull(user_invites.accepted_at),
          gt(user_invites.expires_at, new Date())
        )
      )
      .orderBy(desc(user_invites.created_at));

    return res.json({ invites: pending });
  } catch (e: any) {
    console.error("List invites error:", e);
    return res
      .status(500)
      .json({ error: e.message || "Failed to list invites" });
  }
}

export async function withdrawInvite(req: Request, res: Response) {
  const ctx = req.ctx;
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  try {
    const inviteId = req.params.id as string;
    if (!inviteId) return res.status(400).json({ error: "invite_id required" });

    // Fetch the invite
    const [invite] = await db
      .select()
      .from(user_invites)
      .where(eq(user_invites.id, inviteId))
      .limit(1);

    if (!invite) return res.status(404).json({ error: "Invite not found" });

    // Check if already accepted
    if (invite.accepted_at) {
      return res.status(400).json({ error: "Cannot withdraw accepted invite" });
    }

    // Verify org scope - user must be in the same org
    if (ctx.orgId && ctx.orgId !== invite.org_id) {
      return res.status(403).json({ error: "Forbidden: cross-org access" });
    }

    // Mark as expired (soft delete by setting expires_at to now)
    await db
      .update(user_invites)
      .set({ expires_at: new Date() })
      .where(eq(user_invites.id, inviteId));

    // Log audit
    await db.insert(audit_logs).values({
      user_id: req.ctx?.userId as any,
      org_id: invite.org_id,
      action: "invite:withdraw",
      details: `email=${invite.email}`,
    });

    return res.json({ message: "Invite withdrawn successfully" });
  } catch (e: any) {
    console.error("Withdraw invite error:", e);
    return res
      .status(500)
      .json({ error: e.message || "Failed to withdraw invite" });
  }
}
