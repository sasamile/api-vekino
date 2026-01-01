import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoUnidad, EstadoUnidad } from './create-unidad.dto';

export class QueryUnidadesDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por identificador de unidad (búsqueda parcial)',
    example: 'Apto 801',
  })
  @IsOptional()
  @IsString()
  identificador?: string;

  @ApiPropertyOptional({
    enum: TipoUnidad,
    description: 'Filtrar por tipo de unidad',
    example: TipoUnidad.APARTAMENTO,
  })
  @IsOptional()
  @IsEnum(TipoUnidad)
  tipo?: TipoUnidad;

  @ApiPropertyOptional({
    enum: EstadoUnidad,
    description: 'Filtrar por estado de unidad',
    example: EstadoUnidad.OCUPADA,
  })
  @IsOptional()
  @IsEnum(EstadoUnidad)
  estado?: EstadoUnidad;
}

