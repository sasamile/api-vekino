import { ApiProperty } from '@nestjs/swagger';
import { TipoReporte, FormatoReporte } from './generar-reporte.dto';

export class ReporteResponseDto {
  @ApiProperty({ description: 'Tipo de reporte generado', enum: TipoReporte })
  tipoReporte: TipoReporte;

  @ApiProperty({ description: 'Formato del reporte', enum: FormatoReporte })
  formato: FormatoReporte;

  @ApiProperty({ description: 'Datos del reporte' })
  datos: any[];

  @ApiProperty({ description: 'Total de registros' })
  total: number;

  @ApiProperty({ description: 'Resumen del reporte' })
  resumen: {
    totalFacturado?: number;
    totalRecaudado?: number;
    totalPagos?: number;
    totalFacturas?: number;
    unidadesIncluidas?: number;
    usuariosIncluidos?: number;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Fecha de generación del reporte' })
  fechaGeneracion: string;

  @ApiProperty({ description: 'Período del reporte' })
  periodo: string;

  @ApiProperty({ description: 'Filtros aplicados' })
  filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    periodo?: string;
    unidadId?: string;
    userId?: string;
    estados?: string[];
  };
}

export class ReporteCSVResponseDto {
  @ApiProperty({ description: 'Contenido CSV del reporte' })
  contenido: string;

  @ApiProperty({ description: 'Nombre del archivo sugerido' })
  nombreArchivo: string;

  @ApiProperty({ description: 'Tipo MIME del archivo' })
  contentType: string;
}

