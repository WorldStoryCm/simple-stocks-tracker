# ── Stage 1: Install dependencies ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy workspace root + . package manifests
COPY package.json bun.lock ./
COPY ./package.json ././

RUN bun install

# ── Stage 2: Build ──
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/./node_modules ././node_modules
COPY . .

# Next.js collects anonymous telemetry — disable in CI
ENV NEXT_TELEMETRY_DISABLED=1

# Better Auth needs these at build time to avoid warnings during page collection
ARG BETTER_AUTH_SECRET

# Set them as environment variables for the build
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Build the Next.js app (standalone output)
RUN cd . && bun run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=build /app/./public ././public

# Prepare .next cache directory
RUN mkdir -p ./.next && chown nextjs:nodejs ./.next

# Copy standalone server (preserves monorepo directory structure)
COPY --from=build --chown=nextjs:nodejs /app/./.next/standalone ./
# Copy static assets into the standalone output
COPY --from=build --chown=nextjs:nodejs /app/./.next/static ././.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build with output: "standalone"
CMD ["node", "./server.js"]
