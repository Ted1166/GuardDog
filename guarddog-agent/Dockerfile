# ── GuardDog Agent — Google Cloud Run Dockerfile ─────────────────────
# Multi-stage build: keeps final image lean

# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# ── Stage 2: Runtime ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production deps + tsx (needed at runtime)
COPY package*.json ./
RUN npm install --omit=dev && npm install tsx

# Copy source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Cloud Run sets PORT automatically — default 8080
ENV PORT=8080
ENV NODE_ENV=production

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]