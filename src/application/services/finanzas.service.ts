import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { FinanzasRepository } from '../../infrastructure/repositories/finanzas.repository';
import { WompiService } from '../../infrastructure/services/wompi.service';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { CreateFacturaDto } from '../../domain/dto/finanzas/create-factura.dto';
import { BulkCreateFacturasDto } from '../../domain/dto/finanzas/bulk-create-facturas.dto';
import { QueryFacturasDto } from '../../domain/dto/finanzas/query-facturas.dto';
import { CreatePagoDto } from '../../domain/dto/finanzas/create-pago.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinanzasService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly finanzasRepository: FinanzasRepository,
    private readonly wompiService: WompiService,
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Verifica y crea las tablas de finanzas si no existen
   */
  private async ensureFinanzasTables(condominioId: string): Promise<void> {
    const condominio = await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    try {
      // Intentar consultar la tabla factura
      await condominioPrisma.$queryRaw`SELECT 1 FROM "factura" LIMIT 1`;
    } catch (error: any) {
      // Si la tabla no existe, inicializar el esquema
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log('📝 Tablas de finanzas no existen. Creándolas...');
        await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
        console.log('✅ Tablas de finanzas creadas correctamente');
      } else {
        throw error;
      }
    }
  }

  /**
   * Crea una factura individual
   */
  async createFactura(
    condominioId: string,
    dto: CreateFacturaDto,
    createdBy?: string,
    enviarFactura: boolean = false,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que la unidad existe
    const unidad = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, identificador, "valorCuotaAdministracion" 
      FROM "unidad" 
      WHERE id = ${dto.unidadId} 
      LIMIT 1
    `;
    if (!unidad[0]) {
      throw new NotFoundException(`Unidad con ID ${dto.unidadId} no encontrada`);
    }

    // Si no se especifica el valor, usar el de la unidad
    const valor = dto.valor || unidad[0].valorCuotaAdministracion || 0;
    if (valor <= 0) {
      throw new BadRequestException('El valor de la factura debe ser mayor a 0');
    }

    // Verificar que no exista una factura para esta unidad en el mismo período
    const facturaExistente = await condominioPrisma.$queryRaw<any[]>`
      SELECT id FROM "factura" 
      WHERE "unidadId" = ${dto.unidadId} 
        AND periodo = ${dto.periodo}
      LIMIT 1
    `;
    if (facturaExistente[0]) {
      throw new BadRequestException(
        `Ya existe una factura para esta unidad en el período ${dto.periodo}`,
      );
    }

    // Obtener el usuario de la unidad si no se especifica
    let userId = dto.userId;
    if (!userId) {
      const user = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "user" 
        WHERE "unidadId" = ${dto.unidadId} 
          AND active = true 
          AND role IN ('PROPIETARIO'::"UserRole", 'ARRENDATARIO'::"UserRole")
        ORDER BY 
          CASE role 
            WHEN 'PROPIETARIO'::"UserRole" THEN 1 
            WHEN 'ARRENDATARIO'::"UserRole" THEN 2 
            ELSE 3 
          END
        LIMIT 1
      `;
      if (user[0]) {
        userId = user[0].id;
      }
    } else {
      // Verificar que el usuario existe
      const user = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "user" WHERE id = ${userId} LIMIT 1
      `;
      if (!user[0]) {
        throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      }
    }

    // Generar número de factura
    const numeroFactura = await this.finanzasRepository.getNextFacturaNumber(
      condominioPrisma,
      dto.periodo,
    );

    const facturaData = {
      id: uuidv4(),
      numeroFactura,
      unidadId: dto.unidadId,
      userId: userId || null,
      periodo: dto.periodo,
      fechaEmision: new Date(),
      fechaVencimiento: new Date(dto.fechaVencimiento),
      valor,
      descripcion: dto.descripcion || `Cuota de administración - ${dto.periodo}`,
      estado: enviarFactura ? 'ENVIADA' : 'PENDIENTE',
      fechaEnvio: enviarFactura ? new Date() : null,
      fechaPago: null,
      observaciones: dto.observaciones,
      createdBy: createdBy || null,
    };

    const factura = await this.finanzasRepository.createFactura(condominioPrisma, facturaData);

    // TODO: Enviar email de notificación si enviarFactura es true
    // await this.sendFacturaEmail(factura);

    return factura;
  }

  /**
   * Crea facturas masivas para todas las unidades activas
   * Usa automáticamente el valorCuotaAdministracion de cada unidad
   */
  async bulkCreateFacturas(
    condominioId: string,
    dto: BulkCreateFacturasDto,
    createdBy?: string,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que no existan facturas para este período
    const facturasExistentes = await condominioPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "factura" WHERE periodo = ${dto.periodo}
    `;
    if (parseInt(facturasExistentes[0]?.count || '0', 10) > 0) {
      throw new BadRequestException(
        `Ya existen facturas para el período ${dto.periodo}. No se pueden crear facturas duplicadas.`,
      );
    }

    // Obtener todas las unidades activas con su valorCuotaAdministracion
    const unidades = await this.finanzasRepository.findAllUnidades(condominioPrisma);

    if (unidades.length === 0) {
      throw new BadRequestException('No hay unidades activas para facturar');
    }

    const facturasCreadas: any[] = [];
    const fechaEmision = new Date(dto.fechaEmision);
    const fechaVencimiento = new Date(dto.fechaVencimiento);

    // Crear facturas para todas las unidades activas
    for (const unidad of unidades) {
      // Solo crear factura si la unidad tiene un valor de administración asignado
      if (!unidad.valorCuotaAdministracion || unidad.valorCuotaAdministracion <= 0) {
        console.warn(
          `Unidad ${unidad.identificador} no tiene valorCuotaAdministracion asignado. Se omite.`,
        );
        continue;
      }

      try {
        // Obtener el usuario responsable (propietario o arrendatario)
        let userId: string | null = null;
        if (unidad.users && unidad.users.length > 0) {
          // Priorizar PROPIETARIO sobre ARRENDATARIO
          const propietario = unidad.users.find((u: any) => u.role === 'PROPIETARIO');
          const arrendatario = unidad.users.find((u: any) => u.role === 'ARRENDATARIO');
          userId = propietario?.id || arrendatario?.id || unidad.users[0]?.id || null;
        }

        // Generar número de factura
        const numeroFactura = await this.finanzasRepository.getNextFacturaNumber(
          condominioPrisma,
          dto.periodo,
        );

        const facturaData = {
          id: uuidv4(),
          numeroFactura,
          unidadId: unidad.id,
          userId: userId,
          periodo: dto.periodo,
          fechaEmision: fechaEmision,
          fechaVencimiento: fechaVencimiento,
          valor: unidad.valorCuotaAdministracion,
          descripcion: `Cuota de administración - ${dto.periodo}`,
          estado: dto.enviarFacturas ? 'ENVIADA' : 'PENDIENTE',
          fechaEnvio: dto.enviarFacturas ? fechaEmision : null,
          fechaPago: null,
          observaciones: null,
          createdBy: createdBy || null,
        };

        const factura = await this.finanzasRepository.createFactura(condominioPrisma, facturaData);
        facturasCreadas.push(factura);
      } catch (error: any) {
        // Continuar con las demás facturas si una falla
        console.error(`Error creando factura para unidad ${unidad.identificador}:`, error.message);
      }
    }

    return {
      total: facturasCreadas.length,
      facturas: facturasCreadas,
      periodo: dto.periodo,
      fechaEmision: fechaEmision.toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
    };
  }

  /**
   * Actualiza automáticamente el estado de facturas vencidas
   */
  private async updateVencidasFacturas(condominioPrisma: any): Promise<void> {
    try {
      await condominioPrisma.$executeRaw`
        UPDATE "factura"
        SET estado = 'VENCIDA'::"EstadoFactura", "updatedAt" = NOW()
        WHERE estado != 'PAGADA'
          AND estado != 'VENCIDA'
          AND "fechaVencimiento" < CURRENT_DATE
      `;
    } catch (error) {
      console.error('Error actualizando facturas vencidas:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Obtiene todas las facturas con filtros
   */
  async getFacturas(
    condominioId: string,
    filters: QueryFacturasDto,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Actualizar facturas vencidas automáticamente
    await this.updateVencidasFacturas(condominioPrisma);

    const filterParams: any = {
      page: filters.page,
      limit: filters.limit,
      unidadId: filters.unidadId,
      userId: filters.userId,
      periodo: filters.periodo,
      estado: filters.estado,
      fechaVencimientoDesde: filters.fechaVencimientoDesde,
      fechaVencimientoHasta: filters.fechaVencimientoHasta,
    };

    // Si no es admin, solo puede ver sus propias facturas
    if (!isAdmin && userId) {
      filterParams.userId = userId;
    }

    return this.finanzasRepository.findAllFacturas(condominioPrisma, filterParams);
  }

  /**
   * Obtiene una factura por ID
   */
  async getFactura(condominioId: string, facturaId: string, userId?: string, isAdmin: boolean = false) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Actualizar facturas vencidas automáticamente
    await this.updateVencidasFacturas(condominioPrisma);

    const factura = await this.finanzasRepository.findFacturaById(condominioPrisma, facturaId);
    if (!factura) {
      throw new NotFoundException(`Factura con ID ${facturaId} no encontrada`);
    }

    // Si no es admin, solo puede ver sus propias facturas
    if (!isAdmin && userId && factura.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta factura');
    }

    return factura;
  }

  /**
   * Obtiene el resumen de pagos del usuario actual (para usuarios/propietarios)
   */
  async getMisPagos(condominioId: string, userId: string) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Actualizar facturas vencidas automáticamente
    await this.updateVencidasFacturas(condominioPrisma);

    // Obtener todas las facturas del usuario
    const facturas = await this.finanzasRepository.findAllFacturas(condominioPrisma, {
      userId,
      limit: 1000, // Obtener todas
    });

    // Calcular estadísticas
    const facturasData = facturas.data || [];
    const pendientes = facturasData.filter((f: any) => f.estado === 'PENDIENTE' || f.estado === 'ENVIADA');
    const vencidas = facturasData.filter((f: any) => f.estado === 'VENCIDA');
    const pagadas = facturasData.filter((f: any) => f.estado === 'PAGADA');

    const valorPendientes = pendientes.reduce((sum: number, f: any) => sum + parseFloat(f.valor || 0), 0);
    const valorVencidas = vencidas.reduce((sum: number, f: any) => sum + parseFloat(f.valor || 0), 0);
    const valorPagadas = pagadas.reduce((sum: number, f: any) => sum + parseFloat(f.valor || 0), 0);

    // Obtener próxima factura a vencer
    const proximaVencimiento = facturasData
      .filter((f: any) => f.estado !== 'PAGADA')
      .sort((a: any, b: any) => {
        const fechaA = new Date(a.fechaVencimiento).getTime();
        const fechaB = new Date(b.fechaVencimiento).getTime();
        return fechaA - fechaB;
      })[0] || null;

    return {
      resumen: {
        pendientes: {
          cantidad: pendientes.length,
          valor: valorPendientes,
        },
        vencidas: {
          cantidad: vencidas.length,
          valor: valorVencidas,
        },
        pagadas: {
          cantidad: pagadas.length,
          valor: valorPagadas,
        },
        proximoVencimiento: proximaVencimiento ? {
          numeroFactura: proximaVencimiento.numeroFactura,
          fechaVencimiento: proximaVencimiento.fechaVencimiento,
          valor: proximaVencimiento.valor,
          estado: proximaVencimiento.estado,
        } : null,
      },
      facturas: facturasData.map((f: any) => ({
        ...f,
        puedePagar: f.estado !== 'PAGADA' && f.estado !== 'CANCELADA',
      })),
      total: facturas.total,
    };
  }

  /**
   * Envía una factura al usuario (cambia estado a ENVIADA)
   */
  async enviarFactura(condominioId: string, facturaId: string, createdBy?: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const factura = await this.getFactura(condominioId, facturaId);

    if (factura.estado === 'PAGADA') {
      throw new BadRequestException('No se puede enviar una factura que ya está pagada');
    }

    const updates = {
      estado: 'ENVIADA',
      fechaEnvio: new Date(),
    };

    const facturaActualizada = await this.finanzasRepository.updateFactura(
      condominioPrisma,
      facturaId,
      updates,
    );

    // TODO: Enviar email de notificación
    // await this.sendFacturaEmail(facturaActualizada);

    return facturaActualizada;
  }

  /**
   * Crea un pago para una factura usando Wompi
   */
  async createPago(
    condominioId: string,
    dto: CreatePagoDto,
    userId?: string,
    redirectUrl?: string,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que la factura existe
    const factura = await this.getFactura(condominioId, dto.facturaId, userId);

    if (factura.estado === 'PAGADA') {
      throw new BadRequestException('Esta factura ya está pagada');
    }

    if (factura.estado === 'CANCELADA') {
      throw new BadRequestException('Esta factura está cancelada');
    }

    // Verificar que el usuario tiene permiso para pagar esta factura
    if (userId && factura.userId && factura.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para pagar esta factura');
    }

    // Verificar si ya existe un pago pendiente o procesando para esta factura
    const pagosExistentes = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, estado FROM "pago" 
      WHERE "facturaId" = ${dto.facturaId} 
        AND estado IN ('PENDIENTE'::"EstadoPago", 'PROCESANDO'::"EstadoPago")
      LIMIT 1
    `;
    if (pagosExistentes[0]) {
      throw new BadRequestException('Ya existe un pago en proceso para esta factura');
    }

    // Obtener información del usuario para Wompi
    let userEmail = '';
    let userName = '';
    if (userId) {
      const user = await condominioPrisma.$queryRaw<any[]>`
        SELECT email, name FROM "user" WHERE id = ${userId} LIMIT 1
      `;
      if (user[0]) {
        userEmail = user[0].email;
        userName = user[0].name;
      }
    } else if (factura.userId) {
      const user = await condominioPrisma.$queryRaw<any[]>`
        SELECT email, name FROM "user" WHERE id = ${factura.userId} LIMIT 1
      `;
      if (user[0]) {
        userEmail = user[0].email;
        userName = user[0].name;
      }
    }

    if (!userEmail) {
      throw new BadRequestException('No se pudo obtener el email del usuario para procesar el pago');
    }

    // Crear referencia única para Wompi
    const wompiReference = `FAC-${factura.numeroFactura}-${Date.now()}`;

    // Crear pago en la base de datos
    const pagoId = uuidv4();
    const pagoData = {
      id: pagoId,
      facturaId: dto.facturaId,
      userId: userId || factura.userId || null,
      valor: factura.valor,
      metodoPago: dto.metodoPago || 'WOMPI',
      estado: 'PENDIENTE',
      wompiReference,
      observaciones: dto.observaciones,
    };

    const pago = await this.finanzasRepository.createPago(condominioPrisma, pagoData);

    // Si el método de pago es EFECTIVO, marcarlo como completado directamente
    if (dto.metodoPago === 'EFECTIVO') {
      const updates = {
        estado: 'APROBADO',
        fechaPago: new Date(),
      };

      const pagoActualizado = await this.finanzasRepository.updatePago(
        condominioPrisma,
        pagoId,
        updates,
      );

      // Actualizar la factura como pagada
      await this.finanzasRepository.updateFactura(condominioPrisma, dto.facturaId, {
        estado: 'PAGADA',
        fechaPago: new Date(),
      });

      return pagoActualizado;
    }

    // Si el método de pago es WOMPI, crear la transacción en Wompi
    if (dto.metodoPago === 'WOMPI' || !dto.metodoPago) {
      try {
        const wompiResponse = await this.wompiService.createPaymentLink(
          Math.round(factura.valor * 100), // Convertir a centavos
          'COP',
          wompiReference,
          userEmail,
          userName,
          redirectUrl,
        );

        // Construir el link de pago
        // Wompi proporciona el redirect_url directamente en la respuesta del payment link
        const paymentLink = wompiResponse.data.redirect_url || 
          (wompiResponse.data.payment_link_id 
            ? `https://checkout.wompi.co/l/${wompiResponse.data.payment_link_id}`
            : null);

        // Actualizar el pago con la información de Wompi
        const updates = {
          wompiTransactionId: wompiResponse.data.id,
          wompiPaymentLink: paymentLink,
          wompiResponse: JSON.stringify(wompiResponse),
          estado: 'PROCESANDO',
        };

        const pagoActualizado = await this.finanzasRepository.updatePago(
          condominioPrisma,
          pagoId,
          updates,
        );

        return {
          ...pagoActualizado,
          paymentLink: paymentLink,
        };
      } catch (error: any) {
        // Si falla la creación en Wompi, actualizar el estado del pago
        await this.finanzasRepository.updatePago(condominioPrisma, pagoId, {
          estado: 'RECHAZADO',
          observaciones: `Error al crear pago en Wompi: ${error.message}`,
        });
        throw new BadRequestException(`Error al crear pago en Wompi: ${error.message}`);
      }
    }

    return pago;
  }

  /**
   * Marca un pago como completado manualmente (solo ADMIN)
   * Útil para pagos en efectivo o transferencias que se confirman fuera del sistema
   */
  async marcarPagoCompletado(
    condominioId: string,
    pagoId: string,
    observaciones?: string,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const pago = await this.finanzasRepository.findPagoById(condominioPrisma, pagoId);
    if (!pago) {
      throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);
    }

    if (pago.estado === 'APROBADO') {
      throw new BadRequestException('Este pago ya está aprobado');
    }

    // Actualizar el pago como aprobado
    const updates = {
      estado: 'APROBADO',
      fechaPago: new Date(),
      observaciones: observaciones || pago.observaciones,
    };

    const pagoActualizado = await this.finanzasRepository.updatePago(
      condominioPrisma,
      pagoId,
      updates,
    );

    // Actualizar la factura como pagada
    await this.finanzasRepository.updateFactura(condominioPrisma, pago.facturaId, {
      estado: 'PAGADA',
      fechaPago: new Date(),
    });

    return pagoActualizado;
  }

  /**
   * Elimina una factura (solo ADMIN)
   */
  async deleteFactura(condominioId: string, facturaId: string) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const factura = await this.getFactura(condominioId, facturaId);

    // Verificar si la factura tiene pagos asociados
    const pagos = await condominioPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "pago" WHERE "facturaId" = ${facturaId}
    `;
    const tienePagos = parseInt(pagos[0]?.count || '0', 10) > 0;

    if (tienePagos) {
      throw new BadRequestException(
        'No se puede eliminar la factura porque tiene pagos asociados. Primero elimine los pagos.',
      );
    }

    // Eliminar la factura
    await condominioPrisma.$executeRaw`
      DELETE FROM "factura" WHERE id = ${facturaId}
    `;

    return { message: 'Factura eliminada exitosamente' };
  }

  /**
   * Procesa el webhook de Wompi cuando se confirma un pago
   */
  async processWompiWebhook(condominioId: string, webhookData: any) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const transactionId = webhookData.data?.transaction?.id;
    const reference = webhookData.data?.transaction?.reference;
    const status = webhookData.data?.transaction?.status;

    if (!transactionId || !reference) {
      throw new BadRequestException('Datos de webhook inválidos');
    }

    // Buscar el pago por referencia
    const pago = await this.finanzasRepository.findPagoByWompiReference(
      condominioPrisma,
      reference,
    );

    if (!pago) {
      throw new NotFoundException(`Pago con referencia ${reference} no encontrado`);
    }

    // Actualizar el estado del pago según el estado de Wompi
    let estadoPago = 'PENDIENTE';
    if (status === 'APPROVED') {
      estadoPago = 'APROBADO';
    } else if (status === 'DECLINED' || status === 'VOIDED') {
      estadoPago = 'RECHAZADO';
    } else if (status === 'PENDING') {
      estadoPago = 'PROCESANDO';
    }

    const updates: any = {
      estado: estadoPago,
      wompiResponse: JSON.stringify(webhookData),
    };

    if (estadoPago === 'APROBADO') {
      updates.fechaPago = new Date();
      updates.wompiTransactionId = transactionId;

      // Actualizar la factura como pagada
      await this.finanzasRepository.updateFactura(condominioPrisma, pago.facturaId, {
        estado: 'PAGADA',
        fechaPago: new Date(),
      });
    }

    return this.finanzasRepository.updatePago(condominioPrisma, pago.id, updates);
  }

  /**
   * Consulta el estado de un pago en Wompi
   */
  async consultarEstadoPago(condominioId: string, pagoId: string) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const pago = await this.finanzasRepository.findPagoById(condominioPrisma, pagoId);
    if (!pago) {
      throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);
    }

    if (!pago.wompiTransactionId) {
      return pago;
    }

    // Consultar estado en Wompi y actualizar
    return this.verificarYActualizarEstadoPago(condominioPrisma, pago);
  }

  /**
   * Verifica y actualiza el estado de un pago usando el transaction ID de Wompi
   */
  async verificarPagoPorTransactionId(
    condominioId: string,
    wompiTransactionId: string,
  ) {
    await this.ensureFinanzasTables(condominioId);
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    console.log(`🔍 Buscando pago con transaction ID: ${wompiTransactionId}`);

    // Primero consultar directamente en Wompi para obtener información de la transacción
    let wompiStatus;
    let reference: string | null = null;
    
    try {
      console.log(`📡 Consultando transacción en Wompi: ${wompiTransactionId}`);
      wompiStatus = await this.wompiService.getTransactionStatus(wompiTransactionId);
      reference = wompiStatus.data.reference || null;
      console.log(`✅ Transacción encontrada en Wompi. Referencia: ${reference}, Estado: ${wompiStatus.data.status}`);
    } catch (error: any) {
      console.error(`❌ Error al consultar transacción en Wompi:`, error.message);
      throw new NotFoundException(
        `No se pudo encontrar la transacción ${wompiTransactionId} en Wompi. Verifica que el transaction ID sea correcto.`,
      );
    }

    // Buscar el pago por transaction ID
    let pago = await this.finanzasRepository.findPagoByWompiTransactionId(
      condominioPrisma,
      wompiTransactionId,
    );

    if (pago) {
      console.log(`✅ Pago encontrado por transaction ID: ${pago.id}`);
    } else {
      console.log(`⚠️ Pago no encontrado por transaction ID, buscando por referencia: ${reference}`);
      
      // Si no se encuentra por transaction ID, buscar por referencia
      if (reference) {
        pago = await this.finanzasRepository.findPagoByWompiReference(
          condominioPrisma,
          reference,
        );
        
        if (pago) {
          console.log(`✅ Pago encontrado por referencia: ${pago.id}`);
        }
      }
    }

    // Si aún no se encuentra, buscar en todos los pagos recientes y comparar
    if (!pago) {
      console.log(`⚠️ Pago no encontrado por referencia, buscando en pagos recientes...`);
      
      // Buscar todos los pagos recientes (últimas 48 horas) que puedan corresponder
      const pagosRecientes = await condominioPrisma.$queryRaw<any[]>`
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
        WHERE p."createdAt" > NOW() - INTERVAL '48 hours'
          AND p."metodoPago" = 'WOMPI'::"MetodoPago"
          AND (p."wompiTransactionId" IS NULL OR p."wompiTransactionId" = '' OR p.estado IN ('PENDIENTE'::"EstadoPago", 'PROCESANDO'::"EstadoPago"))
        ORDER BY p."createdAt" DESC
        LIMIT 100
      `;

      console.log(`📋 Encontrados ${pagosRecientes.length} pagos recientes para comparar`);

      // Comparar el valor y otros datos para encontrar coincidencias
      const valorEnCentavos = wompiStatus.data.amount_in_cents / 100;
      const valorEnPesos = parseFloat(valorEnCentavos.toFixed(2));
      
      console.log(`💰 Valor de Wompi: ${valorEnPesos} COP`);
      
      for (const pagoReciente of pagosRecientes) {
        const valorPago = parseFloat(pagoReciente.valor || 0);
        console.log(`  - Pago ${pagoReciente.id}: Valor=${valorPago}, Estado=${pagoReciente.estado}, TransactionID=${pagoReciente.wompiTransactionId || 'N/A'}, Reference=${pagoReciente.wompiReference || 'N/A'}`);
        
        // Si el valor coincide exactamente (o con diferencia mínima por redondeo)
        const diferenciaValor = Math.abs(valorPago - valorEnPesos);
        if (diferenciaValor < 1.0) { // Permitir diferencia de hasta 1 peso por redondeo
          console.log(`🎯 Coincidencia por valor encontrada: Pago ${pagoReciente.id} (diferencia: ${diferenciaValor})`);
          
          // Si no tiene transaction ID o está en estado pendiente/procesando, es muy probable que sea este
          if (!pagoReciente.wompiTransactionId || 
              pagoReciente.estado === 'PENDIENTE' || 
              pagoReciente.estado === 'PROCESANDO') {
            console.log(`✅ Pago candidato confirmado: ${pagoReciente.id}`);
            pago = pagoReciente;
            break;
          }
        }
        
        // También verificar si la referencia coincide parcialmente (a veces Wompi cambia el formato)
        if (reference && pagoReciente.wompiReference) {
          // Comparar partes de la referencia
          const refParts = reference.split('_');
          const pagoRefParts = pagoReciente.wompiReference.split('_');
          
          // Si tienen partes comunes y el valor coincide
          if (refParts.length > 0 && pagoRefParts.length > 0) {
            const tieneParteComun = refParts.some(part => pagoRefParts.includes(part));
            if (tieneParteComun && diferenciaValor < 1.0) {
              console.log(`🎯 Coincidencia por referencia parcial y valor: Pago ${pagoReciente.id}`);
              pago = pagoReciente;
              break;
            }
          }
        }
      }
    }

    if (!pago) {
      console.error(`❌ No se pudo encontrar el pago en la base de datos`);
      console.error(`   Transaction ID: ${wompiTransactionId}`);
      console.error(`   Referencia Wompi: ${reference}`);
      console.error(`   Estado Wompi: ${wompiStatus.data.status}`);
      console.error(`   Valor: ${wompiStatus.data.amount_in_cents / 100}`);
      
      throw new NotFoundException(
        `No se pudo encontrar información sobre este pago en la base de datos. Transaction ID: ${wompiTransactionId}, Referencia: ${reference || 'N/A'}. Por favor verifica en tu historial de pagos o contacta al administrador.`,
      );
    }

    // Si el pago no tiene transaction ID guardado, actualizarlo primero
    if (!pago.wompiTransactionId || pago.wompiTransactionId !== wompiTransactionId) {
      console.log(`📝 Actualizando transaction ID del pago ${pago.id}`);
      await this.finanzasRepository.updatePago(condominioPrisma, pago.id, {
        wompiTransactionId: wompiTransactionId,
        wompiResponse: JSON.stringify(wompiStatus),
      });
      // Obtener el pago actualizado
      pago = await this.finanzasRepository.findPagoById(condominioPrisma, pago.id);
    }

    // Consultar estado en Wompi y actualizar
    console.log(`🔄 Verificando y actualizando estado del pago...`);
    return this.verificarYActualizarEstadoPago(condominioPrisma, pago);
  }

  /**
   * Verifica el estado del pago en Wompi y actualiza la base de datos
   */
  private async verificarYActualizarEstadoPago(condominioPrisma: any, pago: any) {
    if (!pago.wompiTransactionId) {
      return pago;
    }

    try {
      // Consultar estado en Wompi
      const wompiStatus = await this.wompiService.getTransactionStatus(pago.wompiTransactionId);

      // Actualizar el estado del pago según el estado de Wompi
      let estadoPago = pago.estado;
      let actualizado = false;

      if (wompiStatus.data.status === 'APPROVED' && pago.estado !== 'APROBADO') {
        estadoPago = 'APROBADO';
        actualizado = true;
        await this.finanzasRepository.updatePago(condominioPrisma, pago.id, {
          estado: estadoPago,
          fechaPago: new Date(),
          wompiResponse: JSON.stringify(wompiStatus),
          wompiTransactionId: pago.wompiTransactionId,
        });

        // Actualizar la factura como pagada
        await this.finanzasRepository.updateFactura(condominioPrisma, pago.facturaId, {
          estado: 'PAGADA',
          fechaPago: new Date(),
        });
      } else if (
        (wompiStatus.data.status === 'DECLINED' || wompiStatus.data.status === 'VOIDED') &&
        pago.estado !== 'RECHAZADO'
      ) {
        estadoPago = 'RECHAZADO';
        actualizado = true;
        await this.finanzasRepository.updatePago(condominioPrisma, pago.id, {
          estado: estadoPago,
          wompiResponse: JSON.stringify(wompiStatus),
        });
      } else if (wompiStatus.data.status === 'PENDING' && pago.estado !== 'PROCESANDO') {
        estadoPago = 'PROCESANDO';
        actualizado = true;
        await this.finanzasRepository.updatePago(condominioPrisma, pago.id, {
          estado: estadoPago,
          wompiResponse: JSON.stringify(wompiStatus),
        });
      }

      // Obtener el pago actualizado
      const pagoActualizado = await this.finanzasRepository.findPagoById(
        condominioPrisma,
        pago.id,
      );

      return {
        ...pagoActualizado,
        estado: estadoPago,
        wompiStatus: wompiStatus.data,
        actualizado,
      };
    } catch (error: any) {
      console.error('Error al verificar estado del pago en Wompi:', error);
      // Si falla la consulta, retornar el pago con su estado actual
      return {
        ...pago,
        error: error.message || 'Error al consultar estado en Wompi',
      };
    }
  }
}

