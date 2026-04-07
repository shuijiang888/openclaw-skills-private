FROM docker.m.daocloud.io/library/node:20-bullseye-slim
WORKDIR /app
COPY api/package.json api/package-lock.json* ./api/
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN cd api && npm install --omit=dev
COPY api/server.mjs ./api/
COPY web ./web
COPY data ./data
WORKDIR /app/api
ENV SRNE_DB_PATH=/data/srne_channel.db
VOLUME /data
EXPOSE 8790
CMD ["node", "server.mjs"]
