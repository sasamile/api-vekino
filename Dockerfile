# syntax=docker/dockerfile:1.4
FROM node:20-alpine

# Instalar dependencias del sistema necesarias para Prisma y Sharp
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar solo archivos de dependencias primero (mejor cacheo)
COPY package*.json ./
COPY prisma.config.ts ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Configurar npm para máxima velocidad y confiabilidad
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set fetch-timeout 120000 && \
    npm config set progress false && \
    npm config set loglevel warn

# Instalar dependencias con cache mount (npm install es más tolerante que npm ci)
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline || \
    (echo "⚠️  Reintentando instalación..." && sleep 10 && npm install --legacy-peer-deps --no-audit --no-fund) || \
    (echo "⚠️  Último intento..." && sleep 20 && npm install --legacy-peer-deps --no-audit --no-fund --force)

# Copiar código fuente y esquemas
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generar Prisma y compilar (combinado para menos layers)
RUN npx prisma generate && npm run build

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production

# Ejecutar aplicación
CMD ["node", "dist/src/main.js"]


