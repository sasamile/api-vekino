import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
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

  @IsEnum(CondominioUserRole)
  @IsOptional()
  role?: CondominioUserRole;
}

