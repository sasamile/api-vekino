import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class FinanzasRepository {
  /**
   * Busca una factura por ID con relaciones y estado calculado dinámicamente
   */
  async findFacturaById(prisma: PrismaClient, id: string) {
    const facturas = await prisma.$queryRaw<any[]>`
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
        CASE
          WHEN f.estado = 'PAGADA' THEN 'PAGADA'::"EstadoFactura"
          WHEN f."fechaVencimiento" < CURRENT_DATE AND f.estado != 'PAGADA' THEN 'VENCIDA'::"EstadoFactura"
          ELSE f.estado
        END as "estado",
        f."fechaEnvio"::text as "fechaEnvio",
        f."fechaPago"::text as "fechaPago",
        f.observaciones,
        f."createdBy",
        f."createdAt"::text as "createdAt",
        f."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'identificador', u.identificador,
          'tipo', u.tipo
        ) as "unidad",
        CASE 
          WHEN us.id IS NOT NULL THEN json_build_object(
            'id', us.id,
            'name', us.name,
            'email', us.email
          )
          ELSE NULL
        END as "user",
        CASE
          WHEN f."fechaVencimiento" < CURRENT_DATE AND f.estado != 'PAGADA' THEN true
          ELSE false
        END as "estaVencida"
      FROM "factura" f
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      LEFT JOIN "user" us ON f."userId" = us.id
      WHERE f.id = ${id}
      LIMIT 1
    `;
    return facturas[0] || null;
  }

  /**
   * Busca todas las facturas con filtros
   */
  async findAllFacturas(
    prisma: PrismaClient,
    filters: {
      page?: number;
      limit?: number;
      unidadId?: string;
      userId?: string;
      periodo?: string;
      estado?: string;
      fechaVencimientoDesde?: string;
      fechaVencimientoHasta?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.unidadId) {
      condiciones.push(`f."unidadId" = $${paramIndex}`);
      params.push(filters.unidadId);
      paramIndex++;
    }

    if (filters.userId) {
      condiciones.push(`f."userId" = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.periodo) {
      condiciones.push(`f.periodo = $${paramIndex}`);
      params.push(filters.periodo);
      paramIndex++;
    }

    if (filters.estado) {
      // Para filtrar por estado, usar el estado calculado dinámicamente
      condiciones.push(`(
        CASE
          WHEN f.estado = 'PAGADA' THEN 'PAGADA'::"EstadoFactura"
          WHEN f."fechaVencimiento" < CURRENT_DATE AND f.estado != 'PAGADA' THEN 'VENCIDA'::"EstadoFactura"
          ELSE f.estado
        END
      ) = $${paramIndex}::"EstadoFactura"`);
      params.push(filters.estado);
      paramIndex++;
    }

    if (filters.fechaVencimientoDesde) {
      condiciones.push(`f."fechaVencimiento" >= $${paramIndex}`);
      params.push(filters.fechaVencimientoDesde);
      paramIndex++;
    }

    if (filters.fechaVencimientoHasta) {
      condiciones.push(`f."fechaVencimiento" <= $${paramIndex}`);
      params.push(filters.fechaVencimientoHasta);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "factura" f
      ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery, ...params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Obtener datos con estado calculado dinámicamente
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    const dataQuery = `
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
        CASE
          WHEN f.estado = 'PAGADA' THEN 'PAGADA'::"EstadoFactura"
          WHEN f."fechaVencimiento" < CURRENT_DATE AND f.estado != 'PAGADA' THEN 'VENCIDA'::"EstadoFactura"
          ELSE f.estado
        END as "estado",
        f."fechaEnvio"::text as "fechaEnvio",
        f."fechaPago"::text as "fechaPago",
        f.observaciones,
        f."createdBy",
        f."createdAt"::text as "createdAt",
        f."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', u.id,
          'identificador', u.identificador,
          'tipo', u.tipo
        ) as "unidad",
        CASE 
          WHEN us.id IS NOT NULL THEN json_build_object(
            'id', us.id,
            'name', us.name,
            'email', us.email
          )
          ELSE NULL
        END as "user",
        CASE
          WHEN f."fechaVencimiento" < CURRENT_DATE AND f.estado != 'PAGADA' THEN true
          ELSE false
        END as "estaVencida"
      FROM "factura" f
      INNER JOIN "unidad" u ON f."unidadId" = u.id
      LEFT JOIN "user" us ON f."userId" = us.id
      ${whereClause}
      ORDER BY f."fechaVencimiento" ASC, f."createdAt" DESC
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
   * Genera el siguiente número de factura
   */
  async getNextFacturaNumber(prisma: PrismaClient, periodo: string): Promise<string> {
    const year = periodo.split('-')[0];
    const month = periodo.split('-')[1];

    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "factura"
      WHERE periodo = ${periodo}
    `;

    const count = parseInt(result[0]?.count || '0', 10);
    const numero = String(count + 1).padStart(4, '0');
    return `FAC-${year}-${month}-${numero}`;
  }

  /**
   * Crea una nueva factura
   */
  async createFactura(prisma: PrismaClient, facturaData: any) {
    await prisma.$executeRaw`
      INSERT INTO "factura" (
        id, "numeroFactura", "unidadId", "userId",
        periodo, "fechaEmision", "fechaVencimiento",
        valor, descripcion, estado, "fechaEnvio",
        "fechaPago", observaciones, "createdBy",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${facturaData.id}, ${facturaData.numeroFactura}, ${facturaData.unidadId},
        ${facturaData.userId || null}, ${facturaData.periodo}, ${facturaData.fechaEmision},
        ${facturaData.fechaVencimiento}, ${facturaData.valor},
        ${facturaData.descripcion || null}, ${facturaData.estado || 'PENDIENTE'}::"EstadoFactura",
        ${facturaData.fechaEnvio || null}, ${facturaData.fechaPago || null},
        ${facturaData.observaciones || null}, ${facturaData.createdBy || null},
        NOW(), NOW()
      )
    `;
    return this.findFacturaById(prisma, facturaData.id);
  }

  /**
   * Actualiza una factura
   */
  async updateFactura(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.userId !== undefined) {
      updateFields.push(`"userId" = $${paramIndex}`);
      values.push(updates.userId || null);
      paramIndex++;
    }

    if (updates.fechaVencimiento !== undefined) {
      updateFields.push(`"fechaVencimiento" = $${paramIndex}`);
      values.push(updates.fechaVencimiento);
      paramIndex++;
    }

    if (updates.valor !== undefined) {
      updateFields.push(`valor = $${paramIndex}`);
      values.push(updates.valor);
      paramIndex++;
    }

    if (updates.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      values.push(updates.descripcion || null);
      paramIndex++;
    }

    if (updates.estado !== undefined) {
      updateFields.push(`estado = $${paramIndex}::"EstadoFactura"`);
      values.push(updates.estado);
      paramIndex++;
    }

    if (updates.fechaEnvio !== undefined) {
      updateFields.push(`"fechaEnvio" = $${paramIndex}`);
      values.push(updates.fechaEnvio || null);
      paramIndex++;
    }

    if (updates.fechaPago !== undefined) {
      updateFields.push(`"fechaPago" = $${paramIndex}`);
      values.push(updates.fechaPago || null);
      paramIndex++;
    }

    if (updates.observaciones !== undefined) {
      updateFields.push(`observaciones = $${paramIndex}`);
      values.push(updates.observaciones || null);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "factura" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findFacturaById(prisma, id);
  }

  /**
   * Busca un pago por ID con relaciones
   */
  async findPagoById(prisma: PrismaClient, id: string) {
    const pagos = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p."facturaId",
        p."userId",
        p.valor,
        p."metodoPago",
        p.estado,
        p."wompiTransactionId",
        p."wompiReference",
        p."wompiPaymentLink",
        p."wompiResponse",
        p."fechaPago"::text as "fechaPago",
        p.observaciones,
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', f.id,
          'numeroFactura', f."numeroFactura",
          'valor', f.valor,
          'estado', f.estado
        ) as "factura",
        CASE 
          WHEN u.id IS NOT NULL THEN json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          )
          ELSE NULL
        END as "user"
      FROM "pago" p
      INNER JOIN "factura" f ON p."facturaId" = f.id
      LEFT JOIN "user" u ON p."userId" = u.id
      WHERE p.id = ${id}
      LIMIT 1
    `;
    return pagos[0] || null;
  }

  /**
   * Busca un pago por referencia de Wompi
   */
  async findPagoByWompiReference(prisma: PrismaClient, wompiReference: string) {
    const pagos = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p."facturaId",
        p."userId",
        p.valor,
        p."metodoPago",
        p.estado,
        p."wompiTransactionId",
        p."wompiReference",
        p."wompiPaymentLink",
        p."wompiResponse",
        p."fechaPago"::text as "fechaPago",
        p.observaciones,
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt"
      FROM "pago" p
      WHERE p."wompiReference" = ${wompiReference}
      LIMIT 1
    `;
    return pagos[0] || null;
  }

  /**
   * Busca un pago por ID de transacción de Wompi con relaciones
   */
  async findPagoByWompiTransactionId(prisma: PrismaClient, wompiTransactionId: string) {
    const pagos = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p."facturaId",
        p."userId",
        p.valor,
        p."metodoPago",
        p.estado,
        p."wompiTransactionId",
        p."wompiReference",
        p."wompiPaymentLink",
        p."wompiResponse",
        p."fechaPago"::text as "fechaPago",
        p.observaciones,
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt",
        json_build_object(
          'id', f.id,
          'numeroFactura', f."numeroFactura",
          'valor', f.valor,
          'estado', f.estado
        ) as "factura",
        CASE 
          WHEN u.id IS NOT NULL THEN json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          )
          ELSE NULL
        END as "user"
      FROM "pago" p
      INNER JOIN "factura" f ON p."facturaId" = f.id
      LEFT JOIN "user" u ON p."userId" = u.id
      WHERE p."wompiTransactionId" = ${wompiTransactionId}
      LIMIT 1
    `;
    return pagos[0] || null;
  }

  /**
   * Crea un nuevo pago
   */
  async createPago(prisma: PrismaClient, pagoData: any) {
    await prisma.$executeRaw`
      INSERT INTO "pago" (
        id, "facturaId", "userId", valor,
        "metodoPago", estado, "wompiTransactionId",
        "wompiReference", "wompiPaymentLink", "wompiResponse",
        "fechaPago", observaciones, "createdAt", "updatedAt"
      )
      VALUES (
        ${pagoData.id}, ${pagoData.facturaId}, ${pagoData.userId || null},
        ${pagoData.valor}, ${pagoData.metodoPago || 'WOMPI'}::"MetodoPago",
        ${pagoData.estado || 'PENDIENTE'}::"EstadoPago",
        ${pagoData.wompiTransactionId || null}, ${pagoData.wompiReference || null},
        ${pagoData.wompiPaymentLink || null}, ${pagoData.wompiResponse || null},
        ${pagoData.fechaPago || null}, ${pagoData.observaciones || null},
        NOW(), NOW()
      )
    `;
    return this.findPagoById(prisma, pagoData.id);
  }

  /**
   * Actualiza un pago
   */
  async updatePago(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.estado !== undefined) {
      updateFields.push(`estado = $${paramIndex}::"EstadoPago"`);
      values.push(updates.estado);
      paramIndex++;
    }

    if (updates.wompiTransactionId !== undefined) {
      updateFields.push(`"wompiTransactionId" = $${paramIndex}`);
      values.push(updates.wompiTransactionId || null);
      paramIndex++;
    }

    if (updates.wompiReference !== undefined) {
      updateFields.push(`"wompiReference" = $${paramIndex}`);
      values.push(updates.wompiReference || null);
      paramIndex++;
    }

    if (updates.wompiPaymentLink !== undefined) {
      updateFields.push(`"wompiPaymentLink" = $${paramIndex}`);
      values.push(updates.wompiPaymentLink || null);
      paramIndex++;
    }

    if (updates.wompiResponse !== undefined) {
      updateFields.push(`"wompiResponse" = $${paramIndex}`);
      values.push(updates.wompiResponse || null);
      paramIndex++;
    }

    if (updates.fechaPago !== undefined) {
      updateFields.push(`"fechaPago" = $${paramIndex}`);
      values.push(updates.fechaPago || null);
      paramIndex++;
    }

    if (updates.observaciones !== undefined) {
      updateFields.push(`observaciones = $${paramIndex}`);
      values.push(updates.observaciones || null);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "pago" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findPagoById(prisma, id);
  }

  /**
   * Obtiene todas las unidades activas
   */
  async findAllUnidades(prisma: PrismaClient) {
    const unidades = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.identificador,
        u.tipo,
        u."valorCuotaAdministracion",
        u.estado,
        json_agg(
          json_build_object(
            'id', us.id,
            'name', us.name,
            'email', us.email,
            'role', us.role
          )
        ) FILTER (WHERE us.id IS NOT NULL) as users
      FROM "unidad" u
      LEFT JOIN "user" us ON u.id = us."unidadId" AND us.active = true
      WHERE u.estado != 'EN_MANTENIMIENTO'::"EstadoUnidad"
      GROUP BY u.id, u.identificador, u.tipo, u."valorCuotaAdministracion", u.estado
      ORDER BY u.identificador
    `;
    return unidades;
  }
}


