# Comandos cURL para Endpoints de Métricas

Todos los endpoints requieren autenticación con rol **SUPERADMIN**.

## Configuración Base

Reemplaza las siguientes variables en los comandos:
- `YOUR_JWT_TOKEN`: Token JWT de autenticación
- `YOUR_SESSION_COOKIE`: Cookie de sesión `better-auth.session_token`
- `BASE_URL`: URL base de la API (por defecto: `http://localhost:3000`)

## 1. Resumen General de Métricas

```bash
curl -X GET "http://localhost:3000/metrics/overview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 2. Alertas y Riesgos

```bash
curl -X GET "http://localhost:3000/metrics/alerts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 3. Listado de Tenants

### Sin filtros (página 1, 10 resultados)
```bash
curl -X GET "http://localhost:3000/metrics/tenants" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Con paginación
```bash
curl -X GET "http://localhost:3000/metrics/tenants?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Con búsqueda
```bash
curl -X GET "http://localhost:3000/metrics/tenants?search=Las%20Flores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Filtrar por estado
```bash
curl -X GET "http://localhost:3000/metrics/tenants?status=activo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Filtrar por plan
```bash
curl -X GET "http://localhost:3000/metrics/tenants?plan=PRO" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Filtrar por ciudad
```bash
curl -X GET "http://localhost:3000/metrics/tenants?city=Bogotá" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Múltiples filtros combinados
```bash
curl -X GET "http://localhost:3000/metrics/tenants?status=activo&plan=PRO&city=Bogotá&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 4. Condominios Creados por Mes (Últimos 6 meses)

```bash
curl -X GET "http://localhost:3000/metrics/condominios-by-month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 5. Distribución por Plan

```bash
curl -X GET "http://localhost:3000/metrics/plan-distribution" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 6. Crecimiento de MRR (Monthly Recurring Revenue)

```bash
curl -X GET "http://localhost:3000/metrics/mrr-growth" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## 7. Distribución por Ciudad

```bash
curl -X GET "http://localhost:3000/metrics/city-distribution" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

## Ejemplo Completo con Variables

```bash
# Configurar variables
BASE_URL="http://localhost:3000"
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SESSION_COOKIE="better-auth-session-token-value"

# Ejecutar request
curl -X GET "${BASE_URL}/metrics/overview" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Cookie: better-auth.session_token=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" \
  | jq '.'
```

## Notas

- Todos los endpoints requieren autenticación con rol **SUPERADMIN**
- Puedes usar solo el token JWT o solo la cookie, pero es recomendable usar ambos
- Los filtros en `/metrics/tenants` son opcionales y se pueden combinar
- Los valores de `plan` pueden ser: `BASICO`, `PRO`, `ENTERPRISE`
- Los valores de `status` pueden ser: `activo`, `suspendido`

