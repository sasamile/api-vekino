import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

/**
 * Servicio para manejar migraciones de esquema en bases de datos de condominios
 * Se encarga de actualizar enums y columnas cuando es necesario
 */
@Injectable()
export class SchemaMigrationService {
  // Cache para evitar verificaciones repetidas en la misma instancia
  private columnsChecked = new Set<string>();
  private enumChecked = new Set<string>();

  /**
   * Asegura que el enum UserRole tenga los valores correctos
   */
  async ensureUserRoleEnum(prisma: PrismaClient) {
    const cacheKey = (prisma as any)._connectionUrl || 'default';

    if (this.enumChecked.has(cacheKey)) {
      return;
    }

    try {
      const enumValues = (await prisma.$queryRawUnsafe(`
        SELECT unnest(enum_range(NULL::"UserRole"))::text as value
      `)) as any[];

      const existingValues = new Set(enumValues.map((v: any) => v.value));
      const requiredValues = new Set(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE']);

      const missingValues = Array.from(requiredValues).filter(
        (val) => !existingValues.has(val),
      );

      if (missingValues.length > 0) {
        console.log(`🔄 Actualizando enum UserRole: agregando ${missingValues.join(', ')}`);

        for (const value of missingValues) {
          try {
            await prisma.$executeRawUnsafe(
              `ALTER TYPE "UserRole" ADD VALUE '${value}'`,
            );
            console.log(`✅ Valor ${value} agregado al enum UserRole`);
          } catch (error: any) {
            if (
              error.message?.includes('already exists') ||
              error.message?.includes('duplicate') ||
              error.code === '42710'
            ) {
              // Valor ya existe, continuar
            } else {
              console.warn(`Advertencia al agregar valor ${value} al enum:`, error.message);
            }
          }
        }

        // Migrar valores antiguos si existen
        if (existingValues.has('USER') || existingValues.has('TENANT')) {
          console.log('⚠️  Detectados valores antiguos en enum UserRole. Migrando datos...');

          if (existingValues.has('USER')) {
            try {
              await prisma.$executeRawUnsafe(`
                UPDATE "user" SET role = 'RESIDENTE'::"UserRole" WHERE role = 'USER'::"UserRole"
              `);
              console.log('✅ Migrados usuarios con rol USER a RESIDENTE');
            } catch (error: any) {
              console.warn('Advertencia al migrar USER:', error.message);
            }
          }

          if (existingValues.has('TENANT')) {
            try {
              await prisma.$executeRawUnsafe(`
                UPDATE "user" SET role = 'ARRENDATARIO'::"UserRole" WHERE role = 'TENANT'::"UserRole"
              `);
              console.log('✅ Migrados usuarios con rol TENANT a ARRENDATARIO');
            } catch (error: any) {
              console.warn('Advertencia al migrar TENANT:', error.message);
            }
          }
        }

        console.log('✅ Enum UserRole actualizado correctamente');
      }

      this.enumChecked.add(cacheKey);
    } catch (error: any) {
      console.warn('Error verificando enum, intentando agregar valores directamente:', error.message);

      const valuesToAdd = ['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'];
      for (const value of valuesToAdd) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE '${value}'`);
        } catch (addError: any) {
          if (
            addError.message?.includes('already exists') ||
            addError.message?.includes('duplicate') ||
            addError.code === '42710'
          ) {
            // Valor ya existe, continuar
          } else {
            console.warn(`No se pudo agregar ${value} al enum:`, addError.message);
          }
        }
      }

      this.enumChecked.add(cacheKey);
    }
  }

  /**
   * Asegura que las columnas nuevas existan en la tabla user
   */
  async ensureUserColumnsExist(prisma: PrismaClient) {
    const cacheKey = (prisma as any)._connectionUrl || 'default';

    if (this.columnsChecked.has(cacheKey)) {
      return;
    }

    const columnsToAdd = [
      { name: 'firstName', type: 'STRING' },
      { name: 'lastName', type: 'STRING' },
      { name: 'tipoDocumento', type: 'STRING' },
      { name: 'numeroDocumento', type: 'STRING' },
      { name: 'telefono', type: 'STRING' },
      { name: 'unidadId', type: 'STRING' },
      { name: 'active', type: 'BOOL DEFAULT true' },
    ];

    try {
      const existingColumns = (await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      `)) as any[];

      const existingColumnNames = new Set(
        existingColumns.map((col: any) => col.column_name.toLowerCase()),
      );

      const columnsToCreate = columnsToAdd.filter(
        (col) => !existingColumnNames.has(col.name.toLowerCase()),
      );

      if (columnsToCreate.length > 0) {
        for (const col of columnsToCreate) {
          try {
            if (col.name === 'active') {
              // Para active, agregar como nullable primero
              await prisma.$executeRawUnsafe(
                `ALTER TABLE "user" ADD COLUMN "${col.name}" BOOL`,
              );
              // Establecer valores por defecto para registros existentes
              await prisma.$executeRawUnsafe(
                `UPDATE "user" SET "${col.name}" = true WHERE "${col.name}" IS NULL`,
              );
              // Establecer NOT NULL y DEFAULT
              await prisma.$executeRawUnsafe(
                `ALTER TABLE "user" ALTER COLUMN "${col.name}" SET NOT NULL`,
              );
              await prisma.$executeRawUnsafe(
                `ALTER TABLE "user" ALTER COLUMN "${col.name}" SET DEFAULT true`,
              );
            } else {
              await prisma.$executeRawUnsafe(
                `ALTER TABLE "user" ADD COLUMN "${col.name}" ${col.type}`,
              );
            }
            console.log(`✅ Columna ${col.name} agregada`);
          } catch (alterError: any) {
            if (
              alterError.message?.includes('already exists') ||
              alterError.code === '42701' ||
              alterError.message?.includes('duplicate column')
            ) {
              // Columna ya existe, continuar
            } else {
              console.warn(`Advertencia al agregar columna ${col.name}:`, alterError.message);
            }
          }
        }
      }

      // Crear índices si no existen
      try {
        await prisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX IF NOT EXISTS "user_numeroDocumento_key" ON "user" ("numeroDocumento") WHERE "numeroDocumento" IS NOT NULL`,
        );
      } catch (error: any) {
        // Ignorar si ya existe
      }

      try {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "user_unidadId_idx" ON "user" ("unidadId")`,
        );
      } catch (error: any) {
        // Ignorar si ya existe
      }

      try {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "user_active_idx" ON "user" ("active")`,
        );
      } catch (error: any) {
        // Ignorar si ya existe
      }

      this.columnsChecked.add(cacheKey);
    } catch (error: any) {
      console.warn('Error en verificación optimizada, usando método fallback:', error.message);

      for (const column of columnsToAdd) {
        try {
          if (column.name === 'active') {
            // Para active, agregar como nullable primero
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "${column.name}" BOOL`,
            );
            // Establecer valores por defecto para registros existentes
            await prisma.$executeRawUnsafe(
              `UPDATE "user" SET "${column.name}" = true WHERE "${column.name}" IS NULL`,
            );
            // Establecer NOT NULL y DEFAULT
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "user" ALTER COLUMN "${column.name}" SET NOT NULL`,
            );
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "user" ALTER COLUMN "${column.name}" SET DEFAULT true`,
            );
          } else {
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type}`,
            );
          }
        } catch (alterError: any) {
          if (!alterError.message?.includes('already exists') && alterError.code !== '42701') {
            console.warn(`Advertencia al agregar columna ${column.name}:`, alterError.message);
          }
        }
      }

      this.columnsChecked.add(cacheKey);
    }
  }

  /**
   * Ejecuta todas las migraciones necesarias
   */
  async migrateSchema(prisma: PrismaClient) {
    await this.ensureUserRoleEnum(prisma);
    await this.ensureUserColumnsExist(prisma);
  }
}

