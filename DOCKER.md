# Guía de Docker para API Vekino

Esta guía explica cómo configurar y ejecutar la API Vekino usando Docker y Docker Compose en una instancia de AWS con Ubuntu.

## Requisitos Previos

- Docker instalado (versión 20.10 o superior)
- Docker Compose instalado (versión 2.0 o superior)
- Acceso a una instancia de AWS EC2 con Ubuntu
- Base de datos CockroachDB configurada y accesible
- Credenciales de AWS S3 configuradas

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# ============================================
# Configuración de la Aplicación
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# Base de Datos (CockroachDB)
# ============================================
# URL de conexión a la base de datos maestra
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd?sslmode=require
DATABASE_URL=postgresql://usuario:contraseña@host:26257/defaultdb?sslmode=require

# ============================================
# Better Auth - Autenticación
# ============================================
# URL base de la API (debe coincidir con el dominio donde se despliega)
BETTER_AUTH_URL=http://localhost:3000
# Secret para firmar tokens (generar uno seguro en producción)
# Puedes generar uno con: openssl rand -base64 32
BETTER_AUTH_SECRET=better-auth-secret-change-in-production
# Orígenes confiables separados por comas (para CORS)
# Ejemplo: http://localhost:5173,https://app.tudominio.com
TRUSTED_ORIGINS=

# ============================================
# AWS S3 - Almacenamiento de Archivos
# ============================================
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tu-bucket-s3
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
```

### Generar Secret Seguro

Para generar un secret seguro para `BETTER_AUTH_SECRET`, ejecuta:

```bash
openssl rand -base64 32
```

## Instalación en AWS EC2 (Ubuntu)

### 1. Conectar a la instancia EC2

```bash
ssh -i tu-clave.pem ubuntu@tu-ip-ec2
```

### 2. Instalar Docker y Docker Compose

```bash
# Actualizar el sistema
sudo apt update
sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar el usuario ubuntu al grupo docker
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version

# Reiniciar sesión o ejecutar:
newgrp docker
```

### 3. Clonar el repositorio (si es necesario)

```bash
git clone tu-repositorio.git
cd api-vekino
```

### 4. Configurar variables de entorno

```bash
# Crear archivo .env
nano .env
# Pegar las variables de entorno y guardar (Ctrl+X, Y, Enter)
```

### 5. Construir y ejecutar con Docker Compose

```bash
# Construir la imagen
docker-compose build

# Iniciar el contenedor
docker-compose up -d

# Ver los logs
docker-compose logs -f

# Verificar que el contenedor está corriendo
docker-compose ps
```

## Comandos Útiles

### Gestión del Contenedor

```bash
# Iniciar el contenedor
docker-compose up -d

# Detener el contenedor
docker-compose down

# Reiniciar el contenedor
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de las últimas 100 líneas
docker-compose logs --tail=100

# Ejecutar comandos dentro del contenedor
docker-compose exec api sh

# Reconstruir la imagen después de cambios
docker-compose up -d --build
```

### Verificación de Salud

```bash
# Verificar que la API está respondiendo
curl http://localhost:3000/api-json

# Verificar el estado del contenedor
docker-compose ps

# Verificar los healthchecks
docker inspect api-vekino | grep -A 10 Health
```

## Configuración de Producción

### 1. Configurar Nginx como Reverse Proxy (Opcional)

Si quieres usar Nginx como reverse proxy:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Configurar SSL con Let's Encrypt (Opcional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### 3. Configurar Auto-inicio del Contenedor

El archivo `docker-compose.yml` ya incluye `restart: unless-stopped`, por lo que el contenedor se reiniciará automáticamente si se detiene o si el servidor se reinicia.

## Solución de Problemas

### El contenedor no inicia

```bash
# Ver logs detallados
docker-compose logs api

# Verificar que las variables de entorno están correctas
docker-compose config
```

### Error de conexión a la base de datos

- Verifica que `DATABASE_URL` esté correctamente configurada
- Verifica que la base de datos CockroachDB sea accesible desde la instancia EC2
- Verifica los grupos de seguridad de AWS para permitir conexiones salientes al puerto 26257

### Error de permisos de Docker

```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### Limpiar recursos de Docker

```bash
# Eliminar contenedores detenidos
docker-compose down

# Eliminar imágenes no utilizadas
docker image prune -a

# Limpiar todo (¡cuidado!)
docker system prune -a
```

## Actualización de la Aplicación

Para actualizar la aplicación después de hacer cambios:

```bash
# 1. Hacer pull de los últimos cambios
git pull

# 2. Reconstruir y reiniciar
docker-compose up -d --build

# 3. Verificar que todo funciona
docker-compose logs -f
```

## Monitoreo

### Ver uso de recursos

```bash
# Ver uso de CPU y memoria
docker stats api-vekino

# Ver espacio en disco
docker system df
```

## Seguridad

- **Nunca** subas el archivo `.env` al repositorio
- Usa secrets seguros para `BETTER_AUTH_SECRET`
- Configura grupos de seguridad de AWS apropiadamente
- Considera usar AWS Secrets Manager o Parameter Store para variables sensibles
- Mantén Docker y el sistema operativo actualizados

## Notas Adicionales

- La base de datos CockroachDB debe estar configurada externamente
- El servicio de S3 de AWS debe estar configurado y accesible
- El puerto 3000 debe estar abierto en los grupos de seguridad de AWS si se accede desde fuera de la instancia

