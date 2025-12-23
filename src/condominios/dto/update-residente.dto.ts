import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoDocumento, RolResidente } from './create-residente.dto';

export class UpdateResidenteDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  apellidos?: string;

  @IsEnum(TipoDocumento)
  @IsOptional()
  tipoDocumento?: TipoDocumento;

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^[0-9]+$/, {
    message: 'El teléfono solo puede contener números',
  })
  telefono?: string;

  @IsEnum(RolResidente)
  @IsOptional()
  rol?: RolResidente;

  @IsString()
  @IsOptional()
  unidadId?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;

  @IsBoolean()
  @IsOptional()
  permitirAccesoPlataforma?: boolean;
}

