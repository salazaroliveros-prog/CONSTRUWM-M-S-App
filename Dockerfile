# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_BASE can be set at build time if needed.
ARG VITE_BASE=/
ENV VITE_BASE=${VITE_BASE}
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server

EXPOSE 8080
CMD ["node", "server/server.mjs"]
