import { Module, forwardRef } from '@nestjs/common';
import { MetricsService } from '../application/services/metrics.service';
import { MetricsController } from '../controllers/metrics.controller';
import { CondominiosRepository } from '../infrastructure/repositories/condominios.repository';
import { UnidadesRepository } from '../infrastructure/repositories/unidades.repository';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { RoleGuard } from '../config/guards/require-role.guard';
import { CondominiosModule } from './condominios.module';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    CondominiosRepository,
    UnidadesRepository,
    PrismaProvider,
    DatabaseManagerService,
    RoleGuard,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}

