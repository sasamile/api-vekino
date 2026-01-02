import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { FinanzasService } from 'src/application/services/finanzas.service';
import { RequireCondominioAccess, RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { CreateFacturaDto } from 'src/domain/dto/finanzas/create-factura.dto';
import { BulkCreateFacturasDto } from 'src/domain/dto/finanzas/bulk-create-facturas.dto';
import { QueryFacturasDto } from 'src/domain/dto/finanzas/query-facturas.dto';
import { CreatePagoDto } from 'src/domain/dto/finanzas/create-pago.dto';
import { WompiWebhookDto } from 'src/domain/dto/finanzas/wompi-webhook.dto';
import { FacturaResponseDto } from 'src/domain/dto/finanzas/factura-response.dto';
import { PagoResponseDto } from 'src/domain/dto/finanzas/pago-response.dto';
import { Request } from 'express';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('finanzas')
@Controller('finanzas')
@UseGuards(RoleGuard)
@RequireCondominioAccess()
export class FinanzasController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly finanzasService: FinanzasService,
  ) {}

  private async getCondominioIdFromSubdomain(
    subdomain: string | null,
  ): Promise<string> {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    const condominio =
      await this.condominiosService.findCondominioBySubdomain(subdomain);
    return condominio.id;
  }

  private getUserFromRequest(req: Request): { id: string; role: string } | null {
    const user = (req as any).user;
    if (!user) return null;
    return { id: user.id, role: user.role };
  }

  private isAdmin(role: string): boolean {
    return role === 'ADMIN';
  }

  // ========== FACTURAS ==========

  /**
   * Crear factura individual (ADMIN)
   */
  @Post('facturas')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Crear factura',
    description: 'Crea una nueva factura de administración para una unidad. Solo ADMIN.',
  })
  @ApiBody({ type: CreateFacturaDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Factura creada exitosamente',
    type: FacturaResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async createFactura(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreateFacturaDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.finanzasService.createFactura(
      condominioId,
      dto,
      user?.id,
      false, // No enviar automáticamente
    );
  }

  /**
   * Crear facturas masivas (ADMIN)
   */
  @Post('facturas/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Crear facturas masivas',
    description: 'Crea facturas para todas las unidades activas o unidades específicas. Solo ADMIN.',
  })
  @ApiBody({ type: BulkCreateFacturasDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Facturas creadas exitosamente',
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async bulkCreateFacturas(
    @Subdomain() subdomain: string | null,
    @Body() dto: BulkCreateFacturasDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.finanzasService.bulkCreateFacturas(condominioId, dto, user?.id);
  }

  /**
   * Obtener todas las facturas
   */
  @Get('facturas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar facturas',
    description: 'Obtiene todas las facturas con filtros. Los usuarios solo ven sus propias facturas.',
  })
  @ApiQuery({ type: QueryFacturasDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Lista de facturas',
  })
  async getFacturas(
    @Subdomain() subdomain: string | null,
    @Query() query: QueryFacturasDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.finanzasService.getFacturas(condominioId, query, user?.id, isAdmin);
  }

  /**
   * Obtener una factura por ID
   */
  @Get('facturas/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener factura',
    description: 'Obtiene una factura por su ID. Los usuarios solo pueden ver sus propias facturas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la factura',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Factura encontrada',
    type: FacturaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Factura no encontrada' })
  async getFactura(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.finanzasService.getFactura(condominioId, id, user?.id, isAdmin);
  }

  /**
   * Enviar factura al usuario (ADMIN)
   */
  @Post('facturas/:id/enviar')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Enviar factura',
    description: 'Envía una factura al usuario (cambia estado a ENVIADA y envía notificación). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la factura',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Factura enviada exitosamente',
    type: FacturaResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async enviarFactura(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.finanzasService.enviarFactura(condominioId, id, user?.id);
  }

  // ========== PAGOS ==========

  /**
   * Crear pago para una factura
   */
  @Post('pagos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear pago',
    description: 'Crea un pago para una factura usando Wompi. Los usuarios solo pueden pagar sus propias facturas.',
  })
  @ApiBody({ type: CreatePagoDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Pago creado exitosamente',
    type: PagoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error al crear el pago' })
  async createPago(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreatePagoDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    
    // Obtener la URL de redirección desde el query o usar una por defecto
    const redirectUrl = (req.query.redirectUrl as string) || undefined;
    
    return this.finanzasService.createPago(condominioId, dto, user?.id, redirectUrl);
  }

  /**
   * Consultar estado de un pago
   */
  @Get('pagos/:id/estado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar estado de pago',
    description: 'Consulta el estado de un pago, incluyendo el estado en Wompi si aplica.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pago',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Estado del pago',
    type: PagoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async consultarEstadoPago(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.finanzasService.consultarEstadoPago(condominioId, id);
  }

  // ========== WEBHOOK WOMPI ==========

  /**
   * Webhook de Wompi para notificaciones de pago
   * Este endpoint debe ser público (sin autenticación) para que Wompi pueda enviar notificaciones
   */
  @Post('webhook/wompi')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Webhook de Wompi',
    description: 'Endpoint para recibir notificaciones de Wompi sobre el estado de los pagos. Público (sin autenticación).',
  })
  @ApiBody({ type: WompiWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado exitosamente',
  })
  async wompiWebhook(
    @Subdomain() subdomain: string | null,
    @Body() webhookData: WompiWebhookDto,
  ) {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.finanzasService.processWompiWebhook(condominioId, webhookData);
  }
}

