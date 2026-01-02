import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { AdminMetricsService } from 'src/application/services/admin-metrics.service';
import { RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import {
  DashboardOverviewDto,
  EstadosCuentaDto,
  ActividadRecienteResponseDto,
  RecaudoMensualResponseDto,
  PagosPorEstadoResponseDto,
  ReservasGraficasResponseDto,
  TopUnidadesRecaudoResponseDto,
  ReporteCompletoDto,
  QueryActividadRecienteDto,
  QueryRecaudoMensualDto,
  QueryReporteDto,
  MetricasAdicionalesDto,
  UnidadesActivasReservasResponseDto,
  ReservasPorEspacioResponseDto,
  FacturacionPorTipoResponseDto,
  ComparacionMensualDto,
} from 'src/domain/dto/admin-metrics/admin-metrics-response.dto';
import { Request } from 'express';

@ApiTags('admin-metrics')
@Controller('admin-metrics')
@UseGuards(RoleGuard)
@RequireRole('ADMIN')
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('better-auth.session_token')
export class AdminMetricsController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly adminMetricsService: AdminMetricsService,
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

  /**
   * Obtiene el resumen del dashboard
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener resumen del dashboard',
    description: 'Retorna las métricas principales para el dashboard del administrador',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
    type: DashboardOverviewDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getDashboard(@Subdomain() subdomain: string | null): Promise<DashboardOverviewDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getDashboardOverview(condominioId);
  }

  /**
   * Obtiene estados de cuenta
   */
  @Get('estados-cuenta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estados de cuenta',
    description: 'Retorna la distribución de unidades por estado de pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Estados de cuenta obtenidos exitosamente',
    type: EstadosCuentaDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getEstadosCuenta(@Subdomain() subdomain: string | null): Promise<EstadosCuentaDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getEstadosCuenta(condominioId);
  }

  /**
   * Obtiene actividad reciente
   */
  @Get('actividad-reciente')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener actividad reciente',
    description: 'Retorna las actividades recientes del condominio (pagos, reservas, facturas)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de actividades a retornar',
    example: 10,
  })
  @ApiQuery({
    name: 'tipos',
    required: false,
    type: String,
    isArray: true,
    description: 'Tipos de actividad a filtrar',
    example: ['PAGO_PROCESADO', 'NUEVA_RESERVA'],
  })
  @ApiResponse({
    status: 200,
    description: 'Actividad reciente obtenida exitosamente',
    type: ActividadRecienteResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getActividadReciente(
    @Subdomain() subdomain: string | null,
    @Query('limit') limit?: number,
    @Query('tipos') tipos?: string | string[],
  ): Promise<ActividadRecienteResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const tiposArray = Array.isArray(tipos) ? tipos : tipos ? [tipos] : undefined;
    return this.adminMetricsService.getActividadReciente(condominioId, {
      limit: limit ? Number(limit) : undefined,
      tipos: tiposArray as any,
    });
  }

  /**
   * Obtiene recaudo mensual con gráficas
   */
  @Get('recaudo-mensual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener recaudo mensual',
    description: 'Retorna el recaudo mensual con datos para gráficas',
  })
  @ApiQuery({
    name: 'meses',
    required: false,
    type: Number,
    description: 'Cantidad de meses a retornar',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Recaudo mensual obtenido exitosamente',
    type: RecaudoMensualResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getRecaudoMensual(
    @Subdomain() subdomain: string | null,
    @Query('meses') meses?: number,
  ): Promise<RecaudoMensualResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getRecaudoMensual(condominioId, {
      meses: meses ? Number(meses) : undefined,
    });
  }

  /**
   * Obtiene distribución de pagos por estado
   */
  @Get('pagos-por-estado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener distribución de pagos por estado',
    description: 'Retorna la distribución de pagos agrupados por estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución de pagos obtenida exitosamente',
    type: PagosPorEstadoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getPagosPorEstado(
    @Subdomain() subdomain: string | null,
  ): Promise<PagosPorEstadoResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getPagosPorEstado(condominioId);
  }

  /**
   * Obtiene gráficas de reservas
   */
  @Get('reservas-graficas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener gráficas de reservas',
    description: 'Retorna datos de reservas para gráficas (por estado y por mes)',
  })
  @ApiQuery({
    name: 'meses',
    required: false,
    type: Number,
    description: 'Cantidad de meses a analizar',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Gráficas de reservas obtenidas exitosamente',
    type: ReservasGraficasResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getReservasGraficas(
    @Subdomain() subdomain: string | null,
    @Query('meses') meses?: number,
  ): Promise<ReservasGraficasResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getReservasGraficas(
      condominioId,
      meses ? Number(meses) : 6,
    );
  }

  /**
   * Obtiene top unidades por recaudo
   */
  @Get('top-unidades-recaudo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener top unidades por recaudo',
    description: 'Retorna las unidades con mayor recaudo',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de unidades a retornar',
    example: 10,
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    type: String,
    description: 'Período a analizar (formato: YYYY-MM)',
    example: '2026-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Top unidades obtenidas exitosamente',
    type: TopUnidadesRecaudoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getTopUnidadesRecaudo(
    @Subdomain() subdomain: string | null,
    @Query('limit') limit?: number,
    @Query('periodo') periodo?: string,
  ): Promise<TopUnidadesRecaudoResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getTopUnidadesRecaudo(
      condominioId,
      limit ? Number(limit) : 10,
      periodo,
    );
  }

  /**
   * Genera reporte completo
   */
  @Get('reporte')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar reporte completo',
    description: 'Genera un reporte completo con todas las métricas y gráficas',
  })
  @ApiQuery({
    name: 'mesInicio',
    required: false,
    type: String,
    description: 'Mes inicial (formato: YYYY-MM)',
    example: '2026-01',
  })
  @ApiQuery({
    name: 'mesFin',
    required: false,
    type: String,
    description: 'Mes final (formato: YYYY-MM)',
    example: '2026-06',
  })
  @ApiQuery({
    name: 'incluirGraficas',
    required: false,
    type: Boolean,
    description: 'Incluir gráficas detalladas',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte generado exitosamente',
    type: ReporteCompletoDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async generarReporte(
    @Subdomain() subdomain: string | null,
    @Query('mesInicio') mesInicio?: string,
    @Query('mesFin') mesFin?: string,
    @Query('incluirGraficas') incluirGraficas?: string,
  ): Promise<ReporteCompletoDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.generarReporte(condominioId, {
      mesInicio,
      mesFin,
      incluirGraficas: incluirGraficas !== 'false',
    });
  }

  /**
   * Obtiene métricas adicionales
   */
  @Get('metricas-adicionales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener métricas adicionales',
    description: 'Retorna métricas adicionales como tasa de ocupación, tiempo promedio de pago, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas adicionales obtenidas exitosamente',
    type: MetricasAdicionalesDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getMetricasAdicionales(
    @Subdomain() subdomain: string | null,
  ): Promise<MetricasAdicionalesDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getMetricasAdicionales(condominioId);
  }

  /**
   * Obtiene unidades más activas en reservas
   */
  @Get('unidades-activas-reservas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener unidades más activas en reservas',
    description: 'Retorna las unidades con más reservas en los últimos 3 meses',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de unidades a retornar',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Unidades activas obtenidas exitosamente',
    type: UnidadesActivasReservasResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getUnidadesActivasReservas(
    @Subdomain() subdomain: string | null,
    @Query('limit') limit?: number,
  ): Promise<UnidadesActivasReservasResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getUnidadesActivasReservas(
      condominioId,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Obtiene reservas por espacio común
   */
  @Get('reservas-por-espacio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener reservas por espacio común',
    description: 'Retorna la distribución de reservas por cada espacio común',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservas por espacio obtenidas exitosamente',
    type: ReservasPorEspacioResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getReservasPorEspacio(
    @Subdomain() subdomain: string | null,
  ): Promise<ReservasPorEspacioResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getReservasPorEspacio(condominioId);
  }

  /**
   * Obtiene facturación por tipo de unidad
   */
  @Get('facturacion-por-tipo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener facturación por tipo de unidad',
    description: 'Retorna la facturación y recaudo agrupado por tipo de unidad',
  })
  @ApiResponse({
    status: 200,
    description: 'Facturación por tipo obtenida exitosamente',
    type: FacturacionPorTipoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getFacturacionPorTipo(
    @Subdomain() subdomain: string | null,
  ): Promise<FacturacionPorTipoResponseDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getFacturacionPorTipo(condominioId);
  }

  /**
   * Obtiene comparación mensual
   */
  @Get('comparacion-mensual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener comparación mensual',
    description: 'Compara el mes actual con el mes anterior',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparación mensual obtenida exitosamente',
    type: ComparacionMensualDto,
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async getComparacionMensual(
    @Subdomain() subdomain: string | null,
  ): Promise<ComparacionMensualDto> {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.adminMetricsService.getComparacionMensual(condominioId);
  }
}

