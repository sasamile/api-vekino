import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from '../condominios.service';
import { CreateUnidadDto } from '../dto/create-unidad.dto';
import { UpdateUnidadDto } from '../dto/update-unidad.dto';
import { BulkUploadUnidadesDto } from '../dto/bulk-upload-unidades.dto';
import { DatabaseManagerService } from '../../config/database-manager.service';

@Injectable()
export class UnidadesService {
  constructor(
    @Inject(PrismaClient) private masterPrisma: PrismaClient,
    private condominiosService: CondominiosService,
    private databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Crea una nueva unidad en un condominio
   */
  async createUnidad(condominioId: string, dto: CreateUnidadDto) {
    // Verificar que el condominio existe
    const condominio = await this.condominiosService.findOne(condominioId);
    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    // Asegurar que la base de datos esté inicializada con todas las tablas
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);

    // Obtener el cliente de Prisma para este condominio
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el identificador sea único
    const existing = await condominioPrisma.$queryRaw<any[]>`
      SELECT id FROM "unidad" WHERE identificador = ${dto.identificador} LIMIT 1
    `;
    if (existing.length > 0) {
      throw new BadRequestException(
        `Ya existe una unidad con el identificador ${dto.identificador}`,
      );
    }

    try {
      const { randomUUID } = await import('crypto');
      const unidadId = randomUUID();
      const estado = dto.estado || 'VACIA';

      // Crear la unidad
      await condominioPrisma.$executeRaw`
        INSERT INTO "unidad" (
          id, identificador, tipo, area, "coeficienteCopropiedad", 
          "valorCuotaAdministracion", estado, "createdAt", "updatedAt"
        )
        VALUES (
          ${unidadId}, ${dto.identificador}, ${dto.tipo}::"TipoUnidad", 
          ${dto.area || null}, ${dto.coeficienteCopropiedad || null}, 
          ${dto.valorCuotaAdministracion || null}, ${estado}::"EstadoUnidad", 
          NOW(), NOW()
        )
      `;

      // Obtener la unidad creada
      const unidades = await condominioPrisma.$queryRaw<any[]>`
        SELECT * FROM "unidad" WHERE id = ${unidadId} LIMIT 1
      `;

      return unidades[0] || null;
    } catch (error) {
      console.error('Error creando unidad:', error);
      throw new BadRequestException(
        `Error al crear la unidad: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene todas las unidades de un condominio
   */
  async getUnidades(condominioId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidades = await condominioPrisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.identificador,
        u.tipo,
        u.area,
        u."coeficienteCopropiedad",
        u."valorCuotaAdministracion",
        u.estado,
        u."createdAt"::text as "createdAt",
        u."updatedAt"::text as "updatedAt",
        COUNT(us.id)::int as "totalUsuarios"
      FROM "unidad" u
      LEFT JOIN "user" us ON u.id = us."unidadId"
      GROUP BY u.id, u.identificador, u.tipo, u.area, u."coeficienteCopropiedad",
               u."valorCuotaAdministracion", u.estado, u."createdAt", u."updatedAt"
      ORDER BY u.identificador ASC
    `;

    return unidades;
  }

  /**
   * Obtiene todas las unidades con sus usuarios asociados
   */
  async getUnidadesWithResidentes(condominioId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener todas las unidades con fechas como texto
    const unidades = await condominioPrisma.$queryRaw<any[]>`
      SELECT 
        id,
        identificador,
        tipo,
        area,
        "coeficienteCopropiedad",
        "valorCuotaAdministracion",
        estado,
        "createdAt"::text as "createdAt",
        "updatedAt"::text as "updatedAt"
      FROM "unidad"
      ORDER BY identificador ASC
    `;

    // Para cada unidad, obtener sus usuarios
    const unidadesConResidentes = await Promise.all(
      unidades.map(async (unidad) => {
        const usuarios = await condominioPrisma.$queryRaw<any[]>`
          SELECT 
            id,
            name,
            "firstName",
            "lastName",
            email,
            "tipoDocumento",
            "numeroDocumento",
            telefono,
            role,
            "unidadId",
            "createdAt"::text as "createdAt",
            "updatedAt"::text as "updatedAt"
          FROM "user"
          WHERE "unidadId" = ${unidad.id}
          ORDER BY "firstName" ASC, "lastName" ASC
        `;

        return {
          ...unidad,
          usuarios: usuarios || [],
          totalUsuarios: usuarios.length,
        };
      }),
    );

    return unidadesConResidentes;
  }

  /**
   * Obtiene una unidad por ID
   */
  async getUnidad(condominioId: string, unidadId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidades = await condominioPrisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.identificador,
        u.tipo,
        u.area,
        u."coeficienteCopropiedad",
        u."valorCuotaAdministracion",
        u.estado,
        u."createdAt"::text as "createdAt",
        u."updatedAt"::text as "updatedAt",
        COUNT(us.id)::int as "totalUsuarios"
      FROM "unidad" u
      LEFT JOIN "user" us ON u.id = us."unidadId"
      WHERE u.id = ${unidadId}
      GROUP BY u.id, u.identificador, u.tipo, u.area, u."coeficienteCopropiedad", 
               u."valorCuotaAdministracion", u.estado, u."createdAt", u."updatedAt"
      LIMIT 1
    `;

    const unidad = unidades[0] || null;

    if (!unidad) {
      throw new NotFoundException(`Unidad con ID ${unidadId} no encontrada`);
    }

    return unidad;
  }

  /**
   * Actualiza una unidad
   */
  async updateUnidad(
    condominioId: string,
    unidadId: string,
    dto: UpdateUnidadDto,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidad = await this.getUnidad(condominioId, unidadId);

    // Verificar que el identificador sea único (si se actualiza)
    if (
      dto.identificador &&
      dto.identificador !== unidad.identificador
    ) {
      const existing = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "unidad" WHERE identificador = ${dto.identificador} AND id != ${unidadId} LIMIT 1
      `;
      if (existing.length > 0) {
        throw new BadRequestException(
          `Ya existe una unidad con el identificador ${dto.identificador}`,
        );
      }
    }

    // Construir la actualización
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.identificador !== undefined) {
      updates.push(`identificador = $${paramIndex}`);
      values.push(dto.identificador);
      paramIndex++;
    }

    if (dto.tipo !== undefined) {
      updates.push(`tipo = $${paramIndex}::"TipoUnidad"`);
      values.push(dto.tipo);
      paramIndex++;
    }

    if (dto.area !== undefined) {
      updates.push(`area = $${paramIndex}`);
      values.push(dto.area || null);
      paramIndex++;
    }

    if (dto.coeficienteCopropiedad !== undefined) {
      updates.push(`"coeficienteCopropiedad" = $${paramIndex}`);
      values.push(dto.coeficienteCopropiedad || null);
      paramIndex++;
    }

    if (dto.valorCuotaAdministracion !== undefined) {
      updates.push(`"valorCuotaAdministracion" = $${paramIndex}`);
      values.push(dto.valorCuotaAdministracion || null);
      paramIndex++;
    }

    if (dto.estado !== undefined) {
      updates.push(`estado = $${paramIndex}::"EstadoUnidad"`);
      values.push(dto.estado);
      paramIndex++;
    }

    updates.push(`"updatedAt" = NOW()`);

    if (updates.length > 0) {
      values.push(unidadId);
      await condominioPrisma.$executeRawUnsafe(
        `UPDATE "unidad" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    // Obtener la unidad actualizada
    return this.getUnidad(condominioId, unidadId);
  }

  /**
   * Carga masiva de unidades desde un array
   */
  async bulkUploadUnidades(
    condominioId: string,
    dto: BulkUploadUnidadesDto,
  ) {
    // Verificar que el condominio existe
    const condominio = await this.condominiosService.findOne(condominioId);
    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    // Obtener el cliente de Prisma para este condominio
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const resultados: {
      exitosas: number;
      errores: Array<{ unidad: CreateUnidadDto; error: string }>;
    } = {
      exitosas: 0,
      errores: [],
    };

    // Procesar cada unidad
    for (const unidadDto of dto.unidades) {
      try {
        // Verificar que el identificador sea único
        const existing = await condominioPrisma.$queryRaw<any[]>`
          SELECT id FROM "unidad" WHERE identificador = ${unidadDto.identificador} LIMIT 1
        `;
        if (existing.length > 0) {
          resultados.errores.push({
            unidad: unidadDto,
            error: `Ya existe una unidad con el identificador ${unidadDto.identificador}`,
          });
          continue;
        }

        // Crear la unidad
        const { randomUUID } = await import('crypto');
        const unidadId = randomUUID();
        const estado = unidadDto.estado || 'VACIA';

        await condominioPrisma.$executeRaw`
          INSERT INTO "unidad" (
            id, identificador, tipo, area, "coeficienteCopropiedad", 
            "valorCuotaAdministracion", estado, "createdAt", "updatedAt"
          )
          VALUES (
            ${unidadId}, ${unidadDto.identificador}, ${unidadDto.tipo}::"TipoUnidad", 
            ${unidadDto.area || null}, ${unidadDto.coeficienteCopropiedad || null}, 
            ${unidadDto.valorCuotaAdministracion || null}, ${estado}::"EstadoUnidad", 
            NOW(), NOW()
          )
        `;

        resultados.exitosas++;
      } catch (error) {
        resultados.errores.push({
          unidad: unidadDto,
          error: error.message || 'Error desconocido al crear la unidad',
        });
      }
    }

    return {
      mensaje:
        resultados.errores.length === 0
          ? 'Carga exitosa'
          : 'Se encontraron errores, por favor revise su archivo e inténtelo nuevamente.',
      resultados,
    };
  }

  /**
   * Elimina una unidad (solo si no tiene usuarios asociados)
   */
  async deleteUnidad(condominioId: string, unidadId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidad = await this.getUnidad(condominioId, unidadId);

    // Verificar que no tenga usuarios asociados
    const usuarios = await condominioPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total FROM "user" WHERE "unidadId" = ${unidadId}
    `;
    const totalUsuarios = parseInt(usuarios[0]?.total || '0', 10);

    if (totalUsuarios > 0) {
      throw new BadRequestException(
        `No se puede eliminar la unidad porque tiene ${totalUsuarios} usuario(s) asociado(s)`,
      );
    }

    // Eliminar la unidad
    await condominioPrisma.$executeRaw`
      DELETE FROM "unidad" WHERE id = ${unidadId}
    `;

    return {
      message: `Unidad ${unidad.identificador} eliminada correctamente`,
      deletedUnidad: unidad,
    };
  }
}

