import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsUrl,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { SubscriptionPlan, Timezone } from './create-condominio.dto';

export class UpdateCondominioDto {
  // Información Institucional
  @IsString()
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsString()
  @IsOptional()
  nit?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEnum(Timezone)
  @IsOptional()
  timezone?: Timezone;

  // Configuración de Acceso y Dominio
  @IsString()
  @IsOptional()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El subdominio solo puede contener letras minúsculas, números y guiones',
  })
  subdomain?: string;

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'El logo debe ser una URL válida' })
  logo?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #3B82F6)',
  })
  primaryColor?: string;

  // Límites y Plan
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  subscriptionPlan?: SubscriptionPlan;

  @IsInt()
  @IsOptional()
  @Min(1)
  unitLimit?: number;

  @IsDateString()
  @IsOptional()
  planExpiresAt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activeModules?: string[];

  // Estado
  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Para suspender/activar el servicio
}

