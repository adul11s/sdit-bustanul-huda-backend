# ADR-001: Architecture — Modular Monolith on Express + Prisma

**Status:** Accepted
**Date:** 2026-10-25

## Context

SDIT Bustanul Huda is a single school with a handful of staff. The backend must cover auth, admin, teacher, student, finance, homeroom, bulletin, exam, calendar, and public endpoints, and it will be maintained by one part-time developer. Microservices would multiply deployment, migration, and debugging cost for zero benefit at this scale.

## Decision

Keep a **modular monolith**:

- Single Express process (`server.ts`) as the entry point.
- Route layer (`server/src/routes/*.routes.ts`) assembles routers per domain; each route gates access with `auth` middleware plus role/ownership middlewares (`middleware/auth.ts`, `middleware/ownership.ts`).
- Business logic lives in typed service classes (`server/src/services/*.service.ts`) and domain modules (`server/src/modules/*`) — route handlers stay thin.
- All persistence goes through **Prisma** (`server/src/core/database`), with PostgreSQL as the primary store. Cross-cutting concerns (audit logging, rate limiting, Zod validation, centralized error handling) are Express middleware: `middleware/audit.ts`, `middleware/rateLimit.ts`, `middleware/validation.ts`, `middleware/errorHandler.ts`.
- Shared types live in `server/src/types` and `server/src/core/types`; internal error handling is centralized in `server/src/core/utils/errors.ts`.

An earlier fully hierarchical `modules/<domain>/{routes,controllers,repositories,services}` layout was collapsed into routes + services to reduce per-domain boilerplate; the interim layers technically existed but added indirection without behavior.

## Consequences

- (+) One deployable, one migration pipeline, one test suite (`tests/api.test.ts`, supertest against the app).
- (+) Domain boundaries still visible via routes/services, so extraction later is possible.
- (−) A bug in one domain can take down the whole API — mitigated by centralized `errorHandler`.
- (−) No horizontal per-domain scaling; irrelevant at current school size.

## Verification

- Typecheck strict on both configs: `npx tsc -p tsconfig.server.json --noEmit` and `npx tsc --noEmit` → 0 errors.
- `npm test` (vitest + supertest) → 28/28 passing locally and on CI with a real Postgres service container (`.github/workflows/ci.yml`).
