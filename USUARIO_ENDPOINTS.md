# Endpoints de Usuario/Residente

## Autenticación
Todos los endpoints requieren autenticación mediante cookie de sesión:
```
Cookie: better-auth.session_token=<token>
```

Reemplaza `<token>` con tu token de sesión válido.

---

## 📊 PAGOS

### 1. Obtener Estado de la Unidad
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/pagos/estado-unidad' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
{
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "identificador": "Apto 101",
  "tipo": "APARTAMENTO",
  "facturasPendientes": 2,
  "facturasVencidas": 1,
  "facturasPagadas": 15,
  "montoPendiente": 450000,
  "montoVencido": 200000,
  "proximoVencimiento": "2025-01-15T00:00:00.000Z",
  "estaAlDia": false
}
```

---

### 2. Obtener Próximo Pago
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/pagos/proximo-pago' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "numeroFactura": "FAC-2025-001",
  "periodo": "2025-01",
  "fechaEmision": "2025-01-01T00:00:00.000Z",
  "fechaVencimiento": "2025-01-15T00:00:00.000Z",
  "valor": 250000,
  "descripcion": "Cuota de administración enero 2025",
  "estado": "PENDIENTE",
  "observaciones": null,
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Apto 101",
    "tipo": "APARTAMENTO"
  }
}
```

---

### 3. Obtener Historial de Pagos
```bash
# Primera página (20 resultados por defecto)
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/pagos/historial?page=1&limit=20' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'

# Con paginación personalizada
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/pagos/historial?page=2&limit=10' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "numeroFactura": "FAC-2025-001",
      "periodo": "2025-01",
      "fechaEmision": "2025-01-01T00:00:00.000Z",
      "fechaVencimiento": "2025-01-15T00:00:00.000Z",
      "valor": 250000,
      "descripcion": "Cuota de administración enero 2025",
      "estado": "PAGADA",
      "fechaPago": "2025-01-10T14:30:00.000Z",
      "observaciones": null,
      "pagos": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "valor": 250000,
          "metodoPago": "WOMPI",
          "estado": "APROBADO",
          "fechaPago": "2025-01-10T14:30:00.000Z",
          "createdAt": "2025-01-10T14:25:00.000Z"
        }
      ]
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

## 🏢 RESERVAS

### 4. Obtener Reservas de la Semana
```bash
# Semana actual
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas/semana' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'

# Semana específica
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas/semana?fechaInicio=2025-01-06T00:00:00.000Z' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "espacioComunId": "990e8400-e29b-41d4-a716-446655440004",
    "fechaInicio": "2025-01-06T10:00:00.000Z",
    "fechaFin": "2025-01-06T14:00:00.000Z",
    "cantidadPersonas": null,
    "estado": "CONFIRMADA",
    "motivo": "Celebración de cumpleaños",
    "observaciones": null,
    "precioTotal": 50000,
    "createdAt": "2025-01-01T08:00:00.000Z",
    "espacioComun": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "nombre": "Salón Social",
      "tipo": "SALON_SOCIAL",
      "capacidad": 50,
      "descripcion": "Salón para eventos sociales",
      "imagen": "https://vekino.s3.us-east-1.amazonaws.com/espacios/..."
    }
  }
]
```

---

### 5. Obtener Mis Reservas (con paginación)
```bash
# Primera página
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas?page=1&limit=20' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'

# Segunda página con 10 resultados
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas?page=2&limit=10' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "espacioComunId": "990e8400-e29b-41d4-a716-446655440004",
      "fechaInicio": "2025-01-15T10:00:00.000Z",
      "fechaFin": "2025-01-15T14:00:00.000Z",
      "cantidadPersonas": null,
      "estado": "PENDIENTE",
      "motivo": "Celebración de cumpleaños",
      "observaciones": null,
      "precioTotal": 50000,
      "createdAt": "2025-01-10T08:00:00.000Z",
      "updatedAt": "2025-01-10T08:00:00.000Z",
      "espacioComun": {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "nombre": "Salón Social",
        "tipo": "SALON_SOCIAL",
        "capacidad": 50,
        "descripcion": "Salón para eventos sociales",
        "imagen": "https://vekino.s3.us-east-1.amazonaws.com/espacios/..."
      }
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 6. Obtener Espacios Disponibles
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas/espacios-disponibles' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "nombre": "Salón Social",
    "tipo": "SALON_SOCIAL",
    "capacidad": 50,
    "descripcion": "Salón para eventos sociales",
    "unidadTiempo": "HORA",
    "precioPorUnidad": 50000,
    "activo": true,
    "imagen": "https://vekino.s3.us-east-1.amazonaws.com/espacios/...",
    "horariosDisponibilidad": {
      "lunes": { "inicio": "08:00", "fin": "22:00" },
      "martes": { "inicio": "08:00", "fin": "22:00" }
    },
    "requiereAprobacion": true
  },
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "nombre": "Zona BBQ",
    "tipo": "ZONA_BBQ",
    "capacidad": 20,
    "descripcion": "Zona de parrilla y asados",
    "unidadTiempo": "HORA",
    "precioPorUnidad": 30000,
    "activo": true,
    "imagen": null,
    "horariosDisponibilidad": null,
    "requiereAprobacion": false
  }
]
```

---

### 7. Obtener Horas Disponibles de un Espacio
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas/espacios/990e8400-e29b-41d4-a716-446655440004/horas-disponibles?fecha=2025-01-15T00:00:00.000Z' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Respuesta esperada:**
```json
{
  "espacio": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "nombre": "Salón Social",
    "horariosDisponibilidad": {
      "lunes": { "inicio": "08:00", "fin": "22:00" },
      "martes": { "inicio": "08:00", "fin": "22:00" }
    },
    "unidadTiempo": "HORA"
  },
  "horasOcupadas": [
    {
      "inicio": "2025-01-15T10:00:00.000Z",
      "fin": "2025-01-15T12:00:00.000Z",
      "estado": "CONFIRMADA"
    },
    {
      "inicio": "2025-01-15T14:00:00.000Z",
      "fin": "2025-01-15T16:00:00.000Z",
      "estado": "PENDIENTE"
    }
  ]
}
```

---

### 8. Crear Nueva Reserva
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/usuario/reservas' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
  --data '{
    "espacioComunId": "990e8400-e29b-41d4-a716-446655440004",
    "fechaInicio": "2025-01-20T10:00:00.000Z",
    "fechaFin": "2025-01-20T14:00:00.000Z",
    "motivo": "Celebración de cumpleaños"
  }'
```

**Respuesta esperada:**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "espacioComunId": "990e8400-e29b-41d4-a716-446655440004",
  "userId": "cc0e8400-e29b-41d4-a716-446655440007",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "fechaInicio": "2025-01-20T10:00:00.000Z",
  "fechaFin": "2025-01-20T14:00:00.000Z",
  "cantidadPersonas": null,
  "estado": "PENDIENTE",
  "motivo": "Celebración de cumpleaños",
  "observaciones": null,
  "precioTotal": null,
  "createdAt": "2025-01-10T15:30:00.000Z",
  "updatedAt": "2025-01-10T15:30:00.000Z",
  "espacioComun": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "nombre": "Salón Social",
    "tipo": "SALON_SOCIAL",
    "capacidad": 50,
    "descripcion": "Salón para eventos sociales",
    "unidadTiempo": "HORA",
    "precioPorUnidad": 50000,
    "activo": true,
    "imagen": "https://vekino.s3.us-east-1.amazonaws.com/espacios/...",
    "horariosDisponibilidad": {
      "lunes": { "inicio": "08:00", "fin": "22:00" }
    },
    "requiereAprobacion": true
  },
  "user": {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Apto 101"
  }
}
```

---

## 🔐 Notas Importantes

1. **Autenticación**: Todos los endpoints requieren una cookie de sesión válida. Obtén el token iniciando sesión primero.

2. **Subdominio**: Reemplaza `condominio-las-flores-actualizado.localhost:3001` con tu subdominio real (ej: `condominio-tu-nombre.vekino.site`).

3. **Producción**: En producción, usa HTTPS:
   ```bash
   curl --location 'https://condominio-tu-nombre.vekino.site/usuario/pagos/estado-unidad' \
     --header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
   ```

4. **Errores comunes**:
   - `400 Bad Request - Usuario no encontrado en la sesión`: No hay sesión activa o el token es inválido
   - `400 Bad Request - El usuario no está asociado a ninguna unidad`: El usuario no tiene unidad asignada (solo para endpoints de pagos)
   - `400 Bad Request - El espacio ya está reservado en ese horario`: Hay conflicto con otra reserva
   - `404 Not Found`: El recurso solicitado no existe

5. **Paginación**: Los endpoints de listado (`/historial`, `/reservas`) soportan paginación con `page` y `limit`. Por defecto: `page=1`, `limit=20`.

