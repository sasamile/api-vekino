#!/bin/bash

# Script de ayuda para Docker Compose en producción
# Uso: ./docker-compose.prod.sh [comando]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./docker-compose.prod.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  build       - Construir las imágenes Docker"
    echo "  up          - Iniciar los servicios en modo detached"
    echo "  down        - Detener y eliminar los servicios"
    echo "  restart     - Reiniciar todos los servicios"
    echo "  logs        - Ver logs de todos los servicios"
    echo "  logs-api    - Ver logs solo de la API"
    echo "  logs-nginx  - Ver logs solo de Nginx"
    echo "  status      - Ver estado de los servicios"
    echo "  shell       - Abrir shell en el contenedor de la API"
    echo "  rebuild     - Reconstruir y reiniciar los servicios"
    echo "  help        - Mostrar esta ayuda"
    echo ""
}

# Verificar que existe .env
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  Advertencia: No se encontró el archivo .env${NC}"
        echo "Crea un archivo .env basado en .env.example"
        echo ""
        read -p "¿Deseas continuar de todas formas? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Comando principal
case "${1:-help}" in
    build)
        echo -e "${GREEN}🔨 Construyendo imágenes Docker...${NC}"
        docker-compose build
        echo -e "${GREEN}✅ Construcción completada${NC}"
        ;;
    
    up)
        check_env
        echo -e "${GREEN}🚀 Iniciando servicios...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Servicios iniciados${NC}"
        echo ""
        echo "Verifica el estado con: ./docker-compose.prod.sh status"
        echo "Ver logs con: ./docker-compose.prod.sh logs"
        ;;
    
    down)
        echo -e "${YELLOW}🛑 Deteniendo servicios...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Servicios detenidos${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}🔄 Reiniciando servicios...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ Servicios reiniciados${NC}"
        ;;
    
    logs)
        docker-compose logs -f
        ;;
    
    logs-api)
        docker-compose logs -f api
        ;;
    
    logs-nginx)
        docker-compose logs -f nginx
        ;;
    
    status)
        echo -e "${GREEN}📊 Estado de los servicios:${NC}"
        docker-compose ps
        echo ""
        echo -e "${GREEN}💚 Health checks:${NC}"
        docker-compose ps --format json | jq -r '.[] | "\(.Name): \(.Health)"' 2>/dev/null || docker-compose ps
        ;;
    
    shell)
        echo -e "${GREEN}🐚 Abriendo shell en el contenedor de la API...${NC}"
        docker-compose exec api sh
        ;;
    
    rebuild)
        check_env
        echo -e "${GREEN}🔨 Reconstruyendo y reiniciando servicios...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}✅ Reconstrucción completada${NC}"
        ;;
    
    help|*)
        show_help
        ;;
esac

