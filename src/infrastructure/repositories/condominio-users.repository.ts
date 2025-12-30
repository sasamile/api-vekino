import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

/**
 * Repositorio para operaciones de base de datos relacionadas con usuarios de condominios
 * Separa la lógica de acceso a datos de la lógica de negocio
 */
@Injectable()
export class CondominioUsersRepository {
  /**
   * Busca un usuario por email en la base de datos del condominio
   */
  async findByEmail(prisma: PrismaClient, email: string) {
    const users = await prisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE email = ${email} LIMIT 1
    `;
    return users[0] || null;
  }

  /**
   * Busca un usuario por ID en la base de datos del condominio
   */
  async findById(prisma: PrismaClient, userId: string) {
    const users = await prisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    return users[0] || null;
  }

  /**
   * Busca todos los usuarios en la base de datos del condominio
   */
  async findAll(prisma: PrismaClient) {
    return prisma.$queryRaw<any[]>`
      SELECT * FROM "user" ORDER BY "createdAt" DESC
    `;
  }

  /**
   * Busca todos los usuarios con paginación y filtros
   */
  async findAllWithPagination(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      active?: boolean;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.active !== undefined) {
      whereConditions.push(`active = $${paramIndex}`);
      queryParams.push(filters.active);
      paramIndex++;
    }

    if (filters.role) {
      whereConditions.push(`role = $${paramIndex}::"UserRole"`);
      queryParams.push(filters.role);
      paramIndex++;
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      whereConditions.push(
        `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex + 1} OR "numeroDocumento" ILIKE $${paramIndex + 2})`,
      );
      queryParams.push(searchPattern);
      queryParams.push(searchPattern);
      queryParams.push(searchPattern);
      paramIndex += 3;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para obtener los datos
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const dataQuery = `
      SELECT * FROM "user" 
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    queryParams.push(limit, offset);

    // Query para contar el total (sin limit y offset)
    const countQuery = `
      SELECT COUNT(*)::int as total FROM "user" 
      ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remover limit y offset

    const [data, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(dataQuery, ...queryParams),
      prisma.$queryRawUnsafe<any[]>(countQuery, ...countParams),
    ]);

    const total = Number(countResult[0]?.total || 0);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca un usuario por número de documento
   */
  async findByNumeroDocumento(prisma: PrismaClient, numeroDocumento: string) {
    const users = await prisma.$queryRaw<any[]>`
      SELECT id FROM "user" WHERE "numeroDocumento" = ${numeroDocumento} LIMIT 1
    `;
    return users[0] || null;
  }

  /**
   * Crea un nuevo usuario en la base de datos del condominio
   */
  async create(prisma: PrismaClient, userData: any) {
    await prisma.$executeRaw`
      INSERT INTO "user" (
        id, name, email, "emailVerified", role,
        "firstName", "lastName", "tipoDocumento", "numeroDocumento", telefono,
        "unidadId", active,
        "createdAt", "updatedAt"
      )
      VALUES (
        ${userData.id}, ${userData.name}, ${userData.email}, ${userData.emailVerified}, ${userData.role}::"UserRole",
        ${userData.firstName || null}, ${userData.lastName || null}, ${userData.tipoDocumento || null},
        ${userData.numeroDocumento || null}, ${userData.telefono || null},
        ${userData.unidadId || null}, ${userData.active !== undefined ? userData.active : true},
        NOW(), NOW()
      )
    `;

    return this.findById(prisma, userData.id);
  }

  /**
   * Crea una cuenta (account) para el usuario
   */
  async createAccount(prisma: PrismaClient, accountData: any) {
    await prisma.$executeRaw`
      INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES (${accountData.id}, ${accountData.accountId}, ${accountData.providerId}, ${accountData.userId}, ${accountData.password}, NOW(), NOW())
    `;
  }

  /**
   * Actualiza un usuario en la base de datos del condominio
   */
  async update(prisma: PrismaClient, userId: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push(`name = $${values.length + 1}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      updateFields.push(`email = $${values.length + 1}`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      updateFields.push(`role = $${values.length + 1}::"UserRole"`);
      values.push(updates.role);
    }
    if (updates.firstName !== undefined) {
      updateFields.push(`"firstName" = $${values.length + 1}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      updateFields.push(`"lastName" = $${values.length + 1}`);
      values.push(updates.lastName);
    }
    if (updates.tipoDocumento !== undefined) {
      updateFields.push(`"tipoDocumento" = $${values.length + 1}`);
      values.push(updates.tipoDocumento);
    }
    if (updates.numeroDocumento !== undefined) {
      updateFields.push(`"numeroDocumento" = $${values.length + 1}`);
      values.push(updates.numeroDocumento);
    }
    if (updates.telefono !== undefined) {
      updateFields.push(`telefono = $${values.length + 1}`);
      values.push(updates.telefono);
    }
    if (updates.unidadId !== undefined) {
      updateFields.push(`"unidadId" = $${values.length + 1}`);
      values.push(updates.unidadId);
    }
    if (updates.image !== undefined) {
      updateFields.push(`image = $${values.length + 1}`);
      values.push(updates.image);
    }
    if (updates.active !== undefined) {
      updateFields.push(`active = $${values.length + 1}`);
      values.push(updates.active);
    }

    if (updateFields.length > 0) {
      values.push(userId);
      await prisma.$executeRawUnsafe(
        `UPDATE "user" SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
        ...values,
      );
    }

    return this.findById(prisma, userId);
  }

  /**
   * Actualiza el rol de un usuario
   */
  async updateRole(prisma: PrismaClient, userId: string, role: string) {
    await prisma.$executeRaw`
      UPDATE "user" SET role = ${role}::"UserRole" WHERE id = ${userId}
    `;
    return this.findById(prisma, userId);
  }

  /**
   * Elimina un usuario
   */
  async delete(prisma: PrismaClient, userId: string) {
    await prisma.$executeRaw`
      DELETE FROM "user" WHERE id = ${userId}
    `;
  }

  /**
   * Busca una cuenta (account) por userId y providerId
   */
  async findAccount(prisma: PrismaClient, userId: string, providerId: string = 'credential') {
    const accounts = await prisma.$queryRaw<any[]>`
      SELECT * FROM "account" WHERE "userId" = ${userId} AND "providerId" = ${providerId} LIMIT 1
    `;
    return accounts[0] || null;
  }

  /**
   * Actualiza la contraseña de una cuenta
   */
  async updateAccountPassword(prisma: PrismaClient, accountId: string, passwordHash: string) {
    await prisma.$executeRaw`
      UPDATE "account" SET password = ${passwordHash} WHERE id = ${accountId}
    `;
  }

  /**
   * Crea una sesión para el usuario
   */
  async createSession(prisma: PrismaClient, sessionData: any) {
    await prisma.$executeRaw`
      INSERT INTO "session" (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
      VALUES (${sessionData.id}, ${sessionData.expiresAt}, ${sessionData.token}, NOW(), NOW(), ${sessionData.ipAddress || null}, ${sessionData.userAgent || null}, ${sessionData.userId})
    `;
  }

  /**
   * Verifica si existe un usuario con el email dado (excluyendo un userId específico)
   */
  async existsByEmail(prisma: PrismaClient, email: string, excludeUserId?: string) {
    const query = excludeUserId
      ? prisma.$queryRaw<any[]>`
          SELECT id, email FROM "user" WHERE email = ${email} AND id != ${excludeUserId} LIMIT 1
        `
      : prisma.$queryRaw<any[]>`
          SELECT id, email FROM "user" WHERE email = ${email} LIMIT 1
        `;
    const users = await query;
    return users[0] || null;
  }

  /**
   * Verifica si existe un usuario con el número de documento dado (excluyendo un userId específico)
   */
  async existsByNumeroDocumento(
    prisma: PrismaClient,
    numeroDocumento: string,
    excludeUserId?: string,
  ) {
    const query = excludeUserId
      ? prisma.$queryRaw<any[]>`
          SELECT id FROM "user" WHERE "numeroDocumento" = ${numeroDocumento} AND id != ${excludeUserId} LIMIT 1
        `
      : prisma.$queryRaw<any[]>`
          SELECT id FROM "user" WHERE "numeroDocumento" = ${numeroDocumento} LIMIT 1
        `;
    const users = await query;
    return users[0] || null;
  }
}

