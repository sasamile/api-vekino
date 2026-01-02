import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { EstadoReserva } from './update-reserva.dto';
import { TipoEspacio } from './create-espacio-comun.dto';

export class QueryReservasDto {
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
    enum: EstadoReserva,
    description: 'Filtrar por estado de reserva',
    example: EstadoReserva.PENDIENTE,
  })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de espacio común',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  espacioComunId?: string;

  @ApiPropertyOptional({
    enum: TipoEspacio,
    description: 'Filtrar por tipo de espacio',
    example: TipoEspacio.SALON_SOCIAL,
  })
  @IsOptional()
  @IsEnum(TipoEspacio)
  tipoEspacio?: TipoEspacio;

  @ApiPropertyOptional({
    description: 'Filtrar por fecha de inicio (desde)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por fecha de fin (hasta)',
    example: '2025-01-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    description: 'Solo mis reservas (para usuarios no admin)',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  soloMias?: boolean;
}

