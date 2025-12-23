import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { DatabaseManagerService } from '../config/database-manager.service';
import { CreateCondominioDto } from './dto/create-condominio.dto';
import { UpdateCondominioDto } from './dto/update-condominio.dto';

@Injectable()
export class CondominiosService {
  constructor(
    @Inject(PrismaClient) private masterPrisma: PrismaClient,
    private databaseManager: DatabaseManagerService,
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
   * Ejemplo: "Condominio Las Flores" -> "condominio-las-flores"
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Normaliza caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
      .replace(/[^a-z0-9\s-]/g, '') // Elimina caracteres especiales
      .trim()
      .replace(/\s+/g, '-') // Reemplaza espacios con guiones
      .replace(/-+/g, '-') // Elimina guiones múltiples
      .replace(/^-|-$/g, ''); // Elimina guiones al inicio/final
  }

  /**
   * Genera un subdominio único basado en el nombre
   * Si ya existe, agrega un número al final
   */
  private async generateUniqueSubdomain(baseName: string): Promise<string> {
    const normalized = this.normalizeName(baseName);
    let subdomain = normalized;
    let counter = 1;

    while (true) {
      const existing = await this.masterPrisma.condominio.findUnique({
        where: { subdomain },
      });

      if (!existing) {
        return subdomain;
      }

      // Si existe, agregar un número
      subdomain = `${normalized}-${counter}`;
      counter++;
    }
  }

  /**
   * Genera un nombre de base de datos único basado en el nombre
   * Si ya existe, agrega un número al final
   */
  private async generateUniqueDatabaseName(baseName: string): Promise<string> {
    const normalized = this.normalizeName(baseName);
    // Los nombres de BD no pueden tener guiones en algunos sistemas, usar guiones bajos
    const dbName = normalized.replace(/-/g, '_');
    let databaseName = dbName;
    let counter = 1;

    while (true) {
      const existing = await this.masterPrisma.condominio.findUnique({
        where: { databaseName },
      });

      if (!existing) {
        return databaseName;
      }

      // Si existe, agregar un número
      databaseName = `${dbName}_${counter}`;
      counter++;
    }
  }

  /**
   * Crea un nuevo condominio y su base de datos
   */
  async createCondominio(dto: CreateCondominioDto) {
    // Generar subdominio automáticamente si no se proporciona
    const subdomain = dto.subdomain || await this.generateUniqueSubdomain(dto.name);

    // Generar nombre de base de datos automáticamente si no se proporciona
    const databaseName = dto.databaseName || await this.generateUniqueDatabaseName(dto.name);

    // Verificar que el nombre de la base de datos no exista (por si acaso)
    const existingByDb = await this.masterPrisma.condominio.findUnique({
      where: { databaseName },
    });

    if (existingByDb) {
      throw new BadRequestException(
        `Ya existe un condominio con el nombre de base de datos: ${databaseName}`,
      );
    }

    // Verificar que el subdominio no exista (por si acaso)
    const existingBySubdomain = await this.masterPrisma.condominio.findUnique({
      where: { subdomain },
    });

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

      // Preparar datos para crear el condominio
      const planExpiresAt = dto.planExpiresAt
        ? new Date(dto.planExpiresAt)
        : null;

      // Crear el registro del condominio en la base de datos maestra
      const condominio = await this.masterPrisma.condominio.create({
        data: {
          name: dto.name,
          subdomain: subdomain,
          databaseName: databaseName,
          databaseUrl: condominioDatabaseUrl,
          // Información Institucional
          nit: dto.nit,
          address: dto.address,
          city: dto.city,
          country: dto.country,
          timezone: dto.timezone,
          // Configuración de Acceso y Dominio
          logo: dto.logo,
          primaryColor: dto.primaryColor || '#3B82F6',
          // Límites y Plan
          subscriptionPlan: dto.subscriptionPlan,
          unitLimit: dto.unitLimit,
          planExpiresAt: planExpiresAt,
          activeModules: dto.activeModules
            ? JSON.stringify(dto.activeModules)
            : null,
        },
      });

      // Inicializar el esquema en la nueva base de datos
      // Esto creará automáticamente todas las tablas según schema-condominio.prisma
      await this.databaseManager.initializeCondominioDatabase(
        condominioDatabaseUrl,
      );

      // Retornar sin campos sensibles
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
  async findAll() {
    const condominios = await this.masterPrisma.condominio.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return condominios.map((c) => this.excludeSensitiveFields(c));
  }

  /**
   * Obtiene un condominio por ID
   */
  async findOne(id: string) {
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { id },
    });

    if (!condominio) {
      throw new NotFoundException(`Condominio con ID ${id} no encontrado`);
    }

    return condominio;
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
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { id: condominioId },
    });

    if (!condominio) {
      throw new NotFoundException(
        `Condominio con ID ${condominioId} no encontrado`,
      );
    }

    return this.databaseManager.getPrismaClientForCondominio(
      condominio.databaseUrl,
    );
  }

  /**
   * Busca un condominio por su subdominio
   * Retorna el condominio completo (incluye campos sensibles) para uso interno
   */
  async findCondominioBySubdomain(subdomain: string) {
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { subdomain },
    });

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
    const condominio = await this.masterPrisma.condominio.update({
      where: { id },
      data: { isActive: false },
    });
    return this.excludeSensitiveFields(condominio);
  }


  /**
   * Actualiza un condominio
   */
  async updateCondominio(id: string, dto: UpdateCondominioDto) {
    const existingCondominio = await this.findOne(id);

    // Si se actualiza el subdominio, verificar que sea único
    if (dto.subdomain && dto.subdomain !== existingCondominio.subdomain) {
      const existing = await this.masterPrisma.condominio.findUnique({
        where: { subdomain: dto.subdomain },
      });

      if (existing) {
        throw new BadRequestException(
          `Ya existe un condominio con el subdominio: ${dto.subdomain}`,
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
    if (dto.subdomain !== undefined) updateData.subdomain = dto.subdomain;
    if (dto.logo !== undefined) updateData.logo = dto.logo;
    if (dto.primaryColor !== undefined) updateData.primaryColor = dto.primaryColor;
    if (dto.subscriptionPlan !== undefined)
      updateData.subscriptionPlan = dto.subscriptionPlan;
    if (dto.unitLimit !== undefined) updateData.unitLimit = dto.unitLimit;
    if (dto.planExpiresAt !== undefined)
      updateData.planExpiresAt = new Date(dto.planExpiresAt);
    if (dto.activeModules !== undefined)
      updateData.activeModules = JSON.stringify(dto.activeModules);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const condominio = await this.masterPrisma.condominio.update({
      where: { id },
      data: updateData,
    });
    return this.excludeSensitiveFields(condominio);
  }

  /**
   * Obtiene la configuración visual del condominio (logo, color)
   * Para usar en el frontend cuando se accede desde el subdominio
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
  async validateSubdomain(subdomain: string): Promise<{ available: boolean }> {
    const existing = await this.masterPrisma.condominio.findUnique({
      where: { subdomain },
    });

    return { available: !existing };
  }

  /**
   * Elimina un condominio y su base de datos
   * IMPORTANTE: Esta acción es irreversible
   */
  async deleteCondominio(id: string) {
    const condominio = await this.findOne(id);

    // Obtener la URL de la base de datos maestra
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

      // 2. Eliminar el registro del condominio en la base de datos maestra
      await this.masterPrisma.condominio.delete({
        where: { id },
      });

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
}

