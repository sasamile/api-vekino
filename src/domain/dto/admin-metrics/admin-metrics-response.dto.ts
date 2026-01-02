import { ApiProperty } from '@nestjs/swagger';

// ========== Dashboard Overview ==========
export class DashboardOverviewDto {
  @ApiProperty({ description: 'Total de unidades en el condominio' })
  totalUnidades: number;

  @ApiProperty({ description: 'Unidades ocupadas' })
  unidadesOcupadas: number;

  @ApiProperty({ description: 'Unidades vacías' })
  unidadesVacias: number;

  @ApiProperty({ description: 'Reservas activas (confirmadas y pendientes)' })
  reservasActivas: number;

  @ApiProperty({ description: 'Porcentaje de recaudo mensual (0-100)' })
  recaudoMensual: number;

  @ApiProperty({ description: 'Total facturado en el mes actual' })
  totalFacturadoMes: number;

  @ApiProperty({ description: 'Total recaudado en el mes actual' })
  totalRecaudadoMes: number;

  @ApiProperty({ description: 'Cantidad de facturas pendientes de pago (no pagadas)' })
  pagosPendientes: number;

  @ApiProperty({ description: 'Cantidad de facturas vencidas' })
  facturasVencidas: number;

  @ApiProperty({ description: 'Cantidad de unidades con morosidad' })
  unidadesMorosas: number;
}

// ========== Estados de Cuenta ==========
export class EstadosCuentaDto {
  @ApiProperty({ description: 'Unidades con pagos al día' })
  pagosAlDia: number;

  @ApiProperty({ description: 'Unidades con pagos pendientes' })
  pagosPendientes: number;

  @ApiProperty({ description: 'Unidades en morosidad (facturas vencidas)' })
  morosidad: number;

  @ApiProperty({ description: 'Total de unidades con facturas' })
  totalUnidadesConFacturas: number;
}

// ========== Actividad Reciente ==========
export enum TipoActividad {
  PAGO_PROCESADO = 'PAGO_PROCESADO',
  NUEVA_RESERVA = 'NUEVA_RESERVA',
  FACTURA_CREADA = 'FACTURA_CREADA',
  FACTURA_VENCIDA = 'FACTURA_VENCIDA',
  RESERVA_CANCELADA = 'RESERVA_CANCELADA',
}

export class ActividadRecienteDto {
  @ApiProperty({ description: 'ID de la actividad' })
  id: string;

  @ApiProperty({ description: 'Tipo de actividad', enum: TipoActividad })
  tipo: TipoActividad;

  @ApiProperty({ description: 'Título completo de la actividad (incluye toda la información)' })
  titulo: string;

  @ApiProperty({ description: 'Fecha de la actividad' })
  fecha: string;

  @ApiProperty({ description: 'Información adicional (JSON)' })
  metadata?: any;
}

export class ActividadRecienteResponseDto {
  @ApiProperty({ description: 'Lista de actividades recientes', type: [ActividadRecienteDto] })
  actividades: ActividadRecienteDto[];

  @ApiProperty({ description: 'Total de actividades' })
  total: number;
}

// ========== Gráficas de Recaudo ==========
export class RecaudoMensualDataDto {
  @ApiProperty({ description: 'Mes (formato: YYYY-MM)' })
  mes: string;

  @ApiProperty({ description: 'Total facturado en el mes' })
  facturado: number;

  @ApiProperty({ description: 'Total recaudado en el mes' })
  recaudado: number;

  @ApiProperty({ description: 'Porcentaje de recaudo (0-100)' })
  porcentajeRecaudo: number;

  @ApiProperty({ description: 'Cantidad de facturas emitidas' })
  facturasEmitidas: number;

  @ApiProperty({ description: 'Cantidad de facturas pagadas' })
  facturasPagadas: number;
}

export class RecaudoMensualResponseDto {
  @ApiProperty({ description: 'Datos de recaudo por mes', type: [RecaudoMensualDataDto] })
  datos: RecaudoMensualDataDto[];

  @ApiProperty({ description: 'Promedio de recaudo mensual (%)' })
  promedioRecaudo: number;
}

// ========== Gráficas de Pagos por Estado ==========
export class PagosPorEstadoDto {
  @ApiProperty({ description: 'Estado del pago' })
  estado: string;

  @ApiProperty({ description: 'Cantidad de pagos' })
  cantidad: number;

  @ApiProperty({ description: 'Valor total de los pagos' })
  valorTotal: number;

  @ApiProperty({ description: 'Porcentaje del total (%)' })
  porcentaje: number;
}

export class PagosPorEstadoResponseDto {
  @ApiProperty({ description: 'Distribución de pagos por estado', type: [PagosPorEstadoDto] })
  distribucion: PagosPorEstadoDto[];

  @ApiProperty({ description: 'Total de pagos' })
  totalPagos: number;

  @ApiProperty({ description: 'Valor total de todos los pagos' })
  valorTotal: number;
}

// ========== Gráficas de Reservas ==========
export class ReservasPorEstadoDto {
  @ApiProperty({ description: 'Estado de la reserva' })
  estado: string;

  @ApiProperty({ description: 'Cantidad de reservas' })
  cantidad: number;

  @ApiProperty({ description: 'Porcentaje del total (%)' })
  porcentaje: number;
}

export class ReservasPorMesDto {
  @ApiProperty({ description: 'Mes (formato: YYYY-MM)' })
  mes: string;

  @ApiProperty({ description: 'Cantidad de reservas' })
  cantidad: number;

  @ApiProperty({ description: 'Reservas confirmadas' })
  confirmadas: number;

  @ApiProperty({ description: 'Reservas canceladas' })
  canceladas: number;
}

export class ReservasGraficasResponseDto {
  @ApiProperty({ description: 'Distribución de reservas por estado', type: [ReservasPorEstadoDto] })
  porEstado: ReservasPorEstadoDto[];

  @ApiProperty({ description: 'Reservas por mes', type: [ReservasPorMesDto] })
  porMes: ReservasPorMesDto[];

  @ApiProperty({ description: 'Total de reservas' })
  totalReservas: number;
}

// ========== Top Unidades por Recaudo ==========
export class TopUnidadRecaudoDto {
  @ApiProperty({ description: 'ID de la unidad' })
  unidadId: string;

  @ApiProperty({ description: 'Identificador de la unidad (ej: Casa 127)' })
  identificador: string;

  @ApiProperty({ description: 'Total recaudado' })
  totalRecaudado: number;

  @ApiProperty({ description: 'Cantidad de pagos completados' })
  pagosCompletados: number;

  @ApiProperty({ description: 'Porcentaje de cumplimiento (%)' })
  porcentajeCumplimiento: number;
}

export class TopUnidadesRecaudoResponseDto {
  @ApiProperty({ description: 'Top unidades por recaudo', type: [TopUnidadRecaudoDto] })
  unidades: TopUnidadRecaudoDto[];

  @ApiProperty({ description: 'Período analizado' })
  periodo: string;
}

// ========== Reporte Completo ==========
export class ReporteCompletoDto {
  @ApiProperty({ description: 'Resumen del dashboard', type: DashboardOverviewDto })
  resumen: DashboardOverviewDto;

  @ApiProperty({ description: 'Estados de cuenta', type: EstadosCuentaDto })
  estadosCuenta: EstadosCuentaDto;

  @ApiProperty({ description: 'Actividad reciente', type: ActividadRecienteResponseDto })
  actividadReciente: ActividadRecienteResponseDto;

  @ApiProperty({ description: 'Recaudo mensual', type: RecaudoMensualResponseDto })
  recaudoMensual: RecaudoMensualResponseDto;

  @ApiProperty({ description: 'Pagos por estado', type: PagosPorEstadoResponseDto })
  pagosPorEstado: PagosPorEstadoResponseDto;

  @ApiProperty({ description: 'Gráficas de reservas', type: ReservasGraficasResponseDto })
  reservas: ReservasGraficasResponseDto;

  @ApiProperty({ description: 'Top unidades por recaudo', type: TopUnidadesRecaudoResponseDto })
  topUnidades: TopUnidadesRecaudoResponseDto;

  @ApiProperty({ description: 'Fecha de generación del reporte' })
  fechaGeneracion: string;

  @ApiProperty({ description: 'Período del reporte' })
  periodo: string;
}

// ========== Query DTOs ==========
export class QueryActividadRecienteDto {
  @ApiProperty({ description: 'Cantidad de actividades a retornar', required: false, default: 10 })
  limit?: number = 10;

  @ApiProperty({ description: 'Tipos de actividad a filtrar', required: false, enum: TipoActividad, isArray: true })
  tipos?: TipoActividad[];
}

export class QueryRecaudoMensualDto {
  @ApiProperty({ description: 'Cantidad de meses a retornar', required: false, default: 6 })
  meses?: number = 6;
}

export class QueryReporteDto {
  @ApiProperty({ description: 'Mes inicial (formato: YYYY-MM)', required: false })
  mesInicio?: string;

  @ApiProperty({ description: 'Mes final (formato: YYYY-MM)', required: false })
  mesFin?: string;

  @ApiProperty({ description: 'Incluir gráficas detalladas', required: false, default: true })
  incluirGraficas?: boolean = true;
}

// ========== Métricas Adicionales ==========
export class MetricasAdicionalesDto {
  @ApiProperty({ description: 'Tasa de ocupación (%)' })
  tasaOcupacion: number;

  @ApiProperty({ description: 'Tiempo promedio de pago (en días)' })
  tiempoPromedioPago: number;

  @ApiProperty({ description: 'Facturas próximas a vencer (próximos 7 días)' })
  facturasProximasVencer: number;

  @ApiProperty({ description: 'Valor total de facturas pendientes (COP)' })
  valorFacturasPendientes: number;

  @ApiProperty({ description: 'Valor total de facturas vencidas (COP)' })
  valorFacturasVencidas: number;
}

export class UnidadActivaReservaDto {
  @ApiProperty({ description: 'ID de la unidad' })
  unidadId: string;

  @ApiProperty({ description: 'Identificador de la unidad' })
  identificador: string;

  @ApiProperty({ description: 'Total de reservas' })
  totalReservas: number;

  @ApiProperty({ description: 'Reservas confirmadas' })
  reservasConfirmadas: number;
}

export class UnidadesActivasReservasResponseDto {
  @ApiProperty({ description: 'Unidades más activas en reservas', type: [UnidadActivaReservaDto] })
  unidades: UnidadActivaReservaDto[];
}

export class ReservaPorEspacioDto {
  @ApiProperty({ description: 'ID del espacio común' })
  espacioId: string;

  @ApiProperty({ description: 'Nombre del espacio común' })
  espacioNombre: string;

  @ApiProperty({ description: 'Total de reservas' })
  totalReservas: number;

  @ApiProperty({ description: 'Reservas confirmadas' })
  reservasConfirmadas: number;

  @ApiProperty({ description: 'Reservas canceladas' })
  reservasCanceladas: number;
}

export class ReservasPorEspacioResponseDto {
  @ApiProperty({ description: 'Reservas por espacio común', type: [ReservaPorEspacioDto] })
  espacios: ReservaPorEspacioDto[];
}

export class FacturacionPorTipoDto {
  @ApiProperty({ description: 'Tipo de unidad' })
  tipo: string;

  @ApiProperty({ description: 'Total facturado' })
  totalFacturado: number;

  @ApiProperty({ description: 'Total recaudado' })
  totalRecaudado: number;

  @ApiProperty({ description: 'Cantidad de unidades' })
  unidades: number;

  @ApiProperty({ description: 'Porcentaje de recaudo (%)' })
  porcentajeRecaudo: number;
}

export class FacturacionPorTipoResponseDto {
  @ApiProperty({ description: 'Facturación por tipo de unidad', type: [FacturacionPorTipoDto] })
  tipos: FacturacionPorTipoDto[];
}

export class ComparacionMensualDto {
  @ApiProperty({ description: 'Datos del mes actual' })
  mesActual: {
    mes: string;
    totalFacturado: number;
    totalRecaudado: number;
    facturasEmitidas: number;
    facturasPagadas: number;
  };

  @ApiProperty({ description: 'Datos del mes anterior' })
  mesAnterior: {
    mes: string;
    totalFacturado: number;
    totalRecaudado: number;
    facturasEmitidas: number;
    facturasPagadas: number;
  };

  @ApiProperty({ description: 'Variación en facturación (%)' })
  variacionFacturado: number;

  @ApiProperty({ description: 'Variación en recaudo (%)' })
  variacionRecaudado: number;

  @ApiProperty({ description: 'Variación en porcentaje de recaudo (%)' })
  variacionPorcentajeRecaudo: number;
}

