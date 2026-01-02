import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoTicket } from './update-ticket.dto';

export class TicketResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Problema con iluminación' })
  titulo: string;

  @ApiProperty({ example: 'La luz del pasillo central está intermitente...' })
  descripcion: string;

  @ApiProperty({ enum: EstadoTicket, example: EstadoTicket.EN_PROGRESO })
  estado: EstadoTicket;

  @ApiPropertyOptional({ example: 'Iluminación' })
  categoria?: string;

  @ApiPropertyOptional({ example: 'MEDIA' })
  prioridad?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  unidadId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  asignadoA?: string;

  @ApiPropertyOptional({ example: '2025-05-20T16:00:00.000Z' })
  fechaResolucion?: string;

  @ApiProperty({ example: '2025-05-20T14:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-05-20T14:30:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Información del usuario que creó el ticket',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Juan Pérez',
      email: 'juan@example.com',
    },
  })
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };

  @ApiPropertyOptional({
    description: 'Información de la unidad relacionada',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      identificador: 'Casa 89',
    },
  })
  unidad?: {
    id: string;
    identificador: string;
  };

  @ApiPropertyOptional({
    description: 'Número de comentarios del ticket',
    example: 3,
  })
  comentariosCount?: number;
}

