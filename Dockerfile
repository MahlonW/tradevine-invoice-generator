# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy the built application
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/src/server.js ./src/server.js
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json
COPY --from=builder --chown=sveltekit:nodejs /app/package-lock.json ./package-lock.json

# Install only production dependencies for runtime
RUN npm ci --omit=dev && npm cache clean --force

USER sveltekit

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application with custom server
CMD ["node", "src/server.js"]
