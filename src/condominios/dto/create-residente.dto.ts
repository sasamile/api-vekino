import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum TipoDocumento {
  CC = 'CC',
  CE = 'CE',
  PASAPORTE = 'PASAPORTE',
  NIT = 'NIT',
  OTRO = 'OTRO',
}

export enum RolResidente {
  PROPIETARIO = 'PROPIETARIO',
  ARRENDATARIO = 'ARRENDATARIO',
  RESIDENTE = 'RESIDENTE',
}

export class CreateResidenteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  apellidos: string;

  @IsEnum(TipoDocumento)
  @IsNotEmpty()
  tipoDocumento: TipoDocumento;

  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^[0-9]+$/, {
    message: 'El teléfono solo puede contener números',
  })
  telefono?: string;

  @IsEnum(RolResidente)
  @IsNotEmpty()
  rol: RolResidente;

  @IsString()
  @IsNotEmpty()
  unidadId: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;

  @IsBoolean()
  @IsOptional()
  permitirAccesoPlataforma?: boolean;
}

