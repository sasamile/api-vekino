import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketCommentDto {
  @ApiProperty({
    description: 'Contenido del comentario',
    example: 'He revisado el problema y enviaré un técnico mañana',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiPropertyOptional({
    description: 'Si el comentario es interno (solo visible para ADMIN)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  esInterno?: boolean;
}

