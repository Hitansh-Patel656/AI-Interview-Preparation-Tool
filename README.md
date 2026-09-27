# AI Interview Preparation Tool

An AI-powered interview preparation platform with a hybrid database architecture:
- **PostgreSQL** — structured relational data (users, scores, outcomes, metric history)
- **MongoDB** — session and transcript data (interview sessions, questions, answers)

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 20    |
| npm         | ≥ 10    |
| PostgreSQL  | ≥ 18    |
| MongoDB     | ≥ 8     |

---


## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your values:

| Variable          | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `MONGO_URI`       | Yes      | MongoDB connection string                        |
| `JWT_SECRET`      | Yes      | Secret key for signing JWTs                      |
| `JWT_EXPIRES_IN`  | No       | Access token lifetime (default: `1h`)            |
| `REFRESH_EXPIRES_IN` | No    | Refresh token lifetime (default: `7d`)           |
| `DATABASE_URL`    | Yes*     | PostgreSQL connection string (preferred)         |
| `PGHOST`          | Yes*     | PostgreSQL host (if not using `DATABASE_URL`)    |
| `PGPORT`          | No       | PostgreSQL port (default: `5432`)                |
| `PGDATABASE`      | Yes*     | PostgreSQL database name                         |
| `PGUSER`          | Yes*     | PostgreSQL user                                  |
| `PGPASSWORD`      | Yes*     | PostgreSQL password                              |
| `DATABASE_SSL`    | No       | Set `true` for remote/cloud PostgreSQL           |

\* Either `DATABASE_URL` **or** the individual `PG*` variables are required.

### 3. Run PostgreSQL migrations

```bash
cd backend
npm run db:migrate
```

### 4. Start the server

```bash
cd backend
npm run dev
```

---

## Verify Connectivity

Once the server is running, check database health at:

```
GET http://localhost:5000/api/health
```

Example response when both databases are connected:

```json
{
  "status": "ok",
  "timestamp": "2026-09-27T06:00:00.000Z",
  "postgresql": "connected",
  "mongodb": "connected"
}
```

---

## Project Structure

```
backend/
  app.js                          Entry point
  config/
    db.js                         MongoDB connection
    postgres.js                   PostgreSQL connection pool
  database/
    migrate.js                    Migration runner
    migrations/
      0001_initial_schema_foundation.sql
  controllers/                    Route handlers
  middleware/                     Auth + upload middleware
  models/                         Mongoose schemas (MongoDB)
  routes/                         Express route definitions
  .env.example                    Environment variable template
  package.json
```