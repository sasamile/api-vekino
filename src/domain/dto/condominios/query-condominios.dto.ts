import { IsOptional, IsInt, Min, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from './create-condominio.dto';

export class QueryCondominiosDto {
  @ApiPropertyOptional({
    description: 'Número de página (empezando en 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Buscar por nombre del condominio',
    example: 'las flores',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo',
    example: true,
  })
  @Transform(({ value }) => {
    // Manejar diferentes formatos de entrada
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0 || value === '') return false;
    // Si no es un valor reconocido, retornar undefined para que sea opcional
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por plan de suscripción',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.BASICO,
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Filtrar por ciudad',
    example: 'Bogotá',
  })
  @IsString()
  @IsOptional()
  city?: string;
}

