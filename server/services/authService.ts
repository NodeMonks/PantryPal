import { db } from "../db";
import {
  users,
  organizations,
  sessions,
  user_invites,
  user_roles,
  roles,
} from "../../shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { hashToken, signAccessToken, signRefreshToken } from "../utils/jwt";
import { getPlanLimits } from "../utils/planLimits";

const SALT_ROUNDS = Number(process.env.BCRYPT_COST || 12);
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || "";

export async function hashPassword(password: string): Promise<string> {
  const pw = PASSWORD_PEPPER ? password + PASSWORD_PEPPER : password;
  return bcrypt.hash(pw, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  const pw = PASSWORD_PEPPER ? password + PASSWORD_PEPPER : password;
  return bcrypt.compare(pw, hash);
}

export async function signup(
  email: string,
  password: string,
  full_name?: string
) {
  // Assumption: signup creates a new organization and sets the user as admin of that org
  const orgName = email.split("@")[0] + " Org";
  const [org] = await db
    .insert(organizations)
    .values({ name: orgName })
    .returning();

  const hashed = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username: email,
      email,
      password: hashed,
      full_name,
      role: "admin",
    })
    .returning();

  // Assign admin role in RBAC for this org
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);
  if (adminRole) {
    await db
      .insert(user_roles)
      .values({ user_id: user.id, org_id: org.id, role_id: adminRole.id });
  }

  // Create initial session
  const sessionId = crypto.randomUUID();
  const refreshPayload = { sub: String(user.id), sid: sessionId };
  const refreshToken = signRefreshToken(refreshPayload);
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    user_id: user.id,
    org_id: org.id,
    refresh_token_hash: refreshHash,
    expires_at: expiresAt,
  });

  const accessToken = signAccessToken({
    sub: String(user.id),
    orgId: org.id,
    roles: ["admin"],
  });
  return { user, org, accessToken, refreshToken };
}

export async function login(
  email: string,
  password: string,
  userAgent?: string,
  ip?: string
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !user.is_active) throw new Error("Invalid credentials");
  const ok = await verifyPassword(password, user.password);
  if (!ok) throw new Error("Invalid credentials");

  // get a primary orgId from first assignment (if any)
  const [assignment] = await db
    .select()
    .from(user_roles)
    .where(eq(user_roles.user_id, user.id))
    .limit(1);

  const sessionId = crypto.randomUUID();
  const refreshPayload = { sub: String(user.id), sid: sessionId };
  const refreshToken = signRefreshToken(refreshPayload);
  const refreshHash = hashToken(refreshToken);
  const ttlMs = parseTtl(process.env.JWT_REFRESH_TTL || "7d");
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.insert(sessions).values({
    id: sessionId,
    user_id: user.id,
    org_id: assignment ? (assignment.org_id as any) : (undefined as any),
    refresh_token_hash: refreshHash,
    user_agent: userAgent,
    ip_address: ip,
    expires_at: expiresAt,
  });

  const accessToken = signAccessToken({
    sub: String(user.id),
    orgId: assignment ? (assignment.org_id as any) : undefined,
  });
  return {
    user,
    accessToken,
    refreshToken,
    sessionId,
    orgId: assignment ? (assignment.org_id as any) : undefined,
  };
}

export async function rotateRefreshToken(oldToken: string) {
  const payload = (await import("../utils/jwt")).verifyRefreshToken(oldToken);
  const oldHash = hashToken(oldToken);
  const res = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.sid),
        eq(sessions.refresh_token_hash, oldHash)
      )
    )
    .limit(1);
  const existing = res[0];
  if (
    !existing ||
    existing.revoked_at ||
    new Date(existing.expires_at) < new Date()
  ) {
    throw new Error("Invalid refresh token");
  }

  // revoke old
  await db
    .update(sessions)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(sessions.id, payload.sid),
        eq(sessions.refresh_token_hash, oldHash)
      )
    );

  // create new
  const newSessionId = crypto.randomUUID();
  const refreshPayload = { sub: payload.sub, sid: newSessionId };
  const newToken = signRefreshToken(refreshPayload);
  const newHash = hashToken(newToken);
  const ttlMs = parseTtl(process.env.JWT_REFRESH_TTL || "7d");
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.insert(sessions).values({
    id: newSessionId,
    user_id: Number(payload.sub),
    org_id: existing.org_id as any,
    refresh_token_hash: newHash,
    expires_at: expiresAt,
  });

  const accessToken = signAccessToken({
    sub: payload.sub as string,
    orgId: existing.org_id as any,
  });
  return { accessToken, refreshToken: newToken };
}

export async function logoutByToken(refreshToken: string) {
  const payload = (await import("../utils/jwt")).verifyRefreshToken(
    refreshToken
  );
  const hash = hashToken(refreshToken);
  await db
    .update(sessions)
    .set({ revoked_at: new Date() })
    .where(
      and(eq(sessions.id, payload.sid), eq(sessions.refresh_token_hash, hash))
    );
}

export async function createInvite(params: {
  org_id: string;
  email: string;
  role_id: number;
  store_id?: string;
  expires_in_hours?: number;
  full_name: string;
  phone?: string;
}) {
  const {
    org_id,
    email,
    role_id,
    store_id,
    expires_in_hours = 48,
    full_name,
    phone,
  } = params;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const token_hash = hashToken(rawToken);
  const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000);

  // Enforce plan-based role limits for the org (Starter 399 plan)
  const [org] = await db
    .select({ plan_name: organizations.plan_name })
    .from(organizations)
    .where(eq(organizations.id, org_id))
    .limit(1);
  const planLimits = getPlanLimits(org?.plan_name);

  const [targetRole] = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, role_id))
    .limit(1);
  const targetRoleName = targetRole?.name;

  const limitConfig: { roleNames: string[]; max: number } | undefined =
    targetRoleName === "store_manager"
      ? {
          roleNames: ["store_manager"],
          max: planLimits.maxRoleUsers.store_manager,
        }
      : targetRoleName === "inventory_manager"
      ? {
          roleNames: ["inventory_manager"],
          max: planLimits.maxRoleUsers.inventory_manager,
        }
      : targetRoleName === "admin" || targetRoleName === "store_owner"
      ? {
          roleNames: ["admin", "store_owner"],
          max: planLimits.maxRoleUsers.adminOrOwner,
        }
      : undefined;

  if (limitConfig && Number.isFinite(limitConfig.max)) {
    // Count distinct users already assigned (org-wide)
    const existingRows = await db
      .select({
        count: sql<number>`count(distinct ${user_roles.user_id})`,
      })
      .from(user_roles)
      .innerJoin(roles, eq(user_roles.role_id, roles.id))
      .where(
        and(
          eq(user_roles.org_id, org_id),
          inArray(roles.name, limitConfig.roleNames)
        )
      );
    const existingCount = Number(existingRows?.[0]?.count || 0);

    // Count pending invites (to avoid over-inviting)
    const pendingInvitesRows = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(user_invites)
      .where(
        and(
          eq(user_invites.org_id, org_id),
          eq(user_invites.role_id, role_id),
          sql`${user_invites.accepted_at} IS NULL`,
          sql`${user_invites.expires_at} > now()`
        )
      );
    const pendingCount = Number(pendingInvitesRows?.[0]?.count || 0);

    if (existingCount + pendingCount >= limitConfig.max) {
      throw new Error(
        `Plan limit exceeded for role ${targetRoleName}: max ${limitConfig.max}`
      );
    }
  }

  const [invite] = await db
    .insert(user_invites)
    .values({
      org_id,
      email,
      role_id,
      store_id,
      token_hash,
      expires_at,
      full_name,
      phone: phone || null,
    })
    .returning();

  return { invite, token: rawToken };
}

export async function acceptInvite(
  token: string,
  password: string,
  full_name?: string
) {
  const token_hash = hashToken(token);
  const res = await db
    .select()
    .from(user_invites)
    .where(eq(user_invites.token_hash, token_hash))
    .limit(1);
  const invite = res[0];
  if (!invite) throw new Error("Invalid invite token");
  if (invite.accepted_at) throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date())
    throw new Error("Invite expired");

  // Enforce plan limits before creating assignment
  const [org] = await db
    .select({ plan_name: organizations.plan_name })
    .from(organizations)
    .where(eq(organizations.id, invite.org_id))
    .limit(1);
  const planLimits = getPlanLimits(org?.plan_name);

  const [targetRole] = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, invite.role_id))
    .limit(1);
  const targetRoleName = targetRole?.name;

  const acceptLimitConfig: { roleNames: string[]; max: number } | undefined =
    targetRoleName === "store_manager"
      ? {
          roleNames: ["store_manager"],
          max: planLimits.maxRoleUsers.store_manager,
        }
      : targetRoleName === "inventory_manager"
      ? {
          roleNames: ["inventory_manager"],
          max: planLimits.maxRoleUsers.inventory_manager,
        }
      : targetRoleName === "admin" || targetRoleName === "store_owner"
      ? {
          roleNames: ["admin", "store_owner"],
          max: planLimits.maxRoleUsers.adminOrOwner,
        }
      : undefined;

  if (acceptLimitConfig && Number.isFinite(acceptLimitConfig.max)) {
    const existingRows = await db
      .select({
        count: sql<number>`count(distinct ${user_roles.user_id})`,
      })
      .from(user_roles)
      .innerJoin(roles, eq(user_roles.role_id, roles.id))
      .where(
        and(
          eq(user_roles.org_id, invite.org_id),
          inArray(roles.name, acceptLimitConfig.roleNames)
        )
      );
    const existingCount = Number(existingRows?.[0]?.count || 0);
    if (existingCount >= acceptLimitConfig.max) {
      throw new Error(
        `Plan limit exceeded for role ${targetRoleName}: max ${acceptLimitConfig.max}`
      );
    }
  }

  // create user if not exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);
  let userId: number;
  if (existing) {
    userId = existing.id;
  } else {
    const hashed = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        username: invite.email,
        email: invite.email,
        password: hashed,
        full_name: full_name || (invite as any).full_name,
        phone: ((invite as any).phone as any) || null,
        role: "cashier",
      })
      .returning();
    userId = user.id;
  }

  // assign role scoped to org/store
  await db.insert(user_roles).values({
    user_id: userId,
    org_id: invite.org_id,
    store_id: invite.store_id as any,
    role_id: invite.role_id,
  });

  // mark invite accepted and set responded_at
  await db
    .update(user_invites)
    .set({ accepted_at: new Date(), responded_at: new Date() })
    .where(eq(user_invites.id, invite.id));

  return { user_id: userId, org_id: invite.org_id };
}

function parseTtl(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600 * 1000;
  const map: any = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(m[1], 10) * map[m[2]];
}
