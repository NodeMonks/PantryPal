import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import type { Response } from "express";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m"; // 10–15 min
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || "7d"; // adjustable

const ACCESS_SECRET: Secret = (process.env.JWT_ACCESS_SECRET ||
  "change-me-access") as Secret;
const REFRESH_SECRET: Secret = (process.env.JWT_REFRESH_SECRET ||
  "change-me-refresh") as Secret;
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "pp_rt";

function toMs(ttl: string): number {
  // supports s, m, h, d
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const map: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };
  return val * map[unit];
}

export type JwtAccessPayload = {
  sub: string | number;
  orgId?: string;
  roles?: string[]; // convenience; actual authorization loads from DB
};

export type JwtRefreshPayload = {
  sub: string | number;
  sid: string; // session id (DB primary key UUID)
};

export function signAccessToken(payload: JwtAccessPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_TTL as any };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtAccessPayload;
}

export function signRefreshToken(payload: JwtRefreshPayload): string {
  const options: SignOptions = { expiresIn: REFRESH_TTL as any };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtRefreshPayload;
}

export function hashToken(token: string): string {
  const pepper = process.env.REFRESH_TOKEN_PEPPER || "";
  return crypto
    .createHash("sha256")
    .update(token + pepper)
    .digest("hex");
}

export function setRefreshCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = toMs(REFRESH_TTL);
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/auth/refresh",
    maxAge,
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
  });
}

export function clearRefreshCookie(res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/auth/refresh",
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
  });
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME;
}
