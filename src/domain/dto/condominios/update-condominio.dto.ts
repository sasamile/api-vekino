import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsArray,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  subdomain?: string; // Subdominio único para acceso (frontend y backend usan el mismo)

  @IsString()
  @IsOptional()
  logo?: string; // URL del logo (se genera automáticamente al subir imagen)

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

  @ValidateIf((o) => o.unitLimit !== undefined && o.unitLimit !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitLimit?: number;

  @IsDateString()
  @IsOptional()
  planExpiresAt?: string;

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
  activeModules?: string[];

  // Estado
  @Transform(({ value }) => {
    // Manejar diferentes formatos de entrada (string desde form-data o boolean)
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0 || value === '') return false;
    // Si no es un valor reconocido, retornar el valor original
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Para suspender/activar el servicio
}

