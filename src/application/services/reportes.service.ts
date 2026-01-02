import { Injectable } from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { ReportesRepository } from '../../infrastructure/repositories/reportes.repository';
import {
  GenerarReporteDto,
  TipoReporte,
  FormatoReporte,
} from '../../domain/dto/reportes/generar-reporte.dto';
import {
  ReporteResponseDto,
  ReporteCSVResponseDto,
} from '../../domain/dto/reportes/reporte-response.dto';

@Injectable()
export class ReportesService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly reportesRepository: ReportesRepository,
  ) {}

  /**
   * Genera un reporte según el tipo especificado
   */
  async generarReporte(
    condominioId: string,
    dto: GenerarReporteDto,
  ): Promise<ReporteResponseDto | ReporteCSVResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    let resultado: { datos: any[]; resumen: any };

    switch (dto.tipoReporte) {
      case TipoReporte.PAGOS:
        resultado = await this.reportesRepository.generarReportePagos(
          condominioPrisma,
          dto,
        );
        break;
      case TipoReporte.FACTURAS:
        resultado = await this.reportesRepository.generarReporteFacturas(
          condominioPrisma,
          dto,
        );
        break;
      case TipoReporte.CLIENTES:
        resultado = await this.reportesRepository.generarReporteClientes(
          condominioPrisma,
          dto,
        );
        break;
      case TipoReporte.RESERVAS:
        resultado = await this.reportesRepository.generarReporteReservas(
          condominioPrisma,
          dto,
        );
        break;
      case TipoReporte.RECAUDO:
        resultado = await this.reportesRepository.generarReporteRecaudo(
          condominioPrisma,
          dto,
        );
        break;
      case TipoReporte.MOROSIDAD:
        resultado = await this.reportesRepository.generarReporteMorosidad(
          condominioPrisma,
          dto,
        );
        break;
      default:
        throw new Error(`Tipo de reporte no válido: ${dto.tipoReporte}`);
    }

    const periodo = this.obtenerPeriodo(dto);

    if (dto.formato === FormatoReporte.CSV) {
      return this.convertirACSV(resultado.datos, dto.tipoReporte, periodo);
    }

    return {
      tipoReporte: dto.tipoReporte,
      formato: dto.formato || FormatoReporte.JSON,
      datos: resultado.datos,
      total: resultado.datos.length,
      resumen: resultado.resumen,
      fechaGeneracion: new Date().toISOString(),
      periodo,
      filtros: {
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        periodo: dto.periodo,
        unidadId: dto.unidadId,
        userId: dto.userId,
        estados: dto.estados,
      },
    };
  }

  /**
   * Obtiene el período del reporte como string
   */
  private obtenerPeriodo(dto: GenerarReporteDto): string {
    if (dto.periodo) {
      return dto.periodo;
    }
    if (dto.fechaInicio && dto.fechaFin) {
      return `${dto.fechaInicio} - ${dto.fechaFin}`;
    }
    if (dto.fechaInicio) {
      return `Desde ${dto.fechaInicio}`;
    }
    if (dto.fechaFin) {
      return `Hasta ${dto.fechaFin}`;
    }
    return 'Todos los períodos';
  }

  /**
   * Convierte los datos a formato CSV
   */
  private convertirACSV(
    datos: any[],
    tipoReporte: TipoReporte,
    periodo: string,
  ): ReporteCSVResponseDto {
    if (datos.length === 0) {
      return {
        contenido: '',
        nombreArchivo: `reporte-${tipoReporte.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    // Obtener las columnas del primer objeto
    const columnas = Object.keys(datos[0]);
    
    // Crear el header CSV
    const header = columnas.join(',');
    
    // Crear las filas CSV
    const filas = datos.map((fila) => {
      return columnas
        .map((columna) => {
          const valor = fila[columna];
          // Escapar comillas y envolver en comillas si contiene comas o comillas
          if (valor === null || valor === undefined) {
            return '';
          }
          const valorStr = String(valor);
          if (valorStr.includes(',') || valorStr.includes('"') || valorStr.includes('\n')) {
            return `"${valorStr.replace(/"/g, '""')}"`;
          }
          return valorStr;
        })
        .join(',');
    });

    const contenido = [header, ...filas].join('\n');

    // Agregar BOM para UTF-8 (ayuda con Excel)
    const contenidoConBOM = '\uFEFF' + contenido;

    return {
      contenido: contenidoConBOM,
      nombreArchivo: `reporte-${tipoReporte.toLowerCase()}-${periodo.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}

