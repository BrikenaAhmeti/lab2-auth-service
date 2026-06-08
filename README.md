# MedSphere Auth Service

Auth and identity microservice for Lab2 MedSphere. It owns patient registration, login, refresh tokens, email verification, password reset, session management, current-user profile updates, admin user creation, doctor directory reads, internal user-profile lookup, account provisioning, contact email handoffs, and auth audit-log ingestion.

Core owns the clinical patient/staff domain. Auth owns credentials, roles, permissions, and token/session state.

## Port

- Local and Docker API: `http://localhost:3005`
- Container port: `3005`
- Health: `GET /health`
- Swagger UI: `http://localhost:3005/docs`
- Swagger UI alias: `http://localhost:3005/api/docs`
- OpenAPI JSON: `http://localhost:3005/docs/openapi.json`
- OpenAPI JSON alias: `http://localhost:3005/api/docs/openapi.json`

## Data Store

- PostgreSQL via Prisma.

Docker Compose starts a dedicated Postgres container, runs `prisma migrate deploy`, runs the seed script, and then starts the Auth Service.

Owned tables:

- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `RefreshToken`
- `EmailVerificationToken`
- `PasswordResetToken`
- `AuditLog`
- `Department` for legacy compatibility routes only; Core remains the primary department service.

## Environment

Copy `.env.example` to `.env`.

Service keys:

- `NODE_ENV`
- `PORT`
- `APP_BASE_URL`
- `FRONTEND_BASE_URL`
- `FRONTEND_ORIGINS`
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

`JWT_ACCESS_SECRET` must match the services and frontend that verify access tokens. `INTERNAL_API_KEY` must match Core, Notifications, CMS, and AI for internal service calls.

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

Stop only local infrastructure:

```bash
npm run docker:infra:down
```

## Run With Docker

```bash
cp .env.example .env
npm run docker:up
```

Stop the stack:

```bash
npm run docker:down
```

## Build And Tests

```bash
npm run build
npm run test
```

Additional commands:

```bash
npm run test:watch
npm run test:unit
npm run test:auth
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
```

## Main Routes

Auth:

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

Users and directory:

- `GET /api/users/doctors`
- `GET /api/users/me`
- `PATCH /api/users/me`

Internal service routes use `x-internal-api-key`:

- `POST /internal/auth/contact-acknowledgement`
- `POST /internal/auth/contact-reply`
- `POST /internal/auth/provision-account`
- `POST /internal/auth/audit-logs`
- `POST /internal/users/profiles`

Legacy department compatibility routes:

- `POST /departments`
- `GET /departments/:id`

Swagger is the source of truth for request and response shapes.

## Email Delivery

Email is sent through SMTP when SMTP keys are configured, through Resend when `RESEND_API_KEY` is configured, and falls back to local preview behavior in development.

## Database Normalization

The Prisma schema is normalized to 3NF for Auth-owned relational data:

- Users, roles, and permissions are separate tables.
- `UserRole` and `RolePermission` model many-to-many relationships without repeating role or permission attributes.
- Refresh, email verification, and password reset tokens are separate lifecycle tables tied to users.
- Audit logs store before/after JSON snapshots as event evidence, not as reusable master data.

The `Department` model is retained only for legacy `/departments` compatibility in this service. Department catalog ownership belongs to Core, so new department workflows should use Core.

## Notes

- Passwords are stored as hashes.
- Access tokens are short lived; refresh tokens are tracked and revocable.
- Profile update routes apply own-user permission checks.
