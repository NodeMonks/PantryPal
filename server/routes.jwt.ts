import type { Express } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  orgInvite,
  inviteAccept,
  loginLimiter,
  refreshLimiter,
} from "./controllers/authController";
import { auth, loadPermissions, can } from "./middleware/jwtAuth";
import { listRoles } from "./controllers/rbacController";

export function registerJwtRoutes(app: Express) {
  // Auth endpoints
  app.post("/auth/signup", loginLimiter, signup);
  app.post("/auth/login", loginLimiter, login);
  app.post("/auth/refresh", refreshLimiter, refresh);
  app.post("/auth/logout", auth(), logout);

  // Organization invite flow
  app.post(
    "/org/invite",
    auth(),
    loadPermissions(),
    can("users:manage"),
    orgInvite
  );
  app.post("/invite/accept", inviteAccept);

  // RBAC helpers
  app.get(
    "/rbac/roles",
    auth(),
    loadPermissions(),
    can("roles:assign"),
    listRoles
  );
}
