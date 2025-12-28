import { IsEmail, IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginCondominioUserDto {
  @ApiPropertyOptional({
    description: 'ID del condominio (opcional, se detecta del subdominio si no se proporciona)',
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  condominioId?: string; // Opcional: se puede detectar del subdominio

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'nspes2022@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

