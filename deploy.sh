#!/bin/bash

# Script de despliegue para API Vekino en AWS EC2
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue de API Vekino..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado. Por favor, instala Docker primero.${NC}"
    exit 1
fi

# Verificar que Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado. Por favor, instala Docker Compose primero.${NC}"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado.${NC}"
    echo -e "${YELLOW}Por favor, crea un archivo .env con las variables de entorno necesarias.${NC}"
    echo -e "${YELLOW}Consulta DOCKER.md para más información.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verificaciones completadas${NC}"

# Habilitar BuildKit para builds más rápidos
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Construir la imagen
echo -e "\n${YELLOW}📦 Construyendo la imagen Docker (con BuildKit para acelerar)...${NC}"
docker-compose build

# Detener contenedores existentes (si existen)
echo -e "\n${YELLOW}🛑 Deteniendo contenedores existentes...${NC}"
docker-compose down || true

# Iniciar los contenedores
echo -e "\n${YELLOW}🚀 Iniciando contenedores...${NC}"
docker-compose up -d

# Esperar a que el contenedor esté listo
echo -e "\n${YELLOW}⏳ Esperando a que la aplicación esté lista...${NC}"
sleep 10

# Verificar el estado
echo -e "\n${YELLOW}📊 Estado de los contenedores:${NC}"
docker-compose ps

# Verificar salud
echo -e "\n${YELLOW}🏥 Verificando salud de la aplicación...${NC}"
if docker-compose ps | grep -q "healthy\|Up"; then
    echo -e "${GREEN}✅ La aplicación está corriendo correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  La aplicación puede estar iniciando. Revisa los logs con: docker-compose logs -f${NC}"
fi

echo -e "\n${GREEN}✨ Despliegue completado!${NC}"
echo -e "\nComandos útiles:"
echo -e "  - Ver logs: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  - Detener: ${YELLOW}docker-compose down${NC}"
echo -e "  - Reiniciar: ${YELLOW}docker-compose restart${NC}"
echo -e "  - Estado: ${YELLOW}docker-compose ps${NC}"

