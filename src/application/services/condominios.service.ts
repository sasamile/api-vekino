import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { CreateCondominioDto } from '../../domain/dto/condominios/create-condominio.dto';
import { UpdateCondominioDto } from '../../domain/dto/condominios/update-condominio.dto';
import { S3Service } from '../../config/aws/s3/s3.service';
import { ImageProcessingService } from '../../config/aws/s3/image-processing.service';
import { CondominiosRepository } from '../../infrastructure/repositories/condominios.repository';

/**
 * Servicio de aplicación para gestión de condominios
 * Contiene la lógica de negocio y orquesta las operaciones
 */
@Injectable()
export class CondominiosService {
  constructor(
    private readonly condominiosRepository: CondominiosRepository,
    private readonly databaseManager: DatabaseManagerService,
    private readonly s3Service: S3Service,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Excluye campos sensibles de la respuesta del condominio
   */
  private excludeSensitiveFields(condominio: any) {
    const { databaseUrl, databaseName, ...safeCondominio } = condominio;
    return safeCondominio;
  }

  /**
   * Normaliza un nombre para usarlo como subdominio o nombre de base de datos
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Genera un subdominio único basado en el nombre o subdominio proporcionado
   */
  private async generateUniqueSubdomain(
    baseName: string,
    excludeId?: string,
  ): Promise<string> {
    const normalized = this.normalizeName(baseName);
    let subdomain = normalized;
    let counter = 1;

    while (true) {
      const exists = await this.condominiosRepository.existsBySubdomain(
        subdomain,
        excludeId,
      );

      if (!exists) {
        return subdomain;
      }

      subdomain = `${normalized}-${counter}`;
      counter++;
    }
  }

  /**
   * Genera un nombre de base de datos único basado en el nombre
   */
  private async generateUniqueDatabaseName(baseName: string): Promise<string> {
    const normalized = this.normalizeName(baseName);
    const dbName = normalized.replace(/-/g, '_');
    let databaseName = dbName;
    let counter = 1;

    while (true) {
      const exists =
        await this.condominiosRepository.existsByDatabaseName(databaseName);

      if (!exists) {
        return databaseName;
      }

      databaseName = `${dbName}_${counter}`;
      counter++;
    }
  }

  /**
   * Crea un nuevo condominio y su base de datos
   */
  async createCondominio(
    dto: CreateCondominioDto,
    logoFile?: Express.Multer.File,
  ) {
    // Determinar subdominio
    let subdomain: string;

    if (dto.subdomain) {
      const normalized = this.normalizeName(dto.subdomain);
      const exists =
        await this.condominiosRepository.existsBySubdomain(normalized);

      if (exists) {
        throw new BadRequestException(
          `Ya existe un condominio con el subdominio: ${normalized}`,
        );
      }
      subdomain = normalized;
    } else {
      subdomain = await this.generateUniqueSubdomain(dto.name);
    }

    // Generar nombre de base de datos
    const databaseName =
      dto.databaseName || (await this.generateUniqueDatabaseName(dto.name));

    // Verificar que el nombre de la base de datos no exista
    const existingByDb =
      await this.condominiosRepository.existsByDatabaseName(databaseName);

    if (existingByDb) {
      throw new BadRequestException(
        `Ya existe un condominio con el nombre de base de datos: ${databaseName}`,
      );
    }

    // Verificar que el subdominio no exista
    const existingBySubdomain =
      await this.condominiosRepository.existsBySubdomain(subdomain);

    if (existingBySubdomain) {
      throw new BadRequestException(
        `Ya existe un condominio con el subdominio: ${subdomain}`,
      );
    }

    // Obtener la URL de la base de datos maestra
    const masterDatabaseUrl = process.env.DATABASE_URL;
    if (!masterDatabaseUrl) {
      throw new BadRequestException(
        'DATABASE_URL no está configurado en las variables de entorno',
      );
    }

    try {
      // Crear la base de datos para el condominio
      const condominioDatabaseUrl =
        await this.databaseManager.createDatabaseForCondominio(
          masterDatabaseUrl,
          databaseName,
        );

      // Procesar y subir logo si se proporciona
      let logoUrl = dto.logo;

      if (logoFile) {
        try {
          const webpBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
            logoFile.buffer,
            800,
            800,
            80,
          );

          const tempId = `temp-${Date.now()}`;
          logoUrl = await this.s3Service.uploadCondominioLogo(webpBuffer, tempId);
        } catch (error) {
          console.error('Error procesando logo:', error);
          throw new BadRequestException(
            `Error al procesar el logo: ${error.message}`,
          );
        }
      }

      // Preparar datos para crear el condominio
      const planExpiresAt = dto.planExpiresAt
        ? new Date(dto.planExpiresAt)
        : null;

      // Crear el registro del condominio
      const condominio = await this.condominiosRepository.create({
        name: dto.name,
        subdomain: subdomain,
        databaseName: databaseName,
        databaseUrl: condominioDatabaseUrl,
        nit: dto.nit,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        timezone: dto.timezone,
        logo: logoUrl,
        primaryColor: dto.primaryColor || '#3B82F6',
        subscriptionPlan: dto.subscriptionPlan,
        unitLimit: dto.unitLimit,
        planExpiresAt: planExpiresAt,
        activeModules: dto.activeModules
          ? JSON.stringify(dto.activeModules)
          : null,
      });

      // Inicializar el esquema en la nueva base de datos
      await this.databaseManager.initializeCondominioDatabase(
        condominioDatabaseUrl,
      );

      return this.excludeSensitiveFields(condominio);
    } catch (error) {
      console.error('Error creando condominio:', error);
      throw new BadRequestException(
        `Error al crear el condominio: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene todos los condominios (solo para superadmin)
   */
  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    subscriptionPlan?: string;
    city?: string;
  }) {
    // Si hay cualquier filtro o paginación, usar findAllWithPagination
    const hasFilters = filters && (
      filters.page !== undefined || 
      filters.limit !== undefined || 
      filters.search || 
      filters.isActive !== undefined || 
      filters.subscriptionPlan || 
      filters.city
    );

    if (hasFilters) {
      const result = await this.condominiosRepository.findAllWithPagination(filters);
      return {
        data: result.data.map((c) => this.excludeSensitiveFields(c)),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    }
    
    const condominios = await this.condominiosRepository.findAllActive();
    return condominios.map((c) => this.excludeSensitiveFields(c));
  }

  /**
   * Obtiene un condominio por ID
   */
  async findOne(id: string) {
    return this.condominiosRepository.findById(id);
  }

  /**
   * Obtiene un condominio por ID sin campos sensibles (para respuestas públicas)
   */
  async findOneSafe(id: string) {
    const condominio = await this.findOne(id);
    return this.excludeSensitiveFields(condominio);
  }

  /**
   * Obtiene el cliente de Prisma para un condominio específico
   */
  async getPrismaClientForCondominio(condominioId: string): Promise<PrismaClient> {
    const condominio = await this.condominiosRepository.findById(condominioId);
    return this.databaseManager.getPrismaClientForCondominio(
      condominio.databaseUrl,
    );
  }

  /**
   * Busca un condominio por su subdominio
   */
  async findCondominioBySubdomain(subdomain: string) {
    const condominio = await this.condominiosRepository.findBySubdomain(subdomain);

    if (!condominio) {
      throw new NotFoundException(
        `Condominio con subdominio ${subdomain} no encontrado`,
      );
    }

    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    return condominio;
  }

  /**
   * Desactiva un condominio (solo marca como inactivo, no elimina la BD)
   */
  async deactivateCondominio(id: string) {
    await this.findOne(id);
    const condominio = await this.condominiosRepository.update(id, {
      isActive: false,
    });
    return this.excludeSensitiveFields(condominio);
  }

  /**
   * Actualiza un condominio
   */
  async updateCondominio(
    id: string,
    dto: UpdateCondominioDto,
    logoFile?: Express.Multer.File,
  ) {
    const existingCondominio = await this.findOne(id);

    // Determinar subdominio efectivo
    let effectiveSubdomain = existingCondominio.subdomain || null;

    // Si se actualiza el subdominio, normalizar y validar
    if (dto.subdomain !== undefined) {
      const normalized = this.normalizeName(dto.subdomain);
      const exists = await this.condominiosRepository.existsBySubdomain(
        normalized,
        id,
      );

      if (exists) {
        throw new BadRequestException(
          `Ya existe un condominio con el subdominio: ${normalized}`,
        );
      }

      effectiveSubdomain = normalized;
    }

    // Procesar y subir logo si se proporciona
    let logoUrl = dto.logo;

    if (logoFile) {
      try {
        const webpBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
          logoFile.buffer,
          800,
          800,
          80,
        );

        logoUrl = await this.s3Service.uploadCondominioLogo(webpBuffer, id);
      } catch (error) {
        console.error('Error procesando logo:', error);
        throw new BadRequestException(
          `Error al procesar el logo: ${error.message}`,
        );
      }
    }

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nit !== undefined) updateData.nit = dto.nit;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (effectiveSubdomain !== null) updateData.subdomain = effectiveSubdomain;
    if (logoUrl !== undefined) updateData.logo = logoUrl;
    if (dto.primaryColor !== undefined)
      updateData.primaryColor = dto.primaryColor;
    if (dto.subscriptionPlan !== undefined)
      updateData.subscriptionPlan = dto.subscriptionPlan;
    if (dto.unitLimit !== undefined) updateData.unitLimit = dto.unitLimit;
    if (dto.planExpiresAt !== undefined)
      updateData.planExpiresAt = new Date(dto.planExpiresAt);
    if (dto.activeModules !== undefined)
      updateData.activeModules = JSON.stringify(dto.activeModules);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const condominio = await this.condominiosRepository.update(id, updateData);
    return this.excludeSensitiveFields(condominio);
  }

  /**
   * Obtiene la configuración visual del condominio (logo, color)
   */
  async getCondominioConfig(subdomain: string) {
    const condominioData = await this.findCondominioBySubdomain(subdomain);

    return {
      logo: condominioData.logo,
      primaryColor: condominioData.primaryColor || '#3B82F6',
      name: condominioData.name,
      subdomain: condominioData.subdomain,
    };
  }

  /**
   * Valida si un subdominio está disponible
   */
  async validateSubdomain(
    subdomainCandidate: string,
  ): Promise<{ available: boolean; subdomain: string }> {
    const normalized = this.normalizeName(subdomainCandidate);
    const suggested = await this.generateUniqueSubdomain(normalized);
    const isSame = suggested === normalized;
    const isAvailable = !(await this.condominiosRepository.existsBySubdomain(normalized));

    return {
      available: isAvailable && isSame,
      subdomain: suggested,
    };
  }

  /**
   * Elimina un condominio y su base de datos
   */
  async deleteCondominio(id: string) {
    const condominio = await this.findOne(id);

    const masterDatabaseUrl = process.env.DATABASE_URL;
    if (!masterDatabaseUrl) {
      throw new BadRequestException(
        'DATABASE_URL no está configurado en las variables de entorno',
      );
    }

    try {
      // 1. Eliminar la base de datos del condominio
      await this.databaseManager.deleteDatabaseForCondominio(
        masterDatabaseUrl,
        condominio.databaseName,
      );

      // 2. Eliminar el registro del condominio
      await this.condominiosRepository.delete(id);

      return {
        message: `Condominio ${condominio.name} y su base de datos han sido eliminados correctamente`,
        deletedCondominio: condominio,
      };
    } catch (error) {
      console.error('Error eliminando condominio:', error);
      throw new BadRequestException(
        `Error al eliminar el condominio: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene todos los subdominios (dominios) de condominios activos
   */
  async getAllDomains() {
    return this.condominiosRepository.findAllActiveSubdomains();
  }
}

