import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WompiWebhookDto {
  @ApiProperty({
    description: 'ID del evento en Wompi',
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'ID de la transacción',
  })
  @IsString()
  data: {
    transaction: {
      id: string;
      status: string;
      amount_in_cents: number;
      currency: string;
      reference: string;
      created_at: string;
      finalized_at?: string;
      status_message?: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Timestamp del evento',
  })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Firma del webhook',
  })
  @IsString()
  @IsOptional()
  signature?: string;
}


