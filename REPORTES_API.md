# API de Reportes para Administradores

Esta API permite generar diferentes tipos de reportes como administrador del condominio.

**Base URL:** `https://condominio-las-flores.localhost:3000/reportes`

**Autenticación:** Todos los endpoints requieren autenticación con cookie `better-auth.session_token` o Bearer token.

**Permisos:** Solo usuarios con rol `ADMIN` pueden acceder a estos endpoints.

---

## Endpoint Principal

### Generar Reporte

Genera un reporte según el tipo especificado. Soporta múltiples tipos de reportes y formatos de salida (JSON o CSV).

**Endpoint:** `POST /reportes/generar`

**Request Body:**
```json
{
  "tipoReporte": "PAGOS",
  "formato": "JSON",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-01-31",
  "periodo": "2026-01",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "estados": ["APROBADO", "PENDIENTE"],
  "incluirDetalles": false
}
```

**Campos:**
- `tipoReporte` (requerido): Tipo de reporte a generar. Valores posibles:
  - `PAGOS`: Reporte de pagos realizados
  - `FACTURAS`: Reporte de facturas emitidas
  - `CLIENTES`: Reporte de clientes/usuarios con su información financiera
  - `RESERVAS`: Reporte de reservas de espacios comunes
  - `RECAUDO`: Reporte de recaudo por período
  - `MOROSIDAD`: Reporte de facturas vencidas y morosidad
- `formato` (opcional): Formato de salida. Valores: `JSON` (default) o `CSV`
- `fechaInicio` (opcional): Fecha inicial del período (formato: YYYY-MM-DD)
- `fechaFin` (opcional): Fecha final del período (formato: YYYY-MM-DD)
- `periodo` (opcional): Período específico (formato: YYYY-MM)
- `unidadId` (opcional): Filtrar por ID de unidad
- `userId` (opcional): Filtrar por ID de usuario/cliente
- `estados` (opcional): Array de estados a filtrar (depende del tipo de reporte)
- `incluirDetalles` (opcional): Incluir detalles adicionales (default: false)

---

## Tipos de Reportes

### 1. Reporte de Pagos

Genera un reporte detallado de todos los pagos realizados.

**Ejemplo Request:**
```json
{
  "tipoReporte": "PAGOS",
  "formato": "JSON",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-01-31",
  "estados": ["APROBADO"]
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "PAGOS",
  "formato": "JSON",
  "datos": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "facturaId": "880e8400-e29b-41d4-a716-446655440001",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "valor": 150000,
      "metodoPago": "WOMPI",
      "estado": "APROBADO",
      "wompiTransactionId": "123456789",
      "fechaPago": "2026-01-15T10:30:00.000Z",
      "numeroFactura": "FAC-2026-01-0001",
      "periodo": "2026-01",
      "unidadIdentificador": "Casa 127",
      "usuarioNombre": "Juan Pérez",
      "usuarioEmail": "juan@example.com"
    }
  ],
  "total": 150,
  "resumen": {
    "totalPagos": 150,
    "totalRecaudado": 22500000,
    "totalFacturado": 30000000,
    "pagosAprobados": 140,
    "pagosPendientes": 8,
    "pagosRechazados": 2
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "2026-01-01 - 2026-01-31",
  "filtros": {
    "fechaInicio": "2026-01-01",
    "fechaFin": "2026-01-31",
    "estados": ["APROBADO"]
  }
}
```

---

### 2. Reporte de Facturas

Genera un reporte detallado de todas las facturas emitidas.

**Ejemplo Request:**
```json
{
  "tipoReporte": "FACTURAS",
  "formato": "JSON",
  "periodo": "2026-01",
  "estados": ["PAGADA", "PENDIENTE", "VENCIDA"]
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "FACTURAS",
  "formato": "JSON",
  "datos": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "numeroFactura": "FAC-2026-01-0001",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "periodo": "2026-01",
      "fechaEmision": "2026-01-01T00:00:00.000Z",
      "fechaVencimiento": "2026-01-31T23:59:59.000Z",
      "valor": 150000,
      "estado": "PAGADA",
      "fechaPago": "2026-01-15T10:30:00.000Z",
      "unidadIdentificador": "Casa 127",
      "usuarioNombre": "Juan Pérez",
      "totalPagado": 150000
    }
  ],
  "total": 200,
  "resumen": {
    "totalFacturas": 200,
    "totalFacturado": 30000000,
    "totalPagado": 26250000,
    "facturasPagadas": 175,
    "facturasPendientes": 20,
    "facturasVencidas": 5
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "2026-01",
  "filtros": {
    "periodo": "2026-01",
    "estados": ["PAGADA", "PENDIENTE", "VENCIDA"]
  }
}
```

---

### 3. Reporte de Clientes

Genera un reporte de todos los clientes/usuarios con su información financiera y de reservas.

**Ejemplo Request:**
```json
{
  "tipoReporte": "CLIENTES",
  "formato": "JSON"
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "CLIENTES",
  "formato": "JSON",
  "datos": [
    {
      "usuarioId": "990e8400-e29b-41d4-a716-446655440002",
      "usuarioNombre": "Juan Pérez",
      "usuarioEmail": "juan@example.com",
      "usuarioTelefono": "+57 300 123 4567",
      "usuarioRol": "PROPIETARIO",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "unidadIdentificador": "Casa 127",
      "unidadTipo": "CASA",
      "totalFacturas": 12,
      "facturasPagadas": 10,
      "facturasPendientes": 2,
      "facturasVencidas": 0,
      "totalPagado": 1500000,
      "totalPendiente": 300000,
      "totalReservas": 5,
      "reservasConfirmadas": 4
    }
  ],
  "total": 150,
  "resumen": {
    "totalClientes": 150,
    "totalFacturado": 22500000,
    "totalRecaudado": 20000000,
    "clientesConMorosidad": 5,
    "clientesAlDia": 145
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "Todos los períodos",
  "filtros": {}
}
```

---

### 4. Reporte de Reservas

Genera un reporte de todas las reservas de espacios comunes.

**Ejemplo Request:**
```json
{
  "tipoReporte": "RESERVAS",
  "formato": "JSON",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-01-31",
  "estados": ["CONFIRMADA", "PENDIENTE"]
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "RESERVAS",
  "formato": "JSON",
  "datos": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "espacioComunId": "bb0e8400-e29b-41d4-a716-446655440001",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "fechaInicio": "2026-01-15T14:00:00.000Z",
      "fechaFin": "2026-01-15T18:00:00.000Z",
      "cantidadPersonas": 20,
      "estado": "CONFIRMADA",
      "motivo": "Cumpleaños",
      "precioTotal": 50000,
      "espacioNombre": "Salón Social",
      "espacioTipo": "SALON_SOCIAL",
      "unidadIdentificador": "Casa 127",
      "usuarioNombre": "Juan Pérez"
    }
  ],
  "total": 75,
  "resumen": {
    "totalReservas": 75,
    "totalConfirmadas": 60,
    "totalCanceladas": 10,
    "totalPendientes": 5,
    "totalIngresos": 3000000
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "2026-01-01 - 2026-01-31",
  "filtros": {
    "fechaInicio": "2026-01-01",
    "fechaFin": "2026-01-31",
    "estados": ["CONFIRMADA", "PENDIENTE"]
  }
}
```

---

### 5. Reporte de Recaudo

Genera un reporte de recaudo agrupado por período.

**Ejemplo Request:**
```json
{
  "tipoReporte": "RECAUDO",
  "formato": "JSON",
  "fechaInicio": "2025-07-01",
  "fechaFin": "2026-01-31"
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "RECAUDO",
  "formato": "JSON",
  "datos": [
    {
      "periodo": "2026-01",
      "totalFacturas": 200,
      "facturasPagadas": 175,
      "totalFacturado": 30000000,
      "totalRecaudado": 26250000,
      "unidadesFacturadas": 200,
      "unidadesPagadas": 175
    },
    {
      "periodo": "2025-12",
      "totalFacturas": 200,
      "facturasPagadas": 190,
      "totalFacturado": 30000000,
      "totalRecaudado": 28500000,
      "unidadesFacturadas": 200,
      "unidadesPagadas": 190
    }
  ],
  "total": 6,
  "resumen": {
    "totalFacturado": 180000000,
    "totalRecaudado": 165000000,
    "porcentajeRecaudo": 91.67,
    "periodos": 6
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "2025-07-01 - 2026-01-31",
  "filtros": {
    "fechaInicio": "2025-07-01",
    "fechaFin": "2026-01-31"
  }
}
```

---

### 6. Reporte de Morosidad

Genera un reporte de facturas vencidas y unidades en morosidad.

**Ejemplo Request:**
```json
{
  "tipoReporte": "MOROSIDAD",
  "formato": "JSON"
}
```

**Response (200 OK) - JSON:**
```json
{
  "tipoReporte": "MOROSIDAD",
  "formato": "JSON",
  "datos": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "numeroFactura": "FAC-2025-12-0001",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "periodo": "2025-12",
      "fechaEmision": "2025-12-01T00:00:00.000Z",
      "fechaVencimiento": "2025-12-31T23:59:59.000Z",
      "valor": 150000,
      "estado": "VENCIDA",
      "diasVencida": 31,
      "unidadIdentificador": "Casa 127",
      "usuarioNombre": "Juan Pérez",
      "usuarioEmail": "juan@example.com",
      "usuarioTelefono": "+57 300 123 4567"
    }
  ],
  "total": 25,
  "resumen": {
    "totalFacturasVencidas": 25,
    "totalMorosidad": 3750000,
    "unidadesMorosas": 20,
    "promedioDiasVencida": 15.5
  },
  "fechaGeneracion": "2026-01-31T23:59:59.000Z",
  "periodo": "Todos los períodos",
  "filtros": {}
}
```

---

## Exportar a CSV

Para exportar un reporte a CSV, simplemente cambia el formato a `CSV`:

**Ejemplo Request:**
```json
{
  "tipoReporte": "PAGOS",
  "formato": "CSV",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-01-31"
}
```

**Response (200 OK) - CSV:**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="reporte-pagos-2026-01-01-2026-01-31-2026-01-31.csv"`
- Body: Archivo CSV descargable

El archivo CSV incluye todas las columnas de los datos y puede abrirse directamente en Excel o Google Sheets.

---

## Ejemplos de Uso

### React/Next.js - Generar Reporte JSON

```typescript
const generarReporte = async (tipoReporte: string, filtros: any) => {
  const response = await fetch('/reportes/generar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      tipoReporte,
      formato: 'JSON',
      ...filtros,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al generar reporte');
  }

  return await response.json();
};

// Uso
const reportePagos = await generarReporte('PAGOS', {
  fechaInicio: '2026-01-01',
  fechaFin: '2026-01-31',
  estados: ['APROBADO'],
});
```

### React/Next.js - Descargar Reporte CSV

```typescript
const descargarReporteCSV = async (tipoReporte: string, filtros: any) => {
  const response = await fetch('/reportes/generar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      tipoReporte,
      formato: 'CSV',
      ...filtros,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al generar reporte');
  }

  // Obtener el nombre del archivo del header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : `reporte-${tipoReporte.toLowerCase()}.csv`;

  // Crear blob y descargar
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Uso
await descargarReporteCSV('FACTURAS', {
  periodo: '2026-01',
});
```

---

## Filtros por Tipo de Reporte

### Pagos
- Estados válidos: `PENDIENTE`, `PROCESANDO`, `APROBADO`, `RECHAZADO`, `CANCELADO`

### Facturas
- Estados válidos: `PENDIENTE`, `ENVIADA`, `PAGADA`, `VENCIDA`, `CANCELADA`

### Reservas
- Estados válidos: `PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `COMPLETADA`

### Clientes, Recaudo, Morosidad
- No aplican filtros de estado específicos

---

## Notas Importantes

1. **Autenticación:** Todos los endpoints requieren la cookie `better-auth.session_token` o Bearer token.

2. **Subdominios:** Los endpoints funcionan con subdominios. Ejemplo: `condominio-las-flores.localhost:3000`

3. **Formato de fechas:** Todas las fechas están en formato ISO 8601 (UTC) o YYYY-MM-DD para filtros.

4. **Moneda:** Los valores están en pesos colombianos (COP).

5. **Permisos:** Solo usuarios con rol `ADMIN` pueden acceder a estos endpoints.

6. **Rendimiento:** Los reportes pueden tardar más tiempo si incluyen muchos datos. Se recomienda usar filtros de fecha para limitar el volumen.

7. **CSV Encoding:** Los archivos CSV incluyen BOM UTF-8 para compatibilidad con Excel.

8. **Límites:** No hay límites explícitos, pero se recomienda usar filtros de fecha para reportes grandes.

---

## Errores Comunes

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "No autorizado - se requiere rol ADMIN"
}
```
**Solución:** Verificar que el usuario tenga rol ADMIN.

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Subdominio no detectado"
}
```
**Solución:** Asegurarse de que la petición se haga desde el subdominio correcto del condominio.

### 400 Bad Request - Tipo de reporte inválido
```json
{
  "statusCode": 400,
  "message": "Tipo de reporte no válido: INVALIDO"
}
```
**Solución:** Verificar que `tipoReporte` sea uno de los valores válidos: `PAGOS`, `FACTURAS`, `CLIENTES`, `RESERVAS`, `RECAUDO`, `MOROSIDAD`.

