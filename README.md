# SDIT Bustanul Huda - Backend

[![CI](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/workflows/ci.yml)

Backend API for SDIT Bustanul Huda school management system.

## Tech Stack

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Zod validation

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database (optional)
npm run db:seed

# Run development server
npm run dev

# Run in production
npm start
```

## API Endpoints

- `/api/auth` - Authentication
- `/api/admin` - Admin routes
- `/api/teacher` - Teacher routes
- `/api/student` - Student routes
- `/api/finance` - Finance routes
- `/api/homeroom` - Homeroom routes
- `/api/bulletins` - Bulletin routes
- `/api/exam` - Exam routes
- `/api/profile` - Profile routes
- `/api/calendar` - Calendar routes
- `/api/public` - Public routes

## Database

Uses PostgreSQL with Prisma ORM. Database schema is in `prisma/schema.prisma`.

## Deployment & Demo

**Status jujur: belum dideploy.** Percobaan deploy ke Vercel (`vercel deploy --prod`, deployment
`dpl_3a4BmemoUU1Cmx3oEg8eqEuf2eLp`) gagal pada build — Express/TS ini belum dipasang untuk
lingkungan serverless Vercel. Lebih penting lagi: aplikasi ini butuh database Postgres tersedia
publik (mis. Neon) yang belum disiapkan; kami tidak mau menaruh kredensial asli di kode atau
mengklaim URL yang tidak bisa dibuka reviewer.

**TODO: deploy menunggu hosting — CI bukti test.**

Bukti kualitas saat ini:
- [![CI](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/workflows/ci.yml) CI hijau: `prisma migrate deploy` + seed di Postgres 16 → strict `tsc` (0 error, 2 config) → 28/28 test API (vitest + supertest) — [run 40169398935](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/runs/40169398935).
- Skor dan kekurangan terdokumentasi di [`docs/quality-scorecard-backend.md`](docs/quality-scorecard-backend.md) dan [docs/adr/](docs/adr/).
