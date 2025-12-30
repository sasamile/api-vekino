import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CondominioUserRole } from './create-condominio-user.dto';

export class UpdateCondominioUserDto {
  @ApiPropertyOptional({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del usuario',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña (mínimo 6 caracteres)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario en el condominio',
    enum: CondominioUserRole,
    example: CondominioUserRole.ADMIN,
  })
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

  @ApiPropertyOptional({
    description: 'Primer nombre',
    example: 'Juan',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido',
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

  @ApiPropertyOptional({
    description: 'Indica si el usuario está activo',
    example: true,
  })
  @Transform(({ value }) => {
    // Manejar diferentes formatos de entrada (string desde form-data o boolean)
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0 || value === '') return false;
    // Si no es un valor reconocido, retornar el valor original
    return value;
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

