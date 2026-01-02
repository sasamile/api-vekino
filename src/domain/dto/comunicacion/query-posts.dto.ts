import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPostsDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar solo posts activos',
    example: true,
    default: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

