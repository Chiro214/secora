# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Go scanner
FROM golang:1.21-alpine AS go-builder
WORKDIR /build
COPY scan-engine/main.go .
RUN go build -o scan-engine main.go

# Final stage
FROM node:20-alpine

RUN apk add --no-cache cairo jpeg pango giflib openjdk17-jre openssl

WORKDIR /app

# Copy from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src

# Copy Go scanner
COPY --from=go-builder /build/scan-engine ./scan-engine/scan-engine
RUN chmod +x ./scan-engine/scan-engine

# Create scan-results directory
RUN mkdir -p scan-results

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
