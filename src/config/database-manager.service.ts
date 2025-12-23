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
        // Crear enum UserRole (si no existe)
        try {
          await pool.query(`
            CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'TENANT');
          `);
        } catch (error: any) {
          // Ignorar si el enum ya existe
          if (!error.message.includes('already exists') && error.code !== '42P16') {
            throw error;
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
        ]);

        // Crear índices en paralelo
        await Promise.all([
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user"("email");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "user_ownerId_idx" ON "user"("ownerId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");`),
          pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session"("token");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId");`),
          pool.query(`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");`),
        ]);

        // Crear foreign keys (deben ser secuenciales porque dependen de las tablas)
        const fkQueries = [
          `ALTER TABLE "session" ADD CONSTRAINT IF NOT EXISTS "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
          `ALTER TABLE "account" ADD CONSTRAINT IF NOT EXISTS "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
          `ALTER TABLE "user" ADD CONSTRAINT IF NOT EXISTS "user_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
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

