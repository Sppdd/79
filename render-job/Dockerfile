FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /job
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY render.ts ./

ENTRYPOINT ["node", "render.ts"]
