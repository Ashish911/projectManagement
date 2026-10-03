# Production image: multi-stage build so the final image has only production deps.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine As builder

WORKDIR /app

# Copy manifests first so the install layer is cached until package*.json changes.
COPY package*.json ./

# Exact install from package-lock.json, skipping devDependencies (jest, nodemon).
RUN npm ci --only=production

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Take only node_modules from the builder; npm cache and tooling stay behind.
COPY --from=builder /app/node_modules ./node_modules

# App source; .dockerignore excludes node_modules, .env* and .git.
COPY . .

# GraphQL API (8000) and Prometheus metrics (9090).
EXPOSE 8000
EXPOSE 9090

# Production script: loads .env.prod (not baked into the image) and runs app.js.
CMD ["npm", "start"]
