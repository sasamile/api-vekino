import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservaDto {
  @ApiProperty({
    description: 'ID del espacio común a reservar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  espacioComunId: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad relacionada (opcional, para casas con espacios para eventos)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la reserva',
    example: '2025-01-15T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de la reserva',
    example: '2025-01-15T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @ApiPropertyOptional({
    description: 'Cantidad de personas',
    example: 30,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  cantidadPersonas?: number;

  @ApiPropertyOptional({
    description: 'Motivo de la reserva',
    example: 'Celebración de cumpleaños',
  })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales',
    example: 'Necesitamos mesas y sillas',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

