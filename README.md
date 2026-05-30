# Express + TypeScript + CQRS + Prisma

## Overview

This project is a **backend template** built with:

- Node.js + Express
- TypeScript
- PostgreSQL (via Prisma ORM)
- CQRS (Command Query Responsibility Segregation)
- Layered architecture (Controller → Handler → Service → Repository)

It is designed as a **scalable, production-ready foundation** for building APIs with clean separation of concerns and testability.

---

## Architecture

This template follows a **layered CQRS architecture**:

### Write flow (Commands)

Controller → Command → CommandHandler → Service → Repository → Prisma → PostgreSQL

### Read flow (Queries)

Controller → Query → QueryHandler → Service → Repository → Prisma → PostgreSQL

---

## Project Structure

```
src/
  app.ts
  server.ts

  config/
    env.ts

  infrastructure/
    db/
      prisma.ts

  shared/
    core/
      buses/
        command-bus.ts
        query-bus.ts
      errors/
        app-error.ts
      types/
        request-with-user.ts
    middleware/
      error-handler.ts
      not-found.ts

  modules/
    departments/
      application/
        commands/
        queries/
        handlers/
      services/
      domain/
      infrastructure/
      presentation/

tests/
  unit/
  integration/

prisma/
  schema.prisma
```

---

## Key Concepts

### CQRS

- Commands → modify state
- Queries → read data
- Handlers execute business logic via services

### Services

Contain business logic and validation.

### Repositories

Abstract database access using Prisma.

### Prisma

Handles database schema, migrations, and queries.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

---

### 2. Setup environment variables

Create a `.env` file:

```env
PORT=4000
NODE_ENV=development

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app?schema=public"

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
APP_BASE_URL=http://localhost:3005
EMAIL_VERIFICATION_URL=http://localhost:3005/api/auth/verify-email
PASSWORD_RESET_URL=http://localhost:5173/reset-password

EMAIL_FROM=your-gmail@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password-without-spaces
RESEND_API_KEY=optional_resend_api_key
```

---

### 3. Setup database

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

---

### 4. Run the project

```bash
npm run dev
```

Server will start on:

```
http://localhost:4000
```

### Docker

Run the full auth service stack:

```bash
npm run docker:up
```

Docker runs database migrations and seeds the default users before starting the API.

Default admin login:

- Email: `admin@medsphere.local`
- Username: `admin`
- Password: `Admin1234!Pass`

---

## Testing

Run tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

---

## Available Scripts

| Script                    | Description             |
| ------------------------- | ----------------------- |
| `npm run dev`             | Run in development mode |
| `npm run build`           | Compile TypeScript      |
| `npm start`               | Run compiled app        |
| `npm run test`            | Run tests               |
| `npm run prisma:migrate`  | Run database migrations |
| `npm run prisma:generate` | Generate Prisma client  |

---

## Example Module (Departments)

Each module follows:

- `domain` → interfaces & entities
- `repository` → database abstraction
- `service` → business logic
- `handlers` → CQRS layer
- `controller` → HTTP layer

---

## Authentication

Implemented flows:

- Patient registration with required personal number and strong password rules (12+ chars, upper/lower/number/special)
- Admin-managed user/staff account creation with role assignment
- Email verification code flow (`/api/auth/verify-email`, `/api/auth/resend-verification`)
- Login with JWT access token (15 minutes) + refresh token (7 days)
- Login accepts either email address or username in the existing `email` request field
- Refresh token hashing, rotation, revocation, and active session listing/revocation
- Forgot/reset password flow (`/api/auth/forgot-password`, `/api/auth/reset-password`)
- Authenticated password change flow (`/api/auth/change-password`)
- RBAC middleware for protected routes (auth, role, and permission checks)
- Auth endpoint rate limiting
- Email delivery via Gmail/SMTP when `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are configured
- Email delivery via Resend when `RESEND_API_KEY` is configured, with console preview fallback in local development

Auth API artifacts:

- OpenAPI: `docs/openapi/auth.openapi.json`
- Postman collection: `docs/postman/MedSphere-Auth.postman_collection.json`
- Swagger UI: `/docs` and `/api/docs`

AI/OpenAI note:

- This auth service does not require OpenAI credentials or an OpenAI SDK. Per the MedSphere plan, OpenAI-backed transcription, summarization, lab interpretation, and reservation-agent features belong in a separate AI service.

Default seeded admin for frontend testing:

- Email: `admin@medsphere.local`
- Username: `admin`
- Password: `Admin1234!Pass`

---

## Extending the Template

To add a new module:

1. Create a folder in `modules/`
2. Add:

   - commands
   - queries
   - handlers
   - service
   - repository
   - controller
3. Register routes in `app.ts`

---

## Tech Stack

- Express
- TypeScript
- Prisma
- PostgreSQL
- Jest
- Zod

---

## Notes

- Prisma is used as a **schema-first ORM**
- Business logic remains **code-first in services**
- Designed to scale into microservices if needed

---

## Author

Template created for scalable backend development and academic projects.
