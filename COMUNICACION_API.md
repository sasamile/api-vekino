# API de Comunicación - Tickets y Foro Comunitario

Esta API permite gestionar tickets de administración y el foro comunitario del condominio.

**Base URL:** `https://condominio-las-flores.localhost:3000/comunicacion`

**Autenticación:** Todos los endpoints requieren autenticación con cookie `better-auth.session_token` o Bearer token.

**Permisos:** 
- **Tickets:** Todos los usuarios pueden crear tickets. Solo ADMIN puede cambiar estados y asignar tickets.
- **Foro:** Todos los usuarios pueden crear posts y comentar. Solo el autor o ADMIN puede editar/eliminar.

---

## Tickets de Administración

Los tickets permiten a los residentes reportar problemas o solicitar servicios a la administración (ej: problemas de iluminación, solicitud de poda, etc.).

### Estados de Tickets

- `ABIERTO`: Ticket recién creado, pendiente de revisión
- `EN_PROGRESO`: Ticket asignado y en proceso de resolución
- `RESUELTO`: Ticket resuelto
- `CERRADO`: Ticket cerrado definitivamente

---

## Endpoints de Tickets

### 1. Crear Ticket

Crea un nuevo ticket de administración.

**Endpoint:** `POST /comunicacion/tickets`

**Request Body:**
```json
{
  "titulo": "Problema con iluminación",
  "descripcion": "La luz del pasillo central está intermitente desde hace 2 días",
  "categoria": "Iluminación",
  "prioridad": "MEDIA",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Campos:**
- `titulo` (requerido): Título del ticket
- `descripcion` (requerido): Descripción detallada del problema o solicitud
- `categoria` (opcional): Categoría del ticket (ej: "Iluminación", "Poda", "Limpieza")
- `prioridad` (opcional): Prioridad del ticket. Valores: `BAJA`, `MEDIA`, `ALTA`, `URGENTE` (default: `MEDIA`)
- `unidadId` (opcional): ID de la unidad relacionada

**Response (201 Created):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "titulo": "Problema con iluminación",
  "descripcion": "La luz del pasillo central está intermitente desde hace 2 días",
  "estado": "ABIERTO",
  "categoria": "Iluminación",
  "prioridad": "MEDIA",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "asignadoA": null,
  "fechaResolucion": null,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T14:30:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "image": null
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 0
}
```

---

### 2. Listar Tickets

Obtiene todos los tickets con filtros opcionales. Los usuarios no ADMIN solo ven sus propios tickets.

**Endpoint:** `GET /comunicacion/tickets`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad de resultados por página (default: 10)
- `estado` (opcional): Filtrar por estado (`ABIERTO`, `EN_PROGRESO`, `RESUELTO`, `CERRADO`)
- `categoria` (opcional): Filtrar por categoría
- `userId` (opcional): Filtrar por ID de usuario (solo ADMIN)
- `unidadId` (opcional): Filtrar por ID de unidad

**Ejemplo Request:**
```
GET /comunicacion/tickets?estado=EN_PROGRESO&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "titulo": "Problema con iluminación",
      "descripcion": "La luz del pasillo central está intermitente...",
      "estado": "EN_PROGRESO",
      "categoria": "Iluminación",
      "prioridad": "MEDIA",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "asignadoA": "880e8400-e29b-41d4-a716-446655440003",
      "fechaResolucion": null,
      "createdAt": "2025-05-20T14:30:00.000Z",
      "updatedAt": "2025-05-20T15:00:00.000Z",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440002",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "unidad": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "identificador": "Casa 89"
      },
      "comentariosCount": 3
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### 3. Obtener Ticket por ID

Obtiene un ticket específico por su ID.

**Endpoint:** `GET /comunicacion/tickets/:id`

**Response (200 OK):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "titulo": "Problema con iluminación",
  "descripcion": "La luz del pasillo central está intermitente desde hace 2 días",
  "estado": "EN_PROGRESO",
  "categoria": "Iluminación",
  "prioridad": "MEDIA",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "asignadoA": "880e8400-e29b-41d4-a716-446655440003",
  "fechaResolucion": null,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T15:00:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 3
}
```

---

### 4. Actualizar Ticket

Actualiza un ticket. Solo ADMIN puede cambiar estado y asignar.

**Endpoint:** `PUT /comunicacion/tickets/:id`

**Request Body:**
```json
{
  "titulo": "Problema con iluminación - ACTUALIZADO",
  "descripcion": "La luz del pasillo central está intermitente. Ya se contactó al técnico.",
  "estado": "EN_PROGRESO",
  "asignadoA": "880e8400-e29b-41d4-a716-446655440003",
  "prioridad": "ALTA"
}
```

**Campos (todos opcionales):**
- `titulo`: Nuevo título
- `descripcion`: Nueva descripción
- `categoria`: Nueva categoría
- `prioridad`: Nueva prioridad
- `unidadId`: Nueva unidad relacionada
- `estado`: Nuevo estado (solo ADMIN)
- `asignadoA`: ID del usuario ADMIN asignado (solo ADMIN)

**Response (200 OK):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "titulo": "Problema con iluminación - ACTUALIZADO",
  "descripcion": "La luz del pasillo central está intermitente. Ya se contactó al técnico.",
  "estado": "EN_PROGRESO",
  "categoria": "Iluminación",
  "prioridad": "ALTA",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "asignadoA": "880e8400-e29b-41d4-a716-446655440003",
  "fechaResolucion": null,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T16:00:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 3
}
```

---

### 5. Eliminar Ticket

Elimina un ticket. Solo ADMIN puede eliminar.

**Endpoint:** `DELETE /comunicacion/tickets/:id`

**Response (200 OK):**
```json
{
  "message": "Ticket eliminado exitosamente"
}
```

---

### 6. Obtener Comentarios de un Ticket

Obtiene todos los comentarios de un ticket. Los comentarios internos solo los ve ADMIN.

**Endpoint:** `GET /comunicacion/tickets/:id/comentarios`

**Response (200 OK):**
```json
[
  {
    "id": "bb0e8400-e29b-41d4-a716-446655440001",
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440000",
    "userId": "880e8400-e29b-41d4-a716-446655440003",
    "contenido": "He revisado el problema y enviaré un técnico mañana",
    "esInterno": false,
    "createdAt": "2025-05-20T15:00:00.000Z",
    "updatedAt": "2025-05-20T15:00:00.000Z",
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "María González",
      "email": "maria@example.com",
      "image": null
    }
  },
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440002",
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440000",
    "userId": "880e8400-e29b-41d4-a716-446655440003",
    "contenido": "Nota interna: El técnico tiene disponibilidad el jueves",
    "esInterno": true,
    "createdAt": "2025-05-20T15:30:00.000Z",
    "updatedAt": "2025-05-20T15:30:00.000Z",
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "María González",
      "email": "maria@example.com",
      "image": null
    }
  }
]
```

---

### 7. Crear Comentario en Ticket

Crea un comentario en un ticket. Solo ADMIN puede crear comentarios internos.

**Endpoint:** `POST /comunicacion/tickets/:id/comentarios`

**Request Body:**
```json
{
  "contenido": "He revisado el problema y enviaré un técnico mañana",
  "esInterno": false
}
```

**Campos:**
- `contenido` (requerido): Contenido del comentario
- `esInterno` (opcional): Si es true, solo ADMIN puede verlo (default: false)

**Response (201 Created):**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440001",
  "ticketId": "aa0e8400-e29b-41d4-a716-446655440000",
  "userId": "880e8400-e29b-41d4-a716-446655440003",
  "contenido": "He revisado el problema y enviaré un técnico mañana",
  "esInterno": false,
  "createdAt": "2025-05-20T15:00:00.000Z",
  "updatedAt": "2025-05-20T15:00:00.000Z",
  "user": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "María González",
    "email": "maria@example.com",
    "image": null
  }
}
```

---

## Foro Comunitario

El foro permite a los residentes interactuar, hacer preguntas y compartir información de manera comunitaria.

---

## Endpoints del Foro

### 1. Crear Post

Crea un nuevo post en el foro comunitario.

**Endpoint:** `POST /comunicacion/posts`

**Request Body:**
```json
{
  "titulo": "¿Alguien sabe si habrá mantenimiento en la piscina esta semana?",
  "contenido": "Hola vecinos, quería saber si alguien tiene información sobre el mantenimiento de la piscina esta semana. Gracias!",
  "imagen": "https://example.com/piscina.jpg",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Campos:**
- `titulo` (opcional): Título del post
- `contenido` (requerido): Contenido del post
- `imagen` (opcional): URL de imagen adjunta
- `unidadId` (opcional): ID de la unidad relacionada (si no se proporciona, se usa la del usuario)

**Response (201 Created):**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440000",
  "titulo": "¿Alguien sabe si habrá mantenimiento en la piscina esta semana?",
  "contenido": "Hola vecinos, quería saber si alguien tiene información sobre el mantenimiento de la piscina esta semana. Gracias!",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "imagen": "https://example.com/piscina.jpg",
  "activo": true,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T14:30:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Carlos Mendoza",
    "email": "carlos@example.com",
    "image": null
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 0,
  "likesCount": 0,
  "userLiked": false
}
```

---

### 2. Listar Posts

Obtiene todos los posts del foro con filtros opcionales.

**Endpoint:** `GET /comunicacion/posts`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad de resultados por página (default: 10)
- `userId` (opcional): Filtrar por ID de usuario
- `activo` (opcional): Filtrar solo posts activos (default: true)

**Ejemplo Request:**
```
GET /comunicacion/posts?page=1&limit=10
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "titulo": "¿Alguien sabe si habrá mantenimiento en la piscina esta semana?",
      "contenido": "Hola vecinos, quería saber si alguien tiene información...",
      "userId": "990e8400-e29b-41d4-a716-446655440002",
      "unidadId": "550e8400-e29b-41d4-a716-446655440000",
      "imagen": null,
      "activo": true,
      "createdAt": "2025-05-20T14:30:00.000Z",
      "updatedAt": "2025-05-20T14:30:00.000Z",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440002",
        "name": "Carlos Mendoza",
        "email": "carlos@example.com",
        "image": null
      },
      "unidad": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "identificador": "Casa 89"
      },
      "comentariosCount": 3,
      "likesCount": 8,
      "userLiked": false
    },
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440001",
      "titulo": null,
      "contenido": "Gracias a todos por participar en la jornada de reciclaje 🌱",
      "userId": "ff0e8400-e29b-41d4-a716-446655440003",
      "unidadId": "660e8400-e29b-41d4-a716-446655440004",
      "imagen": null,
      "activo": true,
      "createdAt": "2025-05-19T10:00:00.000Z",
      "updatedAt": "2025-05-19T10:00:00.000Z",
      "user": {
        "id": "ff0e8400-e29b-41d4-a716-446655440003",
        "name": "Ana López",
        "email": "ana@example.com",
        "image": null
      },
      "unidad": {
        "id": "660e8400-e29b-41d4-a716-446655440004",
        "identificador": "Casa 45"
      },
      "comentariosCount": 5,
      "likesCount": 12,
      "userLiked": true
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### 3. Obtener Post por ID

Obtiene un post específico por su ID.

**Endpoint:** `GET /comunicacion/posts/:id`

**Response (200 OK):**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440000",
  "titulo": "¿Alguien sabe si habrá mantenimiento en la piscina esta semana?",
  "contenido": "Hola vecinos, quería saber si alguien tiene información sobre el mantenimiento de la piscina esta semana. Gracias!",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "imagen": null,
  "activo": true,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T14:30:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Carlos Mendoza",
    "email": "carlos@example.com",
    "image": null
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 3,
  "likesCount": 8,
  "userLiked": false
}
```

---

### 4. Actualizar Post

Actualiza un post. Solo el autor o ADMIN puede editar.

**Endpoint:** `PUT /comunicacion/posts/:id`

**Request Body:**
```json
{
  "titulo": "Mantenimiento de piscina - ACTUALIZADO",
  "contenido": "Actualización: El mantenimiento será el jueves",
  "imagen": "https://example.com/nueva-imagen.jpg"
}
```

**Campos (todos opcionales):**
- `titulo`: Nuevo título
- `contenido`: Nuevo contenido
- `imagen`: Nueva URL de imagen
- `activo`: Si está activo (solo ADMIN puede cambiar)

**Response (200 OK):**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440000",
  "titulo": "Mantenimiento de piscina - ACTUALIZADO",
  "contenido": "Actualización: El mantenimiento será el jueves",
  "userId": "990e8400-e29b-41d4-a716-446655440002",
  "unidadId": "550e8400-e29b-41d4-a716-446655440000",
  "imagen": "https://example.com/nueva-imagen.jpg",
  "activo": true,
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T16:00:00.000Z",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "name": "Carlos Mendoza",
    "email": "carlos@example.com",
    "image": null
  },
  "unidad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "identificador": "Casa 89"
  },
  "comentariosCount": 3,
  "likesCount": 8,
  "userLiked": false
}
```

---

### 5. Eliminar Post

Elimina un post (soft delete). Solo el autor o ADMIN puede eliminar.

**Endpoint:** `DELETE /comunicacion/posts/:id`

**Response (200 OK):**
```json
{
  "message": "Post eliminado exitosamente"
}
```

---

### 6. Obtener Comentarios de un Post

Obtiene todos los comentarios de un post.

**Endpoint:** `GET /comunicacion/posts/:id/comentarios`

**Response (200 OK):**
```json
[
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440001",
    "postId": "dd0e8400-e29b-41d4-a716-446655440000",
    "userId": "880e8400-e29b-41d4-a716-446655440003",
    "contenido": "Sí, el mantenimiento está programado para el jueves",
    "activo": true,
    "createdAt": "2025-05-20T15:00:00.000Z",
    "updatedAt": "2025-05-20T15:00:00.000Z",
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "María González",
      "email": "maria@example.com",
      "image": null
    },
    "unidad": {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "identificador": "Apto 201"
    }
  },
  {
    "id": "gg0e8400-e29b-41d4-a716-446655440002",
    "postId": "dd0e8400-e29b-41d4-a716-446655440000",
    "userId": "aa0e8400-e29b-41d4-a716-446655440005",
    "contenido": "Gracias por la información!",
    "activo": true,
    "createdAt": "2025-05-20T15:30:00.000Z",
    "updatedAt": "2025-05-20T15:30:00.000Z",
    "user": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "Pedro Sánchez",
      "email": "pedro@example.com",
      "image": null
    },
    "unidad": {
      "id": "880e8400-e29b-41d4-a716-446655440006",
      "identificador": "Casa 127"
    }
  }
]
```

---

### 7. Crear Comentario en Post

Crea un comentario en un post del foro.

**Endpoint:** `POST /comunicacion/posts/:id/comentarios`

**Request Body:**
```json
{
  "contenido": "Sí, el mantenimiento está programado para el jueves"
}
```

**Campos:**
- `contenido` (requerido): Contenido del comentario

**Response (201 Created):**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440001",
  "postId": "dd0e8400-e29b-41d4-a716-446655440000",
  "userId": "880e8400-e29b-41d4-a716-446655440003",
  "contenido": "Sí, el mantenimiento está programado para el jueves",
  "activo": true,
  "createdAt": "2025-05-20T15:00:00.000Z",
  "updatedAt": "2025-05-20T15:00:00.000Z",
  "user": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "María González",
    "email": "maria@example.com",
    "image": null
  },
  "unidad": {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "identificador": "Apto 201"
  }
}
```

---

### 8. Toggle Like en Post

Agrega o elimina un like en un post. Si el usuario ya dio like, lo elimina. Si no tiene like, lo agrega.

**Endpoint:** `POST /comunicacion/posts/:id/like`

**Response (200 OK):**
```json
{
  "liked": true,
  "message": "Like agregado"
}
```

O si ya tenía like:
```json
{
  "liked": false,
  "message": "Like eliminado"
}
```

---

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Datos inválidos en el request
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: No autorizado (permisos insuficientes)
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

---

## Ejemplos de Uso

### Ejemplo 1: Crear un ticket y seguirlo

```bash
# 1. Crear ticket
curl -X POST https://condominio-las-flores.localhost:3000/comunicacion/tickets \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "titulo": "Problema con iluminación",
    "descripcion": "La luz del pasillo central está intermitente",
    "categoria": "Iluminación",
    "prioridad": "MEDIA"
  }'

# 2. Ver mis tickets
curl -X GET "https://condominio-las-flores.localhost:3000/comunicacion/tickets?page=1&limit=10" \
  -H "Cookie: better-auth.session_token=..."

# 3. Agregar comentario al ticket
curl -X POST https://condominio-las-flores.localhost:3000/comunicacion/tickets/{ticketId}/comentarios \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contenido": "Gracias por reportar, ya estamos trabajando en ello"
  }'
```

### Ejemplo 2: Participar en el foro

```bash
# 1. Crear post
curl -X POST https://condominio-las-flores.localhost:3000/comunicacion/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "titulo": "¿Alguien sabe si habrá mantenimiento en la piscina esta semana?",
    "contenido": "Hola vecinos, quería saber si alguien tiene información..."
  }'

# 2. Ver todos los posts
curl -X GET "https://condominio-las-flores.localhost:3000/comunicacion/posts?page=1&limit=10" \
  -H "Cookie: better-auth.session_token=..."

# 3. Dar like a un post
curl -X POST https://condominio-las-flores.localhost:3000/comunicacion/posts/{postId}/like \
  -H "Cookie: better-auth.session_token=..."

# 4. Comentar en un post
curl -X POST https://condominio-las-flores.localhost:3000/comunicacion/posts/{postId}/comentarios \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contenido": "Sí, el mantenimiento está programado para el jueves"
  }'
```

---

## Notas Importantes

1. **Tickets:**
   - Los usuarios no ADMIN solo pueden ver y editar sus propios tickets
   - Solo ADMIN puede cambiar el estado y asignar tickets
   - Los comentarios internos (`esInterno: true`) solo son visibles para ADMIN
   - Cuando un ticket se marca como `RESUELTO`, se establece automáticamente `fechaResolucion`

2. **Foro:**
   - Todos los usuarios pueden crear posts y comentar
   - Solo el autor o ADMIN puede editar/eliminar posts
   - Los posts eliminados usan soft delete (no se eliminan físicamente)
   - Un usuario solo puede dar like una vez por post (toggle)
   - Los posts muestran la unidad del usuario (ej: "Casa 89", "Apto 201")

3. **Paginación:**
   - Todos los endpoints de listado soportan paginación con `page` y `limit`
   - La respuesta incluye `total`, `page`, `limit` y `totalPages`

4. **Autenticación:**
   - Todos los endpoints requieren autenticación
   - Se puede usar cookie `better-auth.session_token` o Bearer token
   - El usuario actual se obtiene automáticamente de la sesión

