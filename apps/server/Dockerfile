FROM node:20-bookworm-slim

WORKDIR /app
RUN corepack enable
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @money-app/server prisma:generate \
  && pnpm --filter @money-app/server build

EXPOSE 3000

CMD ["node", "apps/server/dist/apps/server/src/main.js"]
