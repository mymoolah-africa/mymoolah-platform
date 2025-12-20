# Multi-stage build for smaller final image
# Stage 1: Dependencies installation
FROM node:18-alpine AS deps

# Disable Husky during Docker build
ENV HUSKY=0

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm install --os=linux --cpu=x64 sharp && \
    npm cache clean --force

# Stage 2: Final image
FROM node:18-alpine

# Banking-Grade Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code (only what's needed)
COPY --chown=nodejs:nodejs . .

# Create logs directory with correct permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Make start script executable
COPY --chown=nodejs:nodejs start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Switch to non-root user
USER nodejs

# Cloud Run uses PORT environment variable (defaults to 8080)
# Application should read process.env.PORT
EXPOSE 8080

# Health check (Cloud Run compatible)
# Note: Cloud Run has its own health checks, but this helps during development
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
# Cloud Run sets PORT automatically, but we default to 8080
# Using shell script wrapper (can switch to direct node command once confirmed working)
CMD ["/app/start.sh"] 