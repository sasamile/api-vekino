FROM node:24-alpine

# Crear carpeta de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar el resto del código

COPY . .
# Generar el cliente Prisma
RUN npx prisma generate

# Compilar la app (NestJS usa TypeScript)
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Ejecutar aplicación
CMD ["node", "dist/src/main.js"]


