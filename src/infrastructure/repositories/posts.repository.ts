import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PostsRepository {
  /**
   * Busca un post por ID con relaciones
   */
  async findById(prisma: PrismaClient, id: string, userId?: string) {
    const params: any[] = [id];
    let userLikedSubquery = '0';
    
    if (userId) {
      params.push(userId);
      userLikedSubquery = `(
        SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END::int
        FROM "post_reaction" pr
        WHERE pr."postId" = p.id AND pr."userId"::text = $2::text
      )`;
    }

    const query = `
      SELECT 
        p.id,
        p.titulo,
        p.contenido,
        p."userId",
        p."unidadId",
        p.imagen,
        p.activo,
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt",
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
          FROM "post_comment" pc
          WHERE pc."postId" = p.id AND pc.activo = true
        ) as "comentariosCount",
        (
          SELECT COUNT(*)::int
          FROM "post_reaction" pr
          WHERE pr."postId" = p.id
        ) as "likesCount",
        ${userLikedSubquery} as "userLiked"
      FROM "post" p
      INNER JOIN "user" u ON p."userId" = u.id
      LEFT JOIN "unidad" un ON p."unidadId" = un.id
      WHERE p.id::text = $1::text
      LIMIT 1
    `;

    const posts = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return posts[0] || null;
  }

  /**
   * Busca todos los posts con filtros
   */
  async findAll(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      userId?: string;
      activo?: boolean;
    },
    currentUserId?: string,
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      condiciones.push(`p."userId"::text = $${paramIndex}::text`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.activo !== undefined) {
      condiciones.push(`p.activo = $${paramIndex}`);
      params.push(filters.activo);
      paramIndex++;
    } else {
      // Por defecto solo mostrar activos
      condiciones.push(`p.activo = $${paramIndex}`);
      params.push(true);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "post" p
      ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery, ...params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener datos
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const userIdParam = paramIndex + 2;
    let userLikedSubquery = '0';
    let queryParams = [...params];
    
    // Agregar limit y skip con cast explícito
    queryParams.push(limit, skip);
    
    if (currentUserId) {
      queryParams.push(currentUserId);
      userLikedSubquery = `(
        SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END::int
        FROM "post_reaction" pr
        WHERE pr."postId" = p.id AND pr."userId"::text = $${userIdParam}::text
      )`;
    }

    const dataQuery = `
      SELECT 
        p.id,
        p.titulo,
        p.contenido,
        p."userId",
        p."unidadId",
        p.imagen,
        p.activo,
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt",
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
          FROM "post_comment" pc
          WHERE pc."postId" = p.id AND pc.activo = true
        ) as "comentariosCount",
        (
          SELECT COUNT(*)::int
          FROM "post_reaction" pr
          WHERE pr."postId" = p.id
        ) as "likesCount",
        ${userLikedSubquery} as "userLiked"
      FROM "post" p
      INNER JOIN "user" u ON p."userId" = u.id
      LEFT JOIN "unidad" un ON p."unidadId" = un.id
      ${whereClause}
      ORDER BY p."createdAt" DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

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
   * Crea un nuevo post
   */
  async create(prisma: PrismaClient, postData: any) {
    await prisma.$executeRaw`
      INSERT INTO "post" (
        id, titulo, contenido, "userId", "unidadId", imagen, activo,
        "createdAt", "updatedAt"
      )
      VALUES (
        ${postData.id}, ${postData.titulo || null}, ${postData.contenido},
        ${postData.userId}, ${postData.unidadId || null},
        ${postData.imagen || null}, ${postData.activo !== undefined ? postData.activo : true},
        NOW(), NOW()
      )
    `;
    return this.findById(prisma, postData.id);
  }

  /**
   * Actualiza un post
   */
  async update(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.titulo !== undefined) {
      updateFields.push(`titulo = $${paramIndex}`);
      values.push(updates.titulo || null);
      paramIndex++;
    }

    if (updates.contenido !== undefined) {
      updateFields.push(`contenido = $${paramIndex}`);
      values.push(updates.contenido);
      paramIndex++;
    }

    if (updates.imagen !== undefined) {
      updateFields.push(`imagen = $${paramIndex}`);
      values.push(updates.imagen || null);
      paramIndex++;
    }

    if (updates.activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`);
      values.push(updates.activo);
      paramIndex++;
    }

    if (updates.unidadId !== undefined) {
      updateFields.push(`"unidadId" = $${paramIndex}`);
      values.push(updates.unidadId || null);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "post" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findById(prisma, id);
  }

  /**
   * Elimina un post (soft delete)
   */
  async delete(prisma: PrismaClient, id: string) {
    await prisma.$executeRaw`
      UPDATE "post" SET activo = false, "updatedAt" = NOW() WHERE id = ${id}
    `;
  }

  /**
   * Obtiene los comentarios de un post
   */
  async findCommentsByPostId(prisma: PrismaClient, postId: string) {
    const comments = await prisma.$queryRaw<any[]>`
      SELECT 
        pc.id,
        pc."postId",
        pc."userId",
        pc.contenido,
        pc.activo,
        pc."createdAt"::text as "createdAt",
        pc."updatedAt"::text as "updatedAt",
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
        END as "unidad"
      FROM "post_comment" pc
      INNER JOIN "user" u ON pc."userId" = u.id
      LEFT JOIN "unidad" un ON u."unidadId" = un.id
      WHERE pc."postId" = ${postId} AND pc.activo = true
      ORDER BY pc."createdAt" ASC
    `;
    return comments;
  }

  /**
   * Crea un comentario en un post
   */
  async createComment(prisma: PrismaClient, commentData: any) {
    await prisma.$executeRaw`
      INSERT INTO "post_comment" (
        id, "postId", "userId", contenido, activo,
        "createdAt", "updatedAt"
      )
      VALUES (
        ${commentData.id}, ${commentData.postId}, ${commentData.userId},
        ${commentData.contenido}, true,
        NOW(), NOW()
      )
    `;

    const comments = await prisma.$queryRaw<any[]>`
      SELECT 
        pc.id,
        pc."postId",
        pc."userId",
        pc.contenido,
        pc.activo,
        pc."createdAt"::text as "createdAt",
        pc."updatedAt"::text as "updatedAt",
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
        END as "unidad"
      FROM "post_comment" pc
      INNER JOIN "user" u ON pc."userId" = u.id
      LEFT JOIN "unidad" un ON u."unidadId" = un.id
      WHERE pc.id = ${commentData.id}
      LIMIT 1
    `;

    return comments[0] || null;
  }

  /**
   * Verifica si un usuario ya dio reacción a un post
   */
  async hasUserLiked(prisma: PrismaClient, postId: string, userId: string): Promise<boolean> {
    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count
      FROM "post_reaction"
      WHERE "postId" = ${postId} AND "userId" = ${userId}
      LIMIT 1
    `;
    return parseInt(result[0]?.count || '0', 10) > 0;
  }

  /**
   * Agrega un like a un post (mantiene compatibilidad con el nombre del método)
   */
  async addLike(prisma: PrismaClient, postId: string, userId: string) {
    await prisma.$executeRaw`
      INSERT INTO "post_reaction" (id, "postId", "userId", tipo, "createdAt")
      VALUES (gen_random_uuid(), ${postId}, ${userId}, 'LIKE', NOW())
      ON CONFLICT ("postId", "userId") DO UPDATE SET tipo = 'LIKE', "createdAt" = NOW()
    `;
  }

  /**
   * Elimina un like de un post
   */
  async removeLike(prisma: PrismaClient, postId: string, userId: string) {
    await prisma.$executeRaw`
      DELETE FROM "post_reaction"
      WHERE "postId" = ${postId} AND "userId" = ${userId}
    `;
  }
}

