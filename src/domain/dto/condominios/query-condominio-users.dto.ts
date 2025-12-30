import { IsOptional, IsInt, Min, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CondominioUserRole } from './create-condominio-user.dto';

export class QueryCondominioUsersDto {
  @ApiPropertyOptional({
    description: 'Número de página (empezando en 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Buscar por nombre, email o número de documento',
    example: 'juan',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por rol del usuario',
    enum: CondominioUserRole,
    example: CondominioUserRole.PROPIETARIO,
  })
  @IsEnum(CondominioUserRole)
  @IsOptional()
  role?: CondominioUserRole;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

