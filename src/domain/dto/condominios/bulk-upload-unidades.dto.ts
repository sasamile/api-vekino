import { IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUnidadDto } from './create-unidad.dto';

export class BulkUploadUnidadesDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateUnidadDto)
  unidades: CreateUnidadDto[];
}

