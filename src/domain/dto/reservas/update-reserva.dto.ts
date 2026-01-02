import { PartialType } from '@nestjs/swagger';
import { CreateReservaDto } from './create-reserva.dto';
import { IsEnum, IsOptional } from 'class-validator';
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
}

