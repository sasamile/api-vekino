# Endpoints de Gestión de Precios de Planes

Sistema completo para gestionar los precios de los planes de suscripción. Los precios ahora se almacenan en la base de datos y se utilizan para calcular el MRR (Monthly Recurring Revenue) en las métricas.

## Endpoints Disponibles

Todos los endpoints requieren autenticación con rol **SUPERADMIN**.

### 1. Crear Precio de Plan

**POST** `/plan-pricing`

Crea un nuevo precio para un tipo de plan. Solo puede haber un precio por tipo de plan.

```bash
curl -X POST "http://localhost:3001/plan-pricing" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "BASICO",
    "monthlyPrice": 50000,
    "yearlyPrice": 540000,
    "description": "Plan básico con funcionalidades esenciales",
    "features": ["Gestión de unidades", "Reservas básicas", "Documentos"],
    "isActive": true
  }'
```

**Body:**
- `plan` (required): `BASICO` | `PRO` | `ENTERPRISE`
- `monthlyPrice` (required): Precio mensual en pesos colombianos
- `yearlyPrice` (optional): Precio anual (puede tener descuento)
- `description` (optional): Descripción del plan
- `features` (optional): Array de características del plan
- `isActive` (optional): Si el plan está activo (default: true)

### 2. Obtener Todos los Precios

**GET** `/plan-pricing`

Retorna todos los precios configurados.

```bash
curl -X GET "http://localhost:3001/plan-pricing" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE"
```

**Query Parameters:**
- `activeOnly` (optional): `true` | `false` - Solo retornar precios activos

```bash
# Solo precios activos
curl -X GET "http://localhost:3001/plan-pricing?activeOnly=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE"
```

### 3. Obtener Precio de un Plan Específico

**GET** `/plan-pricing/:plan`

Retorna el precio configurado para un tipo de plan específico.

```bash
curl -X GET "http://localhost:3001/plan-pricing/BASICO" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE"
```

**Parámetros:**
- `plan`: `BASICO` | `PRO` | `ENTERPRISE`

### 4. Actualizar Precio de Plan

**PUT** `/plan-pricing/:plan`

Actualiza el precio y configuración de un plan existente.

```bash
curl -X PUT "http://localhost:3001/plan-pricing/BASICO" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyPrice": 60000,
    "yearlyPrice": 648000,
    "description": "Plan básico actualizado",
    "features": ["Gestión de unidades", "Reservas básicas", "Documentos", "Soporte por email"],
    "isActive": true
  }'
```

**Body (todos los campos son opcionales):**
- `monthlyPrice`: Nuevo precio mensual
- `yearlyPrice`: Nuevo precio anual
- `description`: Nueva descripción
- `features`: Nuevo array de características
- `isActive`: Nuevo estado activo/inactivo

### 5. Eliminar Precio de Plan

**DELETE** `/plan-pricing/:plan`

Elimina la configuración de precio de un plan.

```bash
curl -X DELETE "http://localhost:3001/plan-pricing/BASICO" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE"
```

## Ejemplos de Uso

### Inicializar Precios por Defecto

```bash
# Crear precio para plan BÁSICO
curl -X POST "http://localhost:3001/plan-pricing" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "BASICO",
    "monthlyPrice": 50000,
    "yearlyPrice": 540000,
    "description": "Plan básico con funcionalidades esenciales",
    "features": ["Gestión de unidades", "Reservas básicas"],
    "isActive": true
  }'

# Crear precio para plan PRO
curl -X POST "http://localhost:3001/plan-pricing" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "PRO",
    "monthlyPrice": 100000,
    "yearlyPrice": 1080000,
    "description": "Plan profesional con funcionalidades avanzadas",
    "features": ["Gestión de unidades", "Reservas avanzadas", "Documentos", "PQRS", "Soporte prioritario"],
    "isActive": true
  }'

# Crear precio para plan ENTERPRISE
curl -X POST "http://localhost:3001/plan-pricing" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "ENTERPRISE",
    "monthlyPrice": 200000,
    "yearlyPrice": 2160000,
    "description": "Plan empresarial con todas las funcionalidades",
    "features": ["Todas las funcionalidades", "API personalizada", "Soporte 24/7", "Customización avanzada"],
    "isActive": true
  }'
```

### Actualizar Precio de un Plan

```bash
# Aumentar precio del plan PRO
curl -X PUT "http://localhost:3001/plan-pricing/PRO" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyPrice": 120000,
    "yearlyPrice": 1296000
  }'
```

## Respuesta de Ejemplo

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": "BASICO",
  "monthlyPrice": 50000,
  "yearlyPrice": 540000,
  "description": "Plan básico con funcionalidades esenciales",
  "features": ["Gestión de unidades", "Reservas básicas"],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Notas Importantes

1. **Un precio por plan**: Solo puede haber un precio configurado por tipo de plan. Si intentas crear otro, recibirás un error 400.

2. **Precios por defecto**: Si no hay precios configurados en la BD, el sistema usará valores por defecto:
   - BASICO: $50,000
   - PRO: $100,000
   - ENTERPRISE: $200,000

3. **MRR automático**: Los precios configurados se usan automáticamente para calcular el MRR en el endpoint `/metrics/overview` y `/metrics/mrr-growth`.

4. **Precios activos**: Solo los precios con `isActive: true` se usan para cálculos de MRR.

5. **Características**: El campo `features` se almacena como JSON en la base de datos.

## Integración con Métricas

Una vez configurados los precios, el sistema automáticamente:
- Calcula el MRR usando los precios configurados
- Muestra el crecimiento de MRR basado en los precios actuales
- Permite cambiar precios sin modificar código

Los cambios en precios se reflejan inmediatamente en las métricas.

