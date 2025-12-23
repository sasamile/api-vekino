import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ResidentesService } from './residentes.service';
import { CreateResidenteDto } from './dto/create-residente.dto';
import { UpdateResidenteDto } from './dto/update-residente.dto';
import { SearchResidentesDto } from './dto/search-residentes.dto';
import {
  RequireRole,
  RequireCondominioAccess,
  RoleGuard,
} from '../guards/require-role.guard';
import { Subdomain } from '../decorators/subdomain.decorator';
import { CondominiosService } from './condominios.service';

@Controller('residentes')
@UseGuards(RoleGuard)
@RequireRole(['SUPERADMIN', 'ADMIN'])
@RequireCondominioAccess()
export class ResidentesController {
  constructor(
    private readonly residentesService: ResidentesService,
    private readonly condominiosService: CondominiosService,
  ) {}

  private async getCondominioIdFromSubdomain(
    subdomain: string | null,
  ): Promise<string> {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    const condominio = await this.condominiosService.findCondominioBySubdomain(
      subdomain,
    );
    return condominio.id;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Subdomain() subdomain: string | null,
    @Body() createResidenteDto: CreateResidenteDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.createResidente(
      condominioId,
      createResidenteDto,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Subdomain() subdomain: string | null,
    @Query() searchDto: SearchResidentesDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.searchResidentes(condominioId, searchDto);
  }

  @Get(':residenteId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Subdomain() subdomain: string | null,
    @Param('residenteId') residenteId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.getResidente(condominioId, residenteId);
  }

  @Put(':residenteId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Subdomain() subdomain: string | null,
    @Param('residenteId') residenteId: string,
    @Body() updateResidenteDto: UpdateResidenteDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.updateResidente(
      condominioId,
      residenteId,
      updateResidenteDto,
    );
  }

  @Patch(':residenteId')
  @HttpCode(HttpStatus.OK)
  async patch(
    @Subdomain() subdomain: string | null,
    @Param('residenteId') residenteId: string,
    @Body() updateResidenteDto: UpdateResidenteDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.updateResidente(
      condominioId,
      residenteId,
      updateResidenteDto,
    );
  }

  @Post(':residenteId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Subdomain() subdomain: string | null,
    @Param('residenteId') residenteId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.deactivateResidente(condominioId, residenteId);
  }

  @Delete(':residenteId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Subdomain() subdomain: string | null,
    @Param('residenteId') residenteId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.residentesService.deleteResidente(condominioId, residenteId);
  }
}

