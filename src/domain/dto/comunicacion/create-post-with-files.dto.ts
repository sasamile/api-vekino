import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoArchivo {
  IMAGEN = 'IMAGEN',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENTO = 'DOCUMENTO',
}

export class AttachmentDto {
  @ApiProperty({ description: 'Tipo de archivo', enum: TipoArchivo })
  tipo: TipoArchivo;

  @ApiProperty({ description: 'URL del archivo almacenado' })
  url: string;

  @ApiPropertyOptional({ description: 'Nombre original del archivo' })
  nombre?: string;

  @ApiPropertyOptional({ description: 'Tamaño en bytes' })
  tamaño?: number;

  @ApiPropertyOptional({ description: 'Tipo MIME del archivo' })
  mimeType?: string;

  @ApiPropertyOptional({ description: 'URL del thumbnail (para videos)' })
  thumbnailUrl?: string;
}

export class CreatePostWithFilesDto {
  @ApiPropertyOptional({ description: 'Título del post' })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiProperty({ description: 'Contenido del post' })
  @IsString()
  contenido: string;

  @ApiPropertyOptional({ description: 'ID de la unidad relacionada' })
  @IsString()
  @IsOptional()
  unidadId?: string;

  @ApiPropertyOptional({
    description: 'Archivos adjuntos (imágenes, videos, audio, documentos)',
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

