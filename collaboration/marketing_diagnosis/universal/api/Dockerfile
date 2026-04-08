# 通用营销诊断 API — 生产请换 TencentDB + 与 MVP_SCHEMA_DRAFT.sql 一致的迁移
FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.mjs ./
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.mjs"]
