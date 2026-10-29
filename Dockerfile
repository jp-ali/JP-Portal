FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim
ARG REPOSITORY
LABEL org.opencontainers.image.source="https://github.com/${REPOSITORY}"
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=frontend --chown=node:node /app/dist ./dist
COPY --from=backend-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/src ./backend/src
COPY --chown=node:node backend/assets ./backend/assets
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/src/server.js"]
