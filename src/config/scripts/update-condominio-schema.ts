/**
 * Script para actualizar el esquema de Prisma en bases de datos de condominio existentes
 * Agrega las tablas de Factura y Pago si no existen
 * 
 * Uso:
 * ts-node src/config/scripts/update-condominio-schema.ts <database-url>
 * 
 * Ejemplo:
 * ts-node src/config/scripts/update-condominio-schema.ts "postgresql://user:password@host:26257/condominio_db?sslmode=require"
 */

import { DatabaseManagerService } from '../database-manager.service';

const databaseUrl = process.argv[2];

if (!databaseUrl) {
  console.error('Error: Se requiere la URL de la base de datos como argumento');
  console.error('Uso: ts-node src/config/scripts/update-condominio-schema.ts <database-url>');
  process.exit(1);
}

async function updateSchema() {
  try {
    console.log(`Actualizando esquema en: ${databaseUrl}`);
    
    const databaseManager = new DatabaseManagerService();
    
    // Inicializar el esquema (creará las tablas faltantes)
    await databaseManager.initializeCondominioDatabase(databaseUrl);
    
    console.log('✅ Esquema actualizado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar el esquema:', error);
    process.exit(1);
  }
}

updateSchema();


