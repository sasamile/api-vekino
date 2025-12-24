# Configuración de Nginx para API Vekino

Esta carpeta contiene los archivos necesarios para configurar Nginx como reverse proxy con SSL.

## Archivos

- `nginx.conf`: Configuración de Nginx con soporte para SSL y reverse proxy
- `setup-nginx.sh`: Script automatizado para instalar y configurar Nginx + SSL

## Uso Rápido

```bash
# Desde el directorio raíz del proyecto
cd ~/api-vekino
sudo ./nginx/setup-nginx.sh tu-dominio.com
```

## Requisitos Previos

1. **DNS configurado**: Tu dominio debe apuntar a la IP de tu instancia EC2
2. **Puertos abiertos**: Los puertos 80 y 443 deben estar abiertos en los Security Groups de AWS
3. **Aplicación corriendo**: La aplicación Docker debe estar corriendo en el puerto 3000

## Pasos Detallados

### 1. Configurar DNS

Antes de ejecutar el script, asegúrate de que tu dominio apunte a la IP de tu instancia:

```bash
# Verificar la IP pública de tu instancia
curl -s http://169.254.169.254/latest/meta-data/public-ipv4

# Luego configura un registro A en tu DNS apuntando a esta IP
```

### 2. Ejecutar el Script

```bash
sudo ./nginx/setup-nginx.sh tu-dominio.com
```

El script:
- Instala Nginx y Certbot si no están instalados
- Configura Nginx como reverse proxy
- Obtiene certificado SSL de Let's Encrypt
- Configura renovación automática

### 3. Verificar

```bash
# Verificar que Nginx está corriendo
sudo systemctl status nginx

# Verificar certificado SSL
sudo certbot certificates

# Probar tu dominio
curl -I https://tu-dominio.com
```

## Configuración Manual

Si prefieres configurar manualmente, consulta `DOCKER.md` para instrucciones detalladas.

## Solución de Problemas

### Error: "Domain not pointing to this server"

Asegúrate de que tu DNS esté configurado correctamente y espera unos minutos para la propagación.

### Error: "Port 80 already in use"

Verifica qué está usando el puerto 80:
```bash
sudo netstat -tulpn | grep :80
```

### Certificado no se renueva automáticamente

Verifica el timer de Certbot:
```bash
sudo systemctl status certbot.timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Nginx no inicia

Verifica la configuración:
```bash
sudo nginx -t
```

Revisa los logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

