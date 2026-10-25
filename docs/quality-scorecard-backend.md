# Quality Scorecard — sdit-bustanul-huda-backend

**Tanggal review:** 2026-10-25
**Bukti utama:** CI run [40169097288](https://github.com/adul11s/sdit-bustanul-huda-backend/actions/runs/40169097288), commit `4d136db`.

| Dimensi | Bobot | Skor | Bukti |
|---|---|---|---|
| Narasi masalah | 10% | 8 | README: school management (SSO admin/teacher/student/finance/homeroom) untuk sekolah nyata; narasi singkat, bukan studi kasus mendalam |
| Demo & reproduksibilitas | 15% | 7 | README quickstart (`cp .env.example`, seed, dev); **Dockerfile/compose: belum ada** — reproduksi butuh Postgres lokal |
| Kebenaran & test | 20% | 8 | `tests/api.test.ts` 28 test API (supertest) hijau lokal + CI dengan Postgres service; belum ada k6/load test, test tidak terisolasi transaksional per test |
| Arsitektur & keputusan | 15% | 8 | ADR-001/002/003 di `docs/adr/`; modular monolith, JWT+roles, Prisma+migrations; diagram belum dibuat |
| Keamanan | 10% | 8 | JWT + `requireRole` + ownership middleware, rate limit login, audit log ke tabel `AuditLog`, Zod input validation; threat-model.md belum ditulis, token revocation belum selesai |
| Operasional | 10% | 6 | CI pipeline (migrate+seed+tsc+test); belum ada metrics endpoint, alerting, atau runbook; **deploy: TODO — menunggu hosting, CI sebagai bukti test** |
| Kerapian kode | 10% | 9 | TypeScript `strict` dua config (root + server), 0 error tsc; lapisan modules duplikat dirapikan di commit 4d136db |
| Presentasi | 10% | 7 | README jelas dan berstruktur; belum ada GIF/demo video (API-only, koordinasi dengan frontend) |

**Total:** 7.55 / 10

**Known gaps (jujur):**
- Dockerfile/docker-compose belum ada → demo lokal mensyaratkan Postgres terpasang.
- Belum dideploy: `vercel` belum memungkinkan project/scope untuk backend ini. **TODO: deploy menunggu hosting — CI bukti test.**
- Tidak ada metrics/observability dan runbook insiden.
- Test suite 28 test, fokus alur API + otorisasi; belum: concurrency, isolation per test, load benchmark.

**Target berikutnya:** Dockerfile + compose (demo rate → 9), deploy + metrics endpoint (operasional → 8).
