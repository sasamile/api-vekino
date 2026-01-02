import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiPropertyOptional({ example: '¿Alguien sabe si habrá mantenimiento en la piscina esta semana?' })
  titulo?: string;

  @ApiProperty({ example: 'Hola vecinos, quería saber si alguien tiene información...' })
  contenido: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  unidadId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  imagen?: string;

  @ApiProperty({ example: true })
  activo: boolean;

  @ApiProperty({ example: '2025-05-20T14:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-05-20T14:30:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Información del usuario que creó el post',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Carlos Mendoza',
      email: 'carlos@example.com',
      image: 'https://example.com/avatar.jpg',
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
    description: 'Número de comentarios del post',
    example: 3,
  })
  comentariosCount?: number;

  @ApiPropertyOptional({
    description: 'Número de likes del post',
    example: 8,
  })
  likesCount?: number;

  @ApiPropertyOptional({
    description: 'Si el usuario actual dio like al post',
    example: false,
  })
  userLiked?: boolean;
}

