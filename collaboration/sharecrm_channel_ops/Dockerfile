FROM docker.m.daocloud.io/library/node:20-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json* ./api/
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories \
  && apk add --no-cache python3 make g++
RUN npm config set registry https://registry.npmmirror.com \
  && cd api \
  && npm install --omit=dev
COPY api/server.mjs ./api/
COPY web ./web
COPY data ./data
WORKDIR /app/api
ENV SHARECRM_DB_PATH=/data/sharecrm_channel.db
VOLUME /data
EXPOSE 8790
CMD ["node", "server.mjs"]
