import { IsOptional, IsString, IsEnum, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoFactura } from './factura-response.dto';

export class QueryFacturasDto {
  @ApiPropertyOptional({
    description: 'ID de la unidad para filtrar facturas',
  })
  @IsUUID()
  @IsOptional()
  unidadId?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario para filtrar facturas',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Período de facturación (YYYY-MM)',
    example: '2026-01',
  })
  @IsString()
  @IsOptional()
  periodo?: string;

  @ApiPropertyOptional({
    description: 'Estado de la factura',
    enum: EstadoFactura,
  })
  @IsEnum(EstadoFactura)
  @IsOptional()
  estado?: EstadoFactura;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento desde',
  })
  @IsDateString()
  @IsOptional()
  fechaVencimientoDesde?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento hasta',
  })
  @IsDateString()
  @IsOptional()
  fechaVencimientoHasta?: string;

  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    default: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}

