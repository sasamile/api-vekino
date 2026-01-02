import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class ReservasRepository {
  /**
   * Busca una reserva por ID con relaciones
   */
  async findById(prisma: PrismaClient, id: string) {
    const reservas = await prisma.$queryRaw<any[]>`
      SELECT 
        r.id,
        r."espacioComunId",
        r."userId",
        r."unidadId",
        r."fechaInicio"::text as "fechaInicio",
        r."fechaFin"::text as "fechaFin",
        r."cantidadPersonas",
        r.estado,
        r.motivo,
        r.observaciones,
        r."precioTotal",
        r."createdAt"::text as "createdAt",
        r."updatedAt"::text as "updatedAt",
        r."createdBy",
        json_build_object(
          'id', ec.id,
          'nombre', ec.nombre,
          'tipo', ec.tipo,
          'capacidad', ec.capacidad,
          'descripcion', ec.descripcion,
          'unidadTiempo', ec."unidadTiempo",
          'precioPorUnidad', ec."precioPorUnidad",
          'activo', ec.activo,
          'imagen', ec.imagen,
          'horariosDisponibilidad', ec."horariosDisponibilidad",
          'requiereAprobacion', ec."requiereAprobacion"
        ) as "espacioComun",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email
        ) as "user",
        CASE 
          WHEN un.id IS NOT NULL THEN json_build_object(
            'id', un.id,
            'identificador', un.identificador
          )
          ELSE NULL
        END as "unidad"
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      INNER JOIN "user" u ON r."userId" = u.id
      LEFT JOIN "unidad" un ON r."unidadId" = un.id
      WHERE r.id = ${id}
      LIMIT 1
    `;
    return reservas[0] || null;
  }

  /**
   * Busca todas las reservas con filtros
   */
  async findAll(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      estado?: string;
      espacioComunId?: string;
      tipoEspacio?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      userId?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.estado) {
      condiciones.push(`r.estado = $${paramIndex}::"EstadoReserva"`);
      params.push(filters.estado);
      paramIndex++;
    }

    if (filters.espacioComunId) {
      condiciones.push(`r."espacioComunId" = $${paramIndex}`);
      params.push(filters.espacioComunId);
      paramIndex++;
    }

    if (filters.tipoEspacio) {
      condiciones.push(`ec.tipo = $${paramIndex}::"TipoEspacio"`);
      params.push(filters.tipoEspacio);
      paramIndex++;
    }

    if (filters.fechaDesde) {
      // Normalizar fechaDesde al inicio del día (00:00:00) para filtrar por día completo
      const fechaDesde = new Date(filters.fechaDesde);
      fechaDesde.setHours(0, 0, 0, 0);
      condiciones.push(`r."fechaInicio" >= $${paramIndex}`);
      params.push(fechaDesde.toISOString());
      paramIndex++;
    }

    if (filters.fechaHasta) {
      // Normalizar fechaHasta al final del día (23:59:59) para filtrar por día completo
      const fechaHasta = new Date(filters.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999);
      condiciones.push(`r."fechaInicio" <= $${paramIndex}`);
      params.push(fechaHasta.toISOString());
      paramIndex++;
    }

    if (filters.userId) {
      condiciones.push(`r."userId" = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery, ...params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener datos
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const dataQuery = `
      SELECT 
        r.id,
        r."espacioComunId",
        r."userId",
        r."unidadId",
        r."fechaInicio"::text as "fechaInicio",
        r."fechaFin"::text as "fechaFin",
        r."cantidadPersonas",
        r.estado,
        r.motivo,
        r.observaciones,
        r."precioTotal",
        r."createdAt"::text as "createdAt",
        r."updatedAt"::text as "updatedAt",
        r."createdBy",
        json_build_object(
          'id', ec.id,
          'nombre', ec.nombre,
          'tipo', ec.tipo,
          'capacidad', ec.capacidad,
          'descripcion', ec.descripcion,
          'unidadTiempo', ec."unidadTiempo",
          'precioPorUnidad', ec."precioPorUnidad",
          'activo', ec.activo,
          'imagen', ec.imagen,
          'horariosDisponibilidad', ec."horariosDisponibilidad",
          'requiereAprobacion', ec."requiereAprobacion"
        ) as "espacioComun",
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email
        ) as "user",
        CASE 
          WHEN un.id IS NOT NULL THEN json_build_object(
            'id', un.id,
            'identificador', un.identificador
          )
          ELSE NULL
        END as "unidad"
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      INNER JOIN "user" u ON r."userId" = u.id
      LEFT JOIN "unidad" un ON r."unidadId" = un.id
      ${whereClause}
      ORDER BY r."fechaInicio" DESC
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
   * Verifica conflictos de reservas (espacio ya reservado en ese horario)
   * Dos reservas tienen conflicto si sus horarios se solapan (no solo si una contiene a la otra)
   * Considera reservas CONFIRMADAS y PENDIENTES
   */
  async hasConflict(
    prisma: PrismaClient,
    espacioComunId: string,
    fechaInicio: Date,
    fechaFin: Date,
    excludeReservaId?: string,
  ): Promise<boolean> {
    const condiciones: string[] = [
      `"espacioComunId" = $1`,
      `estado IN ('CONFIRMADA'::"EstadoReserva", 'PENDIENTE'::"EstadoReserva")`,
      // Dos intervalos se solapan si: inicio1 < fin2 Y fin1 > inicio2
      `("fechaInicio" < $3 AND "fechaFin" > $2)`,
    ];
    const params: any[] = [espacioComunId, fechaInicio, fechaFin];

    if (excludeReservaId) {
      condiciones.push(`id != $4`);
      params.push(excludeReservaId);
    }

    const query = `
      SELECT COUNT(*) as count
      FROM "reserva"
      WHERE ${condiciones.join(' AND ')}
      LIMIT 1
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return parseInt(result[0]?.count || '0', 10) > 0;
  }

  /**
   * Obtiene las horas ocupadas de un espacio común en un día específico
   */
  async getHorasOcupadas(
    prisma: PrismaClient,
    espacioComunId: string,
    fecha: Date,
  ): Promise<Array<{ fechaInicio: Date; fechaFin: Date; estado: string }>> {
    // Obtener el inicio y fin del día
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const query = `
      SELECT 
        "fechaInicio"::text as "fechaInicio",
        "fechaFin"::text as "fechaFin",
        estado
      FROM "reserva"
      WHERE "espacioComunId" = $1
        AND estado IN ('CONFIRMADA'::"EstadoReserva", 'PENDIENTE'::"EstadoReserva")
        AND "fechaInicio" < $2
        AND "fechaFin" > $3
      ORDER BY "fechaInicio" ASC
    `;

    const reservas = await prisma.$queryRawUnsafe<any[]>(query, espacioComunId, finDia, inicioDia);

    return reservas.map((r) => ({
      fechaInicio: new Date(r.fechaInicio),
      fechaFin: new Date(r.fechaFin),
      estado: r.estado,
    }));
  }

  /**
   * Crea una nueva reserva
   */
  async create(prisma: PrismaClient, reservaData: any) {
    await prisma.$executeRaw`
      INSERT INTO "reserva" (
        id, "espacioComunId", "userId", "unidadId",
        "fechaInicio", "fechaFin", "cantidadPersonas",
        estado, motivo, observaciones, "precioTotal",
        "createdAt", "updatedAt", "createdBy"
      )
      VALUES (
        ${reservaData.id}, ${reservaData.espacioComunId}, ${reservaData.userId},
        ${reservaData.unidadId || null}, ${reservaData.fechaInicio},
        ${reservaData.fechaFin}, ${reservaData.cantidadPersonas || null},
        ${reservaData.estado || 'PENDIENTE'}::"EstadoReserva",
        ${reservaData.motivo || null}, ${reservaData.observaciones || null},
        ${reservaData.precioTotal || null}, NOW(), NOW(),
        ${reservaData.createdBy || null}
      )
    `;
    return this.findById(prisma, reservaData.id);
  }

  /**
   * Actualiza una reserva
   */
  async update(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.espacioComunId !== undefined) {
      updateFields.push(`"espacioComunId" = $${paramIndex}`);
      values.push(updates.espacioComunId);
      paramIndex++;
    }

    if (updates.unidadId !== undefined) {
      updateFields.push(`"unidadId" = $${paramIndex}`);
      values.push(updates.unidadId || null);
      paramIndex++;
    }

    if (updates.fechaInicio !== undefined) {
      updateFields.push(`"fechaInicio" = $${paramIndex}`);
      values.push(updates.fechaInicio);
      paramIndex++;
    }

    if (updates.fechaFin !== undefined) {
      updateFields.push(`"fechaFin" = $${paramIndex}`);
      values.push(updates.fechaFin);
      paramIndex++;
    }

    if (updates.cantidadPersonas !== undefined) {
      updateFields.push(`"cantidadPersonas" = $${paramIndex}`);
      values.push(updates.cantidadPersonas || null);
      paramIndex++;
    }

    if (updates.estado !== undefined) {
      updateFields.push(`estado = $${paramIndex}::"EstadoReserva"`);
      values.push(updates.estado);
      paramIndex++;
    }

    if (updates.motivo !== undefined) {
      updateFields.push(`motivo = $${paramIndex}`);
      values.push(updates.motivo || null);
      paramIndex++;
    }

    if (updates.observaciones !== undefined) {
      updateFields.push(`observaciones = $${paramIndex}`);
      values.push(updates.observaciones || null);
      paramIndex++;
    }

    if (updates.precioTotal !== undefined) {
      updateFields.push(`"precioTotal" = $${paramIndex}`);
      values.push(updates.precioTotal || null);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "reserva" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findById(prisma, id);
  }

  /**
   * Elimina una reserva
   */
  async delete(prisma: PrismaClient, id: string) {
    await prisma.$executeRaw`
      DELETE FROM "reserva" WHERE id = ${id}
    `;
  }
}

