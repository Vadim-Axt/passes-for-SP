FROM node:20 AS builder
WORKDIR /app

COPY package.json ./
COPY client/package.json client/
COPY server/package.json server/

RUN npm install
RUN npm --prefix client install
RUN npm --prefix server install

COPY client ./client
COPY server ./server

RUN npm --prefix client run build
RUN npm --prefix server run build

FROM node:20-slim AS runner
WORKDIR /app

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 4000
CMD ["node", "dist/index.js"]
