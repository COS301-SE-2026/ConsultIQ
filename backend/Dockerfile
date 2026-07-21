# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client
RUN npx --no-install prisma generate

# Build the NestJS application
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install system dependencies needed for Tesseract OCR and PDF processing
RUN apk add --no-cache \
    g++ \
    make \
    python3 \
    tesseract-ocr \
    tesseract-ocr-data-eng

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

USER nestjs

EXPOSE 3000

# Run migrations then start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]