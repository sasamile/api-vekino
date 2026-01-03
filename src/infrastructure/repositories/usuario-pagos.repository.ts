import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class UsuarioPagosRepository {
  /**
   * Obtiene el estado de pagos de la unidad del usuario
   */
  async getEstadoUnidad(prisma: PrismaClient, unidadId: string) {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        u.id as "unidadId",
        u.identificador,
        u.tipo,
        (
          SELECT COUNT(*)::int
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado IN ('PENDIENTE'::"EstadoFactura", 'ENVIADA'::"EstadoFactura", 'VENCIDA'::"EstadoFactura")
        ) as "facturasPendientes",
        (
          SELECT COUNT(*)::int
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado = 'VENCIDA'::"EstadoFactura"
        ) as "facturasVencidas",
        (
          SELECT COUNT(*)::int
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado = 'PAGADA'::"EstadoFactura"
        ) as "facturasPagadas",
        (
          SELECT COALESCE(SUM(f.valor), 0)
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado IN ('PENDIENTE'::"EstadoFactura", 'ENVIADA'::"EstadoFactura", 'VENCIDA'::"EstadoFactura")
        ) as "montoPendiente",
        (
          SELECT COALESCE(SUM(f.valor), 0)
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado = 'VENCIDA'::"EstadoFactura"
        ) as "montoVencido",
        (
          SELECT MIN(f."fechaVencimiento")::text
          FROM "factura" f
          WHERE f."unidadId"::text = $1::text
            AND f.estado IN ('PENDIENTE'::"EstadoFactura", 'ENVIADA'::"EstadoFactura", 'VENCIDA'::"EstadoFactura")
        ) as "proximoVencimiento"
      FROM "unidad" u
      WHERE u.id::text = $1::text
      LIMIT 1
    `, unidadId);

    const estado = result[0];
    if (!estado) {
      return null;
    }

    // Determinar si está al día
    const estaAlDia = estado.facturasVencidas === 0 && estado.facturasPendientes === 0;

    return {
      ...estado,
      estaAlDia,
    };
  }

  /**
   * Obtiene el próximo pago del usuario
   */
  async getProximoPago(prisma: PrismaClient, unidadId: string) {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        f.id,
        f."numeroFactura",
        f.periodo,
        f."fechaEmision"::text as "fechaEmision",
        f."fechaVencimiento"::text as "fechaVencimiento",
        f.valor,
        f.descripcion,
        f.estado,
        f.observaciones,
        json_build_object(
          'id', u.id,
          'identificador', u.identificador,
          'tipo', u.tipo
        ) as "unidad"
      FROM "factura" f
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      WHERE f."unidadId"::text = $1::text
        AND f.estado IN ('PENDIENTE'::"EstadoFactura", 'ENVIADA'::"EstadoFactura", 'VENCIDA'::"EstadoFactura")
      ORDER BY f."fechaVencimiento" ASC
      LIMIT 1
    `, unidadId);

    return result[0] || null;
  }

  /**
   * Obtiene el historial de pagos del usuario
   */
  async getHistorialPagos(
    prisma: PrismaClient,
    unidadId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    // Contar total
    const countResult = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as total
      FROM "factura" f
      WHERE f."unidadId"::text = $1::text
    `, unidadId);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener facturas con sus pagos
    const facturas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        f.id,
        f."numeroFactura",
        f.periodo,
        f."fechaEmision"::text as "fechaEmision",
        f."fechaVencimiento"::text as "fechaVencimiento",
        f.valor,
        f.descripcion,
        f.estado,
        f."fechaPago"::text as "fechaPago",
        f.observaciones,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'valor', p.valor,
                'metodoPago', p."metodoPago"::text,
                'estado', p.estado::text,
                'fechaPago', p."fechaPago"::text,
                'createdAt', p."createdAt"::text
              )
            )
            FROM "pago" p
            WHERE p."facturaId" = f.id
          ),
          '[]'::json
        ) as pagos
      FROM "factura" f
      WHERE f."unidadId"::text = $1::text
      ORDER BY f."fechaVencimiento" DESC
      LIMIT $2 OFFSET $3
    `, unidadId, limit, offset);

    return {
      data: facturas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

