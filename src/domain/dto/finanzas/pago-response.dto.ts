import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PROCESANDO = 'PROCESANDO',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
}

export enum MetodoPago {
  WOMPI = 'WOMPI',
  EFECTIVO = 'EFECTIVO',
}

export class PagoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facturaId: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  valor: number;

  @ApiProperty({ enum: MetodoPago })
  metodoPago: MetodoPago;

  @ApiProperty({ enum: EstadoPago })
  estado: EstadoPago;

  @ApiPropertyOptional()
  wompiTransactionId?: string;

  @ApiPropertyOptional()
  wompiReference?: string;

  @ApiPropertyOptional()
  wompiPaymentLink?: string;

  @ApiPropertyOptional()
  fechaPago?: Date;

  @ApiPropertyOptional()
  observaciones?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  factura?: {
    id: string;
    numeroFactura: string;
    valor: number;
    estado: string;
  };
}

