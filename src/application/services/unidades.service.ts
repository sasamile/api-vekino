import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { CreateUnidadDto } from '../../domain/dto/condominios/create-unidad.dto';
import { UpdateUnidadDto } from '../../domain/dto/condominios/update-unidad.dto';
import { BulkUploadUnidadesDto } from '../../domain/dto/condominios/bulk-upload-unidades.dto';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { UnidadesRepository } from '../../infrastructure/repositories/unidades.repository';

@Injectable()
export class UnidadesService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly databaseManager: DatabaseManagerService,
    private readonly unidadesRepository: UnidadesRepository,
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
    const existing = await this.unidadesRepository.existsByIdentificador(
      condominioPrisma,
      dto.identificador,
    );
    if (existing) {
      throw new BadRequestException(
        `Ya existe una unidad con el identificador ${dto.identificador}`,
      );
    }

    try {
      const { randomUUID } = await import('crypto');
      const unidadId = randomUUID();
      const estado = dto.estado || 'VACIA';

      // Crear la unidad usando el repositorio
      return this.unidadesRepository.create(condominioPrisma, {
        id: unidadId,
        identificador: dto.identificador,
        tipo: dto.tipo,
        area: dto.area || null,
        coeficienteCopropiedad: dto.coeficienteCopropiedad || null,
        valorCuotaAdministracion: dto.valorCuotaAdministracion || null,
        estado: estado,
      });
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

    return this.unidadesRepository.findAll(condominioPrisma);
  }

  /**
   * Obtiene todas las unidades con sus usuarios asociados
   */
  async getUnidadesWithResidentes(
    condominioId: string,
    filters?: {
      userActive?: boolean;
      identificador?: string;
      nombre?: string;
      numeroDocumento?: string;
    },
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener todas las unidades (con filtro por identificador si aplica)
    let unidades = await this.unidadesRepository.findAllBasic(condominioPrisma);

    // Filtrar por identificador si se proporciona
    if (filters?.identificador) {
      unidades = unidades.filter((u) =>
        u.identificador
          .toLowerCase()
          .includes(filters.identificador!.toLowerCase()),
      );
    }

    // Para cada unidad, obtener sus usuarios con filtros aplicados directamente en la consulta
    const unidadesConResidentes = await Promise.all(
      unidades.map(async (unidad) => {
        // Construir condiciones WHERE dinámicamente
        const condiciones: string[] = [];
        const params: any[] = [unidad.id];
        let paramIndex = 2;

        condiciones.push(`"unidadId" = $1`);

        // Aplicar filtro de active si se proporciona
        if (filters?.userActive !== undefined) {
          condiciones.push(`active = $${paramIndex}`);
          params.push(filters.userActive);
          paramIndex++;
        }

        // Aplicar filtro de nombre si se proporciona
        if (filters?.nombre) {
          const searchPattern = `%${filters.nombre.toLowerCase()}%`;
          condiciones.push(`(
            LOWER(COALESCE(name, '')) LIKE $${paramIndex} OR
            LOWER(COALESCE("firstName", '')) LIKE $${paramIndex} OR
            LOWER(COALESCE("lastName", '')) LIKE $${paramIndex} OR
            LOWER(CONCAT(COALESCE("firstName", ''), ' ', COALESCE("lastName", ''))) LIKE $${paramIndex} OR
            LOWER(CONCAT(COALESCE(name, ''), ' ', COALESCE("firstName", ''), ' ', COALESCE("lastName", ''))) LIKE $${paramIndex}
          )`);
          params.push(searchPattern);
          paramIndex++;
        }

        // Aplicar filtro de número de documento si se proporciona
        if (filters?.numeroDocumento) {
          condiciones.push(`LOWER(COALESCE("numeroDocumento", '')) LIKE $${paramIndex}`);
          params.push(`%${filters.numeroDocumento.toLowerCase()}%`);
          paramIndex++;
        }

        const whereClause = condiciones.join(' AND ');

        // Ejecutar la consulta usando queryRawUnsafe con parámetros seguros
        const usuarios = await condominioPrisma.$queryRawUnsafe<any[]>(
          `
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
            active,
            "createdAt"::text as "createdAt",
            "updatedAt"::text as "updatedAt"
          FROM "user"
          WHERE ${whereClause}
          ORDER BY "firstName" ASC, "lastName" ASC
          `,
          ...params,
        );

        return {
          ...unidad,
          usuarios: usuarios || [],
          totalUsuarios: usuarios.length,
        };
      }),
    );

    // Si hay filtros de usuarios, solo retornar unidades que tengan usuarios que cumplan los filtros
    const hasUserFilters = filters?.userActive !== undefined || filters?.nombre || filters?.numeroDocumento;
    const unidadesFiltradas = unidadesConResidentes.filter(
      (u) => !hasUserFilters || u.totalUsuarios > 0,
    );

    return unidadesFiltradas;
  }

  /**
   * Obtiene una unidad por ID
   */
  async getUnidad(condominioId: string, unidadId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidad = await this.unidadesRepository.findById(condominioPrisma, unidadId);

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
      const existing = await this.unidadesRepository.existsByIdentificador(
        condominioPrisma,
        dto.identificador,
        unidadId,
      );
      if (existing) {
        throw new BadRequestException(
          `Ya existe una unidad con el identificador ${dto.identificador}`,
        );
      }
    }

    // Preparar actualizaciones
    const updates: any = {};
    if (dto.identificador !== undefined) updates.identificador = dto.identificador;
    if (dto.tipo !== undefined) updates.tipo = dto.tipo;
    if (dto.area !== undefined) updates.area = dto.area;
    if (dto.coeficienteCopropiedad !== undefined) updates.coeficienteCopropiedad = dto.coeficienteCopropiedad;
    if (dto.valorCuotaAdministracion !== undefined) updates.valorCuotaAdministracion = dto.valorCuotaAdministracion;
    if (dto.estado !== undefined) updates.estado = dto.estado;

    // Actualizar usando el repositorio
    return this.unidadesRepository.update(condominioPrisma, unidadId, updates);
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
        const existing = await this.unidadesRepository.existsByIdentificador(
          condominioPrisma,
          unidadDto.identificador,
        );
        if (existing) {
          resultados.errores.push({
            unidad: unidadDto,
            error: `Ya existe una unidad con el identificador ${unidadDto.identificador}`,
          });
          continue;
        }

        // Crear la unidad usando el repositorio
        const { randomUUID } = await import('crypto');
        const unidadId = randomUUID();
        const estado = unidadDto.estado || 'VACIA';

        await this.unidadesRepository.create(condominioPrisma, {
          id: unidadId,
          identificador: unidadDto.identificador,
          tipo: unidadDto.tipo,
          area: unidadDto.area || null,
          coeficienteCopropiedad: unidadDto.coeficienteCopropiedad || null,
          valorCuotaAdministracion: unidadDto.valorCuotaAdministracion || null,
          estado: estado,
        });

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
    const totalUsuarios = await this.unidadesRepository.countUsersByUnidadId(
      condominioPrisma,
      unidadId,
    );

    if (totalUsuarios > 0) {
      throw new BadRequestException(
        `No se puede eliminar la unidad porque tiene ${totalUsuarios} usuario(s) asociado(s)`,
      );
    }

    // Eliminar la unidad usando el repositorio
    await this.unidadesRepository.delete(condominioPrisma, unidadId);

    return {
      message: `Unidad ${unidad.identificador} eliminada correctamente`,
      deletedUnidad: unidad,
    };
  }
}

