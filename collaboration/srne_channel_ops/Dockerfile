FROM docker.m.daocloud.io/library/node:20-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json* ./api/
RUN apk add --no-cache python3 make g++
RUN cd api && npm install --omit=dev
COPY api/server.mjs ./api/
COPY web ./web
COPY data ./data
WORKDIR /app/api
ENV SRNE_DB_PATH=/data/srne_channel.db
VOLUME /data
EXPOSE 8790
CMD ["node", "server.mjs"]
