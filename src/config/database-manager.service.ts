import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class DatabaseManagerService implements OnModuleDestroy {
  private prismaClients: Map<string, PrismaClient> = new Map();
  private pools: Map<string, Pool> = new Map();

  /**
   * Obtiene o crea un cliente de Prisma para un condominio específico
   */
  getPrismaClientForCondominio(databaseUrl: string): PrismaClient {
    // Usar la URL como clave para cachear clientes
    if (this.prismaClients.has(databaseUrl)) {
      return this.prismaClients.get(databaseUrl)!;
    }

    // Crear nuevo pool de conexiones para este condominio
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode') || 'require';

    const pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port || '26257'),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: sslMode === 'verify-full',
      },
    });

    this.pools.set(databaseUrl, pool);

    // Crear cliente Prisma con el adapter
    const adapter = new PrismaPg(pool);
    const prismaClient = new PrismaClient({ adapter });

    // Conectar
    prismaClient.$connect().catch((error) => {
      console.error(`Error conectando a la base de datos del condominio:`, error);
    });

    this.prismaClients.set(databaseUrl, prismaClient);
    return prismaClient;
  }

  /**
   * Crea una nueva base de datos para un condominio
   * Nota: Esto requiere permisos de superusuario en CockroachDB
   */
  async createDatabaseForCondominio(
    masterDatabaseUrl: string,
    databaseName: string,
  ): Promise<string> {
    // Conectar a la base de datos maestra para crear la nueva BD
    const masterUrl = new URL(masterDatabaseUrl);
    
    // En CockroachDB, necesitamos conectarnos a una base de datos existente (como defaultdb)
    // para crear una nueva base de datos
    const systemDatabase = masterUrl.pathname.slice(1) || 'defaultdb';
    
    const masterPool = new Pool({
      host: masterUrl.hostname,
      port: parseInt(masterUrl.port || '26257'),
      database: systemDatabase,
      user: masterUrl.username,
      password: masterUrl.password,
      ssl: {
        rejectUnauthorized: masterUrl.searchParams.get('sslmode') === 'verify-full',
      },
    });

    try {
      // Crear la base de datos (CockroachDB usa CREATE DATABASE)
      // Escapar el nombre de la base de datos para evitar inyección SQL
      const escapedDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '_');
      await masterPool.query(`CREATE DATABASE IF NOT EXISTS ${escapedDbName}`);
      
      // Construir la nueva URL de conexión
      const newDatabaseUrl = new URL(masterDatabaseUrl);
      newDatabaseUrl.pathname = `/${escapedDbName}`;
      
      return newDatabaseUrl.toString();
    } finally {
      await masterPool.end();
    }
  }

  /**
   * Inicializa el esquema de Prisma en una base de datos de condominio
   * Crea las tablas directamente con SQL (mucho más rápido que prisma db push)
   */
  async initializeCondominioDatabase(databaseUrl: string): Promise<void> {
    try {
      // Verificar si las tablas ya existen
      const prisma = this.getPrismaClientForCondominio(databaseUrl);
      await prisma.$queryRaw`SELECT 1 FROM "user" LIMIT 1`;
      
      // Verificar si el campo identificationNumber existe, si no, agregarlo
      try {
        await prisma.$queryRaw`SELECT "identificationNumber" FROM "user" LIMIT 1`;
      } catch (error: any) {
        // Si el campo no existe, agregarlo
        if (error.message?.includes('does not exist') || error.code === '42703') {
          console.log('📝 Agregando campo identificationNumber a la tabla user...');
          await prisma.$executeRaw`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "identificationNumber" STRING;`;
          console.log('✅ Campo identificationNumber agregado correctamente');
        } else {
          throw error;
        }
      }
      
      // Verificar si la tabla unidad existe, si no, crearla
      try {
        await prisma.$queryRaw`SELECT 1 FROM "unidad" LIMIT 1`;
        console.log('✅ Tabla unidad ya existe');
      } catch (error: any) {
        // Si la tabla no existe, crearla
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('📝 Tabla unidad no existe. Creando tabla unidad y tablas relacionadas...');
          console.log('Error detectado:', error.message, 'Code:', error.code);
          await this.createMissingTablesWithPrisma(prisma);
          console.log('✅ Tablas faltantes creadas correctamente');
        } else {
          console.error('Error inesperado al verificar tabla unidad:', error);
          throw error;
        }
      }
      
      // Verificar si las tablas de finanzas existen, si no, crearlas
      try {
        await prisma.$queryRaw`SELECT 1 FROM "factura" LIMIT 1`;
        console.log('✅ Tabla factura ya existe');
      } catch (error: any) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('📝 Tabla factura no existe. Creando tablas de finanzas...');
          await this.createMissingTablesWithPrisma(prisma);
          console.log('✅ Tablas de finanzas creadas correctamente');
        }
      }

      // Verificar si las tablas de comunicación (tickets y posts) existen, si no, crearlas
      try {
        await prisma.$queryRaw`SELECT 1 FROM "ticket" LIMIT 1`;
        console.log('✅ Tabla ticket ya existe');
      } catch (error: any) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('📝 Tabla ticket no existe. Creando tablas de comunicación...');
          await this.createMissingTablesWithPrisma(prisma);
          console.log('✅ Tablas de comunicación creadas correctamente');
        }
      }

      // Verificar si las nuevas tablas de red social existen, si no, crearlas
      try {
        await prisma.$queryRaw`SELECT 1 FROM "post_reaction" LIMIT 1`;
        console.log('✅ Tabla post_reaction ya existe');
      } catch (error: any) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('📝 Tablas de red social no existen. Creando tablas de reacciones, attachments y chat...');
          await this.createRedSocialTables(prisma);
          console.log('✅ Tablas de red social creadas correctamente');
        }
      }
      
      console.log('✅ El esquema ya está inicializado en esta base de datos');
      return;
    } catch (error) {
      // Las tablas no existen, crearlas directamente con SQL (mucho más rápido)
      console.log('📦 Inicializando esquema en la base de datos del condominio...');
      
      const url = new URL(databaseUrl);
      const pool = new Pool({
        host: url.hostname,
        port: parseInt(url.port || '26257'),
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: {
          rejectUnauthorized: url.searchParams.get('sslmode') === 'verify-full',
        },
      });

      try {
        // Crear enums (si no existen)
        const enums = [
          { name: 'UserRole', values: ['ADMIN', 'USER', 'TENANT'] },
          { name: 'TipoUnidad', values: ['APARTAMENTO', 'CASA', 'LOCAL_COMERCIAL'] },
          { name: 'EstadoUnidad', values: ['OCUPADA', 'VACIA', 'EN_MANTENIMIENTO'] },
          { name: 'TipoDocumento', values: ['CC', 'CE', 'PASAPORTE', 'NIT', 'OTRO'] },
          { name: 'RolResidente', values: ['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'] },
          { name: 'EstadoTicket', values: ['ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'] },
        ];

        for (const enumDef of enums) {
          try {
            const valuesStr = enumDef.values.map(v => `'${v}'`).join(', ');
            await pool.query(`
              CREATE TYPE "${enumDef.name}" AS ENUM (${valuesStr});
            `);
          } catch (error: any) {
            // Ignorar si el enum ya existe
            if (!error.message.includes('already exists') && error.code !== '42P16') {
              throw error;
            }
          }
        }

        // Crear todas las tablas en paralelo (más rápido)
        await Promise.all([
          // Crear tabla User
          pool.query(`
            CREATE TABLE IF NOT EXISTS "user" (
              "id" STRING NOT NULL,
              "name" STRING NOT NULL,
              "email" STRING NOT NULL,
              "emailVerified" BOOL NOT NULL DEFAULT false,
              "image" STRING,
              "identificationNumber" STRING,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              "role" "UserRole" NOT NULL DEFAULT 'USER',
              "ownerId" STRING,
              CONSTRAINT "user_pkey" PRIMARY KEY ("id")
            );
          `),
          // Crear tabla Session
          pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
              "id" STRING NOT NULL,
              "expiresAt" TIMESTAMP(3) NOT NULL,
              "token" STRING NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              "ipAddress" STRING,
              "userAgent" STRING,
              "userId" STRING NOT NULL,
              CONSTRAINT "session_pkey" PRIMARY KEY ("id")
            );
          `),
          // Crear tabla Account
          pool.query(`
            CREATE TABLE IF NOT EXISTS "account" (
              "id" STRING NOT NULL,
              "accountId" STRING NOT NULL,
              "providerId" STRING NOT NULL,
              "userId" STRING NOT NULL,
              "accessToken" STRING,
              "refreshToken" STRING,
              "idToken" STRING,
              "accessTokenExpiresAt" TIMESTAMP(3),
              "refreshTokenExpiresAt" TIMESTAMP(3),
              "scope" STRING,
              "password" STRING,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "account_pkey" PRIMARY KEY ("id")
            );
          `),
          // Crear tabla Verification
          pool.query(`
            CREATE TABLE IF NOT EXISTS "verification" (
              "id" STRING NOT NULL,
              "identifier" STRING NOT NULL,
              "value" STRING NOT NULL,
              "expiresAt" TIMESTAMP(3) NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
            );
          `),
          // Crear tabla Unidad
          pool.query(`
            CREATE TABLE IF NOT EXISTS "unidad" (
              "id" STRING NOT NULL,
              "identificador" STRING NOT NULL,
              "tipo" "TipoUnidad" NOT NULL,
              "area" FLOAT,
              "coeficienteCopropiedad" FLOAT,
              "valorCuotaAdministracion" FLOAT,
              "estado" "EstadoUnidad" NOT NULL DEFAULT 'VACIA',
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "unidad_pkey" PRIMARY KEY ("id")
            );
          `),
          // Crear tabla Residente
          pool.query(`
            CREATE TABLE IF NOT EXISTS "residente" (
              "id" STRING NOT NULL,
              "nombre" STRING NOT NULL,
              "apellidos" STRING NOT NULL,
              "tipoDocumento" "TipoDocumento" NOT NULL,
              "numeroDocumento" STRING NOT NULL,
              "email" STRING NOT NULL,
              "telefono" STRING,
              "rol" "RolResidente" NOT NULL,
              "estado" BOOL NOT NULL DEFAULT true,
              "permitirAccesoPlataforma" BOOL NOT NULL DEFAULT false,
              "unidadId" STRING NOT NULL,
              "userId" STRING,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "residente_pkey" PRIMARY KEY ("id")
            );
          `),
        ]);

        // Crear índices en paralelo
        await Promise.all([
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user"("email");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "user_ownerId_idx" ON "user"("ownerId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");`),
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session"("token");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");`),
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "unidad_identificador_key" ON "unidad"("identificador");`),
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "residente_numeroDocumento_key" ON "residente"("numeroDocumento");`),
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "residente_email_key" ON "residente"("email");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "residente_unidadId_idx" ON "residente"("unidadId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "residente_userId_idx" ON "residente"("userId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "residente_estado_idx" ON "residente"("estado");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "residente_rol_idx" ON "residente"("rol");`),
        ]);

        // Crear foreign keys (deben ser secuenciales porque dependen de las tablas)
        const fkQueries = [
          `ALTER TABLE "session" ADD CONSTRAINT IF NOT EXISTS "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
          `ALTER TABLE "account" ADD CONSTRAINT IF NOT EXISTS "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
          `ALTER TABLE "user" ADD CONSTRAINT IF NOT EXISTS "user_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
          `ALTER TABLE "residente" ADD CONSTRAINT IF NOT EXISTS "residente_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
          `ALTER TABLE "residente" ADD CONSTRAINT IF NOT EXISTS "residente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        ];

        // Ejecutar foreign keys con manejo de errores (pueden fallar si ya existen)
        for (const query of fkQueries) {
          try {
            await pool.query(query);
          } catch (error: any) {
            // Ignorar si la constraint ya existe
            if (!error.message.includes('already exists') && error.code !== '42P16') {
              throw error;
            }
          }
        }

        console.log('✅ Esquema inicializado correctamente en la base de datos del condominio');
      } catch (sqlError: any) {
        console.error('❌ Error creando tablas:', sqlError);
        throw new Error(
          `Error al inicializar el esquema en la base de datos: ${sqlError.message}`,
        );
      } finally {
        await pool.end();
      }
    }
  }

  /**
   * Crea las tablas faltantes usando Prisma $executeRaw
   */
  private async createMissingTablesWithPrisma(prisma: PrismaClient): Promise<void> {
    // Crear enums si no existen
    const enums = [
      { name: 'TipoUnidad', values: ['APARTAMENTO', 'CASA', 'LOCAL_COMERCIAL'] },
      { name: 'EstadoUnidad', values: ['OCUPADA', 'VACIA', 'EN_MANTENIMIENTO'] },
      { name: 'TipoDocumento', values: ['CC', 'CE', 'PASAPORTE', 'NIT', 'OTRO'] },
      { name: 'RolResidente', values: ['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'] },
      { name: 'EstadoFactura', values: ['PENDIENTE', 'ENVIADA', 'PAGADA', 'VENCIDA', 'CANCELADA'] },
      { name: 'EstadoPago', values: ['PENDIENTE', 'PROCESANDO', 'APROBADO', 'RECHAZADO', 'CANCELADO'] },
      { name: 'MetodoPago', values: ['WOMPI', 'EFECTIVO'] },
      { name: 'EstadoTicket', values: ['ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'] },
      { name: 'TipoReaccion', values: ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'] },
      { name: 'TipoArchivo', values: ['IMAGEN', 'VIDEO', 'AUDIO', 'DOCUMENTO'] },
    ];

    for (const enumDef of enums) {
      try {
        const valuesStr = enumDef.values.map(v => `'${v}'`).join(', ');
        await prisma.$executeRawUnsafe(`
          CREATE TYPE "${enumDef.name}" AS ENUM (${valuesStr});
        `);
      } catch (error: any) {
        // Ignorar si el enum ya existe
        if (!error.message?.includes('already exists') && error.code !== '42P16') {
          // No lanzar error, solo continuar
        }
      }
    }

    // Crear tabla Unidad
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "unidad" (
        "id" STRING NOT NULL,
        "identificador" STRING NOT NULL,
        "tipo" "TipoUnidad" NOT NULL,
        "area" FLOAT,
        "coeficienteCopropiedad" FLOAT,
        "valorCuotaAdministracion" FLOAT,
        "estado" "EstadoUnidad" NOT NULL DEFAULT 'VACIA',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "unidad_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla Residente
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "residente" (
        "id" STRING NOT NULL,
        "nombre" STRING NOT NULL,
        "apellidos" STRING NOT NULL,
        "tipoDocumento" "TipoDocumento" NOT NULL,
        "numeroDocumento" STRING NOT NULL,
        "email" STRING NOT NULL,
        "telefono" STRING,
        "rol" "RolResidente" NOT NULL,
        "estado" BOOL NOT NULL DEFAULT true,
        "permitirAccesoPlataforma" BOOL NOT NULL DEFAULT false,
        "unidadId" STRING NOT NULL,
        "userId" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "residente_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla Factura
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "factura" (
        "id" STRING NOT NULL,
        "numeroFactura" STRING NOT NULL,
        "unidadId" STRING NOT NULL,
        "userId" STRING,
        "periodo" STRING NOT NULL,
        "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fechaVencimiento" TIMESTAMP(3) NOT NULL,
        "valor" FLOAT NOT NULL,
        "descripcion" STRING,
        "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
        "fechaEnvio" TIMESTAMP(3),
        "fechaPago" TIMESTAMP(3),
        "observaciones" STRING,
        "createdBy" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla Pago
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pago" (
        "id" STRING NOT NULL,
        "facturaId" STRING NOT NULL,
        "userId" STRING,
        "valor" FLOAT NOT NULL,
        "metodoPago" "MetodoPago" NOT NULL DEFAULT 'WOMPI',
        "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
        "wompiTransactionId" STRING,
        "wompiReference" STRING,
        "wompiPaymentLink" STRING,
        "wompiResponse" STRING,
        "fechaPago" TIMESTAMP(3),
        "observaciones" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear índices
    await Promise.all([
      prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "unidad_identificador_key" ON "unidad"("identificador");`),
      prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "residente_numeroDocumento_key" ON "residente"("numeroDocumento");`),
      prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "residente_email_key" ON "residente"("email");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "residente_unidadId_idx" ON "residente"("unidadId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "residente_userId_idx" ON "residente"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "residente_estado_idx" ON "residente"("estado");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "residente_rol_idx" ON "residente"("rol");`),
      prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "factura_numeroFactura_key" ON "factura"("numeroFactura");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "factura_unidadId_idx" ON "factura"("unidadId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "factura_userId_idx" ON "factura"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "factura_periodo_idx" ON "factura"("periodo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "factura_estado_idx" ON "factura"("estado");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "factura_fechaVencimiento_idx" ON "factura"("fechaVencimiento");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pago_facturaId_idx" ON "pago"("facturaId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pago_userId_idx" ON "pago"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pago_estado_idx" ON "pago"("estado");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pago_wompiTransactionId_idx" ON "pago"("wompiTransactionId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pago_wompiReference_idx" ON "pago"("wompiReference");`),
    ]);

    // Crear foreign keys
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "residente" ADD CONSTRAINT IF NOT EXISTS "residente_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "residente" ADD CONSTRAINT IF NOT EXISTS "residente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "factura" ADD CONSTRAINT IF NOT EXISTS "factura_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "factura" ADD CONSTRAINT IF NOT EXISTS "factura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "pago" ADD CONSTRAINT IF NOT EXISTS "pago_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "pago" ADD CONSTRAINT IF NOT EXISTS "pago_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (error: any) {
      if (!error.message?.includes('already exists') && error.code !== '42P16') {
        // Ignorar si ya existe
      }
    }

    // Crear tabla Ticket
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ticket" (
        "id" STRING NOT NULL,
        "titulo" STRING NOT NULL,
        "descripcion" STRING NOT NULL,
        "estado" "EstadoTicket" NOT NULL DEFAULT 'ABIERTO',
        "categoria" STRING,
        "prioridad" STRING DEFAULT 'MEDIA',
        "userId" STRING NOT NULL,
        "unidadId" STRING,
        "asignadoA" STRING,
        "fechaResolucion" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla TicketComment
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ticket_comment" (
        "id" STRING NOT NULL,
        "ticketId" STRING NOT NULL,
        "userId" STRING NOT NULL,
        "contenido" STRING NOT NULL,
        "esInterno" BOOL NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ticket_comment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla Post
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post" (
        "id" STRING NOT NULL,
        "titulo" STRING,
        "contenido" STRING NOT NULL,
        "userId" STRING NOT NULL,
        "unidadId" STRING,
        "imagen" STRING,
        "activo" BOOL NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "post_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla PostComment
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_comment" (
        "id" STRING NOT NULL,
        "postId" STRING NOT NULL,
        "userId" STRING NOT NULL,
        "contenido" STRING NOT NULL,
        "activo" BOOL NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "post_comment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla PostReaction (reemplaza PostLike)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_reaction" (
        "id" STRING NOT NULL,
        "postId" STRING NOT NULL,
        "userId" STRING NOT NULL,
        "tipo" "TipoReaccion" NOT NULL DEFAULT 'LIKE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_reaction_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla PostAttachment (archivos multimedia)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_attachment" (
        "id" STRING NOT NULL,
        "postId" STRING NOT NULL,
        "tipo" "TipoArchivo" NOT NULL,
        "url" STRING NOT NULL,
        "nombre" STRING,
        "tamaño" INT,
        "mimeType" STRING,
        "thumbnailUrl" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_attachment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla ChatMessage
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "chat_message" (
        "id" STRING NOT NULL,
        "remitenteId" STRING NOT NULL,
        "destinatarioId" STRING NOT NULL,
        "contenido" STRING NOT NULL,
        "leido" BOOL NOT NULL DEFAULT false,
        "leidoAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla ChatAttachment
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "chat_attachment" (
        "id" STRING NOT NULL,
        "mensajeId" STRING NOT NULL,
        "tipo" "TipoArchivo" NOT NULL,
        "url" STRING NOT NULL,
        "nombre" STRING,
        "tamaño" INT,
        "mimeType" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chat_attachment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear índices para tickets y posts
    await Promise.all([
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_userId_idx" ON "ticket"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_unidadId_idx" ON "ticket"("unidadId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_estado_idx" ON "ticket"("estado");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_categoria_idx" ON "ticket"("categoria");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_asignadoA_idx" ON "ticket"("asignadoA");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_createdAt_idx" ON "ticket"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_comment_ticketId_idx" ON "ticket_comment"("ticketId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_comment_userId_idx" ON "ticket_comment"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_comment_createdAt_idx" ON "ticket_comment"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_userId_idx" ON "post"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_unidadId_idx" ON "post"("unidadId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_activo_idx" ON "post"("activo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_createdAt_idx" ON "post"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_comment_postId_idx" ON "post_comment"("postId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_comment_userId_idx" ON "post_comment"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_comment_createdAt_idx" ON "post_comment"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_postId_idx" ON "post_reaction"("postId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_userId_idx" ON "post_reaction"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_tipo_idx" ON "post_reaction"("tipo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_attachment_postId_idx" ON "post_attachment"("postId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_attachment_tipo_idx" ON "post_attachment"("tipo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_remitenteId_idx" ON "chat_message"("remitenteId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_destinatarioId_idx" ON "chat_message"("destinatarioId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_leido_idx" ON "chat_message"("leido");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_createdAt_idx" ON "chat_message"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_attachment_mensajeId_idx" ON "chat_attachment"("mensajeId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_attachment_tipo_idx" ON "chat_attachment"("tipo");`),
    ]);

    // Crear unique constraint para post_reaction (un usuario solo puede tener una reacción por post)
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "post_reaction_postId_userId_key" ON "post_reaction"("postId", "userId");`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    // Crear foreign keys para tickets y posts
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ticket" ADD CONSTRAINT IF NOT EXISTS "ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ticket" ADD CONSTRAINT IF NOT EXISTS "ticket_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ticket_comment" ADD CONSTRAINT IF NOT EXISTS "ticket_comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ticket_comment" ADD CONSTRAINT IF NOT EXISTS "ticket_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post" ADD CONSTRAINT IF NOT EXISTS "post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post" ADD CONSTRAINT IF NOT EXISTS "post_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_comment" ADD CONSTRAINT IF NOT EXISTS "post_comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_comment" ADD CONSTRAINT IF NOT EXISTS "post_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_reaction" ADD CONSTRAINT IF NOT EXISTS "post_reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_reaction" ADD CONSTRAINT IF NOT EXISTS "post_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_attachment" ADD CONSTRAINT IF NOT EXISTS "post_attachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_message" ADD CONSTRAINT IF NOT EXISTS "chat_message_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_message" ADD CONSTRAINT IF NOT EXISTS "chat_message_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_attachment" ADD CONSTRAINT IF NOT EXISTS "chat_attachment_mensajeId_fkey" FOREIGN KEY ("mensajeId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }
  }

  /**
   * Crea las tablas de red social (reacciones, attachments, chat) si no existen
   */
  private async createRedSocialTables(prisma: PrismaClient): Promise<void> {
    // Crear enums si no existen
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE IF NOT EXISTS "TipoReaccion" AS ENUM ('LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY');
      `);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE IF NOT EXISTS "TipoArchivo" AS ENUM ('IMAGEN', 'VIDEO', 'AUDIO', 'DOCUMENTO');
      `);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    // Crear tabla PostReaction (reemplaza PostLike)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_reaction" (
        "id" STRING NOT NULL,
        "postId" STRING NOT NULL,
        "userId" STRING NOT NULL,
        "tipo" "TipoReaccion" NOT NULL DEFAULT 'LIKE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_reaction_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla PostAttachment (archivos multimedia)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_attachment" (
        "id" STRING NOT NULL,
        "postId" STRING NOT NULL,
        "tipo" "TipoArchivo" NOT NULL,
        "url" STRING NOT NULL,
        "nombre" STRING,
        "tamaño" INT,
        "mimeType" STRING,
        "thumbnailUrl" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_attachment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla ChatMessage
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "chat_message" (
        "id" STRING NOT NULL,
        "remitenteId" STRING NOT NULL,
        "destinatarioId" STRING NOT NULL,
        "contenido" STRING NOT NULL,
        "leido" BOOL NOT NULL DEFAULT false,
        "leidoAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear tabla ChatAttachment
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "chat_attachment" (
        "id" STRING NOT NULL,
        "mensajeId" STRING NOT NULL,
        "tipo" "TipoArchivo" NOT NULL,
        "url" STRING NOT NULL,
        "nombre" STRING,
        "tamaño" INT,
        "mimeType" STRING,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chat_attachment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Crear índices
    await Promise.all([
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_postId_idx" ON "post_reaction"("postId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_userId_idx" ON "post_reaction"("userId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_reaction_tipo_idx" ON "post_reaction"("tipo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_attachment_postId_idx" ON "post_attachment"("postId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_attachment_tipo_idx" ON "post_attachment"("tipo");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_remitenteId_idx" ON "chat_message"("remitenteId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_destinatarioId_idx" ON "chat_message"("destinatarioId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_leido_idx" ON "chat_message"("leido");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_message_createdAt_idx" ON "chat_message"("createdAt");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_attachment_mensajeId_idx" ON "chat_attachment"("mensajeId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "chat_attachment_tipo_idx" ON "chat_attachment"("tipo");`),
    ]);

    // Crear unique constraint para post_reaction
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "post_reaction_postId_userId_key" ON "post_reaction"("postId", "userId");`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    // Crear foreign keys
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_reaction" ADD CONSTRAINT IF NOT EXISTS "post_reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_reaction" ADD CONSTRAINT IF NOT EXISTS "post_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "post_attachment" ADD CONSTRAINT IF NOT EXISTS "post_attachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_message" ADD CONSTRAINT IF NOT EXISTS "chat_message_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_message" ADD CONSTRAINT IF NOT EXISTS "chat_message_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "chat_attachment" ADD CONSTRAINT IF NOT EXISTS "chat_attachment_mensajeId_fkey" FOREIGN KEY ("mensajeId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (error: any) {
      // Ignorar si ya existe
    }
  }

  /**
   * Elimina una base de datos de condominio
   */
  async deleteDatabaseForCondominio(
    masterDatabaseUrl: string,
    databaseName: string,
  ): Promise<void> {
    const masterUrl = new URL(masterDatabaseUrl);
    const systemDatabase = masterUrl.pathname.slice(1) || 'defaultdb';
    
    const masterPool = new Pool({
      host: masterUrl.hostname,
      port: parseInt(masterUrl.port || '26257'),
      database: systemDatabase,
      user: masterUrl.username,
      password: masterUrl.password,
      ssl: {
        rejectUnauthorized: masterUrl.searchParams.get('sslmode') === 'verify-full',
      },
    });

    try {
      // Cerrar todas las conexiones activas a la base de datos antes de eliminarla
      const escapedDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // En CockroachDB, primero debemos terminar todas las conexiones activas
      await masterPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [escapedDbName]).catch(() => {
        // Ignorar errores si no hay conexiones activas
      });

      // Eliminar la base de datos
      await masterPool.query(`DROP DATABASE IF EXISTS ${escapedDbName}`);
      console.log(`✅ Base de datos ${escapedDbName} eliminada correctamente`);
    } catch (error) {
      console.error('Error eliminando base de datos:', error);
      throw new Error(`Error al eliminar la base de datos: ${error.message}`);
    } finally {
      await masterPool.end();
      
      // Limpiar el cliente de Prisma de la caché si existe
      const databaseUrl = new URL(masterDatabaseUrl);
      databaseUrl.pathname = `/${databaseName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const urlString = databaseUrl.toString();
      
      if (this.prismaClients.has(urlString)) {
        const client = this.prismaClients.get(urlString)!;
        await client.$disconnect().catch(() => {});
        this.prismaClients.delete(urlString);
      }
      
      if (this.pools.has(urlString)) {
        const pool = this.pools.get(urlString)!;
        await pool.end().catch(() => {});
        this.pools.delete(urlString);
      }
    }
  }

  /**
   * Cierra todas las conexiones al destruir el módulo
   */
  async onModuleDestroy() {
    // Cerrar todos los clientes de Prisma
    for (const [url, client] of this.prismaClients.entries()) {
      try {
        await client.$disconnect();
      } catch (error) {
        console.error(`Error desconectando cliente de ${url}:`, error);
      }
    }

    // Cerrar todos los pools
    for (const [url, pool] of this.pools.entries()) {
      try {
        await pool.end();
      } catch (error) {
        console.error(`Error cerrando pool de ${url}:`, error);
      }
    }

    this.prismaClients.clear();
    this.pools.clear();
  }
}

