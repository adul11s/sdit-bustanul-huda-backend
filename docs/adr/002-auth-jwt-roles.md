# ADR-002: Authentication — JWT with Role-Based Authorization

**Status:** Accepted
**Date:** 2026-10-25

## Context

The API serves five distinct roles (Prisma `Role` enum: `ADMIN`, `TEACHER`, `HOMEROOM_TEACHER`, `STUDENT`, `FINANCE`). Sensitive data (payments, grades, personal data of minors) must not leak across role boundaries, and the app must run behind an ordinary Node host without a dedicated identity provider.

## Decision

- **Stateless JWT** bearer tokens issued by `services/auth.service.ts` and verified in `middleware/auth.ts`; signing secret comes from `JWT_SECRET` (required — CI supplies `JWT_SECRET: ci-test-secret`).
- **Role authorization at the route layer**: sensitive routers (`admin`, `teacher`, `finance`, `homeroom`) mount `requireRole(...)` middleware before their handlers; per-resource checks use `middleware/ownership.ts`.
- **Rate limiting on auth** via `middleware/rateLimit.ts` (brute-force mitigation; CI raises the cap via `AUTH_RATE_LIMIT_MAX=2000` so the 28-test suite is not throttled).
- **Security-relevant actions are audited** through `middleware/audit.ts` writing to the `AuditLog` table.
- Passwords stored hashed (bcrypt); no plaintext comparison anywhere.
- Tests cover authorization: `tests/api.test.ts` asserts unauthenticated requests are rejected and role-restricted endpoints are off-limits to wrong roles.

## Rejected alternatives

- Session cookies + server-side session store: better revocation story but requires sticky state and complicates the pure Node deployment; acceptable trade-off for a school with a handful of staff.
- Third-party IdP (Auth0/Cognito): paid dependency for a small school's internal tool.

## Consequences

- (+) No session table, horizontally scalable, works behind any reverse proxy.
- (−) Token revocation before expiry is limited (not solved here — secret rotation is the manual lever). Documented as a known gap in the quality scorecard.
- (−) JWT in localStorage is XSS-exposed; mitigate with strict output validation (Zod) and no inline HTML rendering.

## Verification

- `npm test` → 28/28 (auth + authorization cases included).
- CI green with `JWT_SECRET` set: run [40169398935](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/runs/40169398935).
