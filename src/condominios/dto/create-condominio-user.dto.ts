import { IsString, IsNotEmpty, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';

export enum CondominioUserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  TENANT = 'TENANT',
}

export class CreateCondominioUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(CondominioUserRole)
  role: CondominioUserRole;

  @IsString()
  @IsOptional()
  identificationNumber?: string; // Número de identificación (opcional)
}


