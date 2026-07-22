# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — install once, cached independently of the source
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# build — Vite compiles the SPA; the API URL is baked in at build time
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# runtime — static files served by nginx as a non-root user
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Port 8080 so the server can run unprivileged.
RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
