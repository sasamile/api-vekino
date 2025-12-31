import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PlanPricingRepository } from '../../infrastructure/repositories/plan-pricing.repository';
import { CreatePlanPricingDto } from '../../domain/dto/plan-pricing/create-plan-pricing.dto';
import { UpdatePlanPricingDto } from '../../domain/dto/plan-pricing/update-plan-pricing.dto';
import { PlanPricingResponseDto } from '../../domain/dto/plan-pricing/plan-pricing-response.dto';
import { SubscriptionPlan } from '../../domain/dto/condominios/create-condominio.dto';

@Injectable()
export class PlanPricingService {
  constructor(
    private readonly planPricingRepository: PlanPricingRepository,
  ) {}

  /**
   * Convierte un modelo de Prisma a DTO de respuesta
   */
  private toResponseDto(pricing: any): PlanPricingResponseDto {
    return {
      id: pricing.id,
      plan: pricing.plan,
      monthlyPrice: pricing.monthlyPrice,
      yearlyPrice: pricing.yearlyPrice,
      description: pricing.description,
      features: pricing.features ? JSON.parse(pricing.features) : null,
      isActive: pricing.isActive,
      createdAt: pricing.createdAt,
      updatedAt: pricing.updatedAt,
    };
  }

  /**
   * Crea un nuevo precio de plan
   */
  async create(dto: CreatePlanPricingDto): Promise<PlanPricingResponseDto> {
    // Verificar que no exista ya un precio para este plan
    const exists = await this.planPricingRepository.exists(dto.plan);
    if (exists) {
      throw new BadRequestException(
        `Ya existe un precio configurado para el plan ${dto.plan}`,
      );
    }

    const pricing = await this.planPricingRepository.create({
      plan: dto.plan,
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      description: dto.description,
      features: dto.features,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.toResponseDto(pricing);
  }

  /**
   * Obtiene todos los precios de planes
   */
  async findAll(activeOnly: boolean = false): Promise<PlanPricingResponseDto[]> {
    const pricings = await this.planPricingRepository.findAll(activeOnly);
    return pricings.map((p) => this.toResponseDto(p));
  }

  /**
   * Obtiene un precio de plan por tipo
   */
  async findByPlan(plan: SubscriptionPlan): Promise<PlanPricingResponseDto> {
    const pricing = await this.planPricingRepository.findByPlan(plan);
    if (!pricing) {
      throw new NotFoundException(`No se encontró precio para el plan ${plan}`);
    }
    return this.toResponseDto(pricing);
  }

  /**
   * Obtiene todos los precios activos como un mapa (para uso en métricas)
   */
  async getActivePricesMap(): Promise<Record<SubscriptionPlan, number>> {
    return this.planPricingRepository.findAllActiveAsMap();
  }

  /**
   * Actualiza un precio de plan
   */
  async update(
    plan: SubscriptionPlan,
    dto: UpdatePlanPricingDto,
  ): Promise<PlanPricingResponseDto> {
    const exists = await this.planPricingRepository.exists(plan);
    if (!exists) {
      throw new NotFoundException(`No se encontró precio para el plan ${plan}`);
    }

    const pricing = await this.planPricingRepository.update(plan, {
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      description: dto.description,
      features: dto.features,
      isActive: dto.isActive,
    });

    return this.toResponseDto(pricing);
  }

  /**
   * Elimina un precio de plan
   */
  async delete(plan: SubscriptionPlan): Promise<void> {
    const exists = await this.planPricingRepository.exists(plan);
    if (!exists) {
      throw new NotFoundException(`No se encontró precio para el plan ${plan}`);
    }

    await this.planPricingRepository.delete(plan);
  }
}

