import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import { EspaciosComunesService } from 'src/application/services/espacios-comunes.service';
import { ReservasService } from 'src/application/services/reservas.service';
import { RequireCondominioAccess, RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { CreateEspacioComunDto } from 'src/domain/dto/reservas/create-espacio-comun.dto';
import { UpdateEspacioComunDto } from 'src/domain/dto/reservas/update-espacio-comun.dto';
import { CreateReservaDto } from 'src/domain/dto/reservas/create-reserva.dto';
import { UpdateReservaDto } from 'src/domain/dto/reservas/update-reserva.dto';
import { QueryReservasDto } from 'src/domain/dto/reservas/query-reservas.dto';
import { Request } from 'express';

@ApiTags('reservas')
@Controller('reservas')
@UseGuards(RoleGuard)
@RequireCondominioAccess()
export class ReservasController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly espaciosComunesService: EspaciosComunesService,
    private readonly reservasService: ReservasService,
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

  // ========== ESPACIOS COMUNES (Solo ADMIN) ==========

  /**
   * Crear espacio común (ADMIN)
   */
  @Post('espacios')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Crear espacio común',
    description: 'Crea un nuevo espacio común disponible para reservas. Solo ADMIN.',
  })
  @ApiBody({ type: CreateEspacioComunDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Espacio común creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async createEspacio(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreateEspacioComunDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.espaciosComunesService.createEspacioComun(condominioId, dto);
  }

  /**
   * Obtener todos los espacios comunes
   */
  @Get('espacios')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Listar espacios comunes',
    description: 'Obtiene todos los espacios comunes disponibles. Todos los usuarios pueden ver.',
  })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Filtrar por espacios activos',
    example: true,
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['SALON_SOCIAL', 'ZONA_BBQ', 'SAUNA', 'CASA_EVENTOS', 'GIMNASIO', 'PISCINA', 'CANCHA_DEPORTIVA', 'PARQUEADERO', 'OTRO'],
    description: 'Filtrar por tipo de espacio',
    example: 'SALON_SOCIAL',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de espacios comunes' })
  async getEspacios(
    @Subdomain() subdomain: string | null,
    @Query('activo') activo?: string | boolean,
    @Query('tipo') tipo?: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const activoBool = activo === undefined ? undefined : activo === true || activo === 'true';
    return this.espaciosComunesService.getEspaciosComunes(condominioId, activoBool, tipo);
  }

  /**
   * Obtener un espacio común por ID
   */
  @Get('espacios/:espacioId')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Obtener espacio común',
    description: 'Obtiene un espacio común específico por ID. Todos los usuarios pueden ver.',
  })
  @ApiParam({ name: 'espacioId', description: 'ID del espacio común' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Espacio común encontrado' })
  @ApiResponse({ status: 404, description: 'Espacio común no encontrado' })
  async getEspacio(
    @Subdomain() subdomain: string | null,
    @Param('espacioId') espacioId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.espaciosComunesService.getEspacioComun(condominioId, espacioId);
  }

  /**
   * Actualizar espacio común (ADMIN)
   */
  @Put('espacios/:espacioId')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Actualizar espacio común',
    description: 'Actualiza un espacio común. Solo ADMIN.',
  })
  @ApiParam({ name: 'espacioId', description: 'ID del espacio común' })
  @ApiBody({ type: UpdateEspacioComunDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Espacio común actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Espacio común no encontrado' })
  async updateEspacio(
    @Subdomain() subdomain: string | null,
    @Param('espacioId') espacioId: string,
    @Body() dto: UpdateEspacioComunDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.espaciosComunesService.updateEspacioComun(condominioId, espacioId, dto);
  }

  /**
   * Eliminar espacio común (ADMIN)
   */
  @Delete('espacios/:espacioId')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Eliminar espacio común',
    description: 'Elimina un espacio común. Solo ADMIN. No se puede eliminar si tiene reservas activas.',
  })
  @ApiParam({ name: 'espacioId', description: 'ID del espacio común' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Espacio común eliminado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar porque tiene reservas activas' })
  async deleteEspacio(
    @Subdomain() subdomain: string | null,
    @Param('espacioId') espacioId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.espaciosComunesService.deleteEspacioComun(condominioId, espacioId);
  }

  // ========== RESERVAS ==========

  /**
   * Crear reserva (todos los usuarios)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Crear reserva',
    description: 'Crea una nueva reserva de espacio común. Todos los usuarios pueden crear reservas.',
  })
  @ApiBody({ type: CreateReservaDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en la solicitud (conflicto de horarios, etc.)' })
  async createReserva(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreateReservaDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.reservasService.createReserva(condominioId, user.id, dto, user.id);
  }

  /**
   * Listar reservas
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Listar reservas',
    description: 'Obtiene todas las reservas. ADMIN ve todas, usuarios ven solo las suyas.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'] })
  @ApiQuery({ name: 'espacioComunId', required: false, type: String })
  @ApiQuery({ name: 'tipoEspacio', required: false, enum: ['SALON_SOCIAL', 'ZONA_BBQ', 'SAUNA', 'CASA_EVENTOS', 'GIMNASIO', 'PISCINA', 'CANCHA_DEPORTIVA', 'PARQUEADERO', 'OTRO'] })
  @ApiQuery({ name: 'fechaDesde', required: false, type: String })
  @ApiQuery({ name: 'fechaHasta', required: false, type: String })
  @ApiQuery({ name: 'soloMias', required: false, type: Boolean })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  async getReservas(
    @Subdomain() subdomain: string | null,
    @Query() query: QueryReservasDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.reservasService.getReservas(condominioId, query, user?.id, isAdmin);
  }

  /**
   * Obtener horas ocupadas de un espacio común en un día específico
   */
  @Get('espacios/:espacioComunId/disponibilidad')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Obtener horas ocupadas/disponibles',
    description: 'Obtiene las horas ocupadas de un espacio común en un día específico. Útil para mostrar disponibilidad en el frontend.',
  })
  @ApiParam({ name: 'espacioComunId', description: 'ID del espacio común' })
  @ApiQuery({
    name: 'fecha',
    required: true,
    type: String,
    description: 'Fecha en formato YYYY-MM-DD',
    example: '2026-01-02',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Horas ocupadas del espacio común' })
  @ApiResponse({ status: 404, description: 'Espacio común no encontrado' })
  async getHorasOcupadas(
    @Subdomain() subdomain: string | null,
    @Param('espacioComunId') espacioComunId: string,
    @Query('fecha') fecha: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.reservasService.getHorasOcupadas(condominioId, espacioComunId, fecha);
  }

  /**
   * Obtener reserva por ID
   */
  @Get(':reservaId')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Obtener reserva',
    description: 'Obtiene una reserva específica. ADMIN puede ver cualquiera, usuarios solo las suyas.',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva encontrada' })
  @ApiResponse({ status: 403, description: 'No autorizado para ver esta reserva' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async getReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.reservasService.getReserva(condominioId, reservaId, user?.id, isAdmin);
  }

  /**
   * Actualizar reserva
   */
  @Put(':reservaId')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Actualizar reserva',
    description: 'Actualiza una reserva. ADMIN puede cambiar cualquier cosa. Usuarios solo pueden actualizar sus propias reservas y cambiar fechas/motivo (no estado).',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBody({ type: UpdateReservaDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva actualizada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado para actualizar esta reserva' })
  async updateReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
    @Body() dto: UpdateReservaDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.reservasService.updateReserva(condominioId, reservaId, dto, user?.id, isAdmin);
  }

  /**
   * Cancelar reserva
   */
  @Post(':reservaId/cancelar')
  @HttpCode(HttpStatus.OK)
  @RequireRole(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'])
  @ApiOperation({
    summary: 'Cancelar reserva',
    description: 'Cancela una reserva. Usuarios solo pueden cancelar las suyas. ADMIN puede cancelar cualquiera.',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado para cancelar esta reserva' })
  async cancelarReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    const isAdmin = user ? this.isAdmin(user.role) : false;
    return this.reservasService.cancelarReserva(condominioId, reservaId, user?.id, isAdmin);
  }

  /**
   * Aprobar reserva (ADMIN)
   */
  @Post(':reservaId/aprobar')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Aprobar reserva',
    description: 'Aprueba una reserva pendiente cambiando su estado a CONFIRMADA. Solo ADMIN.',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva aprobada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async aprobarReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.reservasService.aprobarReserva(condominioId, reservaId);
  }

  /**
   * Rechazar reserva (ADMIN)
   */
  @Post(':reservaId/rechazar')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Rechazar reserva',
    description: 'Rechaza una reserva pendiente cambiando su estado a CANCELADA. Solo ADMIN.',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva rechazada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async rechazarReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.reservasService.rechazarReserva(condominioId, reservaId);
  }

  /**
   * Eliminar reserva (ADMIN)
   */
  @Delete(':reservaId')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Eliminar reserva',
    description: 'Elimina permanentemente una reserva. Solo ADMIN.',
  })
  @ApiParam({ name: 'reservaId', description: 'ID de la reserva' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reserva eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async deleteReserva(
    @Subdomain() subdomain: string | null,
    @Param('reservaId') reservaId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.reservasService.deleteReserva(condominioId, reservaId);
  }
}

