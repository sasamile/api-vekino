import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../condominios/create-condominio.dto';

export class MetricsOverviewDto {
  @ApiProperty({ example: 45, description: 'Total de tenants activos' })
  activeTenants: number;

  @ApiProperty({ example: 3, description: 'Total de tenants suspendidos' })
  suspendedTenants: number;

  @ApiProperty({ example: 7, description: 'Tenants con plan por vencer en 7 días' })
  expiringSoon: number;

  @ApiProperty({ example: 2, description: 'Tenants que requieren atención' })
  requiresAttention: number;

  @ApiProperty({ example: 125000, description: 'Monthly Recurring Revenue (MRR) en pesos' })
  mrr: number;

  @ApiProperty({ example: 2, description: 'Cancelaciones este mes' })
  churn: number;
}

export class AlertTenantDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Condominio Las Flores' })
  name: string;

  @ApiProperty({ example: 'lasflores.vekino.site', nullable: true })
  subdomain: string | null;

  @ApiProperty({ example: '2025-12-31T00:00:00.000Z', nullable: true })
  planExpiresAt: Date | null;

  @ApiProperty({ example: 5, nullable: true, description: 'Días restantes hasta el vencimiento' })
  daysUntilExpiration?: number | null;

  @ApiProperty({ example: { used: 120, limit: 150 }, nullable: true })
  usage?: { used: number; limit: number | null } | null;
}

export class AlertDto {
  @ApiProperty({ example: 'expiring_plan', description: 'Tipo de alerta' })
  type: 'expiring_plan' | 'unit_limit_exceeded';

  @ApiProperty({ example: 'Tenants con plan por vencer en 7 días', description: 'Título de la alerta' })
  title: string;

  @ApiProperty({ example: 3, description: 'Cantidad de tenants afectados' })
  count: number;

  @ApiProperty({ example: 'Ver detalles', description: 'Texto del botón de acción' })
  actionText: string;

  @ApiProperty({ type: [AlertTenantDto], description: 'Lista de tenants afectados' })
  tenants: AlertTenantDto[];
}

export class AlertsDto {
  @ApiProperty({ type: [AlertDto], description: 'Lista de alertas' })
  alerts: AlertDto[];
}

export class TenantListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Condominio Las Flores' })
  name: string;

  @ApiProperty({ example: 'lasflores.vekino.site' })
  subdomain: string;

  @ApiProperty({ example: 'activo', enum: ['activo', 'suspendido'] })
  status: string;

  @ApiProperty({ example: 'PREMIUM', enum: ['BASICO', 'PRO', 'ENTERPRISE'] })
  plan: SubscriptionPlan;

  @ApiProperty({ example: { used: 120, limit: 150 }, description: 'Uso de unidades' })
  usage: { used: number; limit: number | null };

  @ApiProperty({ example: 'Bogotá' })
  city: string | null;

  @ApiProperty({ example: 'Colombia' })
  country: string | null;

  @ApiProperty({ example: '2025-12-31T00:00:00.000Z' })
  planExpiresAt: Date | null;

  @ApiProperty({ example: '2025-01-05T00:00:00.000Z' })
  lastAccess: Date | null;
}

export class TenantsListDto {
  @ApiProperty({ type: [TenantListItemDto] })
  data: TenantListItemDto[];

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class MonthlyCreationDto {
  @ApiProperty({ example: '2024-07' })
  month: string;

  @ApiProperty({ example: 5 })
  count: number;
}

export class CondominiosByMonthDto {
  @ApiProperty({ type: [MonthlyCreationDto] })
  data: MonthlyCreationDto[];
}

export class PlanDistributionDto {
  @ApiProperty({ example: 'BASICO' })
  plan: SubscriptionPlan;

  @ApiProperty({ example: 25 })
  count: number;

  @ApiProperty({ example: 55.6 })
  percentage: number;
}

export class PlanDistributionResponseDto {
  @ApiProperty({ type: [PlanDistributionDto] })
  distribution: PlanDistributionDto[];
}

export class MonthlyMRRDto {
  @ApiProperty({ example: '2024-07' })
  month: string;

  @ApiProperty({ example: 100000 })
  mrr: number;
}

export class MRRGrowthDto {
  @ApiProperty({ type: [MonthlyMRRDto] })
  data: MonthlyMRRDto[];
}

export class CityDistributionDto {
  @ApiProperty({ example: 'Bogotá' })
  city: string;

  @ApiProperty({ example: 18 })
  count: number;

  @ApiProperty({ example: 40.0 })
  percentage: number;
}

export class CityDistributionResponseDto {
  @ApiProperty({ type: [CityDistributionDto] })
  distribution: CityDistributionDto[];
}

