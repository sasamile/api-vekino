import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class UsuarioReservasRepository {
  /**
   * Obtiene las reservas del usuario en la semana actual
   */
  async getReservasSemana(prisma: PrismaClient, userId: string, fechaInicio?: Date) {
    const inicioSemana = fechaInicio || new Date();
    inicioSemana.setHours(0, 0, 0, 0);
    
    // Ajustar al lunes de la semana
    const diaSemana = inicioSemana.getDay();
    const diff = inicioSemana.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    inicioSemana.setDate(diff);
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const reservas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        r.id,
        r."espacioComunId",
        r."fechaInicio"::text as "fechaInicio",
        r."fechaFin"::text as "fechaFin",
        r."cantidadPersonas",
        r.estado,
        r.motivo,
        r.observaciones,
        r."precioTotal",
        r."createdAt"::text as "createdAt",
        json_build_object(
          'id', ec.id,
          'nombre', ec.nombre,
          'tipo', ec.tipo::text,
          'capacidad', ec.capacidad,
          'descripcion', ec.descripcion,
          'imagen', ec.imagen
        ) as "espacioComun"
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      WHERE r."userId"::text = $1::text
        AND r."fechaInicio" >= $2
        AND r."fechaInicio" <= $3
      ORDER BY r."fechaInicio" ASC
    `, userId, inicioSemana, finSemana);

    return reservas;
  }

  /**
   * Obtiene todos los espacios comunes disponibles
   */
  async getEspaciosDisponibles(prisma: PrismaClient) {
    const espacios = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        ec.id,
        ec.nombre,
        ec.tipo::text as tipo,
        ec.capacidad,
        ec.descripcion,
        ec."unidadTiempo"::text as "unidadTiempo",
        ec."precioPorUnidad",
        ec.activo,
        ec.imagen,
        ec."horariosDisponibilidad",
        ec."requiereAprobacion"
      FROM "espacio_comun" ec
      WHERE ec.activo = true
      ORDER BY ec.nombre ASC
    `);

    return espacios;
  }

  /**
   * Obtiene las horas disponibles de un espacio en un día específico
   */
  async getHorasDisponibles(
    prisma: PrismaClient,
    espacioComunId: string,
    fecha: Date,
  ) {
    // Obtener el espacio común para conocer sus horarios
    const espacio = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        ec.id,
        ec.nombre,
        ec."horariosDisponibilidad",
        ec."unidadTiempo"::text as "unidadTiempo"
      FROM "espacio_comun" ec
      WHERE ec.id::text = $1::text
      LIMIT 1
    `, espacioComunId);

    if (!espacio[0]) {
      return { horasDisponibles: [], horasOcupadas: [] };
    }

    // Obtener reservas del día
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const reservas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        "fechaInicio"::text as "fechaInicio",
        "fechaFin"::text as "fechaFin",
        estado::text as estado
      FROM "reserva"
      WHERE "espacioComunId"::text = $1::text
        AND estado IN ('CONFIRMADA'::"EstadoReserva", 'PENDIENTE'::"EstadoReserva")
        AND "fechaInicio" >= $2
        AND "fechaInicio" <= $3
      ORDER BY "fechaInicio" ASC
    `, espacioComunId, inicioDia, finDia);

    const horasOcupadas = reservas.map((r) => ({
      inicio: r.fechaInicio,
      fin: r.fechaFin,
      estado: r.estado,
    }));

    // Si hay horarios de disponibilidad configurados, calcular horas disponibles
    // Por ahora, retornamos las horas ocupadas y el frontend puede calcular las disponibles
    // basándose en los horarios de disponibilidad del espacio

    return {
      espacio: espacio[0],
      horasOcupadas,
    };
  }

  /**
   * Obtiene las reservas del usuario con paginación
   */
  async getMisReservas(
    prisma: PrismaClient,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    // Contar total
    const countResult = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as total
      FROM "reserva" r
      WHERE r."userId"::text = $1::text
    `, userId);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener reservas
    const reservas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        r.id,
        r."espacioComunId",
        r."fechaInicio"::text as "fechaInicio",
        r."fechaFin"::text as "fechaFin",
        r."cantidadPersonas",
        r.estado::text as estado,
        r.motivo,
        r.observaciones,
        r."precioTotal",
        r."createdAt"::text as "createdAt",
        r."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', ec.id,
          'nombre', ec.nombre,
          'tipo', ec.tipo::text,
          'capacidad', ec.capacidad,
          'descripcion', ec.descripcion,
          'imagen', ec.imagen
        ) as "espacioComun"
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      WHERE r."userId"::text = $1::text
      ORDER BY r."fechaInicio" DESC
      LIMIT $2 OFFSET $3
    `, userId, limit, offset);

    return {
      data: reservas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

