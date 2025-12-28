import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsEmail,
  IsArray,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionPlan {
  BASICO = 'BASICO',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum Timezone {
  AMERICA_BOGOTA = 'AMERICA_BOGOTA',
  AMERICA_MEXICO_CITY = 'AMERICA_MEXICO_CITY',
  AMERICA_LIMA = 'AMERICA_LIMA',
  AMERICA_SANTIAGO = 'AMERICA_SANTIAGO',
  AMERICA_BUENOS_AIRES = 'AMERICA_BUENOS_AIRES',
  AMERICA_CARACAS = 'AMERICA_CARACAS',
  AMERICA_MONTEVIDEO = 'AMERICA_MONTEVIDEO',
  AMERICA_ASUNCION = 'AMERICA_ASUNCION',
  AMERICA_LA_PAZ = 'AMERICA_LA_PAZ',
  AMERICA_QUITO = 'AMERICA_QUITO',
  AMERICA_GUAYAQUIL = 'AMERICA_GUAYAQUIL',
  AMERICA_PANAMA = 'AMERICA_PANAMA',
  AMERICA_MANAGUA = 'AMERICA_MANAGUA',
  AMERICA_SAN_JOSE = 'AMERICA_SAN_JOSE',
  AMERICA_TEGUCIGALPA = 'AMERICA_TEGUCIGALPA',
  AMERICA_GUATEMALA = 'AMERICA_GUATEMALA',
  AMERICA_SANTO_DOMINGO = 'AMERICA_SANTO_DOMINGO',
  AMERICA_HAVANA = 'AMERICA_HAVANA',
  UTC = 'UTC',
}

export class CreateCondominioDto {
  // Información Institucional
  @ApiProperty({
    description: 'Nombre del condominio',
    example: 'Condominio Las Flores',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    description: 'NIT / Identificación Tributaria',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  nit?: string; // NIT / Identificación Tributaria

  @ApiPropertyOptional({
    description: 'Dirección física del condominio',
    example: 'Calle 123 #45-67',
  })
  @IsString()
  @IsOptional()
  address?: string; // Dirección física

  @ApiPropertyOptional({
    description: 'Ciudad donde se encuentra el condominio',
    example: 'Bogotá',
  })
  @IsString()
  @IsOptional()
  city?: string; // Ciudad

  @ApiPropertyOptional({
    description: 'País donde se encuentra el condominio',
    example: 'Colombia',
  })
  @IsString()
  @IsOptional()
  country?: string; // País

  @ApiPropertyOptional({
    description: 'Zona horaria del condominio',
    enum: Timezone,
    example: Timezone.AMERICA_BOGOTA,
  })
  @IsEnum(Timezone)
  @IsOptional()
  timezone?: Timezone; // Zona horaria

  // Configuración de Acceso y Dominio
  @ApiPropertyOptional({
    description: 'Subdominio único para acceso (frontend y backend usan el mismo subdominio). Si no se proporciona, se genera automáticamente desde el nombre. Solo letras minúsculas, números y guiones',
    example: 'condominio-las-flores',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El subdominio solo puede contener letras minúsculas, números y guiones',
  })
  subdomain?: string; // Subdominio único para acceso (frontend y backend usan el mismo)

  @ApiPropertyOptional({
    description: 'URL del logo (se genera automáticamente al subir imagen)',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logo?: string; // URL del logo (se genera automáticamente al subir imagen)

  @ApiPropertyOptional({
    description: 'Color principal en formato hexadecimal',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #3B82F6)',
  })
  primaryColor?: string; // Color principal (hex)

  // Límites y Plan
  @ApiPropertyOptional({
    description: 'Plan de suscripción del condominio',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.BASICO,
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Límite de unidades permitidas',
    example: 100,
    minimum: 1,
  })
  @ValidateIf((o) => o.unitLimit !== undefined && o.unitLimit !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitLimit?: number; // Límite de unidades

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento del plan (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  planExpiresAt?: string; // Fecha de vencimiento del plan

  @ApiPropertyOptional({
    description: 'Módulos activos del condominio (debe enviarse como string JSON en form-data)',
    example: ['reservas', 'documentos', 'pqrs'],
    type: [String],
  })
  @ValidateIf((o) => o.activeModules !== undefined && o.activeModules !== null)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  activeModules?: string[]; // Módulos activos: ["reservas", "documentos", "pqrs"]

  // Campos técnicos (opcionales, se generan automáticamente)
  @ApiPropertyOptional({
    description: 'Nombre de la base de datos (opcional, se genera automáticamente desde el nombre)',
    example: 'condominio_las_flores',
  })
  @IsString()
  @IsOptional()
  databaseName?: string; // Opcional: se genera automáticamente desde el nombre
}
