import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrismaClient } from "../prisma.provider";

// Usar la misma instancia de PrismaClient del provider
const prisma = getPrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // CockroachDB es compatible con PostgreSQL
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Puedes cambiar esto a true si quieres verificación de email
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/auth", // Ruta base para Better Auth
  secret: process.env.BETTER_AUTH_SECRET || "better-auth-secret-change-in-production",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "http://localhost:5173",
    // Agregar todos los orígenes confiables (se pueden agregar más según necesidad)
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false, // No permitir que el usuario establezca el rol durante el registro
      },
    },
  },
});

