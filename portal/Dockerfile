# Multi-stage build for MyMoolah Admin Portal
# Single Cloud Run service: Express backend serves API + frontend static files

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY admin/frontend/package*.json ./
RUN npm install --ignore-scripts

COPY admin/frontend/ .
RUN npm run build

# Stage 2: Production backend + built frontend
FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./portal/backend/
RUN cd portal/backend && npm install --omit=dev

# Copy backend source
COPY backend/ ./portal/backend/

# Copy db-connection-helper (placed into portal/scripts/ by Cloud Build step)
# Required for Codespaces/local Docker fallback — not used in Cloud Run
COPY scripts/db-connection-helper.js ./scripts/db-connection-helper.js

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./portal/admin/frontend/dist

# Copy container entry point
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Cloud Run injects PORT (defaults to 8080)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["sh", "/app/start.sh"]
