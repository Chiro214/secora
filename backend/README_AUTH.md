# 🔒 Secure Authentication Setup Guide

This backend now uses **PostgreSQL** (via Prisma) and **Redis** (via Upstash) for a production-ready authentication system.

## 1. Prerequisites

You need a PostgreSQL database and a Redis instance.
- **Render**: Create a PostgreSQL database and a Redis instance from the dashboard.
- **Local**: Install Postgres and Redis locally or use Docker.

## 2. Environment Variables (.env)

Add these to your `backend/.env` file:

```bash
# Database (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Redis (Upstash or local)
REDIS_URL="redis://default:password@host:6379"

# Security Secrets
JWT_SECRET="your-super-secret-long-key"
```

## 3. Setup Commands

Run these commands in the `backend` folder:

```bash
# 1. Install new dependencies
npm install

# 2. Initialize the Database Schema
# This creates the User table in your database
npx prisma db push

# 3. Generate the Prisma Client
npx prisma generate
```

## 4. Features Implemented

- **Account Locking**: Users are locked out for 15 minutes after 5 failed attempts.
- **Rate Limiting**: Redis tracks login attempts by IP to prevent brute-force.
- **Secure Password Storage**: Uses `bcrypt` (workflow is ready).
- **Graceful Error Handling**: Generic "Invalid credentials" messages to prevent user enumeration.

## 5. Deployment

When deploying to Render:
1. Add `DATABASE_URL` and `REDIS_URL` to your Environment Variables.
2. Update your **Build Command** to: `npm install && npx prisma generate`
3. Update your **Start Command** to: `node src/server.js` (or `npm start`)
