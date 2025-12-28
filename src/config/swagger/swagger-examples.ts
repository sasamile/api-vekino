/**
 * Ejemplos de respuestas para Swagger/OpenAPI
 * Centraliza todos los ejemplos para mantener los controladores limpios
 */
export const swaggerExamples = {
  // ========== AUTH ==========
  auth: {
    register: {
      success: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@vekino.com',
          name: 'Juan Pérez',
          role: 'SUPERADMIN',
        },
        session: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      },
      error: {
        statusCode: 400,
        message: [
          'email debe ser un correo electrónico válido',
          'password debe tener al menos 8 caracteres',
        ],
        error: 'Bad Request',
      },
    },
    login: {
      success: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@vekino.com',
          name: 'Juan Pérez',
          role: 'SUPERADMIN',
        },
        session: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      },
      error: {
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      },
    },
    getCurrentUser: {
      success: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@vekino.com',
          name: 'Super Admin',
          role: 'SUPERADMIN',
          emailVerified: true,
          image: null,
          identificationNumber: null,
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          condominioId: null,
        },
        session: {
          token: 'session-token',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      },
      error: {
        statusCode: 403,
        message: 'No autenticado - sesión no encontrada',
        error: 'Forbidden',
      },
    },
  },

  // ========== CONDOMINIOS ==========
  condominios: {
    create: {
      success: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Condominio Las Flores',
        nit: '900123456-7',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        country: 'Colombia',
        subdomain: 'condominio-las-flores',
        logo: 'https://example.com/logo.png',
        primaryColor: '#3B82F6',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
      error: {
        statusCode: 400,
        message: ['name debe ser una cadena de texto', 'name no debe estar vacío'],
        error: 'Bad Request',
      },
      forbidden: {
        statusCode: 403,
        message: 'No tienes permisos para realizar esta acción',
        error: 'Forbidden',
      },
    },
    findAll: {
      success: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Condominio Las Flores',
          nit: '900123456-7',
          address: 'Calle 123 #45-67',
          city: 'Bogotá',
          country: 'Colombia',
          subdomain: 'condominio-las-flores',
          logo: 'https://example.com/logo.png',
          primaryColor: '#3B82F6',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
        },
      ],
    },
    validateSubdomain: {
      success: {
        available: true,
        subdomain: 'condominio-las-flores',
      },
    },
    getConfig: {
      success: {
        logo: 'https://example.com/logo.png',
        primaryColor: '#3B82F6',
        name: 'Condominio Las Flores',
      },
    },
    delete: {
      success: {
        message: 'Condominio eliminado exitosamente',
      },
    },
    getAllDomains: {
      success: [
        'condominio-las-flores',
        'condominio-los-rosales',
        'condominio-villa-del-mar',
      ],
    },
  },

  // ========== CONDOMINIOS USERS ==========
  condominiosUsers: {
    create: {
      success: {
        id: '93e0ef39-855a-454b-b612-02e70d74e924',
        name: 'Juan Pérez',
        email: 'juan.perez@email.com',
        role: 'PROPIETARIO',
        firstName: 'Juan',
        lastName: 'Pérez',
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        telefono: '3001234567',
        unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
      },
      error: {
        statusCode: 400,
        message: 'No se pudo identificar el condominio. El subdominio es requerido.',
        error: 'Bad Request',
      },
      forbidden: {
        statusCode: 403,
        message: 'No tienes permisos para realizar esta acción',
        error: 'Forbidden',
      },
    },
    findAll: {
      success: [
        {
          id: '93e0ef39-855a-454b-b612-02e70d74e924',
          name: 'Juan Pérez',
          email: 'juan.perez@email.com',
          role: 'PROPIETARIO',
          firstName: 'Juan',
          lastName: 'Pérez',
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          telefono: '3001234567',
          unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
          createdAt: '2024-12-23T10:30:00.000Z',
          updatedAt: '2024-12-23T10:30:00.000Z',
        },
      ],
    },
    findOne: {
      success: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        role: 'ADMIN',
        firstName: 'Juan',
        lastName: 'Pérez',
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        telefono: '+57 300 123 4567',
        unidadId: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    },
    login: {
      success: {
        user: {
          id: '93e0ef39-855a-454b-b612-02e70d74e924',
          name: 'Juan Pérez',
          email: 'juan.perez@email.com',
          role: 'PROPIETARIO',
          firstName: 'Juan',
          lastName: 'Pérez',
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          telefono: '3001234567',
          unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
          createdAt: '2024-12-23T10:30:00.000Z',
          updatedAt: '2024-12-23T10:30:00.000Z',
        },
        session: {
          token: '14fa228c-6584-461b-bf44-2c08fcfb666f.b5363e75-1f55-47e7-aa64-4bfd34fe9a82',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      },
      error: {
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      },
    },
    delete: {
      success: {
        message: 'Usuario eliminado exitosamente',
      },
    },
    getCurrentUser: {
      success: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'juan.perez@example.com',
          name: 'Juan Pérez',
          role: 'ADMIN',
          emailVerified: true,
          image: null,
          firstName: 'Juan',
          lastName: 'Pérez',
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          telefono: '+57 300 123 4567',
          unidadId: '550e8400-e29b-41d4-a716-446655440001',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
        },
        session: {
          id: 'session-id',
          token: 'session-token',
          expiresAt: '2024-12-31T23:59:59.000Z',
          userId: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      error: {
        statusCode: 403,
        message: 'No autenticado - sesión no encontrada',
        error: 'Forbidden',
      },
    },
  },

  // ========== UNIDADES ==========
  unidades: {
    create: {
      success: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        identificador: '101',
        tipo: 'APARTAMENTO',
        area: 85.5,
        coeficienteCopropiedad: 0.025,
        valorCuotaAdministracion: 150000,
        estado: 'OCUPADA',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        totalUsuarios: 2,
      },
      error: {
        statusCode: 400,
        message: 'Ya existe una unidad con el identificador 101',
        error: 'Bad Request',
      },
    },
    findAll: {
      success: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          identificador: '101',
          tipo: 'APARTAMENTO',
          area: 85.5,
          coeficienteCopropiedad: 0.025,
          valorCuotaAdministracion: 150000,
          estado: 'OCUPADA',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          totalUsuarios: 2,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          identificador: '102',
          tipo: 'APARTAMENTO',
          area: 90.0,
          coeficienteCopropiedad: 0.030,
          valorCuotaAdministracion: 180000,
          estado: 'VACIA',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          totalUsuarios: 0,
        },
      ],
    },
    findOne: {
      success: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        identificador: '101',
        tipo: 'APARTAMENTO',
        area: 85.5,
        coeficienteCopropiedad: 0.025,
        valorCuotaAdministracion: 150000,
        estado: 'OCUPADA',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        totalUsuarios: 2,
      },
    },
    update: {
      success: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        identificador: '101',
        tipo: 'APARTAMENTO',
        area: 90.0,
        coeficienteCopropiedad: 0.030,
        valorCuotaAdministracion: 180000,
        estado: 'OCUPADA',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T10:30:00.000Z',
        totalUsuarios: 2,
      },
    },
    delete: {
      success: {
        message: 'Unidad 101 eliminada correctamente',
        deletedUnidad: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          identificador: '101',
          tipo: 'APARTAMENTO',
        },
      },
      error: {
        statusCode: 400,
        message: 'No se puede eliminar la unidad porque tiene 2 usuario(s) asociado(s)',
        error: 'Bad Request',
      },
    },
    bulkUpload: {
      success: {
        mensaje: 'Carga exitosa',
        resultados: {
          exitosas: 10,
          errores: [],
        },
      },
      partial: {
        mensaje: 'Se encontraron errores, por favor revise su archivo e inténtelo nuevamente.',
        resultados: {
          exitosas: 8,
          errores: [
            {
              unidad: {
                identificador: '101',
                tipo: 'APARTAMENTO',
                area: 85.5,
              },
              error: 'Ya existe una unidad con el identificador 101',
            },
          ],
        },
      },
    },
  },
};

