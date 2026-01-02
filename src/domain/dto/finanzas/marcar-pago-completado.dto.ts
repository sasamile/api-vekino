import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarcarPagoCompletadoDto {
  @ApiPropertyOptional({
    description: 'Observaciones sobre el pago completado',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

