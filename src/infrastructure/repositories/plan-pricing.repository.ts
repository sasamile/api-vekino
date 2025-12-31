import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { SubscriptionPlan } from '../../domain/dto/condominios/create-condominio.dto';

@Injectable()
export class PlanPricingRepository {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  /**
   * Busca un precio de plan por tipo de plan
   */
  async findByPlan(plan: SubscriptionPlan) {
    return this.prisma.planPricing.findUnique({
      where: { plan },
    });
  }

  /**
   * Busca todos los precios de planes
   */
  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.planPricing.findMany({
      where,
      orderBy: [
        { plan: 'asc' },
      ],
    });
  }

  /**
   * Obtiene todos los precios activos como un mapa
   */
  async findAllActiveAsMap(): Promise<Record<SubscriptionPlan, number>> {
    const pricings = await this.prisma.planPricing.findMany({
      where: { isActive: true },
    });

    const map: Record<string, number> = {};
    pricings.forEach((pricing) => {
      map[pricing.plan] = pricing.monthlyPrice;
    });

    // Asegurar que todos los planes tengan un precio (valores por defecto si no existen)
    const defaultPrices: Record<SubscriptionPlan, number> = {
      BASICO: 50000,
      PRO: 100000,
      ENTERPRISE: 200000,
    };

    return {
      BASICO: map.BASICO || defaultPrices.BASICO,
      PRO: map.PRO || defaultPrices.PRO,
      ENTERPRISE: map.ENTERPRISE || defaultPrices.ENTERPRISE,
    } as Record<SubscriptionPlan, number>;
  }

  /**
   * Crea un nuevo precio de plan
   */
  async create(data: {
    plan: SubscriptionPlan;
    monthlyPrice: number;
    yearlyPrice?: number | null;
    description?: string | null;
    features?: string[] | null;
    isActive?: boolean;
  }) {
    return this.prisma.planPricing.create({
      data: {
        ...data,
        features: data.features ? JSON.stringify(data.features) : null,
      },
    });
  }

  /**
   * Actualiza un precio de plan
   */
  async update(plan: SubscriptionPlan, data: {
    monthlyPrice?: number;
    yearlyPrice?: number | null;
    description?: string | null;
    features?: string[] | null;
    isActive?: boolean;
  }) {
    const updateData: any = {};
    
    if (data.monthlyPrice !== undefined) updateData.monthlyPrice = data.monthlyPrice;
    if (data.yearlyPrice !== undefined) updateData.yearlyPrice = data.yearlyPrice;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.features !== undefined) {
      updateData.features = data.features ? JSON.stringify(data.features) : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.planPricing.update({
      where: { plan },
      data: updateData,
    });
  }

  /**
   * Elimina un precio de plan
   */
  async delete(plan: SubscriptionPlan) {
    return this.prisma.planPricing.delete({
      where: { plan },
    });
  }

  /**
   * Verifica si existe un precio para un plan
   */
  async exists(plan: SubscriptionPlan): Promise<boolean> {
    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan },
    });
    return !!pricing;
  }
}

