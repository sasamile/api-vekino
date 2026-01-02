import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoEspacio {
  SALON_SOCIAL = 'SALON_SOCIAL',
  ZONA_BBQ = 'ZONA_BBQ',
  SAUNA = 'SAUNA',
  CASA_EVENTOS = 'CASA_EVENTOS',
  GIMNASIO = 'GIMNASIO',
  PISCINA = 'PISCINA',
  CANCHA_DEPORTIVA = 'CANCHA_DEPORTIVA',
  PARQUEADERO = 'PARQUEADERO',
  OTRO = 'OTRO',
}

export enum UnidadTiempoReserva {
  HORAS = 'HORAS',
  DIAS = 'DIAS',
  MESES = 'MESES',
}

export class CreateEspacioComunDto {
  @ApiProperty({
    description: 'Nombre del espacio común',
    example: 'Salón Social',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    enum: TipoEspacio,
    description: 'Tipo de espacio común',
    example: TipoEspacio.SALON_SOCIAL,
  })
  @IsEnum(TipoEspacio)
  @IsNotEmpty()
  tipo: TipoEspacio;

  @ApiProperty({
    description: 'Capacidad máxima de personas',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  capacidad: number;

  @ApiPropertyOptional({
    description: 'Descripción del espacio',
    example: 'Salón para eventos sociales con capacidad para 50 personas',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    enum: UnidadTiempoReserva,
    description: 'Unidad de tiempo para las reservas',
    example: UnidadTiempoReserva.HORAS,
  })
  @IsEnum(UnidadTiempoReserva)
  @IsNotEmpty()
  unidadTiempo: UnidadTiempoReserva;

  @ApiPropertyOptional({
    description: 'Precio por unidad de tiempo (opcional)',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  precioPorUnidad?: number;

  @ApiPropertyOptional({
    description: 'Si el espacio está activo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activo?: boolean;

  @ApiPropertyOptional({
    description: 'URL de la imagen del espacio',
    example: 'https://s3.amazonaws.com/bucket/salon-social.jpg',
  })
  @IsString()
  @IsOptional()
  imagen?: string;

  @ApiPropertyOptional({
    description: 'Horarios de disponibilidad en formato JSON. Ejemplo: [{"dia": 1, "horaInicio": "09:00", "horaFin": "22:00"}]',
    example: '[{"dia": 1, "horaInicio": "09:00", "horaFin": "22:00"}, {"dia": 2, "horaInicio": "09:00", "horaFin": "22:00"}]',
  })
  @IsString()
  @IsOptional()
  horariosDisponibilidad?: string;

  @ApiPropertyOptional({
    description: 'Si requiere aprobación de ADMIN',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  requiereAprobacion?: boolean;
}

