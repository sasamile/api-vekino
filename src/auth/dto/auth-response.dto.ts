import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'admin@vekino.com',
  })
  email: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'SUPERADMIN',
    enum: ['SUPERADMIN', 'ADMIN', 'USER', 'TENANT'],
  })
  role: string;
}

export class SessionResponseDto {
  @ApiProperty({
    description: 'Token de sesión',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Fecha de expiración de la sesión',
    example: '2024-12-31T23:59:59.000Z',
  })
  expiresAt: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Información del usuario autenticado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Información de la sesión',
    type: SessionResponseDto,
  })
  session: SessionResponseDto;
}

