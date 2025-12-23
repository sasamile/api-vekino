import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CondominioUserRole {
  ADMIN = 'ADMIN',
  PROPIETARIO = 'PROPIETARIO',
  ARRENDATARIO = 'ARRENDATARIO',
  RESIDENTE = 'RESIDENTE',
}

export class CreateCondominioUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Rol del usuario en el condominio',
    enum: CondominioUserRole,
    example: CondominioUserRole.ADMIN,
  })
  @IsEnum(CondominioUserRole)
  role: CondominioUserRole;

  @ApiPropertyOptional({
    description: 'Primer nombre (requerido para PROPIETARIO, ARRENDATARIO, RESIDENTE)',
    example: 'Juan',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido (requerido para PROPIETARIO, ARRENDATARIO, RESIDENTE)',
    example: 'Pérez',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento de identidad',
    example: 'CC',
  })
  @IsString()
  @IsOptional()
  tipoDocumento?: string;

  @ApiPropertyOptional({
    description: 'Número de documento de identidad',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono',
    example: '+57 300 123 4567',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad asociada al usuario',
    example: 'uuid',
  })
  @IsString()
  @IsOptional()
  unidadId?: string;
}


