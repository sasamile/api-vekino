import { Module, forwardRef } from '@nestjs/common';
import { PlanPricingService } from '../application/services/plan-pricing.service';
import { PlanPricingController } from '../controllers/plan-pricing.controller';
import { PlanPricingRepository } from '../infrastructure/repositories/plan-pricing.repository';
import { PrismaProvider } from '../config/prisma.provider';
import { RoleGuard } from '../config/guards/require-role.guard';
import { CondominiosModule } from './condominios.module';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [PlanPricingController],
  providers: [
    PlanPricingService,
    PlanPricingRepository,
    PrismaProvider,
    RoleGuard,
  ],
  exports: [PlanPricingService],
})
export class PlanPricingModule {}

