import { PartialType } from '@nestjs/swagger';
import { CreateTicketDto } from './create-ticket.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoTicket {
  ABIERTO = 'ABIERTO',
  EN_PROGRESO = 'EN_PROGRESO',
  RESUELTO = 'RESUELTO',
  CERRADO = 'CERRADO',
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({
    enum: EstadoTicket,
    description: 'Estado del ticket (solo ADMIN puede cambiar)',
    example: EstadoTicket.EN_PROGRESO,
  })
  @IsEnum(EstadoTicket)
  @IsOptional()
  estado?: EstadoTicket;

  @ApiPropertyOptional({
    description: 'ID del usuario ADMIN asignado al ticket',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  asignadoA?: string;
}

