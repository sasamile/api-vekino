# API de Red Social - Sistema de Comunicación

Documentación completa de la API para el sistema de red social del condominio, incluyendo posts con archivos multimedia, reacciones, comentarios, chat y usuarios.

## Base URL

```
http://condominio-las-flores-actualizado.localhost:3001
```

o en producción:

```
https://condominio-las-flores-actualizado.vekino.site
```

## Autenticación

Todos los endpoints requieren autenticación mediante cookie:

```
Cookie: better-auth.session_token=<token>
```

---

## 📝 POSTS DEL FORO

### 1. Crear Post con Archivos Multimedia

Crea un nuevo post en el foro con soporte para múltiples archivos (imágenes, videos, audio, documentos).

**Endpoint:** `POST /comunicacion/posts`

**Headers:**
```
Content-Type: application/json
Cookie: better-auth.session_token=<token>
```

**Body (JSON):**
```json
{
  "titulo": "Evento de Navidad",
  "contenido": "¡Invitamos a todos al evento de Navidad este sábado!",
  "unidadId": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
  "attachments": [
    {
      "tipo": "IMAGEN",
      "url": "https://storage.example.com/images/navidad.jpg",
      "nombre": "navidad.jpg",
      "tamaño": 2048576,
      "mimeType": "image/jpeg"
    },
    {
      "tipo": "VIDEO",
      "url": "https://storage.example.com/videos/evento.mp4",
      "nombre": "evento.mp4",
      "tamaño": 15728640,
      "mimeType": "video/mp4",
      "thumbnailUrl": "https://storage.example.com/thumbnails/evento.jpg"
    },
    {
      "tipo": "AUDIO",
      "url": "https://storage.example.com/audio/anuncio.mp3",
      "nombre": "anuncio.mp3",
      "tamaño": 3145728,
      "mimeType": "audio/mpeg"
    },
    {
      "tipo": "DOCUMENTO",
      "url": "https://storage.example.com/docs/invitacion.pdf",
      "nombre": "invitacion.pdf",
      "tamaño": 512000,
      "mimeType": "application/pdf"
    }
  ]
}
```

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "titulo": "Evento de Navidad",
  "contenido": "¡Invitamos a todos al evento de Navidad este sábado!",
  "unidadId": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
  "attachments": [
    {
      "tipo": "IMAGEN",
      "url": "https://storage.example.com/images/navidad.jpg",
      "nombre": "navidad.jpg",
      "tamaño": 2048576,
      "mimeType": "image/jpeg"
    }
  ]
}'
```

**Tipos de archivo soportados:**
- `IMAGEN`: JPG, PNG, GIF, WebP
- `VIDEO`: MP4, AVI, MOV, WebM
- `AUDIO`: MP3, WAV, OGG
- `DOCUMENTO`: PDF, DOC, DOCX, XLS, XLSX

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titulo": "Evento de Navidad",
  "contenido": "¡Invitamos a todos al evento de Navidad este sábado!",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "unidadId": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
  "activo": true,
  "createdAt": "2026-01-02T12:00:00.000Z",
  "updatedAt": "2026-01-02T12:00:00.000Z",
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "image": "https://example.com/avatar.jpg"
  },
  "unidad": {
    "id": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
    "identificador": "Casa 127"
  },
  "attachments": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "tipo": "IMAGEN",
      "url": "https://storage.example.com/images/navidad.jpg",
      "nombre": "navidad.jpg",
      "tamaño": 2048576,
      "mimeType": "image/jpeg",
      "thumbnailUrl": null,
      "createdAt": "2026-01-02T12:00:00.000Z"
    }
  ],
  "reactions": {
    "LIKE": 5,
    "LOVE": 3,
    "LAUGH": 1,
    "WOW": 0,
    "SAD": 0,
    "ANGRY": 0,
    "total": 9,
    "userReaction": "LIKE"
  },
  "comentariosCount": 3,
  "likesCount": 9
}
```

---

### 2. Obtener Posts (Lista Paginada)

Obtiene una lista paginada de posts con filtros opcionales.

**Endpoint:** `GET /comunicacion/posts`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 10)
- `userId` (opcional): Filtrar por ID de usuario
- `activo` (opcional): Filtrar solo posts activos (default: true)

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts?activo=true&page=1&limit=10' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titulo": "Evento de Navidad",
      "contenido": "¡Invitamos a todos al evento de Navidad este sábado!",
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "unidadId": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
      "activo": true,
      "createdAt": "2026-01-02T12:00:00.000Z",
      "updatedAt": "2026-01-02T12:00:00.000Z",
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "image": "https://example.com/avatar.jpg"
      },
      "unidad": {
        "id": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
        "identificador": "Casa 127"
      },
      "attachments": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "tipo": "IMAGEN",
          "url": "https://storage.example.com/images/navidad.jpg",
          "nombre": "navidad.jpg",
          "tamaño": 2048576,
          "mimeType": "image/jpeg"
        }
      ],
      "reactions": {
        "LIKE": 5,
        "LOVE": 3,
        "LAUGH": 1,
        "WOW": 0,
        "SAD": 0,
        "ANGRY": 0,
        "total": 9,
        "userReaction": "LIKE"
      },
      "comentariosCount": 3,
      "likesCount": 9
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### 3. Obtener Post por ID

Obtiene un post específico con todos sus detalles.

**Endpoint:** `GET /comunicacion/posts/:id`

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):** Similar al response de crear post.

---

### 4. Actualizar Post

Actualiza un post existente (solo el autor o ADMIN).

**Endpoint:** `PUT /comunicacion/posts/:id`

**cURL:**
```bash
curl --location --request PUT 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "titulo": "Evento de Navidad - ACTUALIZADO",
  "contenido": "¡Invitamos a todos al evento de Navidad este sábado a las 6 PM!"
}'
```

---

### 5. Eliminar Post

Elimina un post (soft delete, solo el autor o ADMIN).

**Endpoint:** `DELETE /comunicacion/posts/:id`

**cURL:**
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

---

## ❤️ REACCIONES

### 6. Agregar/Actualizar Reacción a Post

Agrega o actualiza una reacción a un post. Si el usuario ya tiene una reacción, se actualiza.

**Endpoint:** `POST /comunicacion/posts/:id/reaction`

**Body (JSON):**
```json
{
  "tipo": "LOVE"
}
```

**Tipos de reacción disponibles:**
- `LIKE`: 👍
- `LOVE`: ❤️
- `LAUGH`: 😂
- `WOW`: 😮
- `SAD`: 😢
- `ANGRY`: 😠

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/reaction' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "tipo": "LOVE"
}'
```

**Response (200):**
```json
{
  "reaction": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "postId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "tipo": "LOVE",
    "createdAt": "2026-01-02T12:05:00.000Z"
  },
  "message": "Reacción agregada exitosamente"
}
```

---

### 7. Eliminar Reacción

Elimina la reacción del usuario al post.

**Endpoint:** `DELETE /comunicacion/posts/:id/reaction`

**cURL:**
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/reaction' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
{
  "message": "Reacción eliminada exitosamente"
}
```

---

## 💬 COMENTARIOS

### 8. Crear Comentario en Post

Crea un comentario en un post.

**Endpoint:** `POST /comunicacion/posts/:id/comentarios`

**Body (JSON):**
```json
{
  "contenido": "¡Excelente idea! Nos vemos allí."
}
```

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/comentarios' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "contenido": "¡Excelente idea! Nos vemos allí."
}'
```

**Response (201):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "postId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "contenido": "¡Excelente idea! Nos vemos allí.",
  "activo": true,
  "createdAt": "2026-01-02T12:10:00.000Z",
  "updatedAt": "2026-01-02T12:10:00.000Z",
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "María García",
    "email": "maria@example.com",
    "image": "https://example.com/avatar2.jpg"
  },
  "unidad": {
    "id": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
    "identificador": "Casa 89"
  }
}
```

---

### 9. Obtener Comentarios de un Post

Obtiene todos los comentarios de un post.

**Endpoint:** `GET /comunicacion/posts/:id/comentarios`

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/comentarios' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "postId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "contenido": "¡Excelente idea! Nos vemos allí.",
    "activo": true,
    "createdAt": "2026-01-02T12:10:00.000Z",
    "updatedAt": "2026-01-02T12:10:00.000Z",
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "María García",
      "email": "maria@example.com",
      "image": "https://example.com/avatar2.jpg"
    },
    "unidad": {
      "id": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
      "identificador": "Casa 89"
    }
  }
]
```

---

### 10. Eliminar Comentario

Elimina un comentario (solo el autor o ADMIN).

**Endpoint:** `DELETE /comunicacion/posts/comentarios/:id`

**cURL:**
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/comentarios/990e8400-e29b-41d4-a716-446655440004' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

---

## 👥 USUARIOS (SIDEBAR)

### 11. Obtener Lista de Usuarios

Obtiene la lista de usuarios activos del condominio para mostrar en el sidebar.

**Endpoint:** `GET /comunicacion/usuarios`

**Query Parameters:**
- `search` (opcional): Buscar por nombre o email
- `limit` (opcional): Cantidad de resultados (default: 50)

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/usuarios?limit=50' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "image": "https://example.com/avatar.jpg",
      "role": "PROPIETARIO",
      "unidad": {
        "id": "68270f04-8bf4-47ec-88c1-fbc0b4085c55",
        "identificador": "Casa 127"
      },
      "online": false,
      "lastSeen": "2026-01-02T11:30:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "María García",
      "email": "maria@example.com",
      "image": "https://example.com/avatar2.jpg",
      "role": "ARRENDATARIO",
      "unidad": {
        "id": "78270f04-8bf4-47ec-88c1-fbc0b4085c56",
        "identificador": "Casa 89"
      },
      "online": true,
      "lastSeen": "2026-01-02T12:00:00.000Z"
    }
  ],
  "total": 25
}
```

---

### 12. Obtener Usuario por ID

Obtiene información detallada de un usuario específico.

**Endpoint:** `GET /comunicacion/usuarios/:id`

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/usuarios/660e8400-e29b-41d4-a716-446655440001' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

---

## 💬 CHAT

### 13. Enviar Mensaje de Chat

Envía un mensaje de chat a otro usuario.

**Endpoint:** `POST /comunicacion/chat/mensajes`

**Body (JSON):**
```json
{
  "destinatarioId": "770e8400-e29b-41d4-a716-446655440002",
  "contenido": "Hola, ¿cómo estás?",
  "attachments": [
    {
      "tipo": "IMAGEN",
      "url": "https://storage.example.com/images/foto.jpg",
      "nombre": "foto.jpg",
      "tamaño": 1024000,
      "mimeType": "image/jpeg"
    }
  ]
}
```

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/chat/mensajes' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "destinatarioId": "770e8400-e29b-41d4-a716-446655440002",
  "contenido": "Hola, ¿cómo estás?"
}'
```

**Response (201):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "remitenteId": "660e8400-e29b-41d4-a716-446655440001",
  "destinatarioId": "770e8400-e29b-41d4-a716-446655440002",
  "contenido": "Hola, ¿cómo estás?",
  "leido": false,
  "leidoAt": null,
  "createdAt": "2026-01-02T12:15:00.000Z",
  "remitente": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "image": "https://example.com/avatar.jpg"
  },
  "destinatario": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "María García",
    "email": "maria@example.com",
    "image": "https://example.com/avatar2.jpg"
  },
  "attachments": []
}
```

---

### 14. Obtener Conversaciones

Obtiene la lista de conversaciones del usuario actual.

**Endpoint:** `GET /comunicacion/chat/conversaciones`

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/chat/conversaciones' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
{
  "data": [
    {
      "userId": "770e8400-e29b-41d4-a716-446655440002",
      "user": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "María García",
        "email": "maria@example.com",
        "image": "https://example.com/avatar2.jpg"
      },
      "ultimoMensaje": {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "contenido": "Hola, ¿cómo estás?",
        "createdAt": "2026-01-02T12:15:00.000Z",
        "leido": false
      },
      "mensajesNoLeidos": 2,
      "updatedAt": "2026-01-02T12:15:00.000Z"
    }
  ],
  "total": 5
}
```

---

### 15. Obtener Mensajes de una Conversación

Obtiene los mensajes de una conversación específica.

**Endpoint:** `GET /comunicacion/chat/mensajes`

**Query Parameters:**
- `userId` (requerido): ID del usuario con quien se está chateando
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Mensajes por página (default: 50)

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/chat/mensajes?userId=770e8400-e29b-41d4-a716-446655440002&page=1&limit=50' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "remitenteId": "660e8400-e29b-41d4-a716-446655440001",
      "destinatarioId": "770e8400-e29b-41d4-a716-446655440002",
      "contenido": "Hola, ¿cómo estás?",
      "leido": false,
      "leidoAt": null,
      "createdAt": "2026-01-02T12:15:00.000Z",
      "remitente": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "image": "https://example.com/avatar.jpg"
      },
      "attachments": []
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

### 16. Marcar Mensajes como Leídos

Marca todos los mensajes de una conversación como leídos.

**Endpoint:** `POST /comunicacion/chat/mensajes/marcar-leidos`

**Body (JSON):**
```json
{
  "userId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/chat/mensajes/marcar-leidos' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--data '{
  "userId": "770e8400-e29b-41d4-a716-446655440002"
}'
```

**Response (200):**
```json
{
  "message": "Mensajes marcados como leídos",
  "count": 5
}
```

---

### 17. Eliminar Mensaje

Elimina un mensaje de chat (solo el remitente).

**Endpoint:** `DELETE /comunicacion/chat/mensajes/:id`

**cURL:**
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/chat/mensajes/aa0e8400-e29b-41d4-a716-446655440005' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb'
```

---

## 📊 RESUMEN DE ENDPOINTS

### Posts
- `POST /comunicacion/posts` - Crear post con archivos
- `GET /comunicacion/posts` - Listar posts (paginado)
- `GET /comunicacion/posts/:id` - Obtener post por ID
- `PUT /comunicacion/posts/:id` - Actualizar post
- `DELETE /comunicacion/posts/:id` - Eliminar post

### Reacciones
- `POST /comunicacion/posts/:id/reaction` - Agregar/actualizar reacción
- `DELETE /comunicacion/posts/:id/reaction` - Eliminar reacción

### Comentarios
- `POST /comunicacion/posts/:id/comentarios` - Crear comentario
- `GET /comunicacion/posts/:id/comentarios` - Obtener comentarios
- `DELETE /comunicacion/posts/comentarios/:id` - Eliminar comentario

### Usuarios (Sidebar)
- `GET /comunicacion/usuarios` - Listar usuarios
- `GET /comunicacion/usuarios/:id` - Obtener usuario por ID

### Chat
- `POST /comunicacion/chat/mensajes` - Enviar mensaje
- `GET /comunicacion/chat/conversaciones` - Obtener conversaciones
- `GET /comunicacion/chat/mensajes` - Obtener mensajes de conversación
- `POST /comunicacion/chat/mensajes/marcar-leidos` - Marcar como leídos
- `DELETE /comunicacion/chat/mensajes/:id` - Eliminar mensaje

---

## 🔐 CÓDIGOS DE RESPUESTA

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Error en la solicitud
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: No autorizado
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## 📝 NOTAS IMPORTANTES

1. **Subida de Archivos**: Los archivos deben subirse primero a un servicio de almacenamiento (S3, Cloudinary, etc.) y luego enviar las URLs en el campo `attachments`.

2. **Reacciones**: Un usuario solo puede tener una reacción por post. Si ya tiene una reacción y envía otra, se actualiza automáticamente.

3. **Chat**: Los mensajes se ordenan por fecha de creación (más antiguos primero).

4. **Paginación**: Todos los endpoints de lista soportan paginación con `page` y `limit`.

5. **Autenticación**: Todos los endpoints requieren estar autenticado mediante cookie de sesión.

