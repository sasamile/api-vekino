import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { ReportesService } from 'src/application/services/reportes.service';
import { RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { GenerarReporteDto } from 'src/domain/dto/reportes/generar-reporte.dto';
import {
  ReporteResponseDto,
  ReporteCSVResponseDto,
} from 'src/domain/dto/reportes/reporte-response.dto';
import { FormatoReporte } from 'src/domain/dto/reportes/generar-reporte.dto';

@ApiTags('reportes')
@Controller('reportes')
@UseGuards(RoleGuard)
@RequireRole('ADMIN')
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('better-auth.session_token')
export class ReportesController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly reportesService: ReportesService,
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

  /**
   * Genera un reporte según el tipo especificado
   */
  @Post('generar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar reporte',
    description:
      'Genera un reporte según el tipo especificado (PAGOS, FACTURAS, CLIENTES, RESERVAS, RECAUDO, MOROSIDAD). Puede devolver JSON o CSV.',
  })
  @ApiBody({ type: GenerarReporteDto })
  @ApiResponse({
    status: 200,
    description: 'Reporte generado exitosamente',
    type: ReporteResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte CSV generado exitosamente',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  @ApiResponse({ status: 400, description: 'Error en los parámetros del reporte' })
  async generarReporte(
    @Subdomain() subdomain: string | null,
    @Body() dto: GenerarReporteDto,
    @Res() res: Response,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const resultado = await this.reportesService.generarReporte(condominioId, dto);

    // Si es CSV, devolver como archivo descargable
    if (dto.formato === FormatoReporte.CSV) {
      const csvResult = resultado as ReporteCSVResponseDto;
      res.setHeader('Content-Type', csvResult.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${csvResult.nombreArchivo}"`,
      );
      return res.send(csvResult.contenido);
    }

    // Si es JSON, devolver como JSON
    return res.json(resultado);
  }
}

