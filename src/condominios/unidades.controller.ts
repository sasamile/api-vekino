import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';
import { BulkUploadUnidadesDto } from './dto/bulk-upload-unidades.dto';
import {
  RequireRole,
  RequireCondominioAccess,
  RoleGuard,
} from '../guards/require-role.guard';
import { Subdomain } from '../decorators/subdomain.decorator';
import { CondominiosService } from './condominios.service';

@Controller('unidades')
@UseGuards(RoleGuard)
@RequireRole(['SUPERADMIN', 'ADMIN'])
@RequireCondominioAccess()
export class UnidadesController {
  constructor(
    private readonly unidadesService: UnidadesService,
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
    @Body() createUnidadDto: CreateUnidadDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.createUnidad(condominioId, createUnidadDto);
  }

  @Get('with-residentes')
  @HttpCode(HttpStatus.OK)
  async findAllWithResidentes(@Subdomain() subdomain: string | null) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidadesWithResidentes(condominioId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Subdomain() subdomain: string | null) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidades(condominioId);
  }

  @Get(':unidadId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Subdomain() subdomain: string | null,
    @Param('unidadId') unidadId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidad(condominioId, unidadId);
  }

  @Put(':unidadId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Subdomain() subdomain: string | null,
    @Param('unidadId') unidadId: string,
    @Body() updateUnidadDto: UpdateUnidadDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.updateUnidad(
      condominioId,
      unidadId,
      updateUnidadDto,
    );
  }

  @Patch(':unidadId')
  @HttpCode(HttpStatus.OK)
  async patch(
    @Subdomain() subdomain: string | null,
    @Param('unidadId') unidadId: string,
    @Body() updateUnidadDto: UpdateUnidadDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.updateUnidad(
      condominioId,
      unidadId,
      updateUnidadDto,
    );
  }

  @Delete(':unidadId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Subdomain() subdomain: string | null,
    @Param('unidadId') unidadId: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.deleteUnidad(condominioId, unidadId);
  }

  @Post('bulk-upload')
  @HttpCode(HttpStatus.OK)
  async bulkUpload(
    @Subdomain() subdomain: string | null,
    @Body() bulkUploadDto: BulkUploadUnidadesDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.bulkUploadUnidades(condominioId, bulkUploadDto);
  }
}

