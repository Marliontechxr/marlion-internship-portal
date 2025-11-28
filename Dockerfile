# Build stage
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy root package files first
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy all package.json files for workspace resolution
COPY apps/student/package*.json ./apps/student/
COPY packages/config/package*.json ./packages/config/
COPY packages/lib/package*.json ./packages/lib/
COPY packages/ui/package*.json ./packages/ui/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy all source code
COPY apps/student ./apps/student
COPY packages ./packages

# Set environment variables for build
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_APP_URL
ARG DO_AI_API_KEY
ARG DO_AI_MODEL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DO_AI_API_KEY=$DO_AI_API_KEY
ENV DO_AI_MODEL=$DO_AI_MODEL

# Build the student app using turbo
RUN npm run build:student

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/student/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/student/.next/static ./apps/student/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/student/public ./apps/student/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/student/server.js"]
