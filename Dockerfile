# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time environment variables for Next.js
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDcOhIcq62aZuh0YVTcjsNdlysCdTYFfjQ
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marlioninternshipportal2025.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=marlioninternshipportal2025
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marlioninternshipportal2025.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=593947094542
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:593947094542:web:9ed58b16bcf50ed59d165f
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-CMYEE92CG7
ARG NEXT_PUBLIC_APP_URL=https://internship.marliontech.com

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/student/package*.json ./apps/student/
COPY packages/config/package*.json ./packages/config/
COPY packages/lib/package*.json ./packages/lib/
COPY packages/ui/package*.json ./packages/ui/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the student app
RUN npm run build --filter=student

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Runtime environment variables
ENV DO_AI_API_KEY=sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC
ENV DO_AI_MODEL=llama3.3-70b-instruct

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/student/.next/standalone ./
COPY --from=builder /app/apps/student/.next/static ./apps/student/.next/static
COPY --from=builder /app/apps/student/public ./apps/student/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/student/server.js"]
