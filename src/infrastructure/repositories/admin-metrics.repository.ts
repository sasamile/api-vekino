import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class AdminMetricsRepository {
  /**
   * Obtiene el total de unidades
   */
  async getTotalUnidades(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "unidad"
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Obtiene unidades por estado
   */
  async getUnidadesPorEstado(prisma: PrismaClient) {
    const result = await prisma.$queryRaw<
      Array<{ estado: string; count: bigint }>
    >`
      SELECT estado, COUNT(*)::int as count
      FROM "unidad"
      GROUP BY estado
    `;
    return result.map((r) => ({
      estado: r.estado,
      count: Number(r.count),
    }));
  }

  /**
   * Obtiene reservas activas (CONFIRMADA y PENDIENTE)
   */
  async getReservasActivas(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "reserva"
      WHERE estado IN ('CONFIRMADA', 'PENDIENTE')
        AND "fechaFin" >= CURRENT_DATE
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Obtiene métricas de recaudo del mes actual
   */
  async getRecaudoMensual(
    prisma: PrismaClient,
    mes?: string,
  ): Promise<{
    totalFacturado: number;
    totalRecaudado: number;
    facturasEmitidas: number;
    facturasPagadas: number;
  }> {
    const mesActual = mes || new Date().toISOString().slice(0, 7); // YYYY-MM

    const result = await prisma.$queryRaw<
      Array<{
        totalFacturado: number;
        totalRecaudado: number;
        facturasEmitidas: bigint;
        facturasPagadas: bigint;
      }>
    >`
      SELECT 
        COALESCE(SUM(CASE WHEN f.periodo = ${mesActual} THEN f.valor ELSE 0 END), 0)::float as "totalFacturado",
        COALESCE(SUM(CASE 
          WHEN f.periodo = ${mesActual} 
            AND f.estado = 'PAGADA' 
            AND p.estado = 'APROBADO' 
          THEN p.valor 
          ELSE 0 
        END), 0)::float as "totalRecaudado",
        COUNT(DISTINCT CASE WHEN f.periodo = ${mesActual} THEN f.id END)::int as "facturasEmitidas",
        COUNT(DISTINCT CASE 
          WHEN f.periodo = ${mesActual} 
            AND f.estado = 'PAGADA' 
          THEN f.id 
        END)::int as "facturasPagadas"
      FROM "factura" f
      LEFT JOIN "pago" p ON p."facturaId" = f.id
      WHERE f.periodo = ${mesActual}
    `;

    const data = result[0] || {
      totalFacturado: 0,
      totalRecaudado: 0,
      facturasEmitidas: BigInt(0),
      facturasPagadas: BigInt(0),
    };

    return {
      totalFacturado: Number(data.totalFacturado || 0),
      totalRecaudado: Number(data.totalRecaudado || 0),
      facturasEmitidas: Number(data.facturasEmitidas || 0),
      facturasPagadas: Number(data.facturasPagadas || 0),
    };
  }

  /**
   * Obtiene recaudo por mes (últimos N meses)
   */
  async getRecaudoPorMeses(
    prisma: PrismaClient,
    meses: number = 6,
  ): Promise<
    Array<{
      mes: string;
      facturado: number;
      recaudado: number;
      facturasEmitidas: number;
      facturasPagadas: number;
    }>
  > {
    const result = await prisma.$queryRaw<
      Array<{
        mes: string;
        facturado: number;
        recaudado: number;
        facturasEmitidas: bigint;
        facturasPagadas: bigint;
      }>
    >`
      SELECT 
        f.periodo as mes,
        COALESCE(SUM(f.valor), 0)::float as facturado,
        COALESCE(SUM(CASE 
          WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' 
          THEN p.valor 
          ELSE 0 
        END), 0)::float as recaudado,
        COUNT(DISTINCT f.id)::int as "facturasEmitidas",
        COUNT(DISTINCT CASE WHEN f.estado = 'PAGADA' THEN f.id END)::int as "facturasPagadas"
      FROM "factura" f
      LEFT JOIN "pago" p ON p."facturaId" = f.id
      WHERE f.periodo >= TO_CHAR(CURRENT_DATE - INTERVAL '${meses} months', 'YYYY-MM')
      GROUP BY f.periodo
      ORDER BY f.periodo DESC
      LIMIT ${meses}
    `;

    return result.map((r) => ({
      mes: r.mes,
      facturado: Number(r.facturado || 0),
      recaudado: Number(r.recaudado || 0),
      facturasEmitidas: Number(r.facturasEmitidas || 0),
      facturasPagadas: Number(r.facturasPagadas || 0),
    }));
  }

  /**
   * Obtiene pagos pendientes
   */
  async getPagosPendientes(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "pago"
      WHERE estado IN ('PENDIENTE', 'PROCESANDO')
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Obtiene facturas vencidas
   */
  async getFacturasVencidas(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM "factura"
      WHERE estado = 'VENCIDA'
        OR (estado IN ('PENDIENTE', 'ENVIADA') 
            AND "fechaVencimiento" < CURRENT_DATE)
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Obtiene unidades morosas (con facturas vencidas)
   */
  async getUnidadesMorosas(prisma: PrismaClient): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "unidadId")::int as count
      FROM "factura"
      WHERE estado = 'VENCIDA'
        OR (estado IN ('PENDIENTE', 'ENVIADA') 
            AND "fechaVencimiento" < CURRENT_DATE)
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Obtiene estados de cuenta
   */
  async getEstadosCuenta(prisma: PrismaClient) {
    const result = await prisma.$queryRaw<
      Array<{
        pagosAlDia: bigint;
        pagosPendientes: bigint;
        morosidad: bigint;
        total: bigint;
      }>
    >`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN f.estado = 'PAGADA' 
            OR (f.estado IN ('PENDIENTE', 'ENVIADA') 
                AND f."fechaVencimiento" >= CURRENT_DATE)
          THEN f."unidadId" 
        END)::int as "pagosAlDia",
        COUNT(DISTINCT CASE 
          WHEN f.estado IN ('PENDIENTE', 'ENVIADA') 
            AND f."fechaVencimiento" >= CURRENT_DATE
          THEN f."unidadId" 
        END)::int as "pagosPendientes",
        COUNT(DISTINCT CASE 
          WHEN f.estado = 'VENCIDA' 
            OR (f.estado IN ('PENDIENTE', 'ENVIADA') 
                AND f."fechaVencimiento" < CURRENT_DATE)
          THEN f."unidadId" 
        END)::int as morosidad,
        COUNT(DISTINCT f."unidadId")::int as total
      FROM "factura" f
      WHERE f."fechaVencimiento" >= CURRENT_DATE - INTERVAL '3 months'
    `;

    const data = result[0] || {
      pagosAlDia: BigInt(0),
      pagosPendientes: BigInt(0),
      morosidad: BigInt(0),
      total: BigInt(0),
    };

    return {
      pagosAlDia: Number(data.pagosAlDia || 0),
      pagosPendientes: Number(data.pagosPendientes || 0),
      morosidad: Number(data.morosidad || 0),
      totalUnidadesConFacturas: Number(data.total || 0),
    };
  }

  /**
   * Obtiene actividad reciente
   */
  async getActividadReciente(
    prisma: PrismaClient,
    limit: number = 10,
    tipos?: string[],
  ) {
    const actividades: any[] = [];

    // Pagos procesados recientes
    if (!tipos || tipos.includes('PAGO_PROCESADO')) {
      const pagos = await prisma.$queryRaw<
        Array<{
          id: string;
          fecha: Date;
          valor: number;
          unidadIdentificador: string;
          userName: string;
        }>
      >`
        SELECT 
          p.id,
          p."fechaPago" as fecha,
          p.valor,
          u.identificador as "unidadIdentificador",
          us.name as "userName"
        FROM "pago" p
        INNER JOIN "factura" f ON p."facturaId" = f.id
        INNER JOIN "unidad" u ON f."unidadId" = u.id
        LEFT JOIN "user" us ON p."userId" = us.id
        WHERE p.estado = 'APROBADO'
          AND p."fechaPago" IS NOT NULL
        ORDER BY p."fechaPago" DESC
        LIMIT ${limit}
      `;

      pagos.forEach((pago) => {
        actividades.push({
          id: pago.id,
          tipo: 'PAGO_PROCESADO',
          titulo: 'Pago procesado',
          descripcion: `${pago.unidadIdentificador} - $${pago.valor.toLocaleString('es-CO')}`,
          fecha: pago.fecha,
          metadata: {
            valor: pago.valor,
            unidad: pago.unidadIdentificador,
            usuario: pago.userName,
          },
        });
      });
    }

    // Nuevas reservas
    if (!tipos || tipos.includes('NUEVA_RESERVA')) {
      const reservas = await prisma.$queryRaw<
        Array<{
          id: string;
          fecha: Date;
          espacioNombre: string;
          unidadIdentificador: string | null;
        }>
      >`
        SELECT 
          r.id,
          r."createdAt" as fecha,
          ec.nombre as "espacioNombre",
          u.identificador as "unidadIdentificador"
        FROM "reserva" r
        INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
        LEFT JOIN "unidad" u ON r."unidadId" = u.id
        WHERE r.estado IN ('CONFIRMADA', 'PENDIENTE')
        ORDER BY r."createdAt" DESC
        LIMIT ${limit}
      `;

      reservas.forEach((reserva) => {
        actividades.push({
          id: reserva.id,
          tipo: 'NUEVA_RESERVA',
          titulo: 'Nueva reserva',
          descripcion: `${reserva.espacioNombre}${reserva.unidadIdentificador ? ' - ' + reserva.unidadIdentificador : ''}`,
          fecha: reserva.fecha,
          metadata: {
            espacio: reserva.espacioNombre,
            unidad: reserva.unidadIdentificador,
          },
        });
      });
    }

    // Facturas creadas
    if (!tipos || tipos.includes('FACTURA_CREADA')) {
      const facturas = await prisma.$queryRaw<
        Array<{
          id: string;
          fecha: Date;
          numeroFactura: string;
          unidadIdentificador: string;
        }>
      >`
        SELECT 
          f.id,
          f."createdAt" as fecha,
          f."numeroFactura" as "numeroFactura",
          u.identificador as "unidadIdentificador"
        FROM "factura" f
        INNER JOIN "unidad" u ON f."unidadId" = u.id
        ORDER BY f."createdAt" DESC
        LIMIT ${limit}
      `;

      facturas.forEach((factura) => {
        actividades.push({
          id: factura.id,
          tipo: 'FACTURA_CREADA',
          titulo: 'Factura creada',
          descripcion: `${factura.numeroFactura} - ${factura.unidadIdentificador}`,
          fecha: factura.fecha,
          metadata: {
            numeroFactura: factura.numeroFactura,
            unidad: factura.unidadIdentificador,
          },
        });
      });
    }

    // Ordenar por fecha descendente y limitar
    actividades.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });

    return actividades.slice(0, limit);
  }

  /**
   * Obtiene distribución de pagos por estado
   */
  async getPagosPorEstado(prisma: PrismaClient) {
    const result = await prisma.$queryRaw<
      Array<{
        estado: string;
        cantidad: bigint;
        valorTotal: number;
      }>
    >`
      SELECT 
        estado,
        COUNT(*)::int as cantidad,
        COALESCE(SUM(valor), 0)::float as "valorTotal"
      FROM "pago"
      GROUP BY estado
      ORDER BY cantidad DESC
    `;

    const totalPagos = result.reduce((sum, r) => sum + Number(r.cantidad), 0);
    const valorTotal = result.reduce((sum, r) => sum + Number(r.valorTotal), 0);

    return {
      distribucion: result.map((r) => ({
        estado: r.estado,
        cantidad: Number(r.cantidad),
        valorTotal: Number(r.valorTotal),
        porcentaje: totalPagos > 0 ? (Number(r.cantidad) / totalPagos) * 100 : 0,
      })),
      totalPagos,
      valorTotal,
    };
  }

  /**
   * Obtiene distribución de reservas por estado
   */
  async getReservasPorEstado(prisma: PrismaClient) {
    const result = await prisma.$queryRaw<
      Array<{
        estado: string;
        cantidad: bigint;
      }>
    >`
      SELECT 
        estado,
        COUNT(*)::int as cantidad
      FROM "reserva"
      GROUP BY estado
      ORDER BY cantidad DESC
    `;

    const total = result.reduce((sum, r) => sum + Number(r.cantidad), 0);

    return result.map((r) => ({
      estado: r.estado,
      cantidad: Number(r.cantidad),
      porcentaje: total > 0 ? (Number(r.cantidad) / total) * 100 : 0,
    }));
  }

  /**
   * Obtiene reservas por mes
   */
  async getReservasPorMes(prisma: PrismaClient, meses: number = 6) {
    const result = await prisma.$queryRaw<
      Array<{
        mes: string;
        cantidad: bigint;
        confirmadas: bigint;
        canceladas: bigint;
      }>
    >`
      SELECT 
        TO_CHAR("fechaInicio", 'YYYY-MM') as mes,
        COUNT(*)::int as cantidad,
        COUNT(CASE WHEN estado = 'CONFIRMADA' THEN 1 END)::int as confirmadas,
        COUNT(CASE WHEN estado = 'CANCELADA' THEN 1 END)::int as canceladas
      FROM "reserva"
      WHERE "fechaInicio" >= CURRENT_DATE - INTERVAL '${meses} months'
      GROUP BY TO_CHAR("fechaInicio", 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT ${meses}
    `;

    return result.map((r) => ({
      mes: r.mes,
      cantidad: Number(r.cantidad),
      confirmadas: Number(r.confirmadas),
      canceladas: Number(r.canceladas),
    }));
  }

  /**
   * Obtiene top unidades por recaudo
   */
  async getTopUnidadesRecaudo(
    prisma: PrismaClient,
    limit: number = 10,
    periodo?: string,
  ) {
    let result: Array<{
      unidadId: string;
      identificador: string;
      totalRecaudado: number;
      pagosCompletados: bigint;
      facturasEmitidas: bigint;
    }>;

    if (periodo) {
      result = await prisma.$queryRaw<
        Array<{
          unidadId: string;
          identificador: string;
          totalRecaudado: number;
          pagosCompletados: bigint;
          facturasEmitidas: bigint;
        }>
      >`
        SELECT 
          u.id as "unidadId",
          u.identificador,
          COALESCE(SUM(CASE 
            WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' 
            THEN p.valor 
            ELSE 0 
          END), 0)::float as "totalRecaudado",
          COUNT(DISTINCT CASE 
            WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' 
            THEN p.id 
          END)::int as "pagosCompletados",
          COUNT(DISTINCT f.id)::int as "facturasEmitidas"
        FROM "unidad" u
        INNER JOIN "factura" f ON f."unidadId" = u.id
        LEFT JOIN "pago" p ON p."facturaId" = f.id
        WHERE f.periodo = ${periodo}
        GROUP BY u.id, u.identificador
        HAVING COUNT(DISTINCT f.id) > 0
        ORDER BY "totalRecaudado" DESC
        LIMIT ${limit}
      `;
    } else {
      result = await prisma.$queryRaw<
        Array<{
          unidadId: string;
          identificador: string;
          totalRecaudado: number;
          pagosCompletados: bigint;
          facturasEmitidas: bigint;
        }>
      >`
        SELECT 
          u.id as "unidadId",
          u.identificador,
          COALESCE(SUM(CASE 
            WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' 
            THEN p.valor 
            ELSE 0 
          END), 0)::float as "totalRecaudado",
          COUNT(DISTINCT CASE 
            WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' 
            THEN p.id 
          END)::int as "pagosCompletados",
          COUNT(DISTINCT f.id)::int as "facturasEmitidas"
        FROM "unidad" u
        INNER JOIN "factura" f ON f."unidadId" = u.id
        LEFT JOIN "pago" p ON p."facturaId" = f.id
        WHERE f.periodo >= TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM')
        GROUP BY u.id, u.identificador
        HAVING COUNT(DISTINCT f.id) > 0
        ORDER BY "totalRecaudado" DESC
        LIMIT ${limit}
      `;
    }

    return result.map((r) => ({
      unidadId: r.unidadId,
      identificador: r.identificador,
      totalRecaudado: Number(r.totalRecaudado || 0),
      pagosCompletados: Number(r.pagosCompletados || 0),
      facturasEmitidas: Number(r.facturasEmitidas || 0),
      porcentajeCumplimiento:
        Number(r.facturasEmitidas) > 0
          ? (Number(r.pagosCompletados) / Number(r.facturasEmitidas)) * 100
          : 0,
    }));
  }
}

