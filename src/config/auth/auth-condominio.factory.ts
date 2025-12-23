import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from 'generated/prisma/client';
import { DatabaseManagerService } from '../database-manager.service';

/**
 * Crea una instancia de Better Auth para un condominio específico
 */
export function createAuthForCondominio(
  databaseUrl: string,
  databaseManager: DatabaseManagerService,
) {
  const prisma = databaseManager.getPrismaClientForCondominio(databaseUrl);

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql', // CockroachDB es compatible con PostgreSQL
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET || 'better-auth-secret-change-in-production',
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'USER',
          input: false,
        },
      },
    },
  });
}


