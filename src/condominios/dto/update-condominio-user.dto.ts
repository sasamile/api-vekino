import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CondominioUserRole } from './create-condominio-user.dto';

export class UpdateCondominioUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  // Para form-data, el enum puede venir como string y necesitamos transformarlo
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value;
    }
    return value;
  })
  @IsEnum(CondominioUserRole)
  @IsOptional()
  role?: CondominioUserRole;

  @IsString()
  @IsOptional()
  identificationNumber?: string; // Número de identificación (opcional)
}

