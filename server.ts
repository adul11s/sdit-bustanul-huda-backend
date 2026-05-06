import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

import authRoutes from './server/src/routes/auth.routes.js';
import adminRoutes from './server/src/routes/admin.routes.js';
import teacherRoutes from './server/src/routes/teacher.routes.js';
import studentRoutes from './server/src/routes/student.routes.js';
import financeRoutes from './server/src/routes/finance.routes.js';
import homeroomRoutes from './server/src/routes/homeroom.routes.js';
import bulletinRoutes from './server/src/routes/bulletin.routes.js';
import profileRoutes from './server/src/routes/profile.routes.js';
import examRoutes from './server/src/modules/exam/routes.js';
import publicRoutes from './server/src/routes/public.routes.js';
import calendarRoutes from './server/src/routes/calendar.routes.js';
import assignmentRoutes from './server/src/routes/assignment.routes.js';
import { errorHandler, notFoundHandler } from './server/src/middleware/errorHandler.js';
import { apiRateLimit } from './server/src/middleware/rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use('/api', apiRateLimit);

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/teacher', teacherRoutes);
  app.use('/api/student/assignments', assignmentRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/homeroom', homeroomRoutes);
  app.use('/api/bulletins', bulletinRoutes);
  app.use('/api/exam', examRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/public', publicRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portNum, () => {
    console.log(`🏫 SDIT Bustanul Huda API running on http://localhost:${portNum}`);
  });
}

startServer().catch(console.error);