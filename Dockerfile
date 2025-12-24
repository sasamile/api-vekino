FROM node:24-alpine

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat openssl

# Crear carpeta de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Generar el cliente Prisma
RUN npx prisma generate

# Compilar la app (NestJS usa TypeScript)
RUN npm run build

# Crear script de inicio
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🚀 Iniciando API Vekino..."' >> /app/start.sh && \
    echo '# Limpiar comillas de todas las variables de entorno si las tienen' >> /app/start.sh && \
    echo 'clean_env_var() {' >> /app/start.sh && \
    echo '  eval "value=\$$1"' >> /app/start.sh && \
    echo '  if [ ! -z "$value" ]; then' >> /app/start.sh && \
    echo '    cleaned=$(echo "$value" | sed "s/^[\"'\'']//; s/[\"'\'']$//")' >> /app/start.sh && \
    echo '    export "$1=$cleaned"' >> /app/start.sh && \
    echo '  fi' >> /app/start.sh && \
    echo '}' >> /app/start.sh && \
    echo 'clean_env_var DATABASE_URL' >> /app/start.sh && \
    echo 'clean_env_var BETTER_AUTH_URL' >> /app/start.sh && \
    echo 'clean_env_var BETTER_AUTH_SECRET' >> /app/start.sh && \
    echo 'if [ -z "$DATABASE_URL" ]; then' >> /app/start.sh && \
    echo '  echo "❌ Error: DATABASE_URL no está configurada"' >> /app/start.sh && \
    echo '  exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "🔄 Ejecutando migraciones de Prisma..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy || echo "⚠️  Advertencia: Error en migraciones (puede ser normal si ya están aplicadas)"' >> /app/start.sh && \
    echo 'echo "🎯 Iniciando aplicación..."' >> /app/start.sh && \
    echo 'exec node dist/src/main.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la app
CMD ["/app/start.sh"]
