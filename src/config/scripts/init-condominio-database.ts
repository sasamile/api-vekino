/**
 * Script para inicializar el esquema de Prisma en una base de datos de condominio
 * 
 * Uso:
 * ts-node src/scripts/init-condominio-database.ts <database-url>
 * 
 * Ejemplo:
 * ts-node src/scripts/init-condominio-database.ts "postgresql://user:password@host:26257/condominio_db?sslmode=require"
 */

import { execSync } from 'child_process';
import * as path from 'path';

const databaseUrl = process.argv[2];

if (!databaseUrl) {
  console.error('Error: Se requiere la URL de la base de datos como argumento');
  console.error('Uso: ts-node src/scripts/init-condominio-database.ts <database-url>');
  process.exit(1);
}

try {
  console.log(`Inicializando base de datos: ${databaseUrl}`);
  
  // Establecer la variable de entorno para Prisma
  process.env.DATABASE_URL = databaseUrl;

  // Ejecutar migraciones usando el schema de condominio
  const schemaPath = path.join(__dirname, '../../prisma/condominio/schema.prisma');
  
  execSync(
    `npx prisma migrate deploy --schema=${schemaPath}`,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    }
  );

  console.log('✅ Base de datos inicializada correctamente');
} catch (error) {
  console.error('❌ Error al inicializar la base de datos:', error);
  process.exit(1);
}

