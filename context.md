Architecture Context for Multi-Tenant Retail Inventory & Billing SaaS
System Intent & Constraints
Purpose: Provide a cloud-hosted SaaS app for small retail businesses to manage inventory and billing. Each tenant is one retailer organization (no separate store‑IDs). The system must feel like each tenant has its own isolated environment
workos.com
.
Tenancy Model: Shared application runtime and database schema (initially) with strict org-level isolation. Each data record carries an org_id and all queries are scoped by it (a WorkOS “first-class tenancy” model)
workos.com
workos.com
. This means every piece of data belongs to exactly one tenant, and every request enforces that org context
workos.com
.
Tech Stack: Frontend is React + TypeScript + Tailwind CSS, built with Vite. Backend is Node.js + Express. We use Drizzle ORM for type-safe Postgres access on Neon (serverless Postgres). Local development uses Neon branches; production on Render with CI/CD. Frontend caches key data in IndexedDB (per-org database) for offline support and performance. Observability uses Sentry for error tracking and performance.
Data and Soft-Delete: Tables include an is_active flag (boolean) for soft deletion
surajsinghbisht054.medium.com
. Records are never physically removed, only marked inactive. All queries default to filtering is_active = true. This preserves history for audit/compliance
surajsinghbisht054.medium.com
while allowing occasional hard-delete cleanup offline.
Tenant Isolation & Data Model
Tenant as First-Class: Implement multi-tenancy such that logical isolation is guaranteed at the application level
workos.com
. In practice: every request handler must determine the current tenant (e.g. from auth token or subdomain) and include that org_id in all operations. No user should ever see data from another org.
Data Partitioning: We start with a shared-schema approach: one database with tables tagged by org_id
workos.com
. This is simplest for SMB SaaS (fast onboarding, low infra overhead
workos.com
). All tables that contain tenant-specific data include an org_id foreign key, and all relevant indexes and unique constraints are composite on (org_id, id)
workos.com
workos.com
. (For scale, we could later migrate high-value tenants to separate Neon projects per-customer for maximum isolation
neon.com
.)
Data Models (Examples):
Tenant/Organization: id (UUID PK), name, created_at.
User: id, email, password_hash; users can belong to multiple orgs via a membership table
workos.com
.
Customer, Product, InventoryStock, Bill, BillItem, etc.: Each has an org_id column. Soft-delete by is_active. (E.g. deleting a product sets is_active = false
surajsinghbisht054.medium.com
.)
Stock Transactions: We track inventory changes (purchases/restocks/sales) in history tables, but also maintain a current_stock field on each product or stock record for quick lookup (see Design Decisions).
Invariant Rules
Immutability of Finalized Bills: Once a bill/invoice is “final” (e.g. marked paid or issued), it must never be edited or deleted
requests.whmcs.com
. This follows standard accounting practice: invoices are legal documents and must remain immutable for auditing
requests.whmcs.com
. (Corrections are handled by issuing a new credit-note bill referencing the original.)
Stock Conservation: Stock levels must be conserved. Stock should never go negative. Whenever an inventory or sale operation adjusts stock, the system must validate that sufficient stock exists first. The sum of restocks plus initial quantity must always equal current stock plus all issued quantities. Business logic in services enforces these rules.
Tenant Boundaries: All data queries implicitly (or explicitly via ORM) include WHERE org_id = currentOrg. Failing to do so is a critical bug (data leak). Following WorkOS guidelines, treat the tenant ID as required and indexed on every row
workos.com
.
Soft-Delete Scope: All repository methods should exclude is_active = false items by default. (E.g. getProducts() returns only active products.) This enforces “deleted” items are invisible unless explicitly querying historical data.
RBAC (Role-Based Access): We have scaffolded roles (e.g. Admin, Manager, Cashier), but full implementation is pending. For now, enforce only basic restrictions: e.g. only Admins can delete (soft-delete) data or close periods. All endpoints still expect a valid authenticated user in the tenant context.
Architecture & Folder Structure
Backend (Node/Express): Follow a “clean” layered structure
medium.com
. For example:
backend/
src/
controllers/ # Express route handlers (parsing requests, sending responses)
services/ # Domain/business logic and use-cases
repositories/ # Drizzle ORM queries for DB access
models/ # TypeScript data models and validation schemas (DTOs)
middleware/ # Auth, tenant-context, error-handling
db/ # Database connection, migrations
config/ # Environment configuration (e.g. Sentry, DB URL)
app.ts # Express app setup and route binding
Controllers map HTTP requests to service methods. Services enforce business rules (stock calculations, billing logic, invoicing rules) independent of HTTP. Repositories (data layer) contain only database operations (CRUD using Drizzle) and take org_id from context. This clear separation (no business logic in controllers) improves testability
medium.com
.
Frontend (React + Vite): Structure by feature/domain. For example:
frontend/
src/
components/ # Reusable UI components
pages/ # Route-based page components
features/ # Context/store and UI for each feature (Inventory, Billing, Customers, etc.)
api/ # Functions to call backend REST API (using fetch/axios)
hooks/ # Custom React hooks (e.g. useAuth, useIndexedDB)
utils/ # Helper functions (date formatting, QR scanner logic)
styles/ # Tailwind config, global styles
index.tsx # App entry and routing
State & Caching: Authentication state (JWT, current user/org) is global. Inventory and recent data are cached in IndexedDB (via a library like Dexie) keyed by org_id. This enables offline operation and reduces reload latency. Cached data automatically expires or refreshes on login.
Styling: Use Tailwind classes in components. Keep design consistent (theme/colors configured centrally).
API, Domain & Repository Boundaries
API (HTTP Endpoints): Define RESTful endpoints (e.g. POST /org/:orgId/bill, GET /org/:orgId/products, etc.). All routes require an authenticated user with their org_id. A tenant-auth middleware ensures the request is tagged with req.orgId.
Controllers: Handle request validation (using e.g. Zod schemas), call service layer, and return JSON responses or errors. Controllers should not contain business logic (just glue code)
medium.com
medium.com
.
Domain/Services: Encapsulate core logic. For example, a BillingService finalizes a bill: it verifies stock availability, decrements stock, creates immutable bill records, and records payment. Services enforce all invariants (stock never negative, bill locked) and throw errors if violated. They orchestrate multiple repositories (e.g. update stock table + insert bill row) in a transaction. All domain logic is org-scoped (passed the current org_id).
Repositories (Data Layer): Use Drizzle ORM to perform database operations. These should only query or mutate data; they do not enforce business rules. For example, ProductRepository.updateStock(orgId, productId, delta) just adjusts quantity. Repositories add org_id = ? filters on queries. All raw SQL or ORM code lives here. This aligns with clean architecture: “data access layer” separate from business logic
medium.com
.
Models/DTOs: Define TypeScript interfaces or classes for domain entities (e.g. Product, Bill). Use these for type safety across layers and for validating inputs/outputs. Do not mix persistence models with business logic; use simple data shapes or classes.
Testing Strategy
Unit Tests: Write unit tests for all business logic in services and for utility functions. For example, test that creating a bill decreases stock correctly and throws if stock is insufficient (validating the stock invariant). Use a testing framework (Jest or similar). Also unit-test controllers (mocking services) to ensure correct HTTP status codes and error handling.
Integration Tests: Test full request flows against a test database. For example, spin up the Express app (or run against a test DB schema), then use a tool like Supertest to POST /billing or GET /inventory. Verify end-to-end behavior, including DB state. Use Neon’s branching or a local Postgres for isolated test DBs.
Multi-Tenant Tests: Specifically test tenant isolation. Create two organizations with similar data and assert that queries for org A never leak org B’s data. For example, after adding a product to Org A, verify that a user of Org B cannot fetch it.
Invariant Tests: Write tests to assert all invariants: bills cannot be edited after finalization; stock cannot go negative; soft-deleted items do not appear in queries. For example, simulate a finalize-bill call and then attempt an update – expect failure. These prevent regressions on critical rules.
Coverage and CI: Aim for high coverage on critical code (services, controllers). Run tests automatically in CI (Render pipeline or GitHub Actions). Fail the build on any unit or integration test failure.
Database Migrations
Migration System: Use Drizzle’s migration tooling. Keep all schema changes in versioned SQL/TS files under db/migrations/. Review changes carefully: prefer additive migrations (adding columns/tables) over destructive ones.
Tenant Considerations: If using a single schema, simply run migrations once. If using separate databases (Neon project per org), each org’s DB must be migrated. We may automate this by running migrations at each deployment or on-the-fly per-tenant (as shown in community examples
medium.com
). Always maintain a migrations table (e.g. \_\_drizzle_migrations) to track applied versions per DB.
Safety: Never perform destructive operations on production data without review. For example, avoid dropping or renaming columns directly; instead create new columns, migrate data, then deprecate old. Always back up data (Neon offers automated PITR per database). Use Neon branching for dev/staging: create a branch of production, run migrations there first
neon.com
, then merge to main.
Observability & Logging
Error Tracking (Sentry): Integrate Sentry SDK in backend. Capture uncaught exceptions and promise rejections
dev.to
. In each request, set Sentry context/tags: include orgId, userId, and the endpoint path. This allows filtering errors by tenant or feature. Log stack traces and error details in Sentry, but scrub PII (never log full credit card or sensitive user data).
Structured Logging: Use a consistent logger (e.g. Winston or Pino in JSON mode). Log at levels: info for major events (e.g. user logged in, bill created), warn for unusual conditions (low stock warning), and error for failures. Include context fields (timestamp, org_id, user_id, request_id, feature). Don’t log sensitive payloads (payment data, full customer info). For example, log billing amounts but not full credit card numbers.
Metrics & Alerts: Optionally emit metrics (count of bills created, request durations). Tag metrics by org or route. Use Sentry’s performance monitoring for HTTP latency or database spans.
Frontend Errors: Optionally initialize Sentry in React. Capture JS errors or API failures, tagging them with org/user context. This helps debug customer-side issues.
Copilot Safety Zones
Safe for AI to Modify: Boilerplate and scaffolding code, such as creating new controllers for CRUD resources, generating unit test templates, writing simple Redux/Context hooks, or updating CSS classes in components. Generating or refactoring non-critical helper functions (formatters, validators) is also safe, as long as it follows existing patterns. Copilot can add new UI pages, popovers, or similar, respecting established component conventions.
Restricted/Critical Zones: Core business logic and invariants should not be changed without review. For example, code that updates stock or finalizes a bill embodies important rules and legal constraints (immutability of invoices). Authorization middleware and any security-related code (authentication, JWT handling, password hashing) are critical – Copilot should not alter these. Database schema definitions and migrations are sensitive: Copilot can propose new fields, but human oversight is needed before applying. Also, the is_active handling logic and multi-tenant filters are fundamental – AI should not remove or change them. In general, treat any change to existing data rules or security checks as out-of-scope for auto-modification.
Design Decision Rationale
Stock Tracking (Derived vs. Stored): We store a current stock value per product, updated on each sale or restock, rather than computing it from a log every time. This makes reads fast (no heavy SUM() queries) and simplifies enforcement of "never negative" (we check before decrement)
stackoverflow.com
. The trade-off is we must carefully update stock on every transaction (in the same DB transaction). As one expert notes, maintaining stock via a trigger (or application logic) “makes it really easy to see what the current quantity is”
stackoverflow.com
. We avoid performance degradation of summing many rows at runtime. (All stock mutations happen in services, with DB transactions to keep data consistent.)
Soft-Delete: We use soft delete (is_active) to retain history and avoid data loss
surajsinghbisht054.medium.com
. This is important for audit trails: e.g. knowing that an item was deleted by a user. Soft-deleting is reversible and safer than hard delete
surajsinghbisht054.medium.com
. Queries automatically exclude inactive rows, so to the UI the record “disappears”, but the DB still holds it. We document that any code reading data must include the active filter.
Immutable Billing: As per accounting best-practice, once a bill is marked paid/issued we never allow edits
requests.whmcs.com
. Instead, corrections are new bills or credit notes. This design is mandated by legal norms (in many jurisdictions, altering a finalized invoice is illegal
requests.whmcs.com
). Implementing this invariant avoids hidden chargebacks and simplifies audits.
Multi-Tenant Isolation: We start with a shared-schema model (common for small SaaS) because it’s efficient to develop and scale
workos.com
. However, we keep our code tenant-aware so we could migrate to a more isolated setup later. In fact, Neon’s documentation highlights that a “project-per-customer” (one DB per tenant) model gives complete data isolation and ease of compliance
neon.com
. If we grow large, we could automate creating a separate Neon project/db for each retailer. For now, we enforce isolation in the application as WorkOS recommends
workos.com
.
RBAC Approach: We’ve designed roles (Admin, Staff, etc.) for access control. Currently the checks are minimal (any authenticated user can do most things). In future iterations, we’ll tighten this. Copilot should be aware: adding new API actions should respect user roles (e.g. only Admin can delete), so it’s safer to let a human implement detailed permission logic.
This context document provides the architectural rules, folder layout, and constraints for the system. It should guide code generation and refactoring so that any AI-assisted changes maintain the design integrity, data invariants, and security of the multi-tenant inventory/billing platform. All code and tests should comply with these specifications and cite the constraints above when making changes. Sources: Best practices and principles from multi-tenant SaaS design
workos.com
workos.com
, inventory system design
stackoverflow.com
, accounting standards
requests.whmcs.com
, soft-delete usage
surajsinghbisht054.medium.com
, clean architecture patterns
medium.com
, and observability recommendations
dev.to
.
Citations

The developer’s guide to SaaS multi-tenant architecture — WorkOS

https://workos.com/blog/developers-guide-saas-multi-tenant-architecture

The developer’s guide to SaaS multi-tenant architecture — WorkOS

https://workos.com/blog/developers-guide-saas-multi-tenant-architecture

Understanding Soft Delete and Hard Delete in Software Development: Best Practices and Importance | by Suraj Singh Bisht | Medium

https://surajsinghbisht054.medium.com/understanding-soft-delete-and-hard-delete-in-software-development-best-practices-and-importance-539a935d71b5

The developer’s guide to SaaS multi-tenant architecture — WorkOS

https://workos.com/blog/developers-guide-saas-multi-tenant-architecture

The developer’s guide to SaaS multi-tenant architecture — WorkOS

https://workos.com/blog/developers-guide-saas-multi-tenant-architecture

neon.com

https://neon.com/docs/guides/multitenancy
WHMCS Feature Requests - Prevent invoices from being changed

https://requests.whmcs.com/idea/prevent-invoices-from-being-changed

Building Real CLEAN Architecture: A Practical Guide for Node.js Developers | by Jim Livingston | Medium

https://medium.com/@trkbrkr2000/building-real-clean-architecture-a-practical-guide-for-node-js-developers-cfde6c066580

Building Real CLEAN Architecture: A Practical Guide for Node.js Developers | by Jim Livingston | Medium

https://medium.com/@trkbrkr2000/building-real-clean-architecture-a-practical-guide-for-node-js-developers-cfde6c066580

Schema-based Multi-Tenancy with Drizzle ORM | by vimulatus | Medium

https://medium.com/@vimulatus/schema-based-multi-tenancy-with-drizzle-orm-6562483c9b03

neon.com

https://neon.com/docs/guides/multitenancy

Observability Practices with Sentry: Tracking - DEV Community

https://dev.to/ximena_andreaortizferna/observability-practices-with-sentry-tracking-i85

coldfusion - inventory system: transaction-based or store quantity, update with trigger? - Stack Overflow

https://stackoverflow.com/questions/5340368/inventory-system-transaction-based-or-store-quantity-update-with-trigger

Understanding Soft Delete and Hard Delete in Software Development: Best Practices and Importance | by Suraj Singh Bisht | Medium

https://surajsinghbisht054.medium.com/understanding-soft-delete-and-hard-delete-in-software-development-best-practices-and-importance-539a935d71b5
All Sources

workos

surajsin...54.medium

neon
requests.whmcs

medium

dev

stackoverflow
