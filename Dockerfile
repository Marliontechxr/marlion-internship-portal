# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/student/package*.json ./apps/student/
COPY packages/config/package*.json ./packages/config/
COPY packages/lib/package*.json ./packages/lib/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the student app
RUN npm run build:student

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone build
COPY --from=builder /app/apps/student/.next/standalone ./
COPY --from=builder /app/apps/student/.next/static ./apps/student/.next/static
COPY --from=builder /app/apps/student/public ./apps/student/public

EXPOSE 3000

CMD ["node", "apps/student/server.js"]
