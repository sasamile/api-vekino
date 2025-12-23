import { Provider } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

export const createPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    if (!poolInstance) {
      // Validar que DATABASE_URL esté configurado
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error(
          'DATABASE_URL no está configurado. Por favor, asegúrate de que la variable de entorno DATABASE_URL esté definida en tu archivo .env'
        );
      }

      // Parsear la URL de conexión para extraer parámetros SSL
      const url = new URL(connectionString);
      const sslMode = url.searchParams.get('sslmode') || 'require';

      // Configurar Pool con opciones SSL para CockroachDB
      poolInstance = new Pool({
        host: url.hostname,
        port: parseInt(url.port || '26257'),
        database: url.pathname.slice(1), // Remover el '/' inicial
        user: url.username,
        password: url.password,
        max: 10, // Número máximo de clientes en el pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: {
          rejectUnauthorized: sslMode === 'verify-full',
        },
      });
    }
    const adapter = new PrismaPg(poolInstance);
    prismaInstance = new PrismaClient({ adapter });

    // Manejar errores de conexión
    prismaInstance.$connect().catch((error) => {
      console.error('Error conectando a la base de datos:', error);
    });
  }
  return prismaInstance;
};

// Exportar la instancia para uso en otros módulos
export const getPrismaClient = (): PrismaClient => {
  return createPrismaClient();
};

export const PrismaProvider: Provider = {
  provide: PrismaClient,
  useFactory: createPrismaClient,
};

