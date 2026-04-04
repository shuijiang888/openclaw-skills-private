# 生产镜像：需提供 DATABASE_URL、PROFIT_AUTH_* 等环境变量（勿把密钥打进镜像）
# 构建: docker build -t profit-web .
# 运行: docker run -p 3000:3000 -e DATABASE_URL=... -e PROFIT_AUTH_SECRET=... -e PROFIT_AUTH_MODE=session -e NEXT_PUBLIC_PROFIT_AUTH_MODE=session profit-web
# SQLite 文件库请挂载含 prisma/*.db 的卷，且路径与 DATABASE_URL 一致

FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建期注入（与运行时 .env 中 NEXT_PUBLIC_* 一致，否则门户外链等会在镜像里写死为默认值）
ARG NEXT_PUBLIC_PROFIT_AUTH_MODE=
ARG NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=http://119.45.205.137/
ENV NEXT_PUBLIC_PROFIT_AUTH_MODE=$NEXT_PUBLIC_PROFIT_AUTH_MODE
ENV NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL=$NEXT_PUBLIC_PORTAL_APP_INTELLIGENCE_URL
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
