import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { RolResidente } from './create-residente.dto';

export class SearchResidentesDto {
  @IsString()
  @IsOptional()
  search?: string; // Búsqueda por nombre, número de documento o número de unidad

  @IsEnum(RolResidente)
  @IsOptional()
  rol?: RolResidente;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  estado?: boolean; // true = Activo, false = Inactivo

  @IsOptional()
  @Transform(({ value }) => {
    const page = parseInt(value, 10);
    return isNaN(page) ? 1 : page;
  })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const limit = parseInt(value, 10);
    return isNaN(limit) ? 10 : limit;
  })
  limit?: number;
}

