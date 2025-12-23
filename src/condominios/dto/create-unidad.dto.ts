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
  @IsString()
  @IsNotEmpty()
  identificador: string; // Ej: "Casa 127", "Apto 801"

  @IsEnum(TipoUnidad)
  @IsNotEmpty()
  tipo: TipoUnidad;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  area?: number; // Área en m²

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  coeficienteCopropiedad?: number; // Coeficiente de copropiedad (%)

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  valorCuotaAdministracion?: number; // Valor de la cuota de administración

  @IsEnum(EstadoUnidad)
  @IsOptional()
  estado?: EstadoUnidad;
}

