import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CondominioResponseDto {
  @ApiProperty({
    description: 'ID único del condominio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del condominio',
    example: 'Condominio Las Flores',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'NIT / Identificación Tributaria',
    example: '900123456-7',
  })
  nit?: string;

  @ApiPropertyOptional({
    description: 'Dirección física del condominio',
    example: 'Calle 123 #45-67',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'Ciudad donde se encuentra el condominio',
    example: 'Bogotá',
  })
  city?: string;

  @ApiPropertyOptional({
    description: 'País donde se encuentra el condominio',
    example: 'Colombia',
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'Subdominio único para acceso (frontend y backend usan el mismo subdominio)',
    example: 'condominio-las-flores',
  })
  subdomain?: string;

  @ApiPropertyOptional({
    description: 'URL del logo del condominio',
    example: 'https://example.com/logo.png',
  })
  logo?: string;

  @ApiPropertyOptional({
    description: 'Color principal en formato hexadecimal',
    example: '#3B82F6',
  })
  primaryColor?: string;

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

export class CondominioListResponseDto {
  @ApiProperty({
    description: 'Lista de condominios',
    type: [CondominioResponseDto],
  })
  data: CondominioResponseDto[];

  @ApiProperty({
    description: 'Número total de condominios',
    example: 10,
  })
  total: number;
}

