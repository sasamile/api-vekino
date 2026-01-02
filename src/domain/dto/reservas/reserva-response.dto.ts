import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoReserva } from './update-reserva.dto';
import { EspacioComunResponseDto } from './espacio-comun-response.dto';

export class ReservaResponseDto {
  @ApiProperty({ example: '770e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ type: EspacioComunResponseDto })
  espacioComun: EspacioComunResponseDto;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  espacioComunId: string;

  @ApiProperty({
    example: {
      id: '880e8400-e29b-41d4-a716-446655440000',
      name: 'Juan Pérez',
      email: 'juan@example.com',
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ example: '880e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiPropertyOptional({
    example: {
      id: '990e8400-e29b-41d4-a716-446655440000',
      identificador: 'Apto 801',
    },
  })
  unidad?: {
    id: string;
    identificador: string;
  } | null;

  @ApiPropertyOptional({ example: '990e8400-e29b-41d4-a716-446655440000' })
  unidadId?: string | null;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  fechaInicio: Date;

  @ApiProperty({ example: '2025-01-15T14:00:00.000Z' })
  fechaFin: Date;

  @ApiPropertyOptional({ example: 30 })
  cantidadPersonas?: number | null;

  @ApiProperty({ enum: EstadoReserva, example: EstadoReserva.PENDIENTE })
  estado: EstadoReserva;

  @ApiPropertyOptional({ example: 'Celebración de cumpleaños' })
  motivo?: string | null;

  @ApiPropertyOptional({ example: 'Necesitamos mesas y sillas' })
  observaciones?: string | null;

  @ApiPropertyOptional({ example: 200000 })
  precioTotal?: number | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

