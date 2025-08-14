# --- Build (with dev deps for tsc) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

# --- Runtime (prod-only deps, deterministic if lock exists) ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV API_OTEL_PROM_PORT=9464

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Bring compiled JS
COPY --from=build /app/dist ./dist

EXPOSE 3001 9464
CMD ["node", "dist/main.js"]
