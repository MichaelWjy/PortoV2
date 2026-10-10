# syntax=docker/dockerfile:1.7
# Targets:
#   runner (default)  minimal production image: Next.js standalone server, non-root
#   tools             full toolchain for one-off jobs: migrations, seed, admin CLI, retention
# No secrets are baked in; everything comes from the runtime environment.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma generate (postinstall) reads DATABASE_URL from the config; it never connects.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN npx prisma generate && npx next build

# One-off jobs: docker compose run --rm tools npm run db:deploy
FROM builder AS tools
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "db:deploy"]

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache tini \
  && mkdir -p /app/storage/uploads && chown -R node:node /app/storage
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# tini forwards SIGTERM so the server shuts down cleanly.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
