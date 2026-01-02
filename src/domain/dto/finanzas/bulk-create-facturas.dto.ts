import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCreateFacturasDto {
  @ApiProperty({
    description: 'Período de facturación en formato YYYY-MM (ej: "2026-01" para enero 2026)',
    example: '2026-01',
  })
  @IsString()
  periodo: string;

  @ApiProperty({
    description: 'Fecha de emisión/facturación (cuándo se envía la factura)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  fechaEmision: string;

  @ApiProperty({
    description: 'Fecha límite de pago (fecha de vencimiento)',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  fechaVencimiento: string;

  @ApiPropertyOptional({
    description: 'Si es true, envía las facturas automáticamente a los usuarios',
    default: false,
  })
  @IsOptional()
  enviarFacturas?: boolean;
}

