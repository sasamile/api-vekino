# API de Red Social - Sistema de Comunicación

Documentación completa de la API para el sistema de red social del condominio, incluyendo posts con archivos multimedia, reacciones, comentarios, chat y usuarios.

## Base URL

**Desarrollo:**
```
http://condominio-las-flores-actualizado.localhost:3001
```

**Producción:**
```
https://condominio-las-flores-actualizado.vekino.site
```

**Nota:** Reemplaza `condominio-las-flores-actualizado` con el subdominio de tu condominio.

## Autenticación

Todos los endpoints requieren autenticación mediante cookie:

```
Cookie: better-auth.session_token=<token>
```

---

## 🚀 GUÍA RÁPIDA

### Flujo Principal de Uso

1. **Crear un Post con Imágenes**
   - Usa `POST /comunicacion/posts` con **FormData**
   - Adjunta los archivos directamente en el campo `files`
   - Los archivos se suben automáticamente a S3

2. **Ver Posts**
   - Usa `GET /comunicacion/posts` para ver todos los posts
   - Filtra con `userId` para ver posts específicos de un usuario
   - Los posts incluyen archivos, reacciones y contador de comentarios

3. **Reaccionar a Posts**
   - Usa `POST /comunicacion/posts/:id/reaction` para agregar/actualizar reacciones
   - Puedes cambiar tu reacción en cualquier momento
   - Ve todas las reacciones en la respuesta del post

4. **Comentar en Posts**
   - Usa `POST /comunicacion/posts/:id/comentarios` para crear comentarios
   - Todos pueden ver y comentar en cualquier post
   - Usa `GET /comunicacion/posts/:id/comentarios` para ver todos los comentarios

5. **Ver Usuarios (Sidebar)**
   - Usa `GET /comunicacion/usuarios` para obtener la lista de usuarios
   - Útil para buscar usuarios y ver quién está en línea

6. **Chat con Usuarios**
   - Usa `POST /comunicacion/chat/mensajes` para enviar mensajes
   - Usa `GET /comunicacion/chat/conversaciones` para ver tus conversaciones
   - Usa `GET /comunicacion/chat/mensajes?userId=...` para ver mensajes de una conversación

---

## 📝 POSTS DEL FORO

### 1. Crear Post con Archivos Multimedia (FormData)

Crea un nuevo post en el foro con soporte para múltiples archivos (imágenes, videos, audio, documentos). Los archivos se suben directamente a S3.

**Endpoint:** `POST /comunicacion/posts`

**Headers:**
```
Content-Type: multipart/form-data
Cookie: better-auth.session_token=<token>
```

**Body (FormData):**
```
titulo: "Evento de Navidad"
contenido: "¡Invitamos a todos al evento de Navidad este sábado!"
unidadId: "68270f04-8bf4-47ec-88c1-fbc0b4085c55"
files: [archivo1.jpg, archivo2.mp4, archivo3.pdf]
```

**Campos del FormData:**
- `titulo` (string, requerido): Título del post
- `contenido` (string, requerido): Contenido del post
- `unidadId` (string, opcional): ID de la unidad asociada
- `files` (File[], opcional): Archivos multimedia a subir (múltiples archivos permitidos)

**cURL:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts' \
--header 'Cookie: better-auth.session_token=288f2b65-0f9e-4932-8865-470a6e6f7cb3.8a3bc97c-b34e-44c1-a2d4-fef6c380eefb' \
--form 'titulo="Evento de Navidad"' \
--form 'contenido="¡Invitamos a todos al evento de Navidad este sábado!"' \
--form 'unidadId="68270f04-8bf4-47ec-88c1-fbc0b4085c55"' \
--form 'files=@"/ruta/a/imagen1.jpg"' \
--form 'files=@"/ruta/a/video1.mp4"' \
--form 'files=@"/ruta/a/documento1.pdf"'
```

**Ejemplo con JavaScript (Fetch API):**
```javascript
const formData = new FormData();
formData.append('titulo', 'Evento de Navidad');
formData.append('contenido', '¡Invitamos a todos al evento de Navidad este sábado!');
formData.append('unidadId', '68270f04-8bf4-47ec-88c1-fbc0b4085c55');

// Agregar múltiples archivos
const files = document.getElementById('fileInput').files;
for (let i = 0; i < files.length; i++) {
  formData.append('files', files[i]);
}

fetch('http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts', {
  method: 'POST',
  headers: {
    'Cookie': 'better-auth.session_token=TU_TOKEN_AQUI'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Tipos de archivo soportados:**
- **IMAGEN**: JPG, JPEG, PNG, GIF, WebP (se convierten automáticamente a WebP)
- **VIDEO**: MP4, AVI, MOV, WebM (máx. 50MB)
- **AUDIO**: MP3, WAV, OGG (máx. 10MB)
- **DOCUMENTO**: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB)

**Límites:**
- Máximo 10 archivos por post
- Tamaño máximo por archivo: 50MB
- Las imágenes se optimizan automáticamente (redimensionadas y convertidas a WebP)

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
      "url": "https://bucket-name.s3.us-east-1.amazonaws.com/posts/550e8400-e29b-41d4-a716-446655440000/image-123.webp",
      "nombre": "imagen.jpg",
      "tamaño": 2048576,
      "mimeType": "image/webp",
      "thumbnailUrl": null,
      "createdAt": "2026-01-02T12:00:00.000Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "tipo": "VIDEO",
      "url": "https://bucket-name.s3.us-east-1.amazonaws.com/posts/550e8400-e29b-41d4-a716-446655440000/video-456.mp4",
      "nombre": "video.mp4",
      "tamaño": 15728640,
      "mimeType": "video/mp4",
      "thumbnailUrl": "https://bucket-name.s3.us-east-1.amazonaws.com/posts/550e8400-e29b-41d4-a716-446655440000/video-456-thumb.webp",
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

**Notas sobre el almacenamiento:**
- Los archivos se almacenan en **AWS S3** automáticamente
- Las URLs devueltas son públicas y accesibles directamente
- Las imágenes se convierten automáticamente a formato **WebP** para optimización
- Los videos pueden incluir un thumbnail generado automáticamente
- La estructura de carpetas en S3: `posts/{postId}/{archivo}`

---

### 2. Obtener Posts (Lista Paginada)

Obtiene una lista paginada de posts con filtros opcionales. Puedes filtrar para ver tus propios posts o los de otros usuarios.

**Endpoint:** `GET /comunicacion/posts`

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Resultados por página (default: 10)
- `userId` (opcional): Filtrar por ID de usuario específico
  - Si no se especifica: muestra todos los posts del condominio
  - Si se especifica tu `userId`: muestra solo tus posts
  - Si se especifica otro `userId`: muestra solo los posts de ese usuario
- `activo` (opcional): Filtrar solo posts activos (default: true)

**Ejemplos de uso:**

**Ver todos los posts:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts?activo=true&page=1&limit=10' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Ver solo mis posts:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts?userId=TU_USER_ID&page=1&limit=10' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

**Ver posts de otro usuario:**
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts?userId=OTRO_USER_ID&page=1&limit=10' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
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

Agrega o actualiza una reacción a un post. Si el usuario ya tiene una reacción, se actualiza automáticamente. Puedes ver todas las reacciones de un post y cambiar la tuya en cualquier momento.

**Endpoint:** `POST /comunicacion/posts/:id/reaction`

**Body (JSON):**
```json
{
  "tipo": "LOVE"
}
```

**Tipos de reacción disponibles:**
- `LIKE`: 👍 Me gusta
- `LOVE`: ❤️ Me encanta
- `LAUGH`: 😂 Divertido
- `WOW`: 😮 Asombroso
- `SAD`: 😢 Triste
- `ANGRY`: 😠 Enojado

**Notas importantes:**
- Solo puedes tener UNA reacción por post
- Si ya tienes una reacción y envías otra, se actualiza automáticamente
- Puedes ver todas las reacciones de un post en la respuesta del endpoint de obtener posts
- Las reacciones se muestran con contadores por tipo y total

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/reaction' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
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

Crea un comentario en un post. Todos los usuarios pueden ver y crear comentarios en cualquier post del condominio.

**Endpoint:** `POST /comunicacion/posts/:id/comentarios`

**Body (JSON):**
```json
{
  "contenido": "¡Excelente idea! Nos vemos allí."
}
```

**Notas importantes:**
- Todos los usuarios pueden comentar en cualquier post
- Los comentarios se muestran ordenados por fecha (más antiguos primero)
- Cada comentario muestra información del usuario que lo creó (nombre, email, imagen, unidad)
- Solo el autor del comentario o un ADMIN puede eliminarlo

**cURL:**
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/550e8400-e29b-41d4-a716-446655440000/comentarios' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
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

Obtiene la lista de usuarios activos del condominio para mostrar en el sidebar. Útil para ver quién está en línea, buscar usuarios para chatear, o ver información de otros residentes.

**Endpoint:** `GET /comunicacion/usuarios`

**Query Parameters:**
- `search` (opcional): Buscar por nombre o email
- `limit` (opcional): Cantidad de resultados (default: 50)

**Información incluida:**
- Datos básicos del usuario (nombre, email, imagen)
- Rol del usuario (PROPIETARIO, ARRENDATARIO, ADMIN, etc.)
- Unidad asociada (si tiene)
- Estado online/offline
- Última vez visto

**cURL:**
```bash
# Obtener todos los usuarios
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/usuarios?limit=50' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'

# Buscar usuarios por nombre o email
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/usuarios?search=Juan&limit=50' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
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

## 🗂️ ESTRUCTURA DE DATOS

### Post Completo
Cada post incluye:
- **Información básica**: ID, título, contenido, fechas
- **Usuario**: Datos del autor (nombre, email, imagen)
- **Unidad**: Unidad asociada (si aplica)
- **Archivos adjuntos**: Lista de archivos multimedia subidos a S3
- **Reacciones**: Contadores por tipo y reacción del usuario actual
- **Comentarios**: Contador total de comentarios

### Reacciones
Estructura de reacciones en un post:
```json
{
  "LIKE": 5,      // Número de likes
  "LOVE": 3,      // Número de loves
  "LAUGH": 1,     // Número de laughs
  "WOW": 0,       // Número de wows
  "SAD": 0,       // Número de sads
  "ANGRY": 0,     // Número de angrys
  "total": 9,     // Total de reacciones
  "userReaction": "LIKE"  // Tu reacción actual (null si no has reaccionado)
}
```

### Archivos Adjuntos
Cada archivo adjunto incluye:
- **ID**: Identificador único del archivo
- **Tipo**: IMAGEN, VIDEO, AUDIO, DOCUMENTO
- **URL**: URL pública en S3 para acceder al archivo
- **Nombre**: Nombre original del archivo
- **Tamaño**: Tamaño en bytes
- **MIME Type**: Tipo MIME del archivo
- **Thumbnail URL**: URL del thumbnail (solo para videos, opcional)

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

1. **Subida de Archivos**: 
   - Los archivos se suben directamente usando **FormData** (multipart/form-data)
   - Los archivos se almacenan automáticamente en **AWS S3**
   - Las imágenes se optimizan automáticamente (redimensionadas y convertidas a WebP)
   - No necesitas subir los archivos manualmente, el endpoint lo hace por ti

2. **Reacciones**: 
   - Un usuario solo puede tener **una reacción por post**
   - Si ya tienes una reacción y envías otra, se actualiza automáticamente
   - Puedes ver todas las reacciones de un post con contadores por tipo
   - La respuesta incluye tu reacción actual (`userReaction`)

3. **Visualización de Posts**:
   - Puedes ver **todos los posts** del condominio (sin filtrar por `userId`)
   - Puedes ver **solo tus posts** (filtrando con tu `userId`)
   - Puedes ver **posts de otros usuarios** (filtrando con su `userId`)

4. **Comentarios**:
   - Todos los usuarios pueden ver y crear comentarios en cualquier post
   - Los comentarios muestran información completa del usuario (nombre, email, imagen, unidad)
   - Solo el autor del comentario o un ADMIN puede eliminarlo

5. **Chat**: 
   - Los mensajes se ordenan por fecha de creación (más antiguos primero)
   - Puedes enviar archivos adjuntos en los mensajes de chat
   - Soporte para marcar mensajes como leídos

6. **Usuarios (Sidebar)**:
   - Lista todos los usuarios activos del condominio
   - Muestra estado online/offline
   - Útil para buscar usuarios y iniciar conversaciones

7. **Paginación**: 
   - Todos los endpoints de lista soportan paginación con `page` y `limit`
   - La respuesta incluye `total`, `page`, `limit` y `totalPages`

8. **Autenticación**: 
   - Todos los endpoints requieren estar autenticado mediante cookie de sesión
   - El token se obtiene al iniciar sesión en el sistema



