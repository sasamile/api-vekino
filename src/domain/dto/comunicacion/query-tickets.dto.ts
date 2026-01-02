import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoTicket } from './update-ticket.dto';

export class QueryTicketsDto {
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
    enum: EstadoTicket,
    description: 'Filtrar por estado del ticket',
    example: EstadoTicket.EN_PROGRESO,
  })
  @IsEnum(EstadoTicket)
  @IsOptional()
  estado?: EstadoTicket;

  @ApiPropertyOptional({
    description: 'Filtrar por categoría',
    example: 'Iluminación',
  })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de unidad',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;
}

