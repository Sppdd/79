# One image for the whole app: console, WhatsApp webhook, agent, jobs.
# Runs the same on a laptop (docker compose) and on a Nebius Serverless Endpoint (CPU preset).
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-slim AS run
WORKDIR /app
# ffmpeg converts WhatsApp voice notes (OGG/Opus) to PCM for the speech models.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 MEDIA_DIR=/data/media PGLITE_DIR=/data/pglite
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
