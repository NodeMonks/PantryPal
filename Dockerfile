# Multi-stage build for PantryPal
# Stage 1: Build frontend and backend
FROM node:20-alpine AS builder

# Install build tools for native dependencies (bcrypt, bufferutil)
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Use longer timeout for slow networks
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci || npm ci || npm install

# Copy source code
COPY . .

# Build the application
# 1. Vite builds frontend to dist/public
# 2. esbuild bundles server to dist/index.js
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

# Install only runtime dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json package-lock.json ./

# Install ALL dependencies (production mode needs some dev deps like vite)
# Use longer timeout and retry for slow networks
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci || npm ci || npm install

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy necessary config files
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# Create non-root user for security (Alpine Linux commands)
RUN addgroup -S pantrypal && adduser -S -G pantrypal pantrypal
RUN chown -R pantrypal:pantrypal /app
USER pantrypal

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/auth/me', (r) => process.exit(r.statusCode === 200 || r.statusCode === 401 ? 0 : 1))"

# Start the application
CMD ["node", "dist/index.js"]
