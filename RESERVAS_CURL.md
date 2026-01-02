# Documentación de Endpoints de Reservas y Espacios Comunes

Esta documentación contiene todos los endpoints para gestionar espacios comunes y reservas en el sistema de condominios.

## Configuración Base

**Base URL (con subdominio):** `http://condominio-las-flores-actualizado.localhost:3001`

**Autenticación:** Los endpoints requieren autenticación mediante cookie de sesión `better-auth.session_token`.

### 1. Login como ADMIN (obtener cookie de sesión)

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/condominios/login' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: better-auth.session_token=TU_TOKEN_ANTERIOR' \
  -d '{
    "email": "admin@condominio.com",
    "password": "tu_password"
  }' \
  -c cookies.txt \
  -v
```

La cookie se guardará en `cookies.txt`. Para usar en siguientes requests:

```bash
curl -b cookies.txt ...
```

---

## ESPACIOS COMUNES (Solo ADMIN puede crear/editar/eliminar)

### 1. Crear Espacio Común (ADMIN)

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt \
  -d '{
    "nombre": "Salón Social",
    "tipo": "SALON_SOCIAL",
    "capacidad": 50,
    "descripcion": "Salón para eventos sociales con capacidad para 50 personas",
    "unidadTiempo": "HORAS",
    "precioPorUnidad": 50000,
    "activo": true,
    "horariosDisponibilidad": "[{\"dia\": 1, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}, {\"dia\": 2, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}]",
    "requiereAprobacion": true
  }'
```

**Tipos de espacio disponibles:**
- `SALON_SOCIAL`
- `ZONA_BBQ`
- `SAUNA`
- `CASA_EVENTOS`
- `GIMNASIO`
- `PISCINA`
- `CANCHA_DEPORTIVA`
- `PARQUEADERO`
- `OTRO`

**Unidades de tiempo:**
- `HORAS`
- `DIAS`
- `MESES`

**Horarios de Disponibilidad (`horariosDisponibilidad`):**

Es un JSON string que define en qué días de la semana y horarios está disponible el espacio. El formato es un array de objetos con `dia`, `horaInicio` y `horaFin`.

**Mapeo de días (0-6):**
- `0` = **Domingo**
- `1` = **Lunes**
- `2` = **Martes**
- `3` = **Miércoles**
- `4` = **Jueves**
- `5` = **Viernes**
- `6` = **Sábado**

**Ejemplos de horariosDisponibilidad:**

**Lunes a Viernes 9:00 AM - 10:00 PM:**
```json
"[{\"dia\": 1, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}, {\"dia\": 2, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}, {\"dia\": 3, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}, {\"dia\": 4, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}, {\"dia\": 5, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}]"
```
*Disponible: Lunes, Martes, Miércoles, Jueves, Viernes de 9:00 AM a 10:00 PM*

**Sábados y Domingos 8:00 AM - 6:00 PM:**
```json
"[{\"dia\": 0, \"horaInicio\": \"08:00\", \"horaFin\": \"18:00\"}, {\"dia\": 6, \"horaInicio\": \"08:00\", \"horaFin\": \"18:00\"}]"
```
*Disponible: Domingo y Sábado de 8:00 AM a 6:00 PM*

**Solo Martes y Miércoles 10:00 AM - 8:00 PM:**
```json
"[{\"dia\": 2, \"horaInicio\": \"10:00\", \"horaFin\": \"20:00\"}, {\"dia\": 3, \"horaInicio\": \"10:00\", \"horaFin\": \"20:00\"}]"
```
*Disponible: Martes y Miércoles de 10:00 AM a 8:00 PM*

**Todos los días 24 horas (opcional, si no se especifica se permite cualquier horario):**
```json
"[{\"dia\": 0, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 1, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 2, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 3, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 4, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 5, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}, {\"dia\": 6, \"horaInicio\": \"00:00\", \"horaFin\": \"23:59\"}]"
```
*Disponible: Todos los días las 24 horas*

**Nota importante:** 
- El sistema valida automáticamente que las reservas solo se puedan hacer en los **días** y **horarios** definidos en `horariosDisponibilidad`. 
- Si intentas crear una reserva en un día que no está en la lista (ej: reservar un jueves cuando solo está disponible lunes y martes), recibirás un error.
- Si intentas crear una reserva fuera de los horarios permitidos (ej: reservar a las 23:00 cuando el espacio solo está disponible hasta las 22:00), recibirás un error.
- Si no especificas `horariosDisponibilidad`, el espacio estará disponible todos los días a cualquier hora.

### 2. Listar Todos los Espacios Comunes

**Todos los usuarios pueden ver espacios comunes:**

```bash
# Ver todos los espacios
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt

# Ver solo espacios activos
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios?activo=true' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt

# Ver solo espacios inactivos
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios?activo=false' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

### 3. Obtener Espacio Común por ID

```bash
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

### 4. Actualizar Espacio Común (ADMIN)

```bash
curl -X PUT 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt \
  -d '{
    "nombre": "Salón Social Actualizado",
    "capacidad": 60,
    "precioPorUnidad": 60000,
    "activo": true
  }'
```

### 5. Eliminar Espacio Común (ADMIN)

```bash
curl -X DELETE 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

**Nota:** No se puede eliminar un espacio común si tiene reservas activas (PENDIENTE o CONFIRMADA).

---

## RESERVAS (Todos los usuarios pueden crear reservas, ADMIN puede gestionarlas todas)

### 1. Crear Reserva (Cualquier Usuario)

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt \
  -d '{
    "espacioComunId": "550e8400-e29b-41d4-a716-446655440000",
    "unidadId": "660e8400-e29b-41d4-a716-446655440001",
    "fechaInicio": "2025-01-15T10:00:00.000Z",
    "fechaFin": "2025-01-15T14:00:00.000Z",
    "motivo": "Celebración de cumpleaños"
  }'
```

**Campos opcionales:**
- `unidadId`: Solo si es necesario relacionar con una unidad
- `motivo`: Motivo de la reserva

**Campos removidos:**
- `cantidadPersonas`: Ya no es necesario (removido del formulario)
- `observaciones`: Solo ADMIN puede agregar observaciones cuando aprueba/edita una reserva

**Nota:** 
- El estado inicial será `PENDIENTE` si el espacio requiere aprobación, o `CONFIRMADA` si no requiere aprobación.
- El sistema valida automáticamente que no haya conflictos de horarios (no permite reservas solapadas).
- Si hay una reserva de 2:00 PM a 4:00 PM, otra reserva de 2:10 PM a 4:10 PM no será permitida porque se solapan.

### 2. Ver Todas las Reservas ⭐

**ADMIN ve todas las reservas, usuarios ven solo las suyas:**

```bash
# Ver todas las reservas (ADMIN ve todas, usuarios ven solo las suyas)
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt

# Ver todas las reservas (con cookie de sesión - forma recomendada)
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas' \
  -b cookies.txt

# Ver reservas con paginación
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?page=1&limit=10' \
  -b cookies.txt

# Filtrar por estado
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?estado=PENDIENTE' \
  -b cookies.txt

# Filtrar por espacio común
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?espacioComunId=550e8400-e29b-41d4-a716-446655440000' \
  -b cookies.txt

# Filtrar por tipo de espacio
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?tipoEspacio=SALON_SOCIAL' \
  -b cookies.txt

# Filtrar por rango de fechas
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?fechaDesde=2025-01-01T00:00:00.000Z&fechaHasta=2025-01-31T23:59:59.000Z' \
  -b cookies.txt

# Solo mis reservas (para usuarios no admin)
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?soloMias=true' \
  -b cookies.txt

# Combinar filtros
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?estado=PENDIENTE&tipoEspacio=SALON_SOCIAL&page=1&limit=10' \
  -b cookies.txt
```

**Estados disponibles:**
- `PENDIENTE`: Esperando aprobación
- `CONFIRMADA`: Aprobada y confirmada
- `CANCELADA`: Cancelada
- `COMPLETADA`: Ya se completó el evento

### 3. Obtener Reserva por ID

```bash
curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

**Nota:** Los usuarios solo pueden ver sus propias reservas, ADMIN puede ver cualquier reserva.

### 5. Actualizar Reserva

**Usuarios pueden actualizar sus propias reservas (fechas, motivo, etc. pero no el estado). ADMIN puede actualizar cualquier reserva:**

```bash
# Cambiar fechas de la reserva (reprogramar)
curl -X PUT 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt \
  -d '{
    "fechaInicio": "2025-01-20T10:00:00.000Z",
    "fechaFin": "2025-01-20T14:00:00.000Z",
    "motivo": "Celebración de aniversario",
    "observaciones": "Actualizado: Necesitamos también sistema de sonido"
  }'

# Cambiar espacio común (ADMIN)
curl -X PUT 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt \
  -d '{
    "espacioComunId": "880e8400-e29b-41d4-a716-446655440000"
  }'
```

**Nota:** Al cambiar fechas o espacio común, se verificará automáticamente que no haya conflictos con otras reservas confirmadas.

**Nota sobre Observaciones:**
- Las `observaciones` solo pueden ser agregadas/editadas por ADMIN.
- Los usuarios NO pueden agregar observaciones al crear o actualizar reservas.
- ADMIN puede agregar observaciones cuando aprueba o edita una reserva (ej: "Por favor dejar todo limpio al finalizar").

### 6. Cancelar Reserva

**Usuarios pueden cancelar sus propias reservas, ADMIN puede cancelar cualquier reserva:**

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000/cancelar' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

### 7. Aprobar Reserva (ADMIN)

**Solo ADMIN puede aprobar reservas pendientes:**

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000/aprobar' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

Esto cambia el estado de `PENDIENTE` a `CONFIRMADA`.

### 8. Rechazar Reserva (ADMIN)

**Solo ADMIN puede rechazar reservas pendientes:**

```bash
curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000/rechazar' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

Esto cambia el estado de `PENDIENTE` a `CANCELADA`.

### 9. Eliminar Reserva (ADMIN)

**Solo ADMIN puede eliminar permanentemente una reserva:**

```bash
curl -X DELETE 'http://condominio-las-flores-actualizado.localhost:3001/reservas/770e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer TU_JWT_TOKEN' \
  -b cookies.txt
```

---

## Flujo Típico de Uso

### Para ADMIN:

1. **Crear espacios comunes:**
   ```bash
   curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios' \
     -H 'Content-Type: application/json' \
     -b cookies.txt \
     -d '{ ... }'
   ```

2. **Ver todas las reservas pendientes:**
   ```bash
   curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?estado=PENDIENTE' \
     -b cookies.txt
   ```

3. **Aprobar una reserva:**
   ```bash
   curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/{reservaId}/aprobar' \
     -b cookies.txt
   ```

4. **Ver reservas de un espacio específico:**
   ```bash
   curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?espacioComunId={espacioId}' \
     -b cookies.txt
   ```

### Para Usuarios (PROPIETARIO, ARRENDATARIO, RESIDENTE):

1. **Ver espacios disponibles:**
   ```bash
   curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios?activo=true' \
     -b cookies.txt
   ```

2. **Ver horas disponibles de un espacio:**
   ```bash
   curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas/espacios/{espacioId}/disponibilidad?fecha=2026-01-02' \
     -b cookies.txt
   ```

3. **Crear una reserva:**
   ```bash
   curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas' \
     -H 'Content-Type: application/json' \
     -b cookies.txt \
     -d '{
       "espacioComunId": "...",
       "fechaInicio": "2026-01-02T10:00:00.000Z",
       "fechaFin": "2026-01-02T12:00:00.000Z",
       "motivo": "Cumpleaños"
     }'
   ```

4. **Ver mis reservas:**
   ```bash
   curl -X GET 'http://condominio-las-flores-actualizado.localhost:3001/reservas?soloMias=true' \
     -b cookies.txt
   ```

5. **Cancelar mi reserva:**
   ```bash
   curl -X POST 'http://condominio-las-flores-actualizado.localhost:3001/reservas/{reservaId}/cancelar' \
     -b cookies.txt
   ```

6. **Reprogramar mi reserva (cambiar fechas):**
   ```bash
   curl -X PUT 'http://condominio-las-flores-actualizado.localhost:3001/reservas/{reservaId}' \
     -H 'Content-Type: application/json' \
     -b cookies.txt \
     -d '{
       "fechaInicio": "2025-01-20T10:00:00.000Z",
       "fechaFin": "2025-01-20T14:00:00.000Z"
     }'
   ```

---

## Ejemplos de Respuestas

### Espacio Común (Response)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Salón Social",
  "tipo": "SALON_SOCIAL",
  "capacidad": 50,
  "descripcion": "Salón para eventos sociales",
  "unidadTiempo": "HORAS",
  "precioPorUnidad": 50000,
  "activo": true,
  "imagen": "https://s3.amazonaws.com/bucket/salon-social.jpg",
  "horariosDisponibilidad": "[{\"dia\": 1, \"horaInicio\": \"09:00\", \"horaFin\": \"22:00\"}]",
  "requiereAprobacion": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Reserva (Response)

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "espacioComun": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Salón Social",
    "tipo": "SALON_SOCIAL",
    "capacidad": 50,
    "unidadTiempo": "HORAS",
    "precioPorUnidad": 50000
  },
  "espacioComunId": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "userId": "880e8400-e29b-41d4-a716-446655440000",
  "unidad": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "identificador": "Apto 801"
  },
  "unidadId": "990e8400-e29b-41d4-a716-446655440000",
  "fechaInicio": "2025-01-15T10:00:00.000Z",
  "fechaFin": "2025-01-15T14:00:00.000Z",
  "cantidadPersonas": 30,
  "estado": "PENDIENTE",
  "motivo": "Celebración de cumpleaños",
  "observaciones": "Necesitamos mesas y sillas",
  "precioTotal": 200000,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Lista de Reservas (Response con Paginación)

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "espacioComun": { ... },
      "user": { ... },
      "fechaInicio": "2025-01-15T10:00:00.000Z",
      "fechaFin": "2025-01-15T14:00:00.000Z",
      "estado": "PENDIENTE",
      ...
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación. Los usuarios de condominio usan cookies de sesión, mientras que ADMIN también puede usar JWT Bearer token.

2. **Permisos**:
   - **ADMIN**: Puede crear/editar/eliminar espacios comunes y gestionar todas las reservas (aprobar, rechazar, cancelar, eliminar).
   - **Usuarios regulares**: Pueden crear reservas y gestionar solo las suyas (ver, actualizar fechas/motivo, cancelar).

3. **Validación de Conflictos de Reservas**: El sistema verifica automáticamente que no haya conflictos de horarios al crear o actualizar reservas. 
   - Se consideran reservas con estado `CONFIRMADA` y `PENDIENTE` para detectar conflictos.
   - Dos reservas tienen conflicto si sus horarios se solapan (ej: reserva de 2:00 PM a 4:00 PM y otra de 2:10 PM a 4:10 PM se solapan).
   - El endpoint `/reservas/espacios/:espacioComunId/disponibilidad?fecha=YYYY-MM-DD` retorna las horas ocupadas para un día específico.

4. **Cantidad de Personas**: Este campo ha sido removido del formulario ya que no es necesario (se alquila el espacio completo, no por cantidad de personas).

5. **Observaciones**: Solo ADMIN puede agregar/editar observaciones en las reservas. Los usuarios NO pueden agregar observaciones al crear reservas.

6. **Estados de Reserva**:
   - `PENDIENTE`: Esperando aprobación de ADMIN (si el espacio requiere aprobación).
   - `CONFIRMADA`: Reserva aprobada y confirmada.
   - `CANCELADA`: Reserva cancelada (por usuario o rechazada por ADMIN).
   - `COMPLETADA`: Reserva completada (el evento ya ocurrió).

7. **Precio Total**: Se calcula automáticamente basado en `precioPorUnidad` del espacio común y la duración de la reserva, según la `unidadTiempo` configurada.

8. **Subdominio**: Recuerda usar el subdominio correcto en la URL. Ejemplo: `http://condominio-las-flores-actualizado.localhost:3001`

9. **Filtro de Fechas**: El filtro `fechaDesde` y `fechaHasta` filtra correctamente por la fecha de inicio de las reservas. Usa formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss).

