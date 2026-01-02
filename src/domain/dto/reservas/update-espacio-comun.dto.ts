import { PartialType } from '@nestjs/swagger';
import { CreateEspacioComunDto } from './create-espacio-comun.dto';

export class UpdateEspacioComunDto extends PartialType(CreateEspacioComunDto) {}

