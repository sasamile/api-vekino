import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

/**
 * Repositorio para operaciones de base de datos relacionadas con unidades
 * Separa la lógica de acceso a datos de la lógica de negocio
 */
@Injectable()
export class UnidadesRepository {
  /**
   * Busca una unidad por ID
   */
  async findById(prisma: PrismaClient, unidadId: string) {
    const unidades = await prisma.$queryRaw<any[]>`
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
    return unidades[0] || null;
  }

  /**
   * Busca una unidad por identificador
   */
  async findByIdentificador(prisma: PrismaClient, identificador: string) {
    const unidades = await prisma.$queryRaw<any[]>`
      SELECT id FROM "unidad" WHERE identificador = ${identificador} LIMIT 1
    `;
    return unidades[0] || null;
  }

  /**
   * Verifica si existe una unidad con el identificador dado (excluyendo un unidadId específico)
   */
  async existsByIdentificador(
    prisma: PrismaClient,
    identificador: string,
    excludeUnidadId?: string,
  ) {
    const query = excludeUnidadId
      ? prisma.$queryRaw<any[]>`
          SELECT id FROM "unidad" WHERE identificador = ${identificador} AND id != ${excludeUnidadId} LIMIT 1
        `
      : prisma.$queryRaw<any[]>`
          SELECT id FROM "unidad" WHERE identificador = ${identificador} LIMIT 1
        `;
    const unidades = await query;
    return unidades[0] || null;
  }

  /**
   * Busca todas las unidades
   */
  async findAll(prisma: PrismaClient) {
    return prisma.$queryRaw<any[]>`
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
  }

  /**
   * Busca todas las unidades con paginación y filtros
   */
  async findAllWithPagination(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      identificador?: string;
      tipo?: string;
      estado?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Construir condiciones WHERE dinámicamente
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.identificador) {
      condiciones.push(`LOWER(u.identificador) LIKE $${paramIndex}`);
      params.push(`%${filters.identificador.toLowerCase()}%`);
      paramIndex++;
    }

    if (filters.tipo) {
      condiciones.push(`u.tipo = $${paramIndex}::"TipoUnidad"`);
      params.push(filters.tipo);
      paramIndex++;
    }

    if (filters.estado) {
      condiciones.push(`u.estado = $${paramIndex}::"EstadoUnidad"`);
      params.push(filters.estado);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Consulta para contar total (usando subconsulta para evitar problemas con GROUP BY)
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM "unidad" u
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe<any[]>(
      countQuery,
      ...params,
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Consulta para obtener datos con paginación
    // Necesitamos construir la consulta con parámetros correctos para LIMIT y OFFSET
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const dataQuery = `
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
      ${whereClause}
      GROUP BY u.id, u.identificador, u.tipo, u.area, u."coeficienteCopropiedad",
               u."valorCuotaAdministracion", u.estado, u."createdAt", u."updatedAt"
      ORDER BY u.identificador ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const queryParams = [...params, limit, skip];
    const data = await prisma.$queryRawUnsafe<any[]>(dataQuery, ...queryParams);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca todas las unidades sin agrupar (para obtener con usuarios)
   */
  async findAllBasic(prisma: PrismaClient) {
    return prisma.$queryRaw<any[]>`
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
  }

  /**
   * Busca usuarios de una unidad
   */
  async findUsersByUnidadId(prisma: PrismaClient, unidadId: string) {
    return prisma.$queryRaw<any[]>`
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
      WHERE "unidadId" = ${unidadId}
      ORDER BY "firstName" ASC, "lastName" ASC
    `;
  }

  /**
   * Cuenta usuarios de una unidad
   */
  async countUsersByUnidadId(prisma: PrismaClient, unidadId: string) {
    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total FROM "user" WHERE "unidadId" = ${unidadId}
    `;
    return parseInt(result[0]?.total || '0', 10);
  }

  /**
   * Crea una nueva unidad
   */
  async create(prisma: PrismaClient, unidadData: any) {
    await prisma.$executeRaw`
      INSERT INTO "unidad" (
        id, identificador, tipo, area, "coeficienteCopropiedad", 
        "valorCuotaAdministracion", estado, "createdAt", "updatedAt"
      )
      VALUES (
        ${unidadData.id}, ${unidadData.identificador}, ${unidadData.tipo}::"TipoUnidad", 
        ${unidadData.area || null}, ${unidadData.coeficienteCopropiedad || null}, 
        ${unidadData.valorCuotaAdministracion || null}, ${unidadData.estado}::"EstadoUnidad", 
        NOW(), NOW()
      )
    `;

    return this.findById(prisma, unidadData.id);
  }

  /**
   * Actualiza una unidad
   */
  async update(prisma: PrismaClient, unidadId: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.identificador !== undefined) {
      updateFields.push(`identificador = $${paramIndex}`);
      values.push(updates.identificador);
      paramIndex++;
    }

    if (updates.tipo !== undefined) {
      updateFields.push(`tipo = $${paramIndex}::"TipoUnidad"`);
      values.push(updates.tipo);
      paramIndex++;
    }

    if (updates.area !== undefined) {
      updateFields.push(`area = $${paramIndex}`);
      values.push(updates.area || null);
      paramIndex++;
    }

    if (updates.coeficienteCopropiedad !== undefined) {
      updateFields.push(`"coeficienteCopropiedad" = $${paramIndex}`);
      values.push(updates.coeficienteCopropiedad || null);
      paramIndex++;
    }

    if (updates.valorCuotaAdministracion !== undefined) {
      updateFields.push(`"valorCuotaAdministracion" = $${paramIndex}`);
      values.push(updates.valorCuotaAdministracion || null);
      paramIndex++;
    }

    if (updates.estado !== undefined) {
      updateFields.push(`estado = $${paramIndex}::"EstadoUnidad"`);
      values.push(updates.estado);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(unidadId);
      await prisma.$executeRawUnsafe(
        `UPDATE "unidad" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findById(prisma, unidadId);
  }

  /**
   * Cuenta el total de unidades
   */
  async count(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total FROM "unidad"
    `;
    return parseInt(result[0]?.total || '0', 10);
  }

  /**
   * Elimina una unidad
   */
  async delete(prisma: PrismaClient, unidadId: string) {
    await prisma.$executeRaw`
      DELETE FROM "unidad" WHERE id = ${unidadId}
    `;
  }
}


