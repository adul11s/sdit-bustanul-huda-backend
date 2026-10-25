# ADR-003: Data Layer — Prisma + PostgreSQL with Soft Deletes and Migrations

**Status:** Accepted
**Date:** 2026-10-25

## Context

The school data is highly relational (students ↞ guardians ↞ payments, teachers ↞ classes ↞ grades, audit logs). An earlier iteration used a SQLite file (`prisma/dev.db`) which blocked CI on PostgreSQL and made multi-writer operation unsafe. The schema also tracks records that must never physically disappear (financial records, student history).

## Decision

- **PostgreSQL + Prisma ORM** as the single data layer; access is centralized through PrismaClient setup in `server/src/core/database`, not raw SQL.
- **Versioned migrations** via `prisma/migrations/` (applied with `prisma migrate deploy`); CI applies them before seeding, so schema changes are reviewable SQL and reproducible.
- **Soft-delete convention** embedded in the schema header: never hard-delete; set `isDeleted = true` (with `deletedBy`), and every query filters `WHERE isDeleted = false`. Financial and student records survive even after "deletion".
- **Deterministic seed** (`prisma/seed.ts`, run by both local `npm run seed` and CI) so tests rely on a known dataset; demo credentials are documented in `.env.example`/README — real credentials are never committed.
- Tests run against a real database, not a mocked one: CI spins up a `postgres:16` service container and runs migrations + seed before the suite.

## Rejected alternatives

- Keeping SQLite: fine for a demo, but diverges from production, cannot run concurrently in CI properly, and lacks the enum/index features the schema relies on.
- Writing repositories over `pg` directly: duplicates what Prisma already types end-to-end.

## Consequences

- (+) One source of truth for schema + migration in git; CI proves migrations apply cleanly on empty Postgres.
- (−) Prisma client must be regenerated after schema edits (`npm run db:generate`) — handled in CI.
- (−) Soft deletes grow tables over time; cleanup is a future operational task, acceptable at school-scale data volumes.
- (−) Seeded database in CI is not reset per test file yet — the suite is written to be order-tolerant rather than transactionally isolated per test.

## Verification

- Local: `npm test` → 28/28 against the local Postgres/seed.
- CI: `.github/workflows/ci.yml` — `prisma migrate deploy` + seed on `postgres:16`, then typecheck + vitest; run #40169097288 green.
