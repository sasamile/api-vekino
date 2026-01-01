import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUnidadesWithResidentesDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de usuario (activo/inactivo)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  userActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por identificador de unidad (utilidad)',
    example: 'Apto 801',
  })
  @IsOptional()
  @IsString()
  identificador?: string;

  @ApiPropertyOptional({
    description: 'Buscar por nombre de usuario',
    example: 'Juan Pérez',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Buscar por número de documento',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  numeroDocumento?: string;
}

