import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'Título del post',
    example: '¿Alguien sabe si habrá mantenimiento en la piscina esta semana?',
  })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiProperty({
    description: 'Contenido del post',
    example: 'Hola vecinos, quería saber si alguien tiene información sobre el mantenimiento de la piscina esta semana...',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiPropertyOptional({
    description: 'URL de imagen adjunta',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsOptional()
  imagen?: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad relacionada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;
}

