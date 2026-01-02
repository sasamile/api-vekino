import { IsString, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFacturaDto } from './create-factura.dto';

export class BulkCreateFacturasDto {
  @ApiProperty({
    description: 'Período de facturación en formato YYYY-MM (ej: "2026-01" para enero 2026)',
    example: '2026-01',
  })
  @IsString()
  periodo: string;

  @ApiProperty({
    description: 'Fecha de vencimiento de las facturas',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  fechaVencimiento: string;

  @ApiPropertyOptional({
    description: 'Array de facturas específicas a crear. Si no se proporciona, se crean facturas para todas las unidades activas.',
    type: [CreateFacturaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacturaDto)
  @IsOptional()
  facturas?: CreateFacturaDto[];

  @ApiPropertyOptional({
    description: 'Si es true, envía las facturas automáticamente a los usuarios',
    default: false,
  })
  @IsOptional()
  enviarFacturas?: boolean;
}

