import { IsEmail, IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class LoginCondominioUserDto {
  @IsUUID()
  @IsOptional()
  condominioId?: string; // Opcional: se puede detectar del subdominio

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

