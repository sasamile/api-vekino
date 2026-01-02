import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostCommentDto {
  @ApiProperty({
    description: 'Contenido del comentario',
    example: 'Sí, el mantenimiento está programado para el jueves',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;
}

