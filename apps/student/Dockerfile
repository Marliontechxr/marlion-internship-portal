# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/student/package*.json ./apps/student/
COPY packages/*/package*.json ./packages/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build:student

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/student/.next/standalone ./
COPY --from=builder /app/apps/student/.next/static ./apps/student/.next/static
COPY --from=builder /app/apps/student/public ./apps/student/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/student/server.js"]
