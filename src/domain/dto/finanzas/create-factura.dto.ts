import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFacturaDto {
  @ApiProperty({
    description: 'ID de la unidad a la que se le genera la factura',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  unidadId: string;

  @ApiPropertyOptional({
    description: 'ID del usuario responsable del pago (propietario o arrendatario). Si no se especifica, se usa el usuario de la unidad.',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Período de facturación en formato YYYY-MM (ej: "2026-01" para enero 2026)',
    example: '2026-01',
  })
  @IsString()
  periodo: string;

  @ApiProperty({
    description: 'Fecha de vencimiento de la factura',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  fechaVencimiento: string;

  @ApiProperty({
    description: 'Valor de la cuota de administración',
    example: 150000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  valor: number;

  @ApiPropertyOptional({
    description: 'Descripción de la factura',
    example: 'Cuota de administración enero 2026',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}


