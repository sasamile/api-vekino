import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdatePlanPricingDto {
  @ApiPropertyOptional({
    example: 50000,
    description: 'Precio mensual en pesos colombianos',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({
    example: 540000,
    description: 'Precio anual en pesos colombianos',
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
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

