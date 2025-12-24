#!/bin/bash

# Script para configurar Nginx y SSL con Let's Encrypt para API Vekino
# Uso: sudo ./setup-nginx.sh tu-dominio.com

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Por favor, ejecuta este script con sudo${NC}"
    exit 1
fi

# Verificar que se proporcionó el dominio
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar tu dominio${NC}"
    echo -e "${YELLOW}Uso: sudo ./setup-nginx.sh tu-dominio.com${NC}"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@${DOMAIN}"  # Puedes cambiar esto

echo -e "${GREEN}🚀 Configurando Nginx y SSL para ${DOMAIN}...${NC}"

# Actualizar sistema
echo -e "\n${YELLOW}📦 Actualizando sistema...${NC}"
apt update

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo -e "\n${YELLOW}📦 Instalando Nginx...${NC}"
    apt install -y nginx
fi

# Instalar Certbot
if ! command -v certbot &> /dev/null; then
    echo -e "\n${YELLOW}📦 Instalando Certbot...${NC}"
    apt install -y certbot python3-certbot-nginx
fi

# Crear directorio para certificados temporales
mkdir -p /var/www/certbot

# Copiar configuración de Nginx
echo -e "\n${YELLOW}📝 Configurando Nginx...${NC}"
if [ -f "nginx/nginx.conf" ]; then
    # Reemplazar placeholders en la configuración
    sed "s/REPLACE_WITH_DOMAIN/${DOMAIN}/g" nginx/nginx.conf > /tmp/nginx-api-vekino.conf
    sed -i "s/server_name _;/server_name ${DOMAIN};/g" /tmp/nginx-api-vekino.conf
    
    # Copiar a sites-available
    cp /tmp/nginx-api-vekino.conf /etc/nginx/sites-available/api-vekino
    
    # Crear enlace simbólico
    if [ ! -L /etc/nginx/sites-enabled/api-vekino ]; then
        ln -s /etc/nginx/sites-available/api-vekino /etc/nginx/sites-enabled/
    fi
    
    # Remover configuración por defecto si existe
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi
else
    echo -e "${RED}❌ No se encontró nginx/nginx.conf${NC}"
    exit 1
fi

# Verificar configuración de Nginx
echo -e "\n${YELLOW}🔍 Verificando configuración de Nginx...${NC}"
nginx -t

# Iniciar Nginx
echo -e "\n${YELLOW}🚀 Iniciando Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx

# Verificar que el puerto 80 esté abierto
echo -e "\n${YELLOW}🔍 Verificando que el puerto 80 esté abierto...${NC}"
if ! netstat -tuln | grep -q ":80 "; then
    echo -e "${YELLOW}⚠️  El puerto 80 no está abierto. Asegúrate de configurarlo en los Security Groups de AWS${NC}"
fi

# Obtener certificado SSL
echo -e "\n${YELLOW}🔐 Obteniendo certificado SSL de Let's Encrypt...${NC}"
echo -e "${YELLOW}Nota: Asegúrate de que tu dominio apunte a esta IP antes de continuar${NC}"
read -p "¿Tu dominio ya apunta a esta IP? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Obtener certificado
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect
    
    # Actualizar configuración con el dominio real
    sed -i "s/REPLACE_WITH_DOMAIN/${DOMAIN}/g" /etc/nginx/sites-available/api-vekino
    
    # Recargar Nginx
    systemctl reload nginx
    
    echo -e "\n${GREEN}✅ Certificado SSL instalado correctamente${NC}"
    
    # Configurar renovación automática
    echo -e "\n${YELLOW}🔄 Configurando renovación automática de certificados...${NC}"
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    # Verificar que el timer esté activo
    systemctl status certbot.timer --no-pager
    
    echo -e "\n${GREEN}✅ Configuración completada!${NC}"
    echo -e "\nTu aplicación está disponible en:"
    echo -e "  ${GREEN}https://${DOMAIN}${NC}"
    echo -e "\nPara verificar el estado de Nginx:"
    echo -e "  ${YELLOW}sudo systemctl status nginx${NC}"
    echo -e "\nPara ver los logs:"
    echo -e "  ${YELLOW}sudo tail -f /var/log/nginx/api-vekino-access.log${NC}"
    echo -e "  ${YELLOW}sudo tail -f /var/log/nginx/api-vekino-error.log${NC}"
else
    echo -e "\n${YELLOW}⚠️  Configura primero tu DNS para que ${DOMAIN} apunte a esta IP${NC}"
    echo -e "${YELLOW}Luego ejecuta:${NC}"
    echo -e "  ${GREEN}sudo certbot --nginx -d ${DOMAIN}${NC}"
fi

