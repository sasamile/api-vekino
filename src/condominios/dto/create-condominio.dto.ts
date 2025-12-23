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
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsOptional()
  nit?: string; // NIT / Identificación Tributaria

  @IsString()
  @IsOptional()
  address?: string; // Dirección física

  @IsString()
  @IsOptional()
  city?: string; // Ciudad

  @IsString()
  @IsOptional()
  country?: string; // País

  @IsEnum(Timezone)
  @IsOptional()
  timezone?: Timezone; // Zona horaria

  // Configuración de Acceso y Dominio
  @IsString()
  @IsOptional()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El subdominio solo puede contener letras minúsculas, números y guiones',
  })
  subdomain?: string; // Opcional: se genera automáticamente desde el nombre

  @IsString()
  @IsOptional()
  logo?: string; // URL del logo (se genera automáticamente al subir imagen)

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #3B82F6)',
  })
  primaryColor?: string; // Color principal (hex)

  // Límites y Plan
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @ValidateIf((o) => o.unitLimit !== undefined && o.unitLimit !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitLimit?: number; // Límite de unidades

  @IsDateString()
  @IsOptional()
  planExpiresAt?: string; // Fecha de vencimiento del plan

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
  @IsString()
  @IsOptional()
  databaseName?: string; // Opcional: se genera automáticamente desde el nombre
}
