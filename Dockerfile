FROM node:18-alpine

# Banking-Grade Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Disable Husky during Docker build
ENV HUSKY=0

# Install dependencies (production only for smaller image)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

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
CMD ["node", "server.js"] 