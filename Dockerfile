# Dockerfile multi-stage para optimizar el tamaño de la imagen

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

# Instalar dependencias (usar --legacy-peer-deps para resolver conflictos de peer dependencies)
RUN npm install --legacy-peer-deps

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

# Instalar solo dependencias de producción (usar --legacy-peer-deps para resolver conflictos)
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copiar archivos compilados desde la etapa de build
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Cambiar al usuario no root
USER nestjs

# Exponer el puerto de la aplicación
EXPOSE 3000

# Variable de entorno para Node.js
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main.js"]

