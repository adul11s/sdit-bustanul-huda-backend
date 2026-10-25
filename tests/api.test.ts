import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server.js';
import prisma from '../server/src/utils/prisma.js';
import type { Role } from '../server/src/types/index.js';

let app: Express;

const ADMIN = 'admin@nurulislam.sch.id';
const TEACHER = 'dewi.permata@nurulislam.sch.id'; // plain TEACHER, no homeroom class
const HOMEROOM = 'budi.santoso@nurulislam.sch.id'; // HOMEROOM_TEACHER of class 1A
const STUDENT = 'siswa1@nurulislam.sch.id';
const FINANCE = 'finance@nurulislam.sch.id';
const PASSWORD = 'password123';

async function login(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${res.text}`);
  const cookie = res.headers['set-cookie']?.[0];
  return (Array.isArray(cookie) ? cookie[0] : cookie).split(';')[0];
}

/** One token of each role, logged in once (shared across tests). */
const tokens: Partial<Record<Role, string>> = {};
async function tokenFor(role: Role): Promise<string> {
  if (!tokens[role]) {
    const creds: Record<Role, string> = {
      ADMIN: ADMIN,
      TEACHER: TEACHER,
      HOMEROOM_TEACHER: HOMEROOM,
      STUDENT: STUDENT,
      FINANCE: FINANCE,
    };
    tokens[role] = await login(creds[role]);
  }
  return tokens[role] as string;
}

// A protected endpoint per role (the "gate" of that module)
const ROLE_ENDPOINTS: Record<Role, string> = {
  ADMIN: '/api/admin/users',
  TEACHER: '/api/teacher/subjects',
  HOMEROOM_TEACHER: '/api/homeroom/class',
  STUDENT: '/api/student/assignments',
  FINANCE: '/api/finance/invoices',
};
// Routes granted per module gate (derived from router.use(roleMiddleware([...]))):
// /api/admin: ADMIN · /api/teacher: TEACHER+HOMEROOM_TEACHER · /api/homeroom: HOMEROOM_TEACHER
// /api/student: STUDENT · /api/finance: FINANCE+ADMIN
const ROLES = ['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE'] as const;
const ALLOWED_AT: Record<string, string[]> = {
  '/api/admin/users': ['ADMIN'],
  '/api/teacher/subjects': ['TEACHER', 'HOMEROOM_TEACHER'],
  '/api/homeroom/class': ['HOMEROOM_TEACHER'],
  '/api/student/assignments': ['STUDENT'],
  '/api/finance/invoices': ['FINANCE', 'ADMIN'],
};

beforeAll(async () => {
  app = createApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth: login', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ email: ADMIN, role: 'ADMIN' });
    expect(res.headers['set-cookie']?.[0]).toContain('token=');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@nurulislam.sch.id', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed payload with 400 (validation middleware)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
  });
});

describe('authorization middleware: five roles', () => {
  for (const role of ROLES) {
    it(`${role} is accepted at its own module gate`, async () => {
      const token = await tokenFor(role);
      const res = await request(app).get(ROLE_ENDPOINTS[role]).set('Cookie', token);
      expect(res.status).toBe(200);
    });

    it(`${role} gets 403 on other roles' protected endpoints`, async () => {
      const token = await tokenFor(role);
      for (const other of ROLES) {
        if (other === role) continue;
        const res = await request(app).get(ROLE_ENDPOINTS[other]).set('Cookie', token);
        // Some modules intentionally share gates (supplier: finance/teacher); only assert
        // 403 when this role is genuinely not allowed there.
        if (!ALLOWED_AT[ROLE_ENDPOINTS[other]].includes(role)) {
          expect(res.status, `${role} -> ${other}:${ROLE_ENDPOINTS[other]}`).toBe(403);
        } else {
          expect(res.status, `${role} -> ${other}:${ROLE_ENDPOINTS[other]}`).toBe(200);
        }
      }
    });

    it('requests with no token get 401', async () => {
      const res = await request(app).get(ROLE_ENDPOINTS[role]);
      expect(res.status).toBe(401);
    });
  }
});

describe('CRUD flow: admin users', () => {
  const email = `crud.test.${Date.now()}@test.local`;
  let userId: string;

  it('creates a user (POST /api/admin/users)', async () => {
    const token = await tokenFor('ADMIN');
    const res = await request(app)
      .post('/api/admin/users')
      .set('Cookie', token)
      .send({ email, password: 'Testpass123', name: 'CRUD Test User', role: 'STUDENT', gender: 'MALE' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    userId = res.body.data.id;
    expect(userId).toBeTruthy();
    expect(res.body.data.email).toBe(email);
  });

  it('lists users including the new one (GET /api/admin/users)', async () => {
    const token = await tokenFor('ADMIN');
    const res = await request(app).get('/api/admin/users?limit=100').set('Cookie', token);
    expect(res.status).toBe(200);
    const emails = res.body.data.map((u: { email: string }) => u.email);
    expect(emails).toContain(email);
  });

  it('updates the user (PUT /api/admin/users/:id)', async () => {
    const token = await tokenFor('ADMIN');
    const res = await request(app).put(`/api/admin/users/${userId}`).set('Cookie', token).send({ name: 'CRUD Updated User' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('CRUD Updated User');
  });

  it('soft-deletes the user (DELETE /api/admin/users/:id)', async () => {
    const token = await tokenFor('ADMIN');
    const res = await request(app).delete(`/api/admin/users/${userId}`).set('Cookie', token);
    expect(res.status).toBe(200);

    const db = await prisma.user.findUnique({ where: { id: userId } });
    expect(db?.isActive).toBe(false);
  });
});

describe('homeroom attendance: upsert + read', () => {
  let teacherToken: string;
  let studentId: string;
  const date = '2026-10-25';
  const targetDate = new Date(2026, 9, 25);
  targetDate.setHours(0, 0, 0, 0);

  beforeAll(async () => {
    teacherToken = await tokenFor('HOMEROOM_TEACHER');
    const res = await request(app).get(`/api/homeroom/attendance?date=${date}`).set('Cookie', teacherToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    studentId = res.body.data[0].id;
  });

  it('POST /api/homeroom/attendance lets a STUDENT role in be rejected (403)',
    async () => {
      const token = await tokenFor('STUDENT');
      const res = await request(app)
        .post('/api/homeroom/attendance')
        .set('Cookie', token)
        .send({ date, records: [{ studentId, status: 'PRESENT' }] });
      expect(res.status).toBe(403);
    });

  it('records attendance for the first student in the homeroom class', async () => {
    const res = await request(app)
      .post('/api/homeroom/attendance')
      .set('Cookie', teacherToken)
      .send({ date, records: [{ studentId, status: 'PRESENT', note: 'on time' }] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].status).toBe('PRESENT');

    const saved = await prisma.attendance.findUnique({
      where: { studentId_date: { studentId, date: targetDate } },
    });
    expect(saved?.status).toBe('PRESENT');
    expect(saved?.note).toBe('on time');
  });

  it('upserts (creates only once, then updates the same record)', async () => {
    const res = await request(app)
      .post('/api/homeroom/attendance')
      .set('Cookie', teacherToken)
      .send({ date, records: [{ studentId, status: 'ABSENT', note: null }] });
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBeTruthy();

    const saved = await prisma.attendance.findUnique({
      where: { studentId_date: { studentId, date: targetDate } },
    });
    expect(saved?.status).toBe('ABSENT');
    expect(saved?.id).toBe(res.body.data[0].id);
  });

  it('GET /api/homeroom/attendance returns the stored record', async () => {
    const res = await request(app).get(`/api/homeroom/attendance?date=${date}`).set('Cookie', teacherToken);
    expect(res.status).toBe(200);
    const target = res.body.data.find((s: { id: string }) => s.id === studentId);
    expect(target).toBeTruthy();
    expect(target.attendances).toHaveLength(1);
    expect(target.attendances[0].status).toBe('ABSENT');
  });

  it('rejects students from other classes', async () => {
    const classRes = await request(app).get('/api/homeroom/class').set('Cookie', teacherToken);
    const myClassId: string = classRes.body.data.id;
    const other = await prisma.student.findFirst({ where: { classId: { not: myClassId } } });
    if (!other) return; // single-class seed only
    const res = await request(app)
      .post('/api/homeroom/attendance')
      .set('Cookie', teacherToken)
      .send({ date, records: [{ studentId: other.id, status: 'PRESENT' }] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
