import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Título del ticket',
    example: 'Problema con iluminación',
  })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({
    description: 'Descripción detallada del problema o solicitud',
    example: 'La luz del pasillo central está intermitente desde hace 2 días',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({
    description: 'Categoría del ticket',
    example: 'Iluminación',
  })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Prioridad del ticket',
    enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'],
    example: 'MEDIA',
    default: 'MEDIA',
  })
  @IsEnum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'])
  @IsOptional()
  prioridad?: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad relacionada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;
}

