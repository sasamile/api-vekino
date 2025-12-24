# Dockerfile multi-stage para optimizar el tamaño de la imagen
# syntax=docker/dockerfile:1.4

# Etapa 1: Build - Compilar la aplicación
FROM node:20-alpine AS builder

# Instalar dependencias del sistema necesarias para Prisma y Sharp
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./

# Configurar npm para manejar mejor problemas de red
RUN npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set fetch-timeout 120000

# Instalar dependencias usando cache mount para acelerar builds subsecuentes
# Usar --legacy-peer-deps para resolver conflictos de peer dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps || \
    (sleep 5 && npm ci --legacy-peer-deps) || \
    (sleep 10 && npm ci --legacy-peer-deps)

# Copiar el código fuente y esquemas de Prisma
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generar el cliente de Prisma
RUN npx prisma generate

# Compilar la aplicación
RUN npm run build

# Etapa 2: Producción - Imagen final optimizada
FROM node:20-alpine AS production

# Instalar dependencias del sistema necesarias para Prisma y Sharp
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Crear usuario no root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Copiar node_modules desde builder (solo producción) - MUCHO MÁS RÁPIDO que reinstalar
# Filtrar solo las dependencias de producción
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copiar archivos compilados desde la etapa de build
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Limpiar dependencias de desarrollo manualmente (más rápido que reinstalar)
RUN rm -rf node_modules/@types node_modules/typescript node_modules/ts-node node_modules/ts-jest node_modules/jest node_modules/@nestjs/cli node_modules/@nestjs/schematics node_modules/@nestjs/testing node_modules/eslint* node_modules/prettier node_modules/supertest node_modules/ts-loader node_modules/tsconfig-paths node_modules/@better-auth/cli 2>/dev/null || true

# Cambiar al usuario no root
USER nestjs

# Exponer el puerto de la aplicación
EXPOSE 3000

# Variable de entorno para Node.js
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main.js"]

