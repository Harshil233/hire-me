# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — production dependencies only, cached separately from the source
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# build — full dependency tree, compiled to dist/
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# runtime — slim, non-root, no dev dependencies and no sources
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# wget backs the healthcheck below; tini reaps zombies under PID 1.
RUN apk add --no-cache tini wget

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Uploads live on a volume so they survive container replacement.
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT}/api/v1/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
