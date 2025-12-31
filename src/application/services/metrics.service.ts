import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosRepository } from '../../infrastructure/repositories/condominios.repository';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { CondominiosService } from './condominios.service';
import { UnidadesRepository } from '../../infrastructure/repositories/unidades.repository';
import {
  MetricsOverviewDto,
  AlertsDto,
  AlertDto,
  AlertTenantDto,
  TenantListItemDto,
  TenantsListDto,
  CondominiosByMonthDto,
  PlanDistributionResponseDto,
  MRRGrowthDto,
  CityDistributionResponseDto,
} from '../../domain/dto/metrics/metrics-response.dto';
import { SubscriptionPlan } from '../../domain/dto/condominios/create-condominio.dto';
import { PlanPricingService } from './plan-pricing.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly condominiosRepository: CondominiosRepository,
    private readonly databaseManager: DatabaseManagerService,
    private readonly condominiosService: CondominiosService,
    private readonly unidadesRepository: UnidadesRepository,
    private readonly planPricingService: PlanPricingService,
  ) {}

  /**
   * Obtiene el resumen general de métricas
   */
  async getMetricsOverview(): Promise<MetricsOverviewDto> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener todos los condominios
    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000, // Obtener todos
    });

    const condominios = allCondominios.data;

    // Calcular métricas
    const activeTenants = condominios.filter((c) => c.isActive).length;
    const suspendedTenants = condominios.filter((c) => !c.isActive).length;

    // Condominios con plan por vencer en 7 días
    const expiringSoon = condominios.filter((c) => {
      if (!c.planExpiresAt || !c.isActive) return false;
      const expiresAt = new Date(c.planExpiresAt);
      return expiresAt <= sevenDaysFromNow && expiresAt > now;
    }).length;

    // Calcular MRR (Monthly Recurring Revenue) usando precios desde BD
    const planPrices = await this.planPricingService.getActivePricesMap();
    const mrr = condominios
      .filter((c) => c.isActive && c.subscriptionPlan)
      .reduce((total, c) => {
        const planPrice = planPrices[c.subscriptionPlan as SubscriptionPlan] || 0;
        return total + planPrice;
      }, 0);

    // Churn: condominios desactivados este mes
    const churn = condominios.filter((c) => {
      if (c.isActive) return false;
      const updatedAt = new Date(c.updatedAt);
      return updatedAt >= startOfMonth;
    }).length;

    // Requieren atención: expiring soon + excedieron límite
    const requiresAttention = expiringSoon; // Se puede agregar lógica adicional

    return {
      activeTenants,
      suspendedTenants,
      expiringSoon,
      requiresAttention,
      mrr,
      churn,
    };
  }

  /**
   * Obtiene las alertas y riesgos
   */
  async getAlerts(): Promise<AlertsDto> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000,
    });

    const condominios = allCondominios.data;

    // Alertas de planes por vencer
    const expiringCondominios = condominios.filter((c) => {
      if (!c.planExpiresAt || !c.isActive) return false;
      const expiresAt = new Date(c.planExpiresAt);
      return expiresAt <= sevenDaysFromNow && expiresAt > now;
    });

    // Alertas de límite de unidades excedido
    const exceededLimitCondominios = await this.getCondominiosExceedingUnitLimit(
      condominios,
    );

    const alerts: AlertDto[] = [];

    if (expiringCondominios.length > 0) {
      // Enriquecer con información adicional
      const expiringTenants: AlertTenantDto[] = await Promise.all(
        expiringCondominios.map(async (c) => ({
          id: c.id,
          name: c.name,
          subdomain: c.subdomain
            ? `${c.subdomain}.vekino.site`
            : null,
          planExpiresAt: c.planExpiresAt,
          usage: null,
        })),
      );

      alerts.push({
        type: 'expiring_plan' as const,
        title: 'Tenants con plan por vencer en 7 días',
        count: expiringCondominios.length,
        actionText: 'Ver detalles',
        tenants: expiringTenants,
      });
    }

    if (exceededLimitCondominios.length > 0) {
      // Enriquecer con información de uso
      const exceededTenants: AlertTenantDto[] = await Promise.all(
        exceededLimitCondominios.map(async (c) => {
          const usage = await this.getUnitUsage(c.id);
          return {
            id: c.id,
            name: c.name,
            subdomain: c.subdomain
              ? `${c.subdomain}.vekino.site`
              : null,
            planExpiresAt: c.planExpiresAt,
            usage,
          };
        }),
      );

      alerts.push({
        type: 'unit_limit_exceeded' as const,
        title: 'Tenants excedieron límite de unidades',
        count: exceededLimitCondominios.length,
        actionText: 'Ver detalles',
        tenants: exceededTenants,
      });
    }

    return { alerts };
  }

  /**
   * Obtiene el listado de tenants con filtros
   */
  async getTenantsList(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'activo' | 'suspendido';
    plan?: SubscriptionPlan;
    city?: string;
  }): Promise<TenantsListDto> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Construir filtros para el repositorio
    const repositoryFilters: any = {
      page,
      limit,
    };

    if (filters.search) {
      repositoryFilters.search = filters.search;
    }

    if (filters.status === 'activo') {
      repositoryFilters.isActive = true;
    } else if (filters.status === 'suspendido') {
      repositoryFilters.isActive = false;
    }

    if (filters.plan) {
      repositoryFilters.subscriptionPlan = filters.plan;
    }

    if (filters.city) {
      repositoryFilters.city = filters.city;
    }

    const result = await this.condominiosRepository.findAllWithPagination(
      repositoryFilters,
    );

    // Enriquecer con datos adicionales (uso de unidades, último acceso)
    const enrichedData = await Promise.all(
      result.data.map(async (condominio) => {
        const usage = await this.getUnitUsage(condominio.id);
        const lastAccess = await this.getLastAccess(condominio.id);

        return {
          id: condominio.id,
          name: condominio.name,
          subdomain: condominio.subdomain
            ? `${condominio.subdomain}.vekino.site`
            : null,
          status: condominio.isActive ? 'activo' : 'suspendido',
          plan: condominio.subscriptionPlan || 'BASICO',
          usage,
          city: condominio.city,
          country: condominio.country,
          planExpiresAt: condominio.planExpiresAt,
          lastAccess,
        } as TenantListItemDto;
      }),
    );

    return {
      data: enrichedData,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Obtiene condominios creados por mes (últimos 6 meses)
   */
  async getCondominiosByMonth(): Promise<CondominiosByMonthDto> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000,
    });

    // Agrupar por mes
    const monthlyData: Record<string, number> = {};

    allCondominios.data.forEach((c) => {
      const createdAt = new Date(c.createdAt);
      const year = createdAt.getFullYear();
      const month = createdAt.getMonth() + 1; // getMonth() retorna 0-11
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Generar todos los meses de los últimos 6 meses (incluyendo el mes actual)
    const months: string[] = [];
    const monthsSet = new Set<string>();
    
    for (let i = 5; i >= 0; i--) {
      let year = currentYear;
      let month = currentMonth - i;
      
      // Ajustar año si el mes es negativo
      while (month < 0) {
        year -= 1;
        month += 12;
      }
      
      // Ajustar año si el mes es mayor a 11
      while (month > 11) {
        year += 1;
        month -= 12;
      }
      
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Solo agregar si no está duplicado
      if (!monthsSet.has(monthKey)) {
        monthsSet.add(monthKey);
        months.push(monthKey);
      }
    }

    // Ordenar los meses para asegurar orden cronológico
    const sortedMonths = months.sort();

    const data = sortedMonths.map((month) => ({
      month,
      count: monthlyData[month] || 0,
    }));

    return { data };
  }

  /**
   * Obtiene la distribución por plan
   */
  async getPlanDistribution(): Promise<PlanDistributionResponseDto> {
    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000,
    });

    const activeCondominios = allCondominios.data.filter((c) => c.isActive);

    const distribution: Record<string, number> = {
      BASICO: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    activeCondominios.forEach((c) => {
      const plan = (c.subscriptionPlan || 'BASICO') as SubscriptionPlan;
      distribution[plan] = (distribution[plan] || 0) + 1;
    });

    const total = activeCondominios.length;

    const result = Object.entries(distribution).map(([plan, count]) => ({
      plan: plan as SubscriptionPlan,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }));

    return { distribution: result };
  }

  /**
   * Obtiene el crecimiento de MRR por mes (últimos 6 meses)
   */
  async getMRRGrowth(): Promise<MRRGrowthDto> {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000,
    });

    // Generar todos los meses de los últimos 6 meses
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
    }

    const monthlyMRR: Record<string, number> = {};

    months.forEach((month) => {
      monthlyMRR[month] = 0;
    });

    // Obtener precios desde BD
    const planPrices = await this.planPricingService.getActivePricesMap();

    // Calcular MRR para cada mes basado en condominios activos en ese momento
    // Nota: Esto es una aproximación. Para un cálculo más preciso, necesitarías
    // un historial de cambios de estado y planes.
    allCondominios.data.forEach((c) => {
      const createdAt = new Date(c.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

      // Si el condominio está activo y fue creado antes o durante el mes
      if (c.isActive && createdAt <= now) {
        const planPrice =
          planPrices[(c.subscriptionPlan || 'BASICO') as SubscriptionPlan] || 0;

        // Agregar MRR a todos los meses desde su creación
        months.forEach((m) => {
          if (m >= monthKey) {
            monthlyMRR[m] = (monthlyMRR[m] || 0) + planPrice;
          }
        });
      }
    });

    const data = months.map((month) => ({
      month,
      mrr: monthlyMRR[month] || 0,
    }));

    return { data };
  }

  /**
   * Obtiene la distribución por ciudad
   */
  async getCityDistribution(): Promise<CityDistributionResponseDto> {
    const allCondominios = await this.condominiosRepository.findAllWithPagination({
      limit: 10000,
    });

    const activeCondominios = allCondominios.data.filter((c) => c.isActive && c.city);

    const distribution: Record<string, number> = {};

    activeCondominios.forEach((c) => {
      const city = c.city || 'Otras';
      distribution[city] = (distribution[city] || 0) + 1;
    });

    const total = activeCondominios.length;

    const result = Object.entries(distribution)
      .map(([city, count]) => ({
        city,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { distribution: result };
  }

  /**
   * Obtiene el uso de unidades de un condominio
   */
  private async getUnitUsage(condominioId: string): Promise<{
    used: number;
    limit: number | null;
  }> {
    try {
      const condominio = await this.condominiosService.findOne(condominioId);
      const condominioPrisma =
        await this.condominiosService.getPrismaClientForCondominio(condominioId);

      const totalUnidades = await this.unidadesRepository.count(condominioPrisma);

      return {
        used: totalUnidades,
        limit: condominio.unitLimit,
      };
    } catch (error) {
      console.error(`Error obteniendo uso de unidades para ${condominioId}:`, error);
      return { used: 0, limit: null };
    }
  }

  /**
   * Obtiene el último acceso de un condominio (última sesión de cualquier usuario)
   */
  private async getLastAccess(condominioId: string): Promise<Date | null> {
    try {
      const condominioPrisma =
        await this.condominiosService.getPrismaClientForCondominio(condominioId);

      // Obtener la última sesión creada o actualizada
      const lastSession = await condominioPrisma.session.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      return lastSession?.updatedAt || null;
    } catch (error) {
      console.error(`Error obteniendo último acceso para ${condominioId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene condominios que excedieron el límite de unidades
   */
  private async getCondominiosExceedingUnitLimit(
    condominios: any[],
  ): Promise<any[]> {
    const exceeded: any[] = [];

    for (const condominio of condominios) {
      if (!condominio.isActive || !condominio.unitLimit) continue;

      try {
        const usage = await this.getUnitUsage(condominio.id);
        if (usage.used > usage.limit!) {
          exceeded.push(condominio);
        }
      } catch (error) {
        // Ignorar errores al obtener uso
        console.error(
          `Error verificando límite para ${condominio.id}:`,
          error,
        );
      }
    }

    return exceeded;
  }
}

