import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoFactura {
  PENDIENTE = 'PENDIENTE',
  ENVIADA = 'ENVIADA',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
}

export class FacturaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numeroFactura: string;

  @ApiProperty()
  unidadId: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  periodo: string;

  @ApiProperty()
  fechaEmision: Date;

  @ApiProperty()
  fechaVencimiento: Date;

  @ApiProperty()
  valor: number;

  @ApiPropertyOptional()
  descripcion?: string;

  @ApiProperty({ enum: EstadoFactura })
  estado: EstadoFactura;

  @ApiPropertyOptional()
  fechaEnvio?: Date;

  @ApiPropertyOptional()
  fechaPago?: Date;

  @ApiPropertyOptional()
  observaciones?: string;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  unidad?: {
    id: string;
    identificador: string;
    tipo: string;
  };

  @ApiPropertyOptional()
  user?: {
    id: string;
    name: string;
    email: string;
  };
}


