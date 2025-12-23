import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CondominioUserRole } from './create-condominio-user.dto';

export class CondominioUserResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'juan.perez@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Rol del usuario en el condominio',
    enum: CondominioUserRole,
    example: CondominioUserRole.ADMIN,
  })
  role: CondominioUserRole;

  @ApiPropertyOptional({
    description: 'Primer nombre',
    example: 'Juan',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido',
    example: 'Pérez',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento de identidad',
    example: 'CC',
  })
  tipoDocumento?: string;

  @ApiPropertyOptional({
    description: 'Número de documento de identidad',
    example: '1234567890',
  })
  numeroDocumento?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono',
    example: '+57 300 123 4567',
  })
  telefono?: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad asociada',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  unidadId?: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class CondominioUserListResponseDto {
  @ApiProperty({
    description: 'Lista de usuarios del condominio',
    type: [CondominioUserResponseDto],
  })
  data: CondominioUserResponseDto[];

  @ApiProperty({
    description: 'Número total de usuarios',
    example: 25,
  })
  total: number;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Información del usuario autenticado',
    type: CondominioUserResponseDto,
  })
  user: CondominioUserResponseDto;

  @ApiProperty({
    description: 'Información de la sesión',
    example: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresAt: '2024-12-31T23:59:59.000Z',
    },
  })
  session: {
    token: string;
    expiresAt: string;
  };
}

