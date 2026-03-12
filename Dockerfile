# Build stage — install production dependencies
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Runtime stage — minimal image
FROM node:20-alpine
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

ENV PORT=8080
EXPOSE 8080

USER node

CMD ["node", "src/server/index.js"]
