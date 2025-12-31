import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../condominios/create-condominio.dto';

export class PlanPricingResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.BASICO })
  plan: SubscriptionPlan;

  @ApiProperty({ example: 50000, description: 'Precio mensual en pesos colombianos' })
  monthlyPrice: number;

  @ApiPropertyOptional({ example: 540000, description: 'Precio anual en pesos colombianos' })
  yearlyPrice?: number | null;

  @ApiPropertyOptional({ example: 'Plan básico con funcionalidades esenciales' })
  description?: string | null;

  @ApiPropertyOptional({ 
    example: ['Gestión de unidades', 'Reservas básicas'],
    description: 'Características del plan'
  })
  features?: string[] | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

