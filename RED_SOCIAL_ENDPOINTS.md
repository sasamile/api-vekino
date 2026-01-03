# Endpoints de Red Social - Documentación Completa

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

## 1. Crear Post (con archivos multimedia)

**POST** `/comunicacion/posts`

Crea un nuevo post con soporte para archivos multimedia (imágenes, videos, audio, documentos).

### cURL sin archivos:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--form 'titulo=Mi primer post' \
--form 'contenido=Este es el contenido de mi post'
```

### cURL con imagen:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--form 'titulo=Post con imagen' \
--form 'contenido=Mira esta imagen que subí' \
--form 'files=@/ruta/a/tu/imagen.jpg'
```

### cURL con múltiples archivos:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--form 'titulo=Post con múltiples archivos' \
--form 'contenido=Subí varias imágenes' \
--form 'files=@/ruta/imagen1.jpg' \
--form 'files=@/ruta/imagen2.png' \
--form 'files=@/ruta/video.mp4'
```

### Respuesta exitosa:
```json
{
  "id": "uuid-del-post",
  "titulo": "Post con imagen",
  "contenido": "Mira esta imagen que subí",
  "userId": "uuid-del-usuario",
  "unidadId": null,
  "imagen": null,
  "activo": true,
  "createdAt": "2026-01-03 11:04:48.819",
  "updatedAt": "2026-01-03 11:04:48.819",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Nombre Usuario",
    "email": "usuario@example.com",
    "image": "https://..."
  },
  "unidad": null,
  "comentariosCount": 0,
  "likesCount": 0,
  "userLiked": 0,
  "attachments": [
    {
      "id": "uuid-del-attachment",
      "tipo": "IMAGEN",
      "url": "https://vekino.s3.us-east-1.amazonaws.com/posts/...",
      "nombre": "imagen.jpg",
      "tamaño": 123456,
      "mimeType": "image/webp",
      "thumbnailUrl": null,
      "createdAt": "2026-01-03 11:04:48.819"
    }
  ]
}
```

---

## 2. Obtener Posts

**GET** `/comunicacion/posts`

Obtiene todos los posts con paginación y filtros.

### Parámetros de consulta:
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad de resultados por página (default: 10)
- `activo` (opcional): Filtrar por posts activos (true/false, default: true)
- `userId` (opcional): Filtrar posts de un usuario específico

### cURL:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts?activo=true&page=1&limit=20' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "data": [
    {
      "id": "uuid-del-post",
      "titulo": "Post con imagen",
      "contenido": "Mira esta imagen",
      "userId": "uuid-del-usuario",
      "unidadId": null,
      "imagen": null,
      "activo": true,
      "createdAt": "2026-01-03 11:04:48.819",
      "updatedAt": "2026-01-03 11:04:48.819",
      "user": {
        "id": "uuid-del-usuario",
        "name": "Nombre Usuario",
        "email": "usuario@example.com",
        "image": "https://..."
      },
      "unidad": null,
      "comentariosCount": 5,
      "likesCount": 10,
      "userLiked": 1,
      "attachments": [...]
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## 3. Obtener Post por ID

**GET** `/comunicacion/posts/:id`

Obtiene un post específico por su ID.

### cURL:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "id": "uuid-del-post",
  "titulo": "Post con imagen",
  "contenido": "Mira esta imagen",
  "userId": "uuid-del-usuario",
  "unidadId": null,
  "imagen": null,
  "activo": true,
  "createdAt": "2026-01-03 11:04:48.819",
  "updatedAt": "2026-01-03 11:04:48.819",
  "user": {...},
  "unidad": null,
  "comentariosCount": 5,
  "likesCount": 10,
  "userLiked": 1,
  "attachments": [...]
}
```

---

## 4. Actualizar Post

**PUT** `/comunicacion/posts/:id`

Actualiza un post. Solo el autor o ADMIN puede editar.

### cURL:
```bash
curl --location --request PUT 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--data '{
  "titulo": "Título actualizado",
  "contenido": "Contenido actualizado"
}'
```

### Respuesta exitosa:
```json
{
  "id": "uuid-del-post",
  "titulo": "Título actualizado",
  "contenido": "Contenido actualizado",
  ...
}
```

---

## 5. Eliminar Post

**DELETE** `/comunicacion/posts/:id`

Elimina un post (soft delete). Solo el autor o ADMIN puede eliminar.

### cURL:
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "message": "Post eliminado exitosamente"
}
```

---

## 6. Obtener Comentarios de un Post

**GET** `/comunicacion/posts/:id/comentarios`

Obtiene todos los comentarios de un post.

### cURL:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST/comentarios' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
[
  {
    "id": "uuid-del-comentario",
    "postId": "uuid-del-post",
    "userId": "uuid-del-usuario",
    "contenido": "Este es un comentario",
    "activo": true,
    "createdAt": "2026-01-03 11:04:48.819",
    "updatedAt": "2026-01-03 11:04:48.819",
    "user": {
      "id": "uuid-del-usuario",
      "name": "Nombre Usuario",
      "email": "usuario@example.com",
      "image": "https://..."
    },
    "unidad": null
  }
]
```

---

## 7. Crear Comentario en un Post

**POST** `/comunicacion/posts/:id/comentarios`

Crea un comentario en un post.

### cURL:
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST/comentarios' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--data '{
  "contenido": "Este es mi comentario"
}'
```

### Respuesta exitosa:
```json
{
  "id": "uuid-del-comentario",
  "postId": "uuid-del-post",
  "userId": "uuid-del-usuario",
  "contenido": "Este es mi comentario",
  "activo": true,
  "createdAt": "2026-01-03 11:04:48.819",
  "updatedAt": "2026-01-03 11:04:48.819",
  "user": {...},
  "unidad": null
}
```

---

## 8. Agregar Reacción a un Post

**POST** `/comunicacion/posts/:id/reaction`

Agrega o actualiza una reacción en un post. Tipos disponibles: `LIKE`, `LOVE`, `LAUGH`, `WOW`, `SAD`, `ANGRY`.

### cURL:
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST/reaction' \
--header 'Content-Type: application/json' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \
--data '{
  "tipo": "LOVE"
}'
```

### Respuesta exitosa:
```json
{
  "message": "Reacción agregada exitosamente",
  "reaction": "LOVE",
  "reactionsCount": [
    {
      "tipo": "LIKE",
      "count": 5
    },
    {
      "tipo": "LOVE",
      "count": 3
    }
  ]
}
```

---

## 9. Eliminar Reacción de un Post

**DELETE** `/comunicacion/posts/:id/reaction`

Elimina la reacción del usuario actual en un post.

### cURL:
```bash
curl --location --request DELETE 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST/reaction' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "message": "Reacción eliminada exitosamente",
  "reaction": null,
  "reactionsCount": [
    {
      "tipo": "LIKE",
      "count": 4
    }
  ]
}
```

---

## 10. Toggle Like (Legacy)

**POST** `/comunicacion/posts/:id/like`

Agrega o elimina un like en un post (método legacy, mantiene compatibilidad).

### cURL:
```bash
curl --location --request POST 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/posts/UUID_DEL_POST/like' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "liked": true,
  "message": "Like agregado"
}
```

---

## 11. Obtener Usuarios (Sidebar)

**GET** `/comunicacion/usuarios`

Obtiene la lista de usuarios del condominio para mostrar en el sidebar.

### Parámetros de consulta:
- `page` (opcional): Número de página
- `limit` (opcional): Cantidad de resultados por página
- `search` (opcional): Búsqueda por nombre o email

### cURL:
```bash
curl --location 'http://condominio-las-flores-actualizado.localhost:3001/comunicacion/usuarios?limit=5' \
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
```

### Respuesta exitosa:
```json
{
  "data": [
    {
      "id": "uuid-del-usuario",
      "name": "Nombre Usuario",
      "email": "usuario@example.com",
      "image": "https://...",
      "role": "ADMIN"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 5,
  "totalPages": 10
}
```

---

## Tipos de Archivos Soportados

### Imágenes:
- `jpg`, `jpeg`, `png`, `gif`, `webp`
- Se procesan automáticamente: redimensionan a máximo 1920x1920px y se convierten a WebP
- Calidad: 85%

### Videos:
- `mp4`, `avi`, `mov`, `webm`
- Tamaño máximo: 50MB

### Audio:
- `mp3`, `wav`, `ogg`
- Tamaño máximo: 50MB

### Documentos:
- `pdf`, `doc`, `docx`, `xls`, `xlsx`
- Tamaño máximo: 50MB

---

## Tipos de Reacciones

- `LIKE` - 👍 Me gusta
- `LOVE` - ❤️ Me encanta
- `LAUGH` - 😂 Me divierte
- `WOW` - 😮 Me asombra
- `SAD` - 😢 Me entristece
- `ANGRY` - 😠 Me enoja

**Nota:** Un usuario solo puede tener una reacción por post. Si ya tiene una reacción y agrega otra, se actualiza la reacción existente.

---

## Códigos de Estado HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Error en la solicitud (validación, datos inválidos)
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - No autorizado (permisos insuficientes)
- `404 Not Found` - Recurso no encontrado
- `500 Internal Server Error` - Error del servidor

---

## Notas Importantes

1. **Posts son por usuario, no por unidad**: Los posts están asociados al usuario que los crea. El `unidadId` se obtiene automáticamente del perfil del usuario solo para mostrar información adicional.

2. **Attachments**: Los archivos se almacenan en S3 y se incluyen en el campo `attachments` de la respuesta. El campo `imagen` es legacy y puede estar en `null`.

3. **Reacciones**: Un usuario solo puede tener una reacción por post. Si agrega una nueva reacción, reemplaza la anterior.

4. **Soft Delete**: Los posts eliminados se marcan como `activo: false` pero no se eliminan físicamente de la base de datos.

5. **Paginación**: Todos los endpoints que devuelven listas soportan paginación con `page` y `limit`.

