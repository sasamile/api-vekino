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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
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

@ApiTags('unidades')
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
  @ApiOperation({
    summary: 'Crear una nueva unidad',
    description: 'Crea una nueva unidad en el condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Unidad creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o subdominio no detectado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
  })
  async create(
    @Subdomain() subdomain: string | null,
    @Body() createUnidadDto: CreateUnidadDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.createUnidad(condominioId, createUnidadDto);
  }

  @Get('with-residentes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todas las unidades con residentes',
    description: 'Retorna todas las unidades del condominio incluyendo información de residentes asociados',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades con residentes obtenida exitosamente',
  })
  async findAllWithResidentes(@Subdomain() subdomain: string | null) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidadesWithResidentes(condominioId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todas las unidades',
    description: 'Retorna todas las unidades del condominio detectado del subdominio',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades obtenida exitosamente',
  })
  async findAll(@Subdomain() subdomain: string | null) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidades(condominioId);
  }

  @Get(':unidadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener una unidad por ID',
    description: 'Retorna los detalles de una unidad específica',
  })
  @ApiParam({
    name: 'unidadId',
    description: 'ID de la unidad',
    example: 'uuid',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Unidad obtenida exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Unidad no encontrada',
  })
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
  @ApiOperation({
    summary: 'Cargar múltiples unidades',
    description: 'Crea múltiples unidades en el condominio mediante carga masiva',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Unidades cargadas exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async bulkUpload(
    @Subdomain() subdomain: string | null,
    @Body() bulkUploadDto: BulkUploadUnidadesDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.bulkUploadUnidades(condominioId, bulkUploadDto);
  }
}

