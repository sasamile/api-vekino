import { PartialType } from '@nestjs/swagger';
import { CreateReservaDto } from './create-reserva.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoReserva {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
  COMPLETADA = 'COMPLETADA',
}

export class UpdateReservaDto extends PartialType(CreateReservaDto) {
  @ApiPropertyOptional({
    enum: EstadoReserva,
    description: 'Estado de la reserva (solo ADMIN puede cambiar)',
    example: EstadoReserva.CONFIRMADA,
  })
  @IsEnum(EstadoReserva)
  @IsOptional()
  estado?: EstadoReserva;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales (solo ADMIN puede editar)',
    example: 'Por favor dejar todo limpio al finalizar',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

