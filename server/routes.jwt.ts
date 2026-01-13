import type { Express } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  orgInvite,
  inviteAccept,
  listPendingInvites,
  listAcceptedInvites,
  listNonRespondedInvites,
  withdrawInvite,
  loginLimiter,
  refreshLimiter,
} from "./controllers/authController";
import { auth, loadPermissions, can } from "./middleware/jwtAuth";
import { listRoles } from "./controllers/rbacController";

export function registerJwtRoutes(app: Express) {
  // Auth endpoints
  app.post("/api/auth/signup", loginLimiter, signup);
  app.post("/api/auth/login", loginLimiter, login);
  app.post("/api/auth/refresh", refreshLimiter, refresh);
  app.post("/api/auth/logout", auth(), logout);

  // Debug endpoint to check current context
  app.get("/api/debug/context", auth(), loadPermissions(), (req, res) => {
    return res.json({
      userId: req.ctx?.userId,
      orgId: req.ctx?.orgId,
      roles: req.ctx?.roles,
      permissions: req.ctx?.permissions,
      stores: req.ctx?.stores,
    });
  });

  // NOTE: Organization invite flow is handled in setupAuthRoutes (session-based)
  // These JWT-specific endpoints use Bearer token authentication
  app.post("/api/invite/accept", inviteAccept);
  app.get(
    "/api/org/invites/pending",
    auth(),
    loadPermissions(),
    can("users:manage"),
    listPendingInvites
  );
  app.get(
    "/api/org/invites/accepted",
    auth(),
    loadPermissions(),
    can("users:manage"),
    listAcceptedInvites
  );
  app.get(
    "/api/org/invites/non-responded",
    auth(),
    loadPermissions(),
    can("users:manage"),
    listNonRespondedInvites
  );
  app.delete(
    "/api/org/invites/:id",
    auth(),
    loadPermissions(),
    can("users:manage"),
    withdrawInvite
  );

  // RBAC helpers - just needs roles loaded, no permission check needed
  app.get("/api/rbac/roles", auth(), loadPermissions(), listRoles);
}
