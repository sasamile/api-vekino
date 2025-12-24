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

# Instalar dependencias con cache mount (MUY RÁPIDO en builds siguientes)
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 2 && \
    npm config set fetch-timeout 60000 && \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline

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


