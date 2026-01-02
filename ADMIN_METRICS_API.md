# API de Métricas para Administradores

Esta API proporciona métricas y gráficas para el dashboard del administrador del condominio.

**Base URL:** `https://condominio-las-flores.localhost:3000/admin-metrics`

**Autenticación:** Todos los endpoints requieren autenticación con cookie `better-auth.session_token` o Bearer token.

**Permisos:** Solo usuarios con rol `ADMIN` pueden acceder a estos endpoints.

---

## Endpoints Disponibles

### 1. Dashboard Overview

Obtiene el resumen principal del dashboard con todas las métricas clave.

**Endpoint:** `GET /admin-metrics/dashboard`

**Response (200 OK):**
```json
{
  "totalUnidades": 200,
  "unidadesOcupadas": 150,
  "unidadesVacias": 50,
  "reservasActivas": 12,
  "recaudoMensual": 87.5,
  "totalFacturadoMes": 30000000,
  "totalRecaudadoMes": 26250000,
  "pagosPendientes": 25,
  "facturasVencidas": 5,
  "unidadesMorosas": 3
}
```

**Campos:**
- `totalUnidades`: Total de unidades en el condominio
- `unidadesOcupadas`: Unidades con estado OCUPADA
- `unidadesVacias`: Unidades con estado VACIA
- `reservasActivas`: Reservas confirmadas o pendientes con fecha futura
- `recaudoMensual`: Porcentaje de recaudo del mes actual (0-100)
- `totalFacturadoMes`: Total facturado en el mes actual (COP)
- `totalRecaudadoMes`: Total recaudado en el mes actual (COP)
- `pagosPendientes`: Cantidad de pagos en estado PENDIENTE o PROCESANDO
- `facturasVencidas`: Cantidad de facturas vencidas
- `unidadesMorosas`: Cantidad de unidades con facturas vencidas

---

### 2. Estados de Cuenta

Obtiene la distribución de unidades por estado de pago.

**Endpoint:** `GET /admin-metrics/estados-cuenta`

**Response (200 OK):**
```json
{
  "pagosAlDia": 175,
  "pagosPendientes": 20,
  "morosidad": 5,
  "totalUnidadesConFacturas": 200
}
```

**Campos:**
- `pagosAlDia`: Unidades con facturas pagadas o pendientes sin vencer
- `pagosPendientes`: Unidades con facturas pendientes sin vencer
- `morosidad`: Unidades con facturas vencidas
- `totalUnidadesConFacturas`: Total de unidades que tienen facturas

---

### 3. Actividad Reciente

Obtiene las actividades recientes del condominio (pagos, reservas, facturas).

**Endpoint:** `GET /admin-metrics/actividad-reciente`

**Query Parameters:**
- `limit` (opcional): Cantidad de actividades a retornar (default: 10)
- `tipos` (opcional): Array de tipos de actividad a filtrar. Valores posibles:
  - `PAGO_PROCESADO`
  - `NUEVA_RESERVA`
  - `FACTURA_CREADA`
  - `FACTURA_VENCIDA`
  - `RESERVA_CANCELADA`

**Ejemplo:**
```bash
GET /admin-metrics/actividad-reciente?limit=20&tipos=PAGO_PROCESADO&tipos=NUEVA_RESERVA
```

**Response (200 OK):**
```json
{
  "actividades": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tipo": "PAGO_PROCESADO",
      "titulo": "Pago procesado",
      "descripcion": "Casa 127 - $450.000",
      "fecha": "2026-01-15T10:30:00.000Z",
      "metadata": {
        "valor": 450000,
        "unidad": "Casa 127",
        "usuario": "Juan Pérez"
      }
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "tipo": "NUEVA_RESERVA",
      "titulo": "Nueva reserva",
      "descripcion": "Salón Social - Casa 89",
      "fecha": "2026-01-15T09:15:00.000Z",
      "metadata": {
        "espacio": "Salón Social",
        "unidad": "Casa 89"
      }
    }
  ],
  "total": 2
}
```

---

### 4. Recaudo Mensual

Obtiene el recaudo mensual con datos para gráficas.

**Endpoint:** `GET /admin-metrics/recaudo-mensual`

**Query Parameters:**
- `meses` (opcional): Cantidad de meses a retornar (default: 6)

**Response (200 OK):**
```json
{
  "datos": [
    {
      "mes": "2026-01",
      "facturado": 30000000,
      "recaudado": 26250000,
      "porcentajeRecaudo": 87.5,
      "facturasEmitidas": 200,
      "facturasPagadas": 175
    },
    {
      "mes": "2025-12",
      "facturado": 30000000,
      "recaudado": 28500000,
      "porcentajeRecaudo": 95.0,
      "facturasEmitidas": 200,
      "facturasPagadas": 190
    }
  ],
  "promedioRecaudo": 91.25
}
```

**Uso para gráficas:**
- **Gráfica de barras:** Mostrar `facturado` vs `recaudado` por mes
- **Gráfica de línea:** Mostrar `porcentajeRecaudo` por mes
- **Indicador:** Mostrar `promedioRecaudo` como KPI

---

### 5. Pagos por Estado

Obtiene la distribución de pagos agrupados por estado.

**Endpoint:** `GET /admin-metrics/pagos-por-estado`

**Response (200 OK):**
```json
{
  "distribucion": [
    {
      "estado": "APROBADO",
      "cantidad": 150,
      "valorTotal": 22500000,
      "porcentaje": 75.0
    },
    {
      "estado": "PENDIENTE",
      "cantidad": 25,
      "valorTotal": 3750000,
      "porcentaje": 12.5
    },
    {
      "estado": "PROCESANDO",
      "cantidad": 15,
      "valorTotal": 2250000,
      "porcentaje": 7.5
    },
    {
      "estado": "RECHAZADO",
      "cantidad": 10,
      "valorTotal": 1500000,
      "porcentaje": 5.0
    }
  ],
  "totalPagos": 200,
  "valorTotal": 30000000
}
```

**Uso para gráficas:**
- **Gráfica de dona/pie:** Mostrar distribución por estado usando `porcentaje`
- **Tabla:** Mostrar cantidad y valor total por estado

---

### 6. Gráficas de Reservas

Obtiene datos de reservas para gráficas (por estado y por mes).

**Endpoint:** `GET /admin-metrics/reservas-graficas`

**Query Parameters:**
- `meses` (opcional): Cantidad de meses a analizar (default: 6)

**Response (200 OK):**
```json
{
  "porEstado": [
    {
      "estado": "CONFIRMADA",
      "cantidad": 45,
      "porcentaje": 60.0
    },
    {
      "estado": "PENDIENTE",
      "cantidad": 20,
      "porcentaje": 26.67
    },
    {
      "estado": "CANCELADA",
      "cantidad": 8,
      "porcentaje": 10.67
    },
    {
      "estado": "COMPLETADA",
      "cantidad": 2,
      "porcentaje": 2.67
    }
  ],
  "porMes": [
    {
      "mes": "2026-01",
      "cantidad": 25,
      "confirmadas": 15,
      "canceladas": 3
    },
    {
      "mes": "2025-12",
      "cantidad": 30,
      "confirmadas": 20,
      "canceladas": 5
    }
  ],
  "totalReservas": 75
}
```

**Uso para gráficas:**
- **Gráfica de dona/pie:** Mostrar `porEstado` usando `porcentaje`
- **Gráfica de barras apiladas:** Mostrar `porMes` con `confirmadas` y `canceladas`
- **Gráfica de línea:** Mostrar tendencia de `cantidad` por mes

---

### 7. Top Unidades por Recaudo

Obtiene las unidades con mayor recaudo.

**Endpoint:** `GET /admin-metrics/top-unidades-recaudo`

**Query Parameters:**
- `limit` (opcional): Cantidad de unidades a retornar (default: 10)
- `periodo` (opcional): Período a analizar (formato: YYYY-MM). Si no se especifica, usa últimos 3 meses.

**Response (200 OK):**
```json
{
  "unidades": [
    {
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "identificador": "Casa 127",
      "totalRecaudado": 1350000,
      "pagosCompletados": 3,
      "porcentajeCumplimiento": 100.0
    },
    {
      "unidadId": "660e8400-e29b-41d4-a716-446655440001",
      "identificador": "Apto 501",
      "totalRecaudado": 1200000,
      "pagosCompletados": 3,
      "porcentajeCumplimiento": 100.0
    }
  ],
  "periodo": "2026-01"
}
```

**Uso:**
- **Tabla de ranking:** Mostrar top unidades con mejor cumplimiento
- **Gráfica de barras horizontales:** Mostrar `totalRecaudado` por unidad

---

### 8. Reporte Completo

Genera un reporte completo con todas las métricas y gráficas.

**Endpoint:** `GET /admin-metrics/reporte`

**Query Parameters:**
- `mesInicio` (opcional): Mes inicial (formato: YYYY-MM)
- `mesFin` (opcional): Mes final (formato: YYYY-MM)
- `incluirGraficas` (opcional): Incluir gráficas detalladas (default: true)

**Response (200 OK):**
```json
{
  "resumen": {
    "totalUnidades": 200,
    "unidadesOcupadas": 150,
    "unidadesVacias": 50,
    "reservasActivas": 12,
    "recaudoMensual": 87.5,
    "totalFacturadoMes": 30000000,
    "totalRecaudadoMes": 26250000,
    "pagosPendientes": 25,
    "facturasVencidas": 5,
    "unidadesMorosas": 3
  },
  "estadosCuenta": {
    "pagosAlDia": 175,
    "pagosPendientes": 20,
    "morosidad": 5,
    "totalUnidadesConFacturas": 200
  },
  "actividadReciente": {
    "actividades": [...],
    "total": 20
  },
  "recaudoMensual": {
    "datos": [...],
    "promedioRecaudo": 91.25
  },
  "pagosPorEstado": {
    "distribucion": [...],
    "totalPagos": 200,
    "valorTotal": 30000000
  },
  "reservas": {
    "porEstado": [...],
    "porMes": [...],
    "totalReservas": 75
  },
  "topUnidades": {
    "unidades": [...],
    "periodo": "Últimos 3 meses"
  },
  "fechaGeneracion": "2026-01-15T10:30:00.000Z",
  "periodo": "Últimos 6 meses (hasta 2026-01)"
}
```

**Uso:**
- **Exportar PDF:** Generar reporte completo para impresión o archivo
- **Dashboard completo:** Mostrar todas las métricas en una sola vista

---

## Ejemplos de Uso

### React/Next.js - Dashboard Overview

```typescript
const obtenerDashboard = async () => {
  const response = await fetch('/admin-metrics/dashboard', {
    method: 'GET',
    credentials: 'include', // Importante para enviar cookies
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener métricas');
  }
  
  return await response.json();
};
```

### React/Next.js - Gráfica de Recaudo Mensual

```typescript
const obtenerRecaudoMensual = async (meses: number = 6) => {
  const response = await fetch(`/admin-metrics/recaudo-mensual?meses=${meses}`, {
    method: 'GET',
    credentials: 'include',
  });
  
  const data = await response.json();
  
  // Preparar datos para Chart.js
  const chartData = {
    labels: data.datos.map((d: any) => d.mes),
    datasets: [
      {
        label: 'Facturado',
        data: data.datos.map((d: any) => d.facturado),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Recaudado',
        data: data.datos.map((d: any) => d.recaudado),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
      },
    ],
  };
  
  return chartData;
};
```

### React/Next.js - Actividad Reciente

```typescript
const obtenerActividadReciente = async (limit: number = 10) => {
  const response = await fetch(
    `/admin-metrics/actividad-reciente?limit=${limit}`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );
  
  const data = await response.json();
  
  // Renderizar actividades
  return data.actividades.map((actividad: any) => ({
    id: actividad.id,
    tipo: actividad.tipo,
    titulo: actividad.titulo,
    descripcion: actividad.descripcion,
    fecha: new Date(actividad.fecha),
    icono: obtenerIconoPorTipo(actividad.tipo),
  }));
};
```

---

## Tipos de Actividad

- **PAGO_PROCESADO**: Pago completado exitosamente
- **NUEVA_RESERVA**: Nueva reserva creada (confirmada o pendiente)
- **FACTURA_CREADA**: Nueva factura generada
- **FACTURA_VENCIDA**: Factura que ha vencido
- **RESERVA_CANCELADA**: Reserva cancelada

---

## Notas Importantes

1. **Autenticación:** Todos los endpoints requieren la cookie `better-auth.session_token` o Bearer token.

2. **Subdominios:** Los endpoints funcionan con subdominios. Ejemplo: `condominio-las-flores.localhost:3000`

3. **Formato de fechas:** Todas las fechas están en formato ISO 8601 (UTC).

4. **Moneda:** Los valores están en pesos colombianos (COP).

5. **Permisos:** Solo usuarios con rol `ADMIN` pueden acceder a estos endpoints.

6. **Rendimiento:** Los endpoints están optimizados para consultas rápidas. El endpoint de reporte completo puede tardar más tiempo.

7. **Caché:** Se recomienda implementar caché en el frontend para las métricas que no cambian frecuentemente (ej: recaudo mensual histórico).

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

