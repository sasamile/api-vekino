import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoUnidad, EstadoUnidad } from './create-unidad.dto';

export class UpdateUnidadDto {
  @IsString()
  @IsOptional()
  identificador?: string;

  @IsEnum(TipoUnidad)
  @IsOptional()
  tipo?: TipoUnidad;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  area?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  coeficienteCopropiedad?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  valorCuotaAdministracion?: number;

  @IsEnum(EstadoUnidad)
  @IsOptional()
  estado?: EstadoUnidad;
}

