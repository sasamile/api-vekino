import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEspacio, UnidadTiempoReserva } from './create-espacio-comun.dto';

export class EspacioComunResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Salón Social' })
  nombre: string;

  @ApiProperty({ enum: TipoEspacio, example: TipoEspacio.SALON_SOCIAL })
  tipo: TipoEspacio;

  @ApiProperty({ example: 50 })
  capacidad: number;

  @ApiPropertyOptional({ example: 'Salón para eventos sociales' })
  descripcion?: string | null;

  @ApiProperty({ enum: UnidadTiempoReserva, example: UnidadTiempoReserva.HORAS })
  unidadTiempo: UnidadTiempoReserva;

  @ApiPropertyOptional({ example: 50000 })
  precioPorUnidad?: number | null;

  @ApiProperty({ example: true })
  activo: boolean;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/bucket/salon-social.jpg' })
  imagen?: string | null;

  @ApiPropertyOptional({
    example: '[{"dia": 1, "horaInicio": "09:00", "horaFin": "22:00"}]',
  })
  horariosDisponibilidad?: string | null;

  @ApiProperty({ example: true })
  requiereAprobacion: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

