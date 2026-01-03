import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TipoReaccion {
  LIKE = 'LIKE',      // 👍
  LOVE = 'LOVE',      // ❤️
  LAUGH = 'LAUGH',    // 😂
  WOW = 'WOW',        // 😮
  SAD = 'SAD',        // 😢
  ANGRY = 'ANGRY',    // 😠
}

export class CreateReactionDto {
  @ApiProperty({
    description: 'Tipo de reacción',
    enum: TipoReaccion,
    example: TipoReaccion.LIKE,
  })
  @IsEnum(TipoReaccion)
  tipo: TipoReaccion;
}



