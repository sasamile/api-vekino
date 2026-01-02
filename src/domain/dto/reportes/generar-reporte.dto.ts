import { IsEnum, IsOptional, IsDateString, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoReporte {
  PAGOS = 'PAGOS',
  FACTURAS = 'FACTURAS',
  CLIENTES = 'CLIENTES',
  RESERVAS = 'RESERVAS',
  RECAUDO = 'RECAUDO',
  MOROSIDAD = 'MOROSIDAD',
}

export enum FormatoReporte {
  JSON = 'JSON',
  CSV = 'CSV',
}

export class GenerarReporteDto {
  @ApiProperty({
    description: 'Tipo de reporte a generar',
    enum: TipoReporte,
    example: TipoReporte.PAGOS,
  })
  @IsEnum(TipoReporte)
  tipoReporte: TipoReporte;

  @ApiPropertyOptional({
    description: 'Formato del reporte',
    enum: FormatoReporte,
    default: FormatoReporte.JSON,
  })
  @IsEnum(FormatoReporte)
  @IsOptional()
  formato?: FormatoReporte = FormatoReporte.JSON;

  @ApiPropertyOptional({
    description: 'Fecha inicial del período (formato: YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha final del período (formato: YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @ApiPropertyOptional({
    description: 'Período específico (formato: YYYY-MM)',
    example: '2026-01',
  })
  @IsString()
  @IsOptional()
  periodo?: string;

  @ApiPropertyOptional({
    description: 'ID de unidad para filtrar',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;

  @ApiPropertyOptional({
    description: 'ID de usuario/cliente para filtrar',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Estados a filtrar (depende del tipo de reporte)',
    type: [String],
    example: ['APROBADO', 'PENDIENTE'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  estados?: string[];

  @ApiPropertyOptional({
    description: 'Incluir detalles adicionales',
    default: false,
  })
  @IsOptional()
  incluirDetalles?: boolean = false;
}

