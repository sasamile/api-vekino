import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiPropertyOptional({
    description: 'Si el post está activo o eliminado',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

