import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Configuración centralizada de Swagger/OpenAPI
 * Toda la documentación de la API se define aquí para mantener los controladores limpios
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('API Vekino')
  .setDescription(
    `API para gestión de condominios

## Sistema de Subdominios

Esta API utiliza un sistema de subdominios para identificar condominios. Los endpoints de usuarios y unidades requieren que se acceda a través del subdominio del condominio.

### Ejemplos de URLs:
- **Desarrollo local**: \`http://condominio-las-flores.localhost:3000\`
- **Producción**: \`https://condominio-las-flores.tudominio.com\`

### Endpoints que requieren subdominio:
- Todos los endpoints bajo \`/condominios/users\` (excepto \`/condominios/login\`)
- Todos los endpoints bajo \`/unidades\`
- \`GET /condominios/config\`

### Endpoints que NO requieren subdominio:
- \`POST /superadmin/*\` - Autenticación de superadministradores
- \`POST /condominios\` - Crear condominio (requiere SUPERADMIN)
- \`GET /condominios\` - Listar todos los condominios
- \`GET /condominios/{id}\` - Obtener condominio por ID
- \`POST /condominios/login\` - Login de usuarios (detecta subdominio automáticamente)
- \`GET /condominios/validate-subdomain/{subdomain}\` - Validar subdominio

### Autenticación:
- **Superadministradores**: Usan \`/superadmin/login\` y obtienen un token JWT
- **Usuarios de condominios**: Usan \`/condominios/login\` y obtienen una cookie de sesión
- Las cookies de sesión funcionan solo en el subdominio específico del condominio`,
  )
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Token de autenticación JWT',
      in: 'header',
    },
    'JWT-auth',
  )
  .addCookieAuth('better-auth.session_token', {
    type: 'apiKey',
    in: 'cookie',
    name: 'better-auth.session_token',
    description: 'Cookie de sesión de Better Auth',
  })
  .addServer(
    'http://localhost:3000',
    'Servidor base (sin subdominio) - Para endpoints de superadmin y creación de condominios',
  )
  .addServer(
    'http://condominio-las-flores.localhost:3000',
    'Servidor con subdominio - Para endpoints de usuarios y unidades (ejemplo)',
  )
  .addTag('auth', 'Autenticación - Endpoints de autenticación de superadministradores')
  .addTag('condominios', 'Condominios - Gestión de condominios')
  .addTag(
    'condominios-users',
    'Condominios - Usuarios - Gestión de usuarios de condominios',
  )
  .addTag('unidades', 'Unidades - Gestión de unidades residenciales')
  .build();

/**
 * Configuración de operaciones de Swagger para endpoints comunes
 */
export const swaggerOperations = {
  // ========== AUTH ==========
  auth: {
    register: {
      summary: 'Registrar un nuevo superadministrador',
      description: 'Crea una nueva cuenta de superadministrador en el sistema.',
      responses: {
        201: {
          description: 'Superadministrador registrado exitosamente',
        },
        400: {
          description: 'Datos de registro inválidos',
        },
      },
    },
    login: {
      summary: 'Iniciar sesión como superadministrador',
      description: 'Autentica un superadministrador y establece una sesión.',
      responses: {
        200: {
          description: 'Inicio de sesión exitoso',
        },
        401: {
          description: 'Credenciales inválidas',
        },
      },
    },
    getCurrentUser: {
      summary: 'Obtener información del superadmin actual',
      description: 'Retorna la información del superadmin autenticado basándose en la cookie de sesión. Incluye el rol del usuario y toda su información.',
      responses: {
        200: {
          description: 'Información del superadmin obtenida exitosamente',
        },
        403: {
          description: 'No autenticado - sesión no encontrada o inválida, o no tienes permisos de superadministrador',
        },
      },
    },
  },

  // ========== CONDOMINIOS ==========
  condominios: {
    create: {
      summary: 'Crear un nuevo condominio',
      description: `Crea un nuevo condominio con su base de datos dedicada. Requiere rol SUPERADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://localhost:3000/condominios' \\
--header 'Authorization: Bearer TU_TOKEN_AQUI' \\
--form 'name="Condominio Las Flores"' \\
--form 'nit="123456789"' \\
--form 'address="Calle 123 #45-67"' \\
--form 'city="Bogotá"' \\
--form 'country="Colombia"' \\
--form 'timezone="AMERICA_BOGOTA"' \\
--form 'subdomain="condominio-las-flores"' \\
--form 'primaryColor="#3B82F6"' \\
--form 'subscriptionPlan="BASICO"' \\
--form 'unitLimit="100"' \\
--form 'planExpiresAt="2025-12-31T23:59:59Z"' \\
--form 'activeModules="[\"reservas\",\"documentos\",\"pqrs\"]"' \\
--form 'logo=@"/ruta/a/imagen.jpg"'
\`\`\``,
      responses: {
        201: {
          description: 'Condominio creado exitosamente',
        },
        400: {
          description: 'Datos inválidos',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN',
        },
      },
    },
    findAll: {
      summary: 'Obtener todos los condominios',
      description: `Retorna una lista de todos los condominios registrados en el sistema.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/condominios' \\
--header 'Content-Type: application/json'
\`\`\``,
      responses: {
        200: {
          description: 'Lista de condominios obtenida exitosamente',
        },
      },
    },
    findOne: {
      summary: 'Obtener un condominio por ID',
      description: 'Retorna la información detallada de un condominio específico. Requiere rol SUPERADMIN.',
      responses: {
        200: {
          description: 'Condominio obtenido exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN',
        },
      },
    },
    update: {
      summary: 'Actualizar un condominio',
      description: 'Actualiza la información de un condominio. Requiere rol SUPERADMIN.',
      responses: {
        200: {
          description: 'Condominio actualizado exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    deactivate: {
      summary: 'Desactivar un condominio',
      description: 'Desactiva un condominio sin eliminarlo. Requiere rol SUPERADMIN.',
      responses: {
        200: {
          description: 'Condominio desactivado exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
      },
    },
    delete: {
      summary: 'Eliminar un condominio',
      description: 'Elimina permanentemente un condominio. Requiere rol SUPERADMIN.',
      responses: {
        200: {
          description: 'Condominio eliminado exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
      },
    },
    validateSubdomain: {
      summary: 'Validar disponibilidad de subdominio',
      description: 'Valida si un subdominio está disponible para uso',
      responses: {
        200: {
          description: 'Resultado de la validación',
        },
      },
    },
    getConfig: {
      summary: 'Obtener configuración visual del condominio',
      description: 'Retorna la configuración visual (logo, color) del condominio detectado del subdominio',
      responses: {
        200: {
          description: 'Configuración obtenida exitosamente',
        },
        400: {
          description: 'Subdominio no detectado',
        },
      },
    },
    getAllDomains: {
      summary: 'Obtener todos los dominios de condominios activos',
      description: 'Retorna una lista de todos los subdominios (dominios) de los condominios activos. Este endpoint es público y no requiere autenticación.',
      responses: {
        200: {
          description: 'Lista de dominios obtenida exitosamente',
        },
      },
    },
  },

  // ========== CONDOMINIOS USERS ==========
  condominiosUsers: {
    create: {
      summary: 'Crear un nuevo usuario en el condominio',
      description: `Crea un nuevo usuario en el condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.
- Ejemplo: \`http://condominio-las-flores.localhost:3000/condominios/users\`
- El subdominio se detecta automáticamente del header \`Host\` de la petición.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "name": "Juan Pérez",
    "email": "juan.perez@email.com",
    "password": "Password123",
    "role": "PROPIETARIO",
    "firstName": "Juan",
    "lastName": "Pérez",
    "tipoDocumento": "CC",
    "numeroDocumento": "1234567890",
    "telefono": "3001234567",
    "unidadId": "93e0ef39-855a-454b-b612-02e70d74e924"
}'
\`\`\``,
      responses: {
        201: {
          description: 'Usuario creado exitosamente',
        },
        400: {
          description: 'Datos inválidos o subdominio no detectado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
        },
      },
    },
    findAll: {
      summary: 'Obtener todos los usuarios del condominio',
      description: `Retorna una lista de todos los usuarios del condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.
- Ejemplo: \`http://condominio-las-flores.localhost:3000/condominios/users\`

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
\`\`\``,
      responses: {
        200: {
          description: 'Lista de usuarios obtenida exitosamente',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
        },
      },
    },
    findOne: {
      summary: 'Obtener un usuario específico del condominio',
      description: 'Retorna la información detallada de un usuario específico del condominio. Requiere rol SUPERADMIN o ADMIN.',
      responses: {
        200: {
          description: 'Usuario obtenido exitosamente',
        },
        404: {
          description: 'Usuario no encontrado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
        },
      },
    },
    updateRole: {
      summary: 'Actualizar el rol de un usuario',
      description: `Actualiza el rol de un usuario específico en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}/role' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "role": "ADMIN"
}'
\`\`\``,
      responses: {
        200: {
          description: 'Rol actualizado exitosamente',
        },
        404: {
          description: 'Usuario no encontrado',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    update: {
      summary: 'Actualizar un usuario (PUT)',
      description: `Actualiza completamente la información de un usuario en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--form 'name="Juan Pérez"' \\
--form 'email="juan.perez@example.com"' \\
--form 'identificationNumber="1234567890"' \\
--form 'image=@"/ruta/a/imagen.jpg"'
\`\`\``,
      responses: {
        200: {
          description: 'Usuario actualizado exitosamente',
        },
        404: {
          description: 'Usuario no encontrado',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    patch: {
      summary: 'Actualizar parcialmente un usuario (PATCH)',
      description: `Actualiza parcialmente la información de un usuario en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--form 'image=@"/ruta/a/nueva-imagen.jpg"'
\`\`\``,
      responses: {
        200: {
          description: 'Usuario actualizado exitosamente',
        },
        404: {
          description: 'Usuario no encontrado',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    delete: {
      summary: 'Eliminar un usuario del condominio',
      description: `Elimina un usuario del condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location --request DELETE 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
\`\`\``,
      responses: {
        200: {
          description: 'Usuario eliminado exitosamente',
        },
        404: {
          description: 'Usuario no encontrado',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    createByCondominioId: {
      summary: 'Crear un nuevo usuario en el condominio (solo SUPERADMIN)',
      description: `Crea un nuevo usuario en un condominio específico. Solo disponible para SUPERADMIN.
Requiere especificar el ID del condominio en la URL.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/condominios/{condominioId}/users' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "name": "Juan Pérez",
    "email": "juan.perez@email.com",
    "password": "Password123",
    "role": "ADMIN",
    "firstName": "Juan",
    "lastName": "Pérez"
}'
\`\`\``,
      responses: {
        201: {
          description: 'Usuario creado exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN',
        },
      },
    },
    findAllByCondominioId: {
      summary: 'Obtener todos los usuarios de un condominio por ID (solo SUPERADMIN)',
      description: `Retorna una lista de todos los usuarios de un condominio específico. Solo disponible para SUPERADMIN.
Requiere especificar el ID del condominio en la URL.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/condominios/{condominioId}/users' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer TU_TOKEN_AQUI' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
\`\`\``,
      responses: {
        200: {
          description: 'Lista de usuarios obtenida exitosamente',
        },
        404: {
          description: 'Condominio no encontrado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN',
        },
      },
    },
    login: {
      summary: 'Iniciar sesión como usuario de condominio',
      description: 'Autentica un usuario de condominio y establece una sesión. El condominio se detecta automáticamente del subdominio si no se proporciona condominioId.',
      responses: {
        200: {
          description: 'Inicio de sesión exitoso',
        },
        401: {
          description: 'Credenciales inválidas',
        },
        400: {
          description: 'Datos inválidos o subdominio no detectado',
        },
      },
    },
    getCurrentUser: {
      summary: 'Obtener información del usuario actual',
      description: 'Retorna la información del usuario autenticado basándose en la cookie de sesión. Incluye el rol del usuario y toda su información. Funciona tanto para usuarios de condominios como para superadmins.',
      responses: {
        200: {
          description: 'Información del usuario obtenida exitosamente',
        },
        403: {
          description: 'No autenticado - sesión no encontrada o inválida',
        },
      },
    },
  },

  // ========== UNIDADES ==========
  unidades: {
    create: {
      summary: 'Crear una nueva unidad',
      description: `Crea una nueva unidad en el condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.
- Ejemplo: \`http://condominio-las-flores.localhost:3000/unidades\`

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/unidades' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "identificador": "Apto 102",
    "tipo": "APARTAMENTO",
    "area": 65.5,
    "coeficienteCopropiedad": 2.5,
    "valorCuotaAdministracion": 150000,
    "estado": "VACIA"
}'
\`\`\``,
      responses: {
        201: {
          description: 'Unidad creada exitosamente',
        },
        400: {
          description: 'Datos inválidos o subdominio no detectado',
        },
        403: {
          description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
        },
      },
    },
    findAll: {
      summary: 'Obtener todas las unidades del condominio',
      description: `Retorna una lista de todas las unidades del condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Lista de unidades obtenida exitosamente',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    findAllWithResidentes: {
      summary: 'Obtener todas las unidades con sus residentes',
      description: `Retorna todas las unidades del condominio con sus usuarios asociados. Requiere rol SUPERADMIN o ADMIN.`,
      responses: {
        200: {
          description: 'Lista de unidades con residentes obtenida exitosamente',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    findOne: {
      summary: 'Obtener una unidad por ID',
      description: `Retorna los detalles de una unidad específica.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Unidad obtenida exitosamente',
        },
        404: {
          description: 'Unidad no encontrada',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    update: {
      summary: 'Editar una unidad (PUT - actualización completa)',
      description: `Actualiza completamente una unidad en el condominio.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Unidad actualizada exitosamente',
        },
        404: {
          description: 'Unidad no encontrada',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    patch: {
      summary: 'Actualizar parcialmente una unidad (PATCH)',
      description: `Actualiza parcialmente una unidad en el condominio.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Unidad actualizada exitosamente',
        },
        404: {
          description: 'Unidad no encontrada',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    delete: {
      summary: 'Eliminar una unidad',
      description: `Elimina una unidad del condominio. Solo se puede eliminar si no tiene usuarios asociados.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Unidad eliminada exitosamente',
        },
        400: {
          description: 'No se puede eliminar la unidad porque tiene usuarios asociados',
        },
        404: {
          description: 'Unidad no encontrada',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
    bulkUpload: {
      summary: 'Carga masiva de unidades',
      description: `Carga múltiples unidades desde un array. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.`,
      responses: {
        200: {
          description: 'Carga de unidades completada',
        },
        400: {
          description: 'Datos inválidos',
        },
        403: {
          description: 'No autorizado',
        },
      },
    },
  },
};

