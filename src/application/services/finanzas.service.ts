import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { FinanzasRepository } from '../../infrastructure/repositories/finanzas.repository';
import { WompiService } from '../../infrastructure/services/wompi.service';
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
  ) {}

  /**
   * Crea una factura individual
   */
  async createFactura(
    condominioId: string,
    dto: CreateFacturaDto,
    createdBy?: string,
    enviarFactura: boolean = false,
  ) {
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
   * Crea facturas masivas para todas las unidades o unidades específicas
   */
  async bulkCreateFacturas(
    condominioId: string,
    dto: BulkCreateFacturasDto,
    createdBy?: string,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const facturasCreadas: any[] = [];

    if (dto.facturas && dto.facturas.length > 0) {
      // Crear facturas específicas
      for (const facturaDto of dto.facturas) {
        try {
          const factura = await this.createFactura(
            condominioId,
            {
              ...facturaDto,
              periodo: dto.periodo,
              fechaVencimiento: dto.fechaVencimiento,
            },
            createdBy,
            dto.enviarFacturas || false,
          );
          facturasCreadas.push(factura);
        } catch (error: any) {
          // Continuar con las demás facturas si una falla
          console.error(`Error creando factura para unidad ${facturaDto.unidadId}:`, error.message);
        }
      }
    } else {
      // Crear facturas para todas las unidades activas
      const unidades = await this.finanzasRepository.findAllUnidades(condominioPrisma);

      for (const unidad of unidades) {
        try {
          const factura = await this.createFactura(
            condominioId,
            {
              unidadId: unidad.id,
              periodo: dto.periodo,
              fechaVencimiento: dto.fechaVencimiento,
              valor: unidad.valorCuotaAdministracion || 0,
            },
            createdBy,
            dto.enviarFacturas || false,
          );
          facturasCreadas.push(factura);
        } catch (error: any) {
          // Continuar con las demás facturas si una falla
          console.error(`Error creando factura para unidad ${unidad.id}:`, error.message);
        }
      }
    }

    return {
      total: facturasCreadas.length,
      facturas: facturasCreadas,
    };
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
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

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
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

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
        // Wompi generalmente proporciona un redirect_url o podemos usar el payment_link_id
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
   * Procesa el webhook de Wompi cuando se confirma un pago
   */
  async processWompiWebhook(condominioId: string, webhookData: any) {
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

    // Consultar estado en Wompi
    try {
      const wompiStatus = await this.wompiService.getTransactionStatus(pago.wompiTransactionId);

      // Actualizar el estado del pago si cambió
      let estadoPago = pago.estado;
      if (wompiStatus.data.status === 'APPROVED' && pago.estado !== 'APROBADO') {
        estadoPago = 'APROBADO';
        await this.finanzasRepository.updatePago(condominioPrisma, pagoId, {
          estado: estadoPago,
          fechaPago: new Date(),
          wompiResponse: JSON.stringify(wompiStatus),
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
        await this.finanzasRepository.updatePago(condominioPrisma, pagoId, {
          estado: estadoPago,
          wompiResponse: JSON.stringify(wompiStatus),
        });
      }

      return {
        ...pago,
        estado: estadoPago,
        wompiStatus: wompiStatus.data,
      };
    } catch (error: any) {
      // Si falla la consulta, retornar el pago con su estado actual
      return pago;
    }
  }
}

