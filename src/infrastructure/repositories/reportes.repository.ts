import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { GenerarReporteDto } from '../../domain/dto/reportes/generar-reporte.dto';

@Injectable()
export class ReportesRepository {
  /**
   * Genera reporte de pagos
   */
  async generarReportePagos(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.fechaInicio) {
      condiciones.push(`p."createdAt" >= $${paramIndex}::timestamp`);
      params.push(filtros.fechaInicio);
      paramIndex++;
    }

    if (filtros.fechaFin) {
      condiciones.push(`p."createdAt" <= $${paramIndex}::timestamp`);
      params.push(filtros.fechaFin + ' 23:59:59');
      paramIndex++;
    }

    if (filtros.unidadId) {
      condiciones.push(`f."unidadId" = $${paramIndex}`);
      params.push(filtros.unidadId);
      paramIndex++;
    }

    if (filtros.userId) {
      condiciones.push(`p."userId" = $${paramIndex}`);
      params.push(filtros.userId);
      paramIndex++;
    }

    if (filtros.estados && filtros.estados.length > 0) {
      const estadosPlaceholders = filtros.estados
        .map((_, i) => `$${paramIndex + i}::"EstadoPago"`)
        .join(', ');
      condiciones.push(`p.estado IN (${estadosPlaceholders})`);
      filtros.estados.forEach((estado) => {
        params.push(estado);
        paramIndex++;
      });
    }

    const whereClause =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.id,
        p."facturaId",
        p."userId",
        p.valor,
        p."metodoPago",
        p.estado,
        p."wompiTransactionId",
        p."wompiReference",
        p."fechaPago"::text as "fechaPago",
        p.observaciones,
        p."createdAt"::text as "createdAt",
        f."numeroFactura",
        f.periodo,
        f."fechaVencimiento"::text as "fechaVencimiento",
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo",
        us.name as "usuarioNombre",
        us.email as "usuarioEmail"
      FROM "pago" p
      INNER JOIN "factura" f ON p."facturaId" = f.id
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      LEFT JOIN "user" us ON p."userId" = us.id
      ${whereClause}
      ORDER BY p."createdAt" DESC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    // Calcular resumen
    const totalPagos = result.length;
    const totalRecaudado = result
      .filter((p) => p.estado === 'APROBADO')
      .reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const totalFacturado = result.reduce(
      (sum, p) => sum + Number(p.valor || 0),
      0,
    );

    return {
      datos: result,
      resumen: {
        totalPagos,
        totalRecaudado,
        totalFacturado,
        pagosAprobados: result.filter((p) => p.estado === 'APROBADO').length,
        pagosPendientes: result.filter((p) => p.estado === 'PENDIENTE').length,
        pagosRechazados: result.filter((p) => p.estado === 'RECHAZADO').length,
      },
    };
  }

  /**
   * Genera reporte de facturas
   */
  async generarReporteFacturas(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.periodo) {
      condiciones.push(`f.periodo = $${paramIndex}`);
      params.push(filtros.periodo);
      paramIndex++;
    }

    if (filtros.fechaInicio) {
      condiciones.push(`f."fechaEmision" >= $${paramIndex}::timestamp`);
      params.push(filtros.fechaInicio);
      paramIndex++;
    }

    if (filtros.fechaFin) {
      condiciones.push(`f."fechaEmision" <= $${paramIndex}::timestamp`);
      params.push(filtros.fechaFin + ' 23:59:59');
      paramIndex++;
    }

    if (filtros.unidadId) {
      condiciones.push(`f."unidadId" = $${paramIndex}`);
      params.push(filtros.unidadId);
      paramIndex++;
    }

    if (filtros.userId) {
      condiciones.push(`f."userId" = $${paramIndex}`);
      params.push(filtros.userId);
      paramIndex++;
    }

    if (filtros.estados && filtros.estados.length > 0) {
      const estadosPlaceholders = filtros.estados
        .map((_, i) => `$${paramIndex + i}::"EstadoFactura"`)
        .join(', ');
      condiciones.push(`f.estado IN (${estadosPlaceholders})`);
      filtros.estados.forEach((estado) => {
        params.push(estado);
        paramIndex++;
      });
    }

    const whereClause =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        f.id,
        f."numeroFactura",
        f."unidadId",
        f."userId",
        f.periodo,
        f."fechaEmision"::text as "fechaEmision",
        f."fechaVencimiento"::text as "fechaVencimiento",
        f.valor,
        f.descripcion,
        f.estado,
        f."fechaEnvio"::text as "fechaEnvio",
        f."fechaPago"::text as "fechaPago",
        f.observaciones,
        f."createdAt"::text as "createdAt",
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo",
        us.name as "usuarioNombre",
        us.email as "usuarioEmail",
        COALESCE(SUM(CASE WHEN p.estado = 'APROBADO' THEN p.valor ELSE 0 END), 0)::float as "totalPagado"
      FROM "factura" f
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      LEFT JOIN "user" us ON f."userId" = us.id
      LEFT JOIN "pago" p ON p."facturaId" = f.id
      ${whereClause}
      GROUP BY f.id, u.identificador, u.tipo, us.name, us.email
      ORDER BY f."fechaEmision" DESC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const totalFacturas = result.length;
    const totalFacturado = result.reduce(
      (sum, f) => sum + Number(f.valor || 0),
      0,
    );
    const totalPagado = result.reduce(
      (sum, f) => sum + Number(f.totalPagado || 0),
      0,
    );

    return {
      datos: result,
      resumen: {
        totalFacturas,
        totalFacturado,
        totalPagado,
        facturasPagadas: result.filter((f) => f.estado === 'PAGADA').length,
        facturasPendientes: result.filter((f) =>
          ['PENDIENTE', 'ENVIADA'].includes(f.estado),
        ).length,
        facturasVencidas: result.filter((f) => f.estado === 'VENCIDA').length,
      },
    };
  }

  /**
   * Genera reporte de clientes/usuarios
   */
  async generarReporteClientes(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.userId) {
      condiciones.push(`us.id = $${paramIndex}`);
      params.push(filtros.userId);
      paramIndex++;
    }

    if (filtros.unidadId) {
      condiciones.push(`u.id = $${paramIndex}`);
      params.push(filtros.unidadId);
      paramIndex++;
    }

    const whereClause =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        us.id as "usuarioId",
        us.name as "usuarioNombre",
        us.email as "usuarioEmail",
        us.telefono as "usuarioTelefono",
        us.role as "usuarioRol",
        u.id as "unidadId",
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo",
        COUNT(DISTINCT f.id)::int as "totalFacturas",
        COUNT(DISTINCT CASE WHEN f.estado = 'PAGADA' THEN f.id END)::int as "facturasPagadas",
        COUNT(DISTINCT CASE WHEN f.estado IN ('PENDIENTE', 'ENVIADA') THEN f.id END)::int as "facturasPendientes",
        COUNT(DISTINCT CASE WHEN f.estado = 'VENCIDA' THEN f.id END)::int as "facturasVencidas",
        COALESCE(SUM(CASE WHEN f.estado = 'PAGADA' THEN f.valor ELSE 0 END), 0)::float as "totalPagado",
        COALESCE(SUM(CASE WHEN f.estado IN ('PENDIENTE', 'ENVIADA', 'VENCIDA') THEN f.valor ELSE 0 END), 0)::float as "totalPendiente",
        COUNT(DISTINCT r.id)::int as "totalReservas",
        COUNT(DISTINCT CASE WHEN r.estado = 'CONFIRMADA' THEN r.id END)::int as "reservasConfirmadas"
      FROM "user" us
      LEFT JOIN "unidad" u ON us."unidadId" = u.id
      LEFT JOIN "factura" f ON f."userId" = us.id
      LEFT JOIN "reserva" r ON r."userId" = us.id
      ${whereClause}
      GROUP BY us.id, us.name, us.email, us.telefono, us.role, u.id, u.identificador, u.tipo
      HAVING COUNT(DISTINCT f.id) > 0 OR COUNT(DISTINCT r.id) > 0
      ORDER BY us.name
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const totalClientes = result.length;
    const totalFacturado = result.reduce(
      (sum, c) => sum + Number(c.totalPagado || 0) + Number(c.totalPendiente || 0),
      0,
    );
    const totalRecaudado = result.reduce(
      (sum, c) => sum + Number(c.totalPagado || 0),
      0,
    );

    return {
      datos: result,
      resumen: {
        totalClientes,
        totalFacturado,
        totalRecaudado,
        clientesConMorosidad: result.filter(
          (c) => Number(c.facturasVencidas || 0) > 0,
        ).length,
        clientesAlDia: result.filter(
          (c) => Number(c.facturasVencidas || 0) === 0,
        ).length,
      },
    };
  }

  /**
   * Genera reporte de reservas
   */
  async generarReporteReservas(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.fechaInicio) {
      condiciones.push(`r."fechaInicio" >= $${paramIndex}::timestamp`);
      params.push(filtros.fechaInicio);
      paramIndex++;
    }

    if (filtros.fechaFin) {
      condiciones.push(`r."fechaFin" <= $${paramIndex}::timestamp`);
      params.push(filtros.fechaFin + ' 23:59:59');
      paramIndex++;
    }

    if (filtros.unidadId) {
      condiciones.push(`r."unidadId" = $${paramIndex}`);
      params.push(filtros.unidadId);
      paramIndex++;
    }

    if (filtros.userId) {
      condiciones.push(`r."userId" = $${paramIndex}`);
      params.push(filtros.userId);
      paramIndex++;
    }

    if (filtros.estados && filtros.estados.length > 0) {
      const estadosPlaceholders = filtros.estados
        .map((_, i) => `$${paramIndex + i}::"EstadoReserva"`)
        .join(', ');
      condiciones.push(`r.estado IN (${estadosPlaceholders})`);
      filtros.estados.forEach((estado) => {
        params.push(estado);
        paramIndex++;
      });
    }

    const whereClause =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
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
        ec.nombre as "espacioNombre",
        ec.tipo as "espacioTipo",
        u.identificador as "unidadIdentificador",
        us.name as "usuarioNombre",
        us.email as "usuarioEmail"
      FROM "reserva" r
      INNER JOIN "espacio_comun" ec ON r."espacioComunId" = ec.id
      LEFT JOIN "unidad" u ON r."unidadId" = u.id
      LEFT JOIN "user" us ON r."userId" = us.id
      ${whereClause}
      ORDER BY r."fechaInicio" DESC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const totalReservas = result.length;
    const totalConfirmadas = result.filter(
      (r) => r.estado === 'CONFIRMADA',
    ).length;
    const totalCanceladas = result.filter(
      (r) => r.estado === 'CANCELADA',
    ).length;
    const totalIngresos = result
      .filter((r) => r.estado === 'CONFIRMADA')
      .reduce((sum, r) => sum + Number(r.precioTotal || 0), 0);

    return {
      datos: result,
      resumen: {
        totalReservas,
        totalConfirmadas,
        totalCanceladas,
        totalPendientes: result.filter((r) => r.estado === 'PENDIENTE').length,
        totalIngresos,
      },
    };
  }

  /**
   * Genera reporte de recaudo
   */
  async generarReporteRecaudo(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.periodo) {
      condiciones.push(`f.periodo = $${paramIndex}`);
      params.push(filtros.periodo);
      paramIndex++;
    }

    if (filtros.fechaInicio) {
      condiciones.push(`f."fechaEmision" >= $${paramIndex}::timestamp`);
      params.push(filtros.fechaInicio);
      paramIndex++;
    }

    if (filtros.fechaFin) {
      condiciones.push(`f."fechaEmision" <= $${paramIndex}::timestamp`);
      params.push(filtros.fechaFin + ' 23:59:59');
      paramIndex++;
    }

    const whereClause =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        f.periodo,
        COUNT(DISTINCT f.id)::int as "totalFacturas",
        COUNT(DISTINCT CASE WHEN f.estado = 'PAGADA' THEN f.id END)::int as "facturasPagadas",
        COALESCE(SUM(f.valor), 0)::float as "totalFacturado",
        COALESCE(SUM(CASE WHEN f.estado = 'PAGADA' AND p.estado = 'APROBADO' THEN p.valor ELSE 0 END), 0)::float as "totalRecaudado",
        COUNT(DISTINCT f."unidadId")::int as "unidadesFacturadas",
        COUNT(DISTINCT CASE WHEN f.estado = 'PAGADA' THEN f."unidadId" END)::int as "unidadesPagadas"
      FROM "factura" f
      LEFT JOIN "pago" p ON p."facturaId" = f.id
      ${whereClause}
      GROUP BY f.periodo
      ORDER BY f.periodo DESC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const totalFacturado = result.reduce(
      (sum, r) => sum + Number(r.totalFacturado || 0),
      0,
    );
    const totalRecaudado = result.reduce(
      (sum, r) => sum + Number(r.totalRecaudado || 0),
      0,
    );

    return {
      datos: result,
      resumen: {
        totalFacturado,
        totalRecaudado,
        porcentajeRecaudo:
          totalFacturado > 0 ? (totalRecaudado / totalFacturado) * 100 : 0,
        periodos: result.length,
      },
    };
  }

  /**
   * Genera reporte de morosidad
   */
  async generarReporteMorosidad(
    prisma: PrismaClient,
    filtros: GenerarReporteDto,
  ) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    condiciones.push(`(f.estado = 'VENCIDA' OR (f.estado IN ('PENDIENTE', 'ENVIADA') AND f."fechaVencimiento" < CURRENT_DATE))`);

    if (filtros.unidadId) {
      condiciones.push(`f."unidadId" = $${paramIndex}`);
      params.push(filtros.unidadId);
      paramIndex++;
    }

    if (filtros.userId) {
      condiciones.push(`f."userId" = $${paramIndex}`);
      params.push(filtros.userId);
      paramIndex++;
    }

    const whereClause = `WHERE ${condiciones.join(' AND ')}`;

    const query = `
      SELECT 
        f.id,
        f."numeroFactura",
        f."unidadId",
        f."userId",
        f.periodo,
        f."fechaEmision"::text as "fechaEmision",
        f."fechaVencimiento"::text as "fechaVencimiento",
        f.valor,
        f.estado,
        EXTRACT(EPOCH FROM (CURRENT_DATE - f."fechaVencimiento")) / 86400::float as "diasVencida",
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo",
        us.name as "usuarioNombre",
        us.email as "usuarioEmail",
        us.telefono as "usuarioTelefono"
      FROM "factura" f
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      LEFT JOIN "user" us ON f."userId" = us.id
      ${whereClause}
      ORDER BY f."fechaVencimiento" ASC
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const totalMorosidad = result.reduce(
      (sum, f) => sum + Number(f.valor || 0),
      0,
    );
    const unidadesMorosas = new Set(result.map((f) => f.unidadId)).size;

    return {
      datos: result,
      resumen: {
        totalFacturasVencidas: result.length,
        totalMorosidad,
        unidadesMorosas,
        promedioDiasVencida:
          result.length > 0
            ? result.reduce((sum, f) => sum + Number(f.diasVencida || 0), 0) /
              result.length
            : 0,
      },
    };
  }
}

