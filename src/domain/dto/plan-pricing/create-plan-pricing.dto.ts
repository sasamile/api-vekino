import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../condominios/create-condominio.dto';
import { Transform } from 'class-transformer';

export class CreatePlanPricingDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.BASICO,
    description: 'Tipo de plan',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    example: 50000,
    description: 'Precio mensual en pesos colombianos',
  })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiPropertyOptional({
    example: 540000,
    description: 'Precio anual en pesos colombianos (opcional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({
    example: 'Plan básico con funcionalidades esenciales',
    description: 'Descripción del plan',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['Gestión de unidades', 'Reservas básicas'],
    description: 'Características del plan (array de strings)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Si el plan está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

