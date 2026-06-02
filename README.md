# MedSphere Auth Service

Auth and identity microservice for Lab2 MedSphere. It owns patient registration, login, refresh tokens, email verification, password reset, session management, current-user profile updates, admin user creation, doctor directory reads, and internal identity lookup/email handoff endpoints used by other services.

## Port

- Local and Docker API: `http://localhost:3005`
- Container port: `3005`
- Health: `GET /health`

## Data Stores

- PostgreSQL via Prisma.
- Docker Compose starts a dedicated `postgres` container and runs migrations before the API starts.

Owned data includes users, roles, permissions, refresh/session state, email verification/reset tokens, audit logs, and the currently hosted department endpoints.

## Environment Keys

Copy `.env.example` to `.env`.

Service keys:

- `NODE_ENV`
- `PORT`
- `APP_BASE_URL`
- `EMAIL_VERIFICATION_URL`
- `PASSWORD_RESET_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_FROM`
- `CORE_SERVICE_URL`
- `INTERNAL_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `RESEND_API_KEY`
- `DATABASE_URL`

Docker/Postgres helper keys:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `AUTH_SERVICE_PORT`
- `CORE_SERVICE_URL_DOCKER`

## Start Locally

```bash
npm install
cp .env.example .env
npm run docker:infra
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Use `npm run docker:infra:down` to stop only the local Postgres container.

## Run With Docker

```bash
cp .env.example .env
npm run docker:up
```

Stop the stack:

```bash
npm run docker:down
```

Docker starts Postgres, runs `prisma migrate deploy`, runs the seed script, then starts the Auth Service.

## Build And Tests

```bash
npm run build
npm run test
```

Additional test commands:

```bash
npm run test:watch
npm run test:unit
npm run test:auth
```

Useful Prisma commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
```

## Swagger

- Swagger UI: `http://localhost:3005/docs`
- Swagger UI alias: `http://localhost:3005/api/docs`
- OpenAPI JSON: `http://localhost:3005/docs/openapi.json`
- OpenAPI JSON alias: `http://localhost:3005/api/docs/openapi.json`

Swagger covers auth flows, sessions, admin user creation, current-user profile endpoints, doctor directory, department endpoints, and internal service-to-service routes:

- `POST /internal/auth/contact-acknowledgement`
- `POST /internal/users/profiles`

## Main Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/verify-email`
- `GET /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `GET /api/auth/session-logs`
- `POST /api/auth/change-password`
- `DELETE /api/auth/sessions/:id`
- `DELETE /api/auth/admin/sessions/:id`
- `POST /api/auth/admin/users`
- `GET /api/users/doctors`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `POST /departments`
- `GET /departments/:id`

## Notes

- JWT access and refresh secrets must match frontend/Core/Notification expectations where tokens are verified.
- `INTERNAL_API_KEY` should match Core, Notifications, CMS, and AI where service-to-service calls are enabled.
- Email is sent through SMTP when SMTP keys are configured, through Resend when `RESEND_API_KEY` is configured, and falls back to local preview behavior in development.
