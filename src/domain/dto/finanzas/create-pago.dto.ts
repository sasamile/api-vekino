import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetodoPago {
  WOMPI = 'WOMPI',
  EFECTIVO = 'EFECTIVO',
}

export class CreatePagoDto {
  @ApiProperty({
    description: 'ID de la factura a pagar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  facturaId: string;

  @ApiPropertyOptional({
    description: 'Método de pago',
    enum: MetodoPago,
    default: MetodoPago.WOMPI,
  })
  @IsEnum(MetodoPago)
  @IsOptional()
  metodoPago?: MetodoPago = MetodoPago.WOMPI;

  @ApiPropertyOptional({
    description: 'Observaciones del pago',
  })
  @IsOptional()
  observaciones?: string;
}

