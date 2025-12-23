import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoUnidad {
  APARTAMENTO = 'APARTAMENTO',
  CASA = 'CASA',
  LOCAL_COMERCIAL = 'LOCAL_COMERCIAL',
}

export enum EstadoUnidad {
  OCUPADA = 'OCUPADA',
  VACIA = 'VACIA',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
}

export class CreateUnidadDto {
  @ApiProperty({
    description: 'Identificador único de la unidad',
    example: 'Apto 102',
  })
  @IsString()
  @IsNotEmpty()
  identificador: string; // Ej: "Casa 127", "Apto 801"

  @ApiProperty({
    description: 'Tipo de unidad',
    enum: TipoUnidad,
    example: TipoUnidad.APARTAMENTO,
  })
  @IsEnum(TipoUnidad)
  @IsNotEmpty()
  tipo: TipoUnidad;

  @ApiPropertyOptional({
    description: 'Área de la unidad en metros cuadrados',
    example: 65.5,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  area?: number; // Área en m²

  @ApiPropertyOptional({
    description: 'Coeficiente de copropiedad en porcentaje',
    example: 2.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  coeficienteCopropiedad?: number; // Coeficiente de copropiedad (%)

  @ApiPropertyOptional({
    description: 'Valor de la cuota de administración',
    example: 150000,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  valorCuotaAdministracion?: number; // Valor de la cuota de administración

  @ApiPropertyOptional({
    description: 'Estado actual de la unidad',
    enum: EstadoUnidad,
    example: EstadoUnidad.VACIA,
  })
  @IsEnum(EstadoUnidad)
  @IsOptional()
  estado?: EstadoUnidad;
}

