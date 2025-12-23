# Configuración de Scalar.com para Documentación de API

Esta guía explica cómo usar Scalar.com para documentar los endpoints de la API Vekino usando la integración con GitHub.

## Configuración Local

La API ya está configurada con Swagger/OpenAPI. Puedes acceder a la documentación en:

- **Swagger UI**: `http://localhost:3000/api`
- **Especificación OpenAPI JSON**: `http://localhost:3000/api-json`
- **Especificación OpenAPI YAML**: `http://localhost:3000/api-yaml`

## Configuración en Scalar.com

### Paso 1: Generar la Especificación OpenAPI

1. Genera el archivo OpenAPI estático ejecutando:
   ```bash
   npm run generate:openapi
   ```

   Esto creará el archivo `docs/openapi.json` en la raíz del proyecto.

2. **Importante**: Asegúrate de hacer commit y push de este archivo a GitHub:
   ```bash
   git add docs/openapi.json scalar.config.json
   git commit -m "feat: agregar especificación OpenAPI para Scalar.com"
   git push
   ```

### Paso 2: Configurar Scalar.com con GitHub

1. Ve a [Scalar.com](https://scalar.com) e inicia sesión con tu cuenta.

2. En el panel de control, haz clic en "Link GitHub Account" para conectar tu cuenta de GitHub (si aún no lo has hecho).

3. Busca tu repositorio `@sasamile/api-vekino` y haz clic en "Link Repository".

4. Scalar.com detectará automáticamente el archivo `scalar.config.json` en la raíz del repositorio.

5. El archivo `scalar.config.json` está configurado para:
   - Usar el archivo `docs/openapi.json` como referencia de API
   - Publicar automáticamente cuando se hace merge a la rama `main`

### Paso 3: Verificar la Configuración

1. En Scalar.com, ve a la configuración de tu proyecto.

2. Verifica que:
   - **Rama**: `main`
   - **Ruta de configuración escalar**: `scalar.config.json`
   - **Referencias**: Debe mostrar "API Vekino" apuntando a `docs/openapi.json`

3. Si hay algún error, verifica que:
   - El archivo `scalar.config.json` existe en la raíz del repositorio
   - El archivo `docs/openapi.json` existe y es válido
   - Ambos archivos están en la rama `main` de GitHub

### Paso 4: Configurar la API Key (Opcional)

Si necesitas autenticación con API Key en Scalar.com:

1. Ve a la configuración de tu API en Scalar.com.

2. En la sección de autenticación, agrega tu API Key:
   ```
   eyJhbGciOiJFZERTQSJ9.eyJ1aWQiOiJJUVFVTE9QQ2JnSk1pbFAxcHRPc1kiLCJ0ZWFtVWlkIjoiTnd3NlBQWURVMkhsQ01IVVV6UTRSIiwidXNlckluZGV4IjoibnNwZXMyMDIwQGdtYWlsLmNvbSIsImlhdCI6MTc2NjUwNjg3OCwiZXhwIjoxNzk4MDQyODc4fQ.o8Gs9lS4h96HJtKsAQto8TaR2f4VH51gFX8G70gm-ngU8qypIIGF4ymvl6RK_P6CfiApcdYJoynyCzvsw8vTAA
   ```

3. Guarda la configuración.

### Paso 5: Publicar

Una vez que hayas configurado todo:

1. Haz clic en "Publicar" para hacer la documentación disponible.

2. Comparte la URL de la documentación con tu equipo.

## Autenticación en la Documentación

La API soporta dos métodos de autenticación:

1. **Bearer Token (JWT)**: Para autenticación con tokens JWT
2. **Cookie Auth**: Para autenticación con cookies de sesión (Better Auth)

Ambos métodos están configurados en la especificación OpenAPI y estarán disponibles en Scalar.com.

## Actualización de la Documentación

Cada vez que hagas cambios en los endpoints o DTOs:

1. Regenera el archivo OpenAPI:
   ```bash
   npm run generate:openapi
   ```

2. Haz commit y push de los cambios:
   ```bash
   git add docs/openapi.json
   git commit -m "docs: actualizar especificación OpenAPI"
   git push
   ```

3. Scalar.com se actualizará automáticamente cuando hagas merge a la rama `main` (gracias a `publishOnMerge: true` en `scalar.config.json`).

   **Nota**: Si quieres actualizar manualmente, puedes hacer clic en "Publicar" en el panel de Scalar.com.

## Endpoints Documentados

Los siguientes grupos de endpoints están documentados:

- **auth**: Endpoints de autenticación de superadministradores
- **condominios**: Gestión de condominios y usuarios
- **unidades**: Gestión de unidades residenciales

## Archivos de Configuración

### scalar.config.json

Este archivo le dice a Scalar.com dónde encontrar la especificación OpenAPI:

```json
{
  "$schema": "https://cdn.scalar.com/schema/scalar-config.json",
  "references": [
    {
      "name": "API Vekino",
      "path": "docs/openapi.json"
    }
  ],
  "publishOnMerge": true
}
```

### docs/openapi.json

Este archivo contiene la especificación OpenAPI completa generada automáticamente desde los decoradores en el código.

## Notas Importantes

- La especificación OpenAPI se genera automáticamente desde los decoradores en el código.
- Todos los DTOs están documentados con `@ApiProperty` y `@ApiPropertyOptional`.
- Los endpoints incluyen descripciones, ejemplos y códigos de respuesta.
- La autenticación está configurada para soportar tanto JWT como cookies.
- El archivo `docs/openapi.json` debe estar en el repositorio para que Scalar.com pueda importarlo desde GitHub.

## Solución de Problemas

### Error: "No válido" en la configuración de Scalar

Si ves el error "No válido" en la configuración de Scalar.com:

1. Verifica que el archivo `scalar.config.json` esté en la raíz del repositorio.
2. Verifica que el archivo `docs/openapi.json` exista y sea un JSON válido.
3. Asegúrate de que ambos archivos estén en la rama `main` de GitHub.
4. Intenta hacer un nuevo push o forzar la actualización en Scalar.com.

### La documentación no se actualiza automáticamente

1. Verifica que `publishOnMerge: true` esté en `scalar.config.json`.
2. Asegúrate de que los cambios estén en la rama `main`.
3. Verifica que Scalar.com tenga acceso al repositorio de GitHub.

