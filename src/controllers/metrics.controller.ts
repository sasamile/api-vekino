import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MetricsService } from '../application/services/metrics.service';
import { RequireRole, RoleGuard } from '../config/guards/require-role.guard';
import {
  MetricsOverviewDto,
  AlertsDto,
  TenantsListDto,
  CondominiosByMonthDto,
  PlanDistributionResponseDto,
  MRRGrowthDto,
  CityDistributionResponseDto,
} from '../domain/dto/metrics/metrics-response.dto';
import { SubscriptionPlan } from '../domain/dto/condominios/create-condominio.dto';

@Controller('metrics')
@UseGuards(RoleGuard)
@RequireRole('SUPERADMIN')
@ApiTags('metrics')
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('better-auth.session_token')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener resumen general de métricas',
    description: 'Retorna el resumen general de métricas para el dashboard de superadmin',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
    type: MetricsOverviewDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getOverview(): Promise<MetricsOverviewDto> {
    return this.metricsService.getMetricsOverview();
  }

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener alertas y riesgos',
    description: 'Retorna las alertas y situaciones que requieren atención inmediata',
  })
  @ApiResponse({
    status: 200,
    description: 'Alertas obtenidas exitosamente',
    type: AlertsDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getAlerts(): Promise<AlertsDto> {
    return this.metricsService.getAlerts();
  }

  @Get('tenants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener listado de tenants',
    description: 'Retorna el listado completo de condominios con filtros opcionales',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de resultados por página',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Búsqueda por nombre',
    example: 'Las Flores',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['activo', 'suspendido'],
    description: 'Filtrar por estado',
    example: 'activo',
  })
  @ApiQuery({
    name: 'plan',
    required: false,
    enum: ['BASICO', 'PRO', 'ENTERPRISE'],
    description: 'Filtrar por plan',
    example: 'PREMIUM',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filtrar por ciudad',
    example: 'Bogotá',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de tenants obtenido exitosamente',
    type: TenantsListDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getTenants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: 'activo' | 'suspendido',
    @Query('plan') plan?: SubscriptionPlan,
    @Query('city') city?: string,
  ): Promise<TenantsListDto> {
    return this.metricsService.getTenantsList({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      plan,
      city,
    });
  }

  @Get('condominios-by-month')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener condominios creados por mes',
    description: 'Retorna la cantidad de condominios creados en los últimos 6 meses',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos obtenidos exitosamente',
    type: CondominiosByMonthDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getCondominiosByMonth(): Promise<CondominiosByMonthDto> {
    return this.metricsService.getCondominiosByMonth();
  }

  @Get('plan-distribution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener distribución por plan',
    description: 'Retorna la distribución de tenants activos por tipo de plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución obtenida exitosamente',
    type: PlanDistributionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getPlanDistribution(): Promise<PlanDistributionResponseDto> {
    return this.metricsService.getPlanDistribution();
  }

  @Get('mrr-growth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener crecimiento de MRR',
    description: 'Retorna la evolución mensual de ingresos recurrentes (MRR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de MRR obtenidos exitosamente',
    type: MRRGrowthDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getMRRGrowth(): Promise<MRRGrowthDto> {
    return this.metricsService.getMRRGrowth();
  }

  @Get('city-distribution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener distribución por ciudad',
    description: 'Retorna la distribución de condominios activos por ciudad',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución obtenida exitosamente',
    type: CityDistributionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async getCityDistribution(): Promise<CityDistributionResponseDto> {
    return this.metricsService.getCityDistribution();
  }
}

