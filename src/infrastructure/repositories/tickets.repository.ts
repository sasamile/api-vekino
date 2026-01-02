import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class TicketsRepository {
  /**
   * Busca un ticket por ID con relaciones
   */
  async findById(prisma: PrismaClient, id: string) {
    const tickets = await prisma.$queryRaw<any[]>`
      SELECT 
        t.id,
        t.titulo,
        t.descripcion,
        t.estado,
        t.categoria,
        t.prioridad,
        t."userId",
        t."unidadId",
        t."asignadoA",
        t."fechaResolucion"::text as "fechaResolucion",
        t."createdAt"::text as "createdAt",
        t."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as "user",
        CASE 
          WHEN un.id IS NOT NULL THEN json_build_object(
            'id', un.id,
            'identificador', un.identificador
          )
          ELSE NULL
        END as "unidad",
        (
          SELECT COUNT(*)::int
          FROM "ticket_comment" tc
          WHERE tc."ticketId" = t.id
        ) as "comentariosCount"
      FROM "ticket" t
      INNER JOIN "user" u ON t."userId" = u.id
      LEFT JOIN "unidad" un ON t."unidadId" = un.id
      WHERE t.id = ${id}
      LIMIT 1
    `;
    return tickets[0] || null;
  }

  /**
   * Busca todos los tickets con filtros
   */
  async findAll(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      estado?: string;
      categoria?: string;
      userId?: string;
      unidadId?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.estado) {
      condiciones.push(`t.estado = $${paramIndex}::"EstadoTicket"`);
      params.push(filters.estado);
      paramIndex++;
    }

    if (filters.categoria) {
      condiciones.push(`t.categoria = $${paramIndex}`);
      params.push(filters.categoria);
      paramIndex++;
    }

    if (filters.userId) {
      condiciones.push(`t."userId" = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.unidadId) {
      condiciones.push(`t."unidadId" = $${paramIndex}`);
      params.push(filters.unidadId);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "ticket" t
      ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery, ...params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener datos
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const dataQuery = `
      SELECT 
        t.id,
        t.titulo,
        t.descripcion,
        t.estado,
        t.categoria,
        t.prioridad,
        t."userId",
        t."unidadId",
        t."asignadoA",
        t."fechaResolucion"::text as "fechaResolucion",
        t."createdAt"::text as "createdAt",
        t."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as "user",
        CASE 
          WHEN un.id IS NOT NULL THEN json_build_object(
            'id', un.id,
            'identificador', un.identificador
          )
          ELSE NULL
        END as "unidad",
        (
          SELECT COUNT(*)::int
          FROM "ticket_comment" tc
          WHERE tc."ticketId" = t.id
        ) as "comentariosCount"
      FROM "ticket" t
      INNER JOIN "user" u ON t."userId" = u.id
      LEFT JOIN "unidad" un ON t."unidadId" = un.id
      ${whereClause}
      ORDER BY t."createdAt" DESC
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
   * Crea un nuevo ticket
   */
  async create(prisma: PrismaClient, ticketData: any) {
    await prisma.$executeRaw`
      INSERT INTO "ticket" (
        id, titulo, descripcion, estado, categoria, prioridad,
        "userId", "unidadId", "asignadoA", "fechaResolucion",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${ticketData.id}, ${ticketData.titulo}, ${ticketData.descripcion},
        ${ticketData.estado || 'ABIERTO'}::"EstadoTicket",
        ${ticketData.categoria || null}, ${ticketData.prioridad || 'MEDIA'},
        ${ticketData.userId}, ${ticketData.unidadId || null},
        ${ticketData.asignadoA || null}, ${ticketData.fechaResolucion || null},
        NOW(), NOW()
      )
    `;
    return this.findById(prisma, ticketData.id);
  }

  /**
   * Actualiza un ticket
   */
  async update(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.titulo !== undefined) {
      updateFields.push(`titulo = $${paramIndex}`);
      values.push(updates.titulo);
      paramIndex++;
    }

    if (updates.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      values.push(updates.descripcion);
      paramIndex++;
    }

    if (updates.estado !== undefined) {
      updateFields.push(`estado = $${paramIndex}::"EstadoTicket"`);
      values.push(updates.estado);
      paramIndex++;
      
      // Si se marca como RESUELTO, establecer fechaResolucion
      if (updates.estado === 'RESUELTO' && !updates.fechaResolucion) {
        updateFields.push(`"fechaResolucion" = NOW()`);
      } else if (updates.estado !== 'RESUELTO') {
        updateFields.push(`"fechaResolucion" = NULL`);
      }
    }

    if (updates.categoria !== undefined) {
      updateFields.push(`categoria = $${paramIndex}`);
      values.push(updates.categoria || null);
      paramIndex++;
    }

    if (updates.prioridad !== undefined) {
      updateFields.push(`prioridad = $${paramIndex}`);
      values.push(updates.prioridad || null);
      paramIndex++;
    }

    if (updates.unidadId !== undefined) {
      updateFields.push(`"unidadId" = $${paramIndex}`);
      values.push(updates.unidadId || null);
      paramIndex++;
    }

    if (updates.asignadoA !== undefined) {
      updateFields.push(`"asignadoA" = $${paramIndex}`);
      values.push(updates.asignadoA || null);
      paramIndex++;
    }

    if (updates.fechaResolucion !== undefined) {
      updateFields.push(`"fechaResolucion" = $${paramIndex}`);
      values.push(updates.fechaResolucion || null);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "ticket" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findById(prisma, id);
  }

  /**
   * Elimina un ticket
   */
  async delete(prisma: PrismaClient, id: string) {
    await prisma.$executeRaw`
      DELETE FROM "ticket" WHERE id = ${id}
    `;
  }

  /**
   * Obtiene los comentarios de un ticket
   */
  async findCommentsByTicketId(
    prisma: PrismaClient,
    ticketId: string,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    const condiciones: string[] = [`tc."ticketId" = $1`];
    const params: any[] = [ticketId];

    // Si no es admin, solo mostrar comentarios no internos
    if (!isAdmin) {
      condiciones.push(`tc."esInterno" = false`);
    }

    const whereClause = condiciones.join(' AND ');

    const query = `
      SELECT 
        tc.id,
        tc."ticketId",
        tc."userId",
        tc.contenido,
        tc."esInterno",
        tc."createdAt"::text as "createdAt",
        tc."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as "user"
      FROM "ticket_comment" tc
      INNER JOIN "user" u ON tc."userId" = u.id
      WHERE ${whereClause}
      ORDER BY tc."createdAt" ASC
    `;

    return await prisma.$queryRawUnsafe<any[]>(query, ...params);
  }

  /**
   * Crea un comentario en un ticket
   */
  async createComment(prisma: PrismaClient, commentData: any) {
    await prisma.$executeRaw`
      INSERT INTO "ticket_comment" (
        id, "ticketId", "userId", contenido, "esInterno",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${commentData.id}, ${commentData.ticketId}, ${commentData.userId},
        ${commentData.contenido}, ${commentData.esInterno || false},
        NOW(), NOW()
      )
    `;

    const comments = await prisma.$queryRaw<any[]>`
      SELECT 
        tc.id,
        tc."ticketId",
        tc."userId",
        tc.contenido,
        tc."esInterno",
        tc."createdAt"::text as "createdAt",
        tc."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as "user"
      FROM "ticket_comment" tc
      INNER JOIN "user" u ON tc."userId" = u.id
      WHERE tc.id = ${commentData.id}
      LIMIT 1
    `;

    return comments[0] || null;
  }
}

