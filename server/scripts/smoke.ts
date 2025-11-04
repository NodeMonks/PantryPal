/*
  Smoke test JWT endpoints locally using Node fetch.
*/
import "dotenv/config";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:5000";

async function post(path: string, body: any, token?: string, cookie?: string) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
    redirect: "manual",
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { res, json };
}

async function get(path: string, token?: string) {
  const res = await fetch(base + path, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { res, json };
}

function extractCookie(res: Response): string | undefined {
  // @ts-ignore
  const raw = res.headers.get("set-cookie") as string | null;
  return raw ?? undefined;
}

(async () => {
  // Start server child process (dev mode)
  console.log("Starting dev server...");
  const cmd = process.platform === "win32" ? "npm run dev" : "npm run dev";
  const child = spawn(cmd, {
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  let ready = false;
  child.stdout.on("data", (b) => {
    const s = b.toString();
    if (s.includes("Server running on http")) ready = true;
    process.stdout.write(s);
  });
  child.stderr.on("data", (b) => process.stderr.write(b.toString()));
  // wait up to 10s for server
  for (let i = 0; i < 20 && !ready; i++) await delay(500);
  if (!ready) {
    console.error("Server did not start in time");
    child.kill("SIGTERM");
    process.exit(1);
  }
  const email = `owner+${Date.now()}@example.com`;
  const password = "Test123!Test";

  console.log("Signup...");
  const { res: sres, json: signup } = await post("/auth/signup", {
    email,
    password,
  });
  if (!("access_token" in (signup || {}))) {
    console.error("Signup failed:", signup);
    process.exit(1);
  }
  const access = signup.access_token as string;
  const orgId = signup.org?.id as string | undefined;
  const cookie = extractCookie(sres as any);
  console.log("✅ signup ok, orgId=", orgId);

  console.log("List roles...");
  const { json: roles } = await get("/rbac/roles", access);
  const manager =
    (roles as any[]).find((r) => r.name === "store_manager") ||
    (roles as any[])[0];
  console.log("✅ roles:", roles?.length);

  console.log("Create invite...");
  const invited = `staff+${Date.now()}@example.com`;
  const { json: invite } = await post(
    "/org/invite",
    { org_id: orgId, email: invited, role_id: manager.id },
    access
  );
  if (!invite?.link) {
    console.error("Invite failed:", invite);
    process.exit(1);
  }
  const token = new URL(invite.link).searchParams.get("token");
  console.log("✅ invite ok");

  console.log("Accept invite...");
  const { json: accept } = await post("/invite/accept", {
    token,
    password: "Staff123!Pass",
  });
  if (!accept?.user_id) {
    console.error("Accept failed:", accept);
    process.exit(1);
  }
  console.log("✅ accept ok");

  console.log("Login as invited...");
  const { res: lres, json: login } = await post("/auth/login", {
    email: invited,
    password: "Staff123!Pass",
  });
  const invitedAccess = login.access_token as string;
  const invitedCookie = extractCookie(lres as any);
  if (!invitedAccess || !invitedCookie) {
    console.error("Login failed:", login);
    process.exit(1);
  }
  console.log("✅ login ok");

  console.log("Refresh...");
  const { json: refresh } = await post(
    "/auth/refresh",
    {},
    undefined,
    invitedCookie
  );
  if (!refresh?.access_token) {
    console.error("Refresh failed:", refresh);
    process.exit(1);
  }
  console.log("✅ refresh ok");

  console.log("Logout...");
  const { json: logout } = await post(
    "/auth/logout",
    {},
    invitedAccess,
    invitedCookie
  );
  console.log("✅ logout ok");

  console.log("All good ✅");
  child.kill("SIGTERM");
  process.exit(0);
})();
