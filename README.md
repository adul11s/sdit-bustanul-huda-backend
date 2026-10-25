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