import { Injectable } from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { AdminMetricsRepository } from '../../infrastructure/repositories/admin-metrics.repository';
import {
  DashboardOverviewDto,
  EstadosCuentaDto,
  ActividadRecienteResponseDto,
  RecaudoMensualResponseDto,
  PagosPorEstadoResponseDto,
  ReservasGraficasResponseDto,
  TopUnidadesRecaudoResponseDto,
  ReporteCompletoDto,
  QueryActividadRecienteDto,
  QueryRecaudoMensualDto,
  QueryReporteDto,
} from '../../domain/dto/admin-metrics/admin-metrics-response.dto';

@Injectable()
export class AdminMetricsService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly adminMetricsRepository: AdminMetricsRepository,
  ) {}

  /**
   * Obtiene el resumen del dashboard
   */
  async getDashboardOverview(
    condominioId: string,
  ): Promise<DashboardOverviewDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const [
      totalUnidades,
      unidadesPorEstado,
      reservasActivas,
      recaudoMensual,
      pagosPendientes,
      facturasVencidas,
      unidadesMorosas,
    ] = await Promise.all([
      this.adminMetricsRepository.getTotalUnidades(condominioPrisma),
      this.adminMetricsRepository.getUnidadesPorEstado(condominioPrisma),
      this.adminMetricsRepository.getReservasActivas(condominioPrisma),
      this.adminMetricsRepository.getRecaudoMensual(condominioPrisma),
      this.adminMetricsRepository.getPagosPendientes(condominioPrisma),
      this.adminMetricsRepository.getFacturasVencidas(condominioPrisma),
      this.adminMetricsRepository.getUnidadesMorosas(condominioPrisma),
    ]);

    const unidadesOcupadas =
      unidadesPorEstado.find((u) => u.estado === 'OCUPADA')?.count || 0;
    const unidadesVacias =
      unidadesPorEstado.find((u) => u.estado === 'VACIA')?.count || 0;

    const porcentajeRecaudo =
      recaudoMensual.totalFacturado > 0
        ? (recaudoMensual.totalRecaudado / recaudoMensual.totalFacturado) * 100
        : 0;

    return {
      totalUnidades,
      unidadesOcupadas,
      unidadesVacias,
      reservasActivas,
      recaudoMensual: Math.round(porcentajeRecaudo * 100) / 100, // Redondear a 2 decimales
      totalFacturadoMes: recaudoMensual.totalFacturado,
      totalRecaudadoMes: recaudoMensual.totalRecaudado,
      pagosPendientes,
      facturasVencidas,
      unidadesMorosas,
    };
  }

  /**
   * Obtiene estados de cuenta
   */
  async getEstadosCuenta(condominioId: string): Promise<EstadosCuentaDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return this.adminMetricsRepository.getEstadosCuenta(condominioPrisma);
  }

  /**
   * Obtiene actividad reciente
   */
  async getActividadReciente(
    condominioId: string,
    query: QueryActividadRecienteDto,
  ): Promise<ActividadRecienteResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const actividades = await this.adminMetricsRepository.getActividadReciente(
      condominioPrisma,
      query.limit || 10,
      query.tipos,
    );

    return {
      actividades: actividades.map((act) => ({
        id: act.id,
        tipo: act.tipo,
        titulo: act.titulo,
        descripcion: act.descripcion,
        fecha: act.fecha instanceof Date ? act.fecha.toISOString() : act.fecha,
        metadata: act.metadata,
      })),
      total: actividades.length,
    };
  }

  /**
   * Obtiene recaudo mensual con gráficas
   */
  async getRecaudoMensual(
    condominioId: string,
    query: QueryRecaudoMensualDto,
  ): Promise<RecaudoMensualResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const datos = await this.adminMetricsRepository.getRecaudoPorMeses(
      condominioPrisma,
      query.meses || 6,
    );

    const datosConPorcentaje = datos.map((d) => ({
      ...d,
      porcentajeRecaudo:
        d.facturado > 0 ? (d.recaudado / d.facturado) * 100 : 0,
    }));

    const promedioRecaudo =
      datosConPorcentaje.length > 0
        ? datosConPorcentaje.reduce(
            (sum, d) => sum + d.porcentajeRecaudo,
            0,
          ) / datosConPorcentaje.length
        : 0;

    return {
      datos: datosConPorcentaje.map((d) => ({
        mes: d.mes,
        facturado: d.facturado,
        recaudado: d.recaudado,
        porcentajeRecaudo: Math.round(d.porcentajeRecaudo * 100) / 100,
        facturasEmitidas: d.facturasEmitidas,
        facturasPagadas: d.facturasPagadas,
      })),
      promedioRecaudo: Math.round(promedioRecaudo * 100) / 100,
    };
  }

  /**
   * Obtiene distribución de pagos por estado
   */
  async getPagosPorEstado(
    condominioId: string,
  ): Promise<PagosPorEstadoResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return this.adminMetricsRepository.getPagosPorEstado(condominioPrisma);
  }

  /**
   * Obtiene gráficas de reservas
   */
  async getReservasGraficas(
    condominioId: string,
    meses: number = 6,
  ): Promise<ReservasGraficasResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const [porEstado, porMes] = await Promise.all([
      this.adminMetricsRepository.getReservasPorEstado(condominioPrisma),
      this.adminMetricsRepository.getReservasPorMes(condominioPrisma, meses),
    ]);

    const totalReservas = porEstado.reduce(
      (sum, r) => sum + r.cantidad,
      0,
    );

    return {
      porEstado,
      porMes,
      totalReservas,
    };
  }

  /**
   * Obtiene top unidades por recaudo
   */
  async getTopUnidadesRecaudo(
    condominioId: string,
    limit: number = 10,
    periodo?: string,
  ): Promise<TopUnidadesRecaudoResponseDto> {
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const unidades = await this.adminMetricsRepository.getTopUnidadesRecaudo(
      condominioPrisma,
      limit,
      periodo,
    );

    return {
      unidades: unidades.map((u) => ({
        unidadId: u.unidadId,
        identificador: u.identificador,
        totalRecaudado: u.totalRecaudado,
        pagosCompletados: u.pagosCompletados,
        porcentajeCumplimiento: Math.round(u.porcentajeCumplimiento * 100) / 100,
      })),
      periodo: periodo || 'Últimos 3 meses',
    };
  }

  /**
   * Genera reporte completo
   */
  async generarReporte(
    condominioId: string,
    query: QueryReporteDto,
  ): Promise<ReporteCompletoDto> {
    const [
      resumen,
      estadosCuenta,
      actividadReciente,
      recaudoMensual,
      pagosPorEstado,
      reservas,
      topUnidades,
    ] = await Promise.all([
      this.getDashboardOverview(condominioId),
      this.getEstadosCuenta(condominioId),
      this.getActividadReciente(condominioId, { limit: 20 }),
      this.getRecaudoMensual(condominioId, { meses: 6 }),
      this.getPagosPorEstado(condominioId),
      query.incluirGraficas !== false
        ? this.getReservasGraficas(condominioId, 6)
        : Promise.resolve({
            porEstado: [],
            porMes: [],
            totalReservas: 0,
          }),
      query.incluirGraficas !== false
        ? this.getTopUnidadesRecaudo(condominioId, 10)
        : Promise.resolve({
            unidades: [],
            periodo: '',
          }),
    ]);

    const mesActual = new Date().toISOString().slice(0, 7);
    const periodo = query.mesInicio && query.mesFin
      ? `${query.mesInicio} - ${query.mesFin}`
      : `Últimos 6 meses (hasta ${mesActual})`;

    return {
      resumen,
      estadosCuenta,
      actividadReciente,
      recaudoMensual,
      pagosPorEstado,
      reservas,
      topUnidades,
      fechaGeneracion: new Date().toISOString(),
      periodo,
    };
  }
}

