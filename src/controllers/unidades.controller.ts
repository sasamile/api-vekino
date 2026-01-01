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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CreateUnidadDto } from 'src/domain/dto/condominios/create-unidad.dto';
import { UpdateUnidadDto } from 'src/domain/dto/condominios/update-unidad.dto';
import { BulkUploadUnidadesDto } from 'src/domain/dto/condominios/bulk-upload-unidades.dto';
import { QueryUnidadesWithResidentesDto } from 'src/domain/dto/condominios/query-unidades-with-residentes.dto';
import { CondominiosService } from 'src/application/services/condominios.service';
import { UnidadesService } from 'src/application/services/unidades.service';
import { RequireCondominioAccess, RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { swaggerOperations } from 'src/config/swagger/swagger.config';
import { swaggerExamples } from 'src/config/swagger/swagger-examples';

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
    const condominio =
      await this.condominiosService.findCondominioBySubdomain(subdomain);
    return condominio.id;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: swaggerOperations.unidades.create.summary,
    description: swaggerOperations.unidades.create.description,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: swaggerOperations.unidades.create.responses[201].description,
    example: swaggerExamples.unidades.create.success,
  })
  @ApiResponse({
    status: 400,
    description: swaggerOperations.unidades.create.responses[400].description,
    example: swaggerExamples.unidades.create.error,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.create.responses[403].description,
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
    summary: swaggerOperations.unidades.findAllWithResidentes.summary,
    description: swaggerOperations.unidades.findAllWithResidentes.description + ' Incluye filtros opcionales por estado de usuario, identificador de unidad, nombre y número de documento.',
  })
  @ApiQuery({
    name: 'userActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado de usuario (true = activos, false = inactivos)',
    example: true,
  })
  @ApiQuery({
    name: 'identificador',
    required: false,
    type: String,
    description: 'Filtrar por identificador de unidad (utilidad)',
    example: 'Apto 801',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description: 'Buscar por nombre de usuario',
    example: 'Juan Pérez',
  })
  @ApiQuery({
    name: 'numeroDocumento',
    required: false,
    type: String,
    description: 'Buscar por número de documento',
    example: '1234567890',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.findAllWithResidentes.responses[200].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.findAllWithResidentes.responses[403].description,
  })
  async findAllWithResidentes(
    @Subdomain() subdomain: string | null,
    @Query() query: QueryUnidadesWithResidentesDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidadesWithResidentes(condominioId, {
      userActive: query.userActive,
      identificador: query.identificador,
      nombre: query.nombre,
      numeroDocumento: query.numeroDocumento,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: swaggerOperations.unidades.findAll.summary,
    description: swaggerOperations.unidades.findAll.description,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.findAll.responses[200].description,
    example: swaggerExamples.unidades.findAll.success,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.findAll.responses[403].description,
  })
  async findAll(@Subdomain() subdomain: string | null) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.getUnidades(condominioId);
  }

  @Get(':unidadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: swaggerOperations.unidades.findOne.summary,
    description: swaggerOperations.unidades.findOne.description,
  })
  @ApiParam({
    name: 'unidadId',
    description: 'ID único de la unidad',
    example: '93e0ef39-855a-454b-b612-02e70d74e924',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.findOne.responses[200].description,
    example: swaggerExamples.unidades.findOne.success,
  })
  @ApiResponse({
    status: 404,
    description: swaggerOperations.unidades.findOne.responses[404].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.findOne.responses[403].description,
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
  @ApiOperation({
    summary: swaggerOperations.unidades.update.summary,
    description: swaggerOperations.unidades.update.description,
  })
  @ApiParam({
    name: 'unidadId',
    description: 'ID único de la unidad',
    example: '93e0ef39-855a-454b-b612-02e70d74e924',
  })
  @ApiBody({ type: UpdateUnidadDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.update.responses[200].description,
    example: swaggerExamples.unidades.update.success,
  })
  @ApiResponse({
    status: 404,
    description: swaggerOperations.unidades.update.responses[404].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.update.responses[403].description,
  })
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
  @ApiOperation({
    summary: swaggerOperations.unidades.patch.summary,
    description: swaggerOperations.unidades.patch.description,
  })
  @ApiParam({
    name: 'unidadId',
    description: 'ID único de la unidad',
    example: '93e0ef39-855a-454b-b612-02e70d74e924',
  })
  @ApiBody({ type: UpdateUnidadDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.patch.responses[200].description,
    example: swaggerExamples.unidades.update.success,
  })
  @ApiResponse({
    status: 404,
    description: swaggerOperations.unidades.patch.responses[404].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.patch.responses[403].description,
  })
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
  @ApiOperation({
    summary: swaggerOperations.unidades.delete.summary,
    description: swaggerOperations.unidades.delete.description,
  })
  @ApiParam({
    name: 'unidadId',
    description: 'ID único de la unidad a eliminar',
    example: '93e0ef39-855a-454b-b612-02e70d74e924',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.delete.responses[200].description,
    example: swaggerExamples.unidades.delete.success,
  })
  @ApiResponse({
    status: 400,
    description: swaggerOperations.unidades.delete.responses[400].description,
    example: swaggerExamples.unidades.delete.error,
  })
  @ApiResponse({
    status: 404,
    description: swaggerOperations.unidades.delete.responses[404].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.delete.responses[403].description,
  })
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
    summary: swaggerOperations.unidades.bulkUpload.summary,
    description: swaggerOperations.unidades.bulkUpload.description,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.unidades.bulkUpload.responses[200].description,
    example: swaggerExamples.unidades.bulkUpload.success,
  })
  @ApiResponse({
    status: 400,
    description: swaggerOperations.unidades.bulkUpload.responses[400].description,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.unidades.bulkUpload.responses[403].description,
  })
  async bulkUpload(
    @Subdomain() subdomain: string | null,
    @Body() bulkUploadDto: BulkUploadUnidadesDto,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.unidadesService.bulkUploadUnidades(condominioId, bulkUploadDto);
  }
}
