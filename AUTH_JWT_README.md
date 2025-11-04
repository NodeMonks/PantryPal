# JWT Auth + RBAC + Multi-tenant Org System

This adds a production-grade authentication and authorization layer alongside the existing session-based auth. It includes:

- Access + Refresh JWT tokens with rotation
- Refresh tokens stored hashed in `sessions` table (revocation supported)
- Org + Store multi-tenancy tables
- Roles, Permissions, Role->Permission mapping
- Role assignment scoped to org and optional store
- Invite-only onboarding flow
- Rate limiting, Helmet, CORS, secure cookies
- Zod validation
- Audit logs for sensitive actions

## Endpoints

- POST `/auth/signup` — create a new org and set the requester as admin (assumption)
- POST `/auth/login` — email/password, returns `{ access_token }` and sets httpOnly refresh cookie
- POST `/auth/refresh` — rotates refresh token, returns new `{ access_token }`
- POST `/auth/logout` — revokes current refresh session and clears cookie
- POST `/org/invite` — create invite (requires `users:manage` permission)
- POST `/invite/accept` — accept invite with token and set password

## Middleware

- `auth()` — verifies access JWT, sets `req.ctx = { userId, orgId }`
- `loadPermissions()` — loads permissions and store scopes from DB
- `can(permission, storeId?)` — checks permission + optional store scope

## Environment

Add to `.env`:

```bash
JWT_ACCESS_SECRET=your-32-byte-secret
JWT_REFRESH_SECRET=your-32-byte-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
REFRESH_COOKIE_NAME=pp_rt
PASSWORD_PEPPER=optional-extra-secret
REFRESH_TOKEN_PEPPER=optional-extra-secret
COOKIE_DOMAIN=your.domain.com
APP_BASE_URL=http://localhost:5000
BCRYPT_COST=12
```

## Schema & Seeds

- SQL schema: `server/sql/schema.sql`
- Seed roles & permissions: `server/sql/seed_roles_permissions.sql`

The same tables are also defined via Drizzle in `shared/schema.ts`.

## Notes

- Self-registration does NOT allow choosing roles. The signup endpoint is assumed to create a new org and admin user.
- Normal users join via invites created by org admins. The invite encodes role and optional store scope.
- Existing session-based endpoints (`/api/auth/*`) continue to work; new JWT flow is opt-in.
- In production, lock down CORS to trusted origins and enable HTTPS so `Secure` cookies are set.

## Quick Test

1. Start the server (`npm run dev`).
2. POST `/auth/signup` with `{ email, password }`.
3. Use returned `access_token` as `Authorization: Bearer ...`.
4. POST `/org/invite` with `{ org_id, email, role_id }`.
5. POST `/invite/accept` with `{ token, password }`.
6. POST `/auth/login` with invited user's creds.
7. POST `/auth/refresh` to rotate tokens.

Audit entries are recorded in `audit_logs` for login/logout/signup/invite.
