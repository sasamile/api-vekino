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
   * Crea los enums necesarios para reservas si no existen
   */
  async ensureReservaEnumsExist(prisma: PrismaClient) {
    const cacheKey = (prisma as any)._connectionUrl || 'default';

    try {
      // Verificar y crear enum TipoEspacio
      try {
        await prisma.$queryRaw`SELECT 'SALON_SOCIAL'::"TipoEspacio"`;
      } catch (error: any) {
        // El enum no existe, crearlo
        await prisma.$executeRawUnsafe(`
          CREATE TYPE "TipoEspacio" AS ENUM (
            'SALON_SOCIAL',
            'ZONA_BBQ',
            'SAUNA',
            'CASA_EVENTOS',
            'GIMNASIO',
            'PISCINA',
            'CANCHA_DEPORTIVA',
            'PARQUEADERO',
            'OTRO'
          )
        `);
        console.log('✅ Enum TipoEspacio creado');
      }

      // Verificar y crear enum UnidadTiempoReserva
      try {
        await prisma.$queryRaw`SELECT 'HORAS'::"UnidadTiempoReserva"`;
      } catch (error: any) {
        await prisma.$executeRawUnsafe(`
          CREATE TYPE "UnidadTiempoReserva" AS ENUM ('HORAS', 'DIAS', 'MESES')
        `);
        console.log('✅ Enum UnidadTiempoReserva creado');
      }

      // Verificar y crear enum EstadoReserva
      try {
        await prisma.$queryRaw`SELECT 'PENDIENTE'::"EstadoReserva"`;
      } catch (error: any) {
        await prisma.$executeRawUnsafe(`
          CREATE TYPE "EstadoReserva" AS ENUM (
            'PENDIENTE',
            'CONFIRMADA',
            'CANCELADA',
            'COMPLETADA'
          )
        `);
        console.log('✅ Enum EstadoReserva creado');
      }
    } catch (error: any) {
      console.warn('Error verificando enums de reservas:', error.message);
    }
  }

  /**
   * Crea las tablas de reservas si no existen
   */
  async ensureReservaTablesExist(prisma: PrismaClient) {
    try {
      // Verificar si la tabla espacio_comun existe
      try {
        await prisma.$queryRaw`SELECT 1 FROM "espacio_comun" LIMIT 1`;
        console.log('✅ Tabla espacio_comun ya existe');
      } catch (error: any) {
        // Crear tabla espacio_comun
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "espacio_comun" (
            "id" STRING NOT NULL,
            "nombre" STRING NOT NULL,
            "tipo" "TipoEspacio" NOT NULL,
            "capacidad" INT4 NOT NULL,
            "descripcion" STRING,
            "unidadTiempo" "UnidadTiempoReserva" NOT NULL,
            "precioPorUnidad" FLOAT8,
            "activo" BOOL NOT NULL DEFAULT true,
            "imagen" STRING,
            "horariosDisponibilidad" STRING,
            "requiereAprobacion" BOOL NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "espacio_comun_pkey" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Tabla espacio_comun creada');

        // Crear índices
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "espacio_comun_tipo_idx" ON "espacio_comun"("tipo")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "espacio_comun_activo_idx" ON "espacio_comun"("activo")
        `);
      }

      // Verificar si la tabla reserva existe
      try {
        await prisma.$queryRaw`SELECT 1 FROM "reserva" LIMIT 1`;
        console.log('✅ Tabla reserva ya existe');
      } catch (error: any) {
        // Primero asegurar que las relaciones existan (user y unidad)
        // Crear tabla reserva
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "reserva" (
            "id" STRING NOT NULL,
            "espacioComunId" STRING NOT NULL,
            "userId" STRING NOT NULL,
            "unidadId" STRING,
            "fechaInicio" TIMESTAMP(3) NOT NULL,
            "fechaFin" TIMESTAMP(3) NOT NULL,
            "cantidadPersonas" INT4,
            "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
            "motivo" STRING,
            "observaciones" STRING,
            "precioTotal" FLOAT8,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "createdBy" STRING,
            CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
          )
        `);
        console.log('✅ Tabla reserva creada');

        // Crear índices
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_espacioComunId_idx" ON "reserva"("espacioComunId")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_userId_idx" ON "reserva"("userId")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_unidadId_idx" ON "reserva"("unidadId")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_fechaInicio_idx" ON "reserva"("fechaInicio")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_fechaFin_idx" ON "reserva"("fechaFin")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "reserva_estado_idx" ON "reserva"("estado")
        `);

        // Agregar foreign keys (con manejo de errores por si las tablas relacionadas no existen)
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "reserva" 
            ADD CONSTRAINT "reserva_espacioComunId_fkey" 
            FOREIGN KEY ("espacioComunId") 
            REFERENCES "espacio_comun"("id") 
            ON DELETE RESTRICT ON UPDATE CASCADE
          `);
        } catch (fkError: any) {
          if (!fkError.message?.includes('already exists') && fkError.code !== '42P16') {
            console.warn('Advertencia al crear FK espacioComunId:', fkError.message);
          }
        }

        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "reserva" 
            ADD CONSTRAINT "reserva_userId_fkey" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE
          `);
        } catch (fkError: any) {
          if (!fkError.message?.includes('already exists') && fkError.code !== '42P16') {
            console.warn('Advertencia al crear FK userId:', fkError.message);
          }
        }

        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "reserva" 
            ADD CONSTRAINT "reserva_unidadId_fkey" 
            FOREIGN KEY ("unidadId") 
            REFERENCES "unidad"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
          `);
        } catch (fkError: any) {
          if (!fkError.message?.includes('already exists') && fkError.code !== '42P16') {
            console.warn('Advertencia al crear FK unidadId:', fkError.message);
          }
        }

        // Agregar relación a User (reservas)
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "user" 
            ADD COLUMN IF NOT EXISTS "reservas" STRING
          `);
          // Esta columna no es necesaria realmente, Prisma la maneja con relaciones
          // Pero la agregamos por si acaso
        } catch (error: any) {
          // Ignorar errores
        }

        // Agregar relación a Unidad (reservas)
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "unidad" 
            ADD COLUMN IF NOT EXISTS "reservas" STRING
          `);
        } catch (error: any) {
          // Ignorar errores
        }
      }
    } catch (error: any) {
      console.warn('Error verificando/creando tablas de reservas:', error.message);
    }
  }

  /**
   * Ejecuta todas las migraciones necesarias
   */
  async migrateSchema(prisma: PrismaClient) {
    await this.ensureUserRoleEnum(prisma);
    await this.ensureUserColumnsExist(prisma);
    await this.ensureReservaEnumsExist(prisma);
    await this.ensureReservaTablesExist(prisma);
  }
}

