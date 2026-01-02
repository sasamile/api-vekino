# API de Finanzas - Documentación para Frontend

Este documento describe todos los endpoints disponibles para el sistema de gestión de finanzas (facturas y pagos con Wompi).

## Configuración Base

**Base URL:** `https://tu-dominio.com` o `http://localhost:3000` (desarrollo)

**Autenticación:** Todos los endpoints requieren autenticación mediante cookie `better-auth.session_token` (excepto el webhook de Wompi).

**Headers requeridos:**
```bash
Cookie: better-auth.session_token=sessionId.userId
Content-Type: application/json
```

---

## Endpoints de Facturas

### 1. Crear Factura Individual (ADMIN)

Crea una factura de administración para una unidad específica.

**Endpoint:** `POST /finanzas/facturas`

**Permisos:** Solo ADMIN

**Request:**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/facturas" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=tu-session-token" \
  -d '{
    "unidadId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "periodo": "2026-01",
    "fechaVencimiento": "2026-01-31T23:59:59Z",
    "valor": 150000,
    "descripcion": "Cuota de administración enero 2026",
    "observaciones": "Pago antes del vencimiento tiene descuento del 5%"
  }'
```

**Campos:**
- `unidadId` (requerido): ID de la unidad a facturar
- `userId` (opcional): ID del usuario responsable del pago. Si no se especifica, se usa el usuario de la unidad
- `periodo` (requerido): Período de facturación en formato `YYYY-MM` (ej: "2026-01")
- `fechaVencimiento` (requerido): Fecha límite de pago en formato ISO 8601
- `valor` (requerido): Valor de la cuota de administración (número)
- `descripcion` (opcional): Descripción de la factura
- `observaciones` (opcional): Observaciones adicionales

**Response (201 Created):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "numeroFactura": "FAC-2026-01-0001",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "periodo": "2026-01",
  "fechaEmision": "2026-01-02T02:00:00.000Z",
  "fechaVencimiento": "2026-01-31T23:59:59.000Z",
  "valor": 150000,
  "descripcion": "Cuota de administración enero 2026",
  "estado": "PENDIENTE",
  "fechaEnvio": null,
  "fechaPago": null,
  "observaciones": "Pago antes del vencimiento tiene descuento del 5%",
  "createdBy": "admin-user-id",
  "createdAt": "2026-01-02T02:00:00.000Z",
  "updatedAt": "2026-01-02T02:00:00.000Z",
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Apto 801",
    "tipo": "APARTAMENTO"
  },
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  }
}
```

---

### 2. Crear Facturas Masivas (ADMIN)

Crea facturas para **todas las unidades activas** automáticamente usando el `valorCuotaAdministracion` asignado a cada unidad.

**Endpoint:** `POST /finanzas/facturas/bulk`

**Permisos:** Solo ADMIN

**Request:**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/facturas/bulk" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=tu-session-token" \
  -d '{
    "periodo": "2026-01",
    "fechaEmision": "2026-01-01T00:00:00Z",
    "fechaVencimiento": "2026-01-31T23:59:59Z",
    "enviarFacturas": true
  }'
```

**Campos:**
- `periodo` (requerido): Período de facturación en formato `YYYY-MM` (ej: "2026-01")
- `fechaEmision` (requerido): Fecha en que se envía/emite la factura (ISO 8601)
- `fechaVencimiento` (requerido): Fecha límite de pago (ISO 8601)
- `enviarFacturas` (opcional, default: false): Si es `true`, las facturas se crean con estado `ENVIADA` y se envía notificación automáticamente

**Notas importantes:**
- Se crean facturas para **todas las unidades activas** que tengan un `valorCuotaAdministracion` asignado
- El valor de cada factura se toma automáticamente del campo `valorCuotaAdministracion` de cada unidad
- Las unidades sin `valorCuotaAdministracion` o con valor 0 se omiten
- Se asigna automáticamente al propietario o arrendatario de cada unidad
- No se pueden crear facturas duplicadas para el mismo período

**Response (201 Created):**
```json
{
  "total": 25,
  "periodo": "2026-01",
  "fechaEmision": "2026-01-01T00:00:00.000Z",
  "fechaVencimiento": "2026-01-31T23:59:59.000Z",
  "facturas": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "numeroFactura": "FAC-2026-01-0001",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "periodo": "2026-01",
      "fechaEmision": "2026-01-01T00:00:00.000Z",
      "fechaVencimiento": "2026-01-31T23:59:59.000Z",
      "valor": 150000,
      "descripcion": "Cuota de administración - 2026-01",
      "estado": "ENVIADA",
      "unidad": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "identificador": "Apto 801",
        "tipo": "APARTAMENTO"
      },
      ...
    },
    ...
  ]
}
```

---

### 3. Listar Facturas

Obtiene todas las facturas con filtros opcionales.

**Endpoint:** `GET /finanzas/facturas`

**Permisos:** 
- ADMIN: Puede ver todas las facturas
- Usuarios: Solo ven sus propias facturas

**Request (sin filtros):**
```bash
curl -X GET "https://condominio-las-flores.localhost:3000/finanzas/facturas" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Request (con filtros):**
```bash
curl -X GET "https://condominio-las-flores.localhost:3000/finanzas/facturas?periodo=2026-01&estado=PENDIENTE&page=1&limit=10" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Query Parameters:**
- `unidadId` (opcional): Filtrar por ID de unidad
- `userId` (opcional): Filtrar por ID de usuario
- `periodo` (opcional): Filtrar por período (ej: "2026-01")
- `estado` (opcional): Filtrar por estado (`PENDIENTE`, `ENVIADA`, `PAGADA`, `VENCIDA`, `CANCELADA`)
- `fechaVencimientoDesde` (opcional): Fecha desde (ISO 8601)
- `fechaVencimientoHasta` (opcional): Fecha hasta (ISO 8601)
- `page` (opcional, default: 1): Número de página
- `limit` (opcional, default: 10): Cantidad de elementos por página

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "numeroFactura": "FAC-2026-01-0001",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "periodo": "2026-01",
      "fechaEmision": "2026-01-02T02:00:00.000Z",
      "fechaVencimiento": "2026-01-31T23:59:59.000Z",
      "valor": 150000,
      "descripcion": "Cuota de administración enero 2026",
      "estado": "PENDIENTE",
      "fechaEnvio": null,
      "fechaPago": null,
      "observaciones": null,
      "createdBy": "admin-user-id",
      "createdAt": "2026-01-02T02:00:00.000Z",
      "updatedAt": "2026-01-02T02:00:00.000Z",
      "unidad": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "identificador": "Apto 801",
        "tipo": "APARTAMENTO"
      },
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### 4. Obtener Factura por ID

Obtiene los detalles de una factura específica.

**Endpoint:** `GET /finanzas/facturas/:id`

**Permisos:**
- ADMIN: Puede ver cualquier factura
- Usuarios: Solo pueden ver sus propias facturas

**Request:**
```bash
curl -X GET "https://condominio-las-flores.localhost:3000/finanzas/facturas/770e8400-e29b-41d4-a716-446655440002" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "numeroFactura": "FAC-2026-01-0001",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "periodo": "2026-01",
  "fechaEmision": "2026-01-02T02:00:00.000Z",
  "fechaVencimiento": "2026-01-31T23:59:59.000Z",
  "valor": 150000,
  "descripcion": "Cuota de administración enero 2026",
  "estado": "PENDIENTE",
  "fechaEnvio": null,
  "fechaPago": null,
  "observaciones": null,
  "createdBy": "admin-user-id",
  "createdAt": "2026-01-02T02:00:00.000Z",
  "updatedAt": "2026-01-02T02:00:00.000Z",
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Apto 801",
    "tipo": "APARTAMENTO"
  },
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  }
}
```

---

### 5. Enviar Factura (ADMIN)

Envía una factura al usuario (cambia estado a `ENVIADA` y envía notificación).

**Endpoint:** `POST /finanzas/facturas/:id/enviar`

**Permisos:** Solo ADMIN

**Request:**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/facturas/770e8400-e29b-41d4-a716-446655440002/enviar" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "numeroFactura": "FAC-2026-01-0001",
  "estado": "ENVIADA",
  "fechaEnvio": "2026-01-02T02:15:00.000Z",
  ...
}
```

---

## Endpoints de Pagos

### 6. Crear Pago

Crea un pago para una factura. Soporta dos métodos: **Wompi** (procesamiento automático) y **Efectivo** (marcado como completado automáticamente).

**Endpoint:** `POST /finanzas/pagos`

**Permisos:** 
- ADMIN: Puede crear pagos para cualquier factura
- Usuarios: Solo pueden pagar sus propias facturas

**Request (Pago con Wompi):**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/pagos?redirectUrl=https://condominio-las-flores.localhost:5173/pago-exitoso" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=tu-session-token" \
  -d '{
    "facturaId": "770e8400-e29b-41d4-a716-446655440002",
    "metodoPago": "WOMPI",
    "observaciones": "Pago de cuota enero 2026"
  }'
```

**Request (Pago en Efectivo):**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/pagos" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=tu-session-token" \
  -d '{
    "facturaId": "770e8400-e29b-41d4-a716-446655440002",
    "metodoPago": "EFECTIVO",
    "observaciones": "Pago recibido en efectivo"
  }'
```

**Query Parameters:**
- `redirectUrl` (opcional): URL a la que redirigir después del pago exitoso (solo para Wompi)

**Campos:**
- `facturaId` (requerido): ID de la factura a pagar
- `metodoPago` (opcional, default: "WOMPI"): Método de pago (`WOMPI` o `EFECTIVO`)
  - `WOMPI`: Crea un link de pago y requiere procesamiento en Wompi
  - `EFECTIVO`: Se marca como completado automáticamente y actualiza la factura como pagada
- `observaciones` (opcional): Observaciones del pago

**Response (201 Created) - Wompi:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "facturaId": "770e8400-e29b-41d4-a716-446655440002",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "valor": 150000,
  "metodoPago": "WOMPI",
  "estado": "PROCESANDO",
  "wompiTransactionId": "123456789",
  "wompiReference": "FAC-FAC-2026-01-0001-1704168000000",
  "wompiPaymentLink": "https://checkout.wompi.co/l/abc123",
  "fechaPago": null,
  "observaciones": "Pago de cuota enero 2026",
  "createdAt": "2026-01-02T02:20:00.000Z",
  "updatedAt": "2026-01-02T02:20:00.000Z",
  "paymentLink": "https://checkout.wompi.co/l/abc123",
  "factura": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "numeroFactura": "FAC-2026-01-0001",
    "valor": 150000,
    "estado": "PENDIENTE"
  }
}
```

**Response (201 Created) - Efectivo:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "facturaId": "770e8400-e29b-41d4-a716-446655440002",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "valor": 150000,
  "metodoPago": "EFECTIVO",
  "estado": "APROBADO",
  "fechaPago": "2026-01-02T02:20:00.000Z",
  "observaciones": "Pago recibido en efectivo",
  "createdAt": "2026-01-02T02:20:00.000Z",
  "updatedAt": "2026-01-02T02:20:00.000Z",
  "factura": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "numeroFactura": "FAC-2026-01-0001",
    "valor": 150000,
    "estado": "PAGADA"
  }
}
```

**Notas importantes:**
- **Wompi:** El campo `paymentLink` contiene la URL que el usuario debe visitar para completar el pago. Redirige al usuario a esta URL.
- **Efectivo:** El pago se marca automáticamente como `APROBADO` y la factura como `PAGADA` sin necesidad de procesamiento externo.

---

### 7. Consultar Estado de Pago

Consulta el estado actual de un pago, incluyendo el estado en Wompi si aplica.

**Endpoint:** `GET /finanzas/pagos/:id/estado`

**Permisos:** Cualquier usuario autenticado

**Request:**
```bash
curl -X GET "https://condominio-las-flores.localhost:3000/finanzas/pagos/880e8400-e29b-41d4-a716-446655440003/estado" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Response (200 OK):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "facturaId": "770e8400-e29b-41d4-a716-446655440002",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "valor": 150000,
  "metodoPago": "WOMPI",
  "estado": "APROBADO",
  "wompiTransactionId": "123456789",
  "wompiReference": "FAC-FAC-2026-01-0001-1704168000000",
  "wompiPaymentLink": "https://checkout.wompi.co/l/abc123",
  "fechaPago": "2026-01-02T02:25:00.000Z",
  "observaciones": "Pago de cuota enero 2026",
  "createdAt": "2026-01-02T02:20:00.000Z",
  "updatedAt": "2026-01-02T02:25:00.000Z",
  "wompiStatus": {
    "id": "123456789",
    "status": "APPROVED",
    "amount_in_cents": 15000000,
    "currency": "COP",
    "reference": "FAC-FAC-2026-01-0001-1704168000000",
    "created_at": "2026-01-02T02:20:00.000Z",
    "finalized_at": "2026-01-02T02:25:00.000Z"
  }
}
```

**Estados posibles:**
- `PENDIENTE`: Pago creado pero no iniciado
- `PROCESANDO`: Pago en proceso en Wompi
- `APROBADO`: Pago completado exitosamente
- `RECHAZADO`: Pago rechazado o fallido
- `CANCELADO`: Pago cancelado

---

### 8. Marcar Pago como Completado (ADMIN)

Marca un pago como completado manualmente. Útil para confirmar pagos en efectivo que se recibieron fuera del sistema.

**Endpoint:** `POST /finanzas/pagos/:id/completar`

**Permisos:** Solo ADMIN

**Request:**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/pagos/880e8400-e29b-41d4-a716-446655440003/completar" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=tu-session-token" \
  -d '{
    "observaciones": "Pago recibido en efectivo el día 15 de enero"
  }'
```

**Campos:**
- `observaciones` (opcional): Observaciones sobre el pago completado

**Response (200 OK):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "facturaId": "770e8400-e29b-41d4-a716-446655440002",
  "estado": "APROBADO",
  "fechaPago": "2026-01-15T10:30:00.000Z",
  "observaciones": "Pago recibido en efectivo el día 15 de enero",
  ...
}
```

**Nota:** Este endpoint actualiza automáticamente la factura asociada como `PAGADA`.

---

### 9. Eliminar Factura (ADMIN)

Elimina una factura. Solo se puede eliminar si no tiene pagos asociados.

**Endpoint:** `DELETE /finanzas/facturas/:id`

**Permisos:** Solo ADMIN

**Request:**
```bash
curl -X DELETE "https://condominio-las-flores.localhost:3000/finanzas/facturas/770e8400-e29b-41d4-a716-446655440002" \
  -H "Cookie: better-auth.session_token=tu-session-token"
```

**Response (200 OK):**
```json
{
  "message": "Factura eliminada exitosamente"
}
```

**Errores posibles:**
- `400 Bad Request`: Si la factura tiene pagos asociados
- `404 Not Found`: Si la factura no existe

---

## Webhook de Wompi

### 10. Webhook de Wompi (Público)

Endpoint público que recibe notificaciones de Wompi cuando cambia el estado de un pago.

**Endpoint:** `POST /finanzas/webhook/wompi`

**Permisos:** Público (sin autenticación)

**Nota:** Este endpoint debe configurarse en el panel de Wompi. La URL completa sería:
`https://tu-dominio.com/finanzas/webhook/wompi`

**Request (enviado por Wompi):**
```bash
curl -X POST "https://condominio-las-flores.localhost:3000/finanzas/webhook/wompi" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "123456789",
        "status": "APPROVED",
        "amount_in_cents": 15000000,
        "currency": "COP",
        "reference": "FAC-FAC-2026-01-0001-1704168000000",
        "created_at": "2026-01-02T02:20:00.000Z",
        "finalized_at": "2026-01-02T02:25:00.000Z",
        "status_message": "Pago aprobado"
      }
    },
    "timestamp": "2026-01-02T02:25:00.000Z",
    "signature": "firma-de-seguridad"
  }'
```

**Response (200 OK):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "estado": "APROBADO",
  "fechaPago": "2026-01-02T02:25:00.000Z",
  ...
}
```

---

## Estados y Enums

### Estados de Factura

- `PENDIENTE`: Factura creada pero no enviada
- `ENVIADA`: Factura enviada al usuario
- `PAGADA`: Factura pagada completamente
- `VENCIDA`: Factura vencida sin pagar
- `CANCELADA`: Factura cancelada

### Estados de Pago

- `PENDIENTE`: Pago creado pero no iniciado
- `PROCESANDO`: Pago en proceso en Wompi
- `APROBADO`: Pago completado exitosamente
- `RECHAZADO`: Pago rechazado o fallido
- `CANCELADO`: Pago cancelado

### Métodos de Pago

- `WOMPI`: Pago mediante Wompi (tarjeta, PSE, etc.) - Se procesa automáticamente
- `EFECTIVO`: Pago en efectivo - Se marca como completado automáticamente al crear el pago

---

## Flujo de Facturación y Pago Recomendado

### Para Administradores (ADMIN)

1. **Crear facturas masivas para todas las unidades:**
   ```bash
   POST /finanzas/facturas/bulk
   {
     "periodo": "2026-01",
     "fechaEmision": "2026-01-01T00:00:00Z",
     "fechaVencimiento": "2026-01-31T23:59:59Z",
     "enviarFacturas": true
   }
   ```
   - Esto crea facturas para todas las unidades activas usando su `valorCuotaAdministracion`
   - Las facturas se asignan automáticamente al propietario o arrendatario de cada unidad

2. **Verificar facturas creadas:**
   ```bash
   GET /finanzas/facturas?periodo=2026-01
   ```

3. **Enviar facturas individuales si es necesario:**
   ```bash
   POST /finanzas/facturas/:id/enviar
   ```

### Para Usuarios (Propietarios/Arrendatarios)

1. **Usuario ve sus facturas pendientes:**
   ```bash
   GET /finanzas/facturas?estado=PENDIENTE
   ```

2. **Usuario selecciona una factura y crea el pago:**

   **Opción A - Pago con Wompi (tarjeta/PSE):**
   ```bash
   POST /finanzas/pagos
   {
     "facturaId": "770e8400-e29b-41d4-a716-446655440002",
     "metodoPago": "WOMPI"
   }
   ```
   - Se genera un `paymentLink` que el usuario debe usar
   - Frontend redirige al usuario al `paymentLink` recibido
   - Usuario completa el pago en Wompi
   - Wompi redirige al usuario a la `redirectUrl` configurada
   - Frontend consulta el estado del pago periódicamente

   **Opción B - Pago en Efectivo:**
   ```bash
   POST /finanzas/pagos
   {
     "facturaId": "770e8400-e29b-41d4-a716-446655440002",
     "metodoPago": "EFECTIVO",
     "observaciones": "Pago recibido"
   }
   ```
   - El pago se marca automáticamente como `APROBADO`
   - La factura se marca automáticamente como `PAGADA`
   - No requiere procesamiento externo

3. **Consultar estado del pago (solo para Wompi):**
   ```bash
   GET /finanzas/pagos/:id/estado
   ```

4. **Si el estado es `APROBADO`, mostrar confirmación. Si es `PROCESANDO`, mostrar mensaje de espera y consultar periódicamente.**

---

## Manejo de Errores

### Errores Comunes

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para ver esta factura",
  "error": "Forbidden"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Factura con ID 770e8400-e29b-41d4-a716-446655440002 no encontrada",
  "error": "Not Found"
}
```

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Esta factura ya está pagada",
  "error": "Bad Request"
}
```

**400 Bad Request (Error de Wompi):**
```json
{
  "statusCode": 400,
  "message": "Error al crear pago en Wompi: Tarjeta rechazada",
  "error": "Bad Request"
}
```

---

## Notas Importantes

1. **Autenticación:** Todos los endpoints requieren la cookie `better-auth.session_token` excepto el webhook de Wompi.

2. **Subdominios:** Los endpoints funcionan con subdominios. Ejemplo: `condominio-las-flores.localhost:3000`

3. **Formato de fechas:** Todas las fechas están en formato ISO 8601 (UTC).

4. **Moneda:** Los valores están en pesos colombianos (COP). Wompi requiere valores en centavos (multiplicar por 100).

5. **Webhook:** El webhook de Wompi debe configurarse en el panel de Wompi apuntando a: `https://tu-dominio.com/finanzas/webhook/wompi`

6. **Polling:** Si un pago está en estado `PROCESANDO`, se recomienda consultar el estado cada 5-10 segundos hasta que cambie a `APROBADO` o `RECHAZADO`.

7. **Números de factura:** Se generan automáticamente en formato `FAC-YYYY-MM-NNNN` (ej: `FAC-2026-01-0001`).

8. **Facturación masiva:** El endpoint `/finanzas/facturas/bulk` crea facturas automáticamente para todas las unidades activas usando su `valorCuotaAdministracion`. No es necesario especificar unidad por unidad. Solo requiere: período, fecha de emisión y fecha límite de pago.

9. **Valor de administración:** Cada unidad debe tener un `valorCuotaAdministracion` asignado en su configuración. Las unidades sin este valor o con valor 0 se omiten en la facturación masiva.

10. **Asignación automática:** Las facturas se asignan automáticamente al propietario o arrendatario de cada unidad. Si una unidad tiene ambos, se prioriza al propietario.

11. **Prevención de duplicados:** No se pueden crear facturas duplicadas para el mismo período. El sistema valida esto automáticamente.

---

## Ejemplos de Integración Frontend

### React/Next.js - Crear facturas masivas (ADMIN)

```typescript
// Crear facturas masivas para todas las unidades
const crearFacturasMasivas = async (periodo: string, fechaEmision: string, fechaVencimiento: string) => {
  const response = await fetch('/finanzas/facturas/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      periodo,
      fechaEmision,
      fechaVencimiento,
      enviarFacturas: true, // Enviar automáticamente
    }),
  });
  
  const resultado = await response.json();
  console.log(`Facturas creadas: ${resultado.total}`);
  return resultado;
};

// Ejemplo de uso
await crearFacturasMasivas(
  '2026-01',
  '2026-01-01T00:00:00Z',
  '2026-01-31T23:59:59Z'
);
```

### React/Next.js - Crear y procesar pago

```typescript
// Crear pago
const crearPago = async (facturaId: string) => {
  const response = await fetch('/finanzas/pagos?redirectUrl=' + encodeURIComponent(window.location.origin + '/pago-exitoso'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Importante para enviar cookies
    body: JSON.stringify({
      facturaId,
      metodoPago: 'WOMPI',
    }),
  });
  
  const pago = await response.json();
  
  // Redirigir al usuario al link de pago
  if (pago.paymentLink) {
    window.location.href = pago.paymentLink;
  }
};

// Consultar estado de pago
const consultarEstadoPago = async (pagoId: string) => {
  const response = await fetch(`/finanzas/pagos/${pagoId}/estado`, {
    credentials: 'include',
  });
  
  return await response.json();
};

// Polling para verificar estado
const verificarPago = async (pagoId: string) => {
  const interval = setInterval(async () => {
    const pago = await consultarEstadoPago(pagoId);
    
    if (pago.estado === 'APROBADO') {
      clearInterval(interval);
      // Mostrar confirmación
      alert('Pago aprobado exitosamente');
    } else if (pago.estado === 'RECHAZADO') {
      clearInterval(interval);
      // Mostrar error
      alert('El pago fue rechazado');
    }
  }, 5000); // Consultar cada 5 segundos
};

// Marcar pago como completado (ADMIN)
const marcarPagoCompletado = async (pagoId: string, observaciones?: string) => {
  const response = await fetch(`/finanzas/pagos/${pagoId}/completar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      observaciones,
    }),
  });
  
  return await response.json();
};

// Eliminar factura (ADMIN)
const eliminarFactura = async (facturaId: string) => {
  const response = await fetch(`/finanzas/facturas/${facturaId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  return await response.json();
};
```

---

## Soporte

Para más información o soporte, contactar al equipo de backend.

