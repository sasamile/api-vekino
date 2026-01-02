import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentDto, TipoArchivo } from './create-post-with-files.dto';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsString()
  @IsNotEmpty()
  destinatarioId: string;

  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiPropertyOptional({
    description: 'Archivos adjuntos al mensaje',
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

