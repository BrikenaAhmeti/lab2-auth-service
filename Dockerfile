# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

FROM base AS deps

RUN npm ci

FROM deps AS build

ENV DATABASE_URL=postgresql://medsphere:medsphere@localhost:5432/auth_service

COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated/prisma ./dist/src/generated/prisma
COPY docs ./dist/docs

EXPOSE 3005

CMD ["node", "dist/src/server.js"]
