import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { UsuarioService } from 'src/application/services/usuario.service';
import { RequireCondominioAccess, RoleGuard } from 'src/config/guards/require-role.guard';
import { CreateReservaDto } from 'src/domain/dto/reservas/create-reserva.dto';
import { Request } from 'express';

@ApiTags('usuario')
@Controller('usuario')
@UseGuards(RoleGuard)
@RequireCondominioAccess()
export class UsuarioController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly usuarioService: UsuarioService,
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
    if (!user || !user.id) {
      return null;
    }
    return { id: user.id, role: user.role };
  }

  // ========== PAGOS ==========

  /**
   * Obtiene el estado de pagos de la unidad del usuario
   */
  @Get('pagos/estado-unidad')
  @ApiOperation({
    summary: 'Obtener estado de pagos de la unidad',
    description: 'Retorna información sobre el estado de pagos de la unidad del usuario (si está al día, facturas pendientes, vencidas, etc.)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Estado de la unidad obtenido exitosamente',
  })
  async getEstadoUnidad(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.getEstadoUnidad(condominioId, user.id);
  }

  /**
   * Obtiene el próximo pago del usuario
   */
  @Get('pagos/proximo-pago')
  @ApiOperation({
    summary: 'Obtener próximo pago',
    description: 'Retorna la próxima factura que debe pagar el usuario',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Próximo pago obtenido exitosamente',
  })
  async getProximoPago(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.getProximoPago(condominioId, user.id);
  }

  /**
   * Obtiene el historial de pagos del usuario
   */
  @Get('pagos/historial')
  @ApiOperation({
    summary: 'Obtener historial de pagos',
    description: 'Retorna el historial completo de facturas y pagos del usuario con paginación',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados por página (por defecto: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de pagos obtenido exitosamente',
  })
  async getHistorialPagos(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.getHistorialPagos(
      condominioId,
      user.id,
      page || 1,
      limit || 20,
    );
  }

  // ========== RESERVAS ==========

  /**
   * Obtiene las reservas del usuario en la semana actual
   */
  @Get('reservas/semana')
  @ApiOperation({
    summary: 'Obtener reservas de la semana',
    description: 'Retorna todas las reservas del usuario para la semana actual (lunes a domingo)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiQuery({
    name: 'fechaInicio',
    required: false,
    type: String,
    description: 'Fecha de inicio de la semana (ISO string). Si no se proporciona, usa la semana actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservas de la semana obtenidas exitosamente',
  })
  async getReservasSemana(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
    @Query('fechaInicio') fechaInicio?: string,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const fecha = fechaInicio ? new Date(fechaInicio) : undefined;
    return await this.usuarioService.getReservasSemana(condominioId, user.id, fecha);
  }

  /**
   * Obtiene todas las reservas del usuario con paginación
   */
  @Get('reservas')
  @ApiOperation({
    summary: 'Obtener mis reservas',
    description: 'Retorna todas las reservas del usuario con paginación',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (por defecto: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados por página (por defecto: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservas obtenidas exitosamente',
  })
  async getMisReservas(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.getMisReservas(
      condominioId,
      user.id,
      page || 1,
      limit || 20,
    );
  }

  /**
   * Obtiene todos los espacios comunes disponibles
   */
  @Get('reservas/espacios-disponibles')
  @ApiOperation({
    summary: 'Obtener espacios disponibles',
    description: 'Retorna todos los espacios comunes disponibles para reservar',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Espacios disponibles obtenidos exitosamente',
  })
  async getEspaciosDisponibles(
    @Subdomain() subdomain: string | null,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.getEspaciosDisponibles(condominioId);
  }

  /**
   * Obtiene las horas disponibles de un espacio en un día específico
   */
  @Get('reservas/espacios/:espacioId/horas-disponibles')
  @ApiOperation({
    summary: 'Obtener horas disponibles de un espacio',
    description: 'Retorna las horas ocupadas y disponibles de un espacio común en un día específico',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiParam({
    name: 'espacioId',
    description: 'ID del espacio común',
  })
  @ApiQuery({
    name: 'fecha',
    required: true,
    type: String,
    description: 'Fecha para consultar disponibilidad (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Horas disponibles obtenidas exitosamente',
  })
  async getHorasDisponibles(
    @Subdomain() subdomain: string | null,
    @Param('espacioId') espacioId: string,
    @Query('fecha') fecha: string,
  ) {
    if (!fecha) {
      throw new BadRequestException('La fecha es requerida');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const fechaDate = new Date(fecha);
    
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    return await this.usuarioService.getHorasDisponibles(
      condominioId,
      espacioId,
      fechaDate,
    );
  }

  /**
   * Crea una nueva reserva
   */
  @Post('reservas')
  @ApiOperation({
    summary: 'Crear reserva',
    description: 'Crea una nueva reserva de un espacio común para el usuario',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Reserva creada exitosamente',
  })
  async crearReserva(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
    @Body() dto: CreateReservaDto,
  ) {
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }

    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return await this.usuarioService.crearReserva(condominioId, user.id, dto);
  }
}

