import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

/**
 * Repositorio para operaciones de base de datos relacionadas con condominios
 * Separa la lógica de acceso a datos de la lógica de negocio
 */
@Injectable()
export class CondominiosRepository {
  constructor(@Inject(PrismaClient) private readonly masterPrisma: PrismaClient) {}

  /**
   * Busca un condominio por ID
   */
  async findById(id: string) {
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { id },
    });

    if (!condominio) {
      throw new NotFoundException(`Condominio con ID ${id} no encontrado`);
    }

    return condominio;
  }

  /**
   * Busca un condominio por subdominio
   */
  async findBySubdomain(subdomain: string) {
    return this.masterPrisma.condominio.findUnique({
      where: { subdomain },
    });
  }

  /**
   * Busca todos los condominios activos
   */
  async findAllActive() {
    return this.masterPrisma.condominio.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca todos los condominios con paginación y filtros
   */
  async findAllWithPagination(filters: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    subscriptionPlan?: string;
    city?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.subscriptionPlan) {
      where.subscriptionPlan = filters.subscriptionPlan;
    }

    if (filters.city) {
      where.city = {
        contains: filters.city,
        mode: 'insensitive',
      };
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.masterPrisma.condominio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.masterPrisma.condominio.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Crea un nuevo condominio
   */
  async create(data: any) {
    return this.masterPrisma.condominio.create({
      data,
    });
  }

  /**
   * Actualiza un condominio
   */
  async update(id: string, data: any) {
    return this.masterPrisma.condominio.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina un condominio
   */
  async delete(id: string) {
    return this.masterPrisma.condominio.delete({
      where: { id },
    });
  }

  /**
   * Verifica si existe un condominio con el subdominio dado
   */
  async existsBySubdomain(subdomain: string, excludeId?: string) {
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { subdomain },
    });

    if (!condominio) {
      return false;
    }

    if (excludeId && condominio.id === excludeId) {
      return false;
    }

    return true;
  }

  /**
   * Verifica si existe un condominio con el nombre de base de datos dado
   */
  async existsByDatabaseName(databaseName: string) {
    const condominio = await this.masterPrisma.condominio.findUnique({
      where: { databaseName },
    });

    return !!condominio;
  }

  /**
   * Obtiene todos los subdominios de condominios activos
   */
  async findAllActiveSubdomains() {
    const condominios = await this.masterPrisma.condominio.findMany({
      where: { 
        isActive: true,
        subdomain: { not: null },
      },
      select: {
        subdomain: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return condominios
      .map((c) => c.subdomain)
      .filter((subdomain): subdomain is string => subdomain !== null);
  }
}

