import { Module, forwardRef } from '@nestjs/common';
import { AdminMetricsService } from '../application/services/admin-metrics.service';
import { AdminMetricsRepository } from '../infrastructure/repositories/admin-metrics.repository';
import { AdminMetricsController } from '../controllers/admin-metrics.controller';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { CondominiosModule } from './condominios.module';
import { PrismaProvider } from '../config/prisma.provider';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [AdminMetricsController],
  providers: [
    // Application Services
    AdminMetricsService,
    // Infrastructure Repositories
    AdminMetricsRepository,
    // Config Services
    PrismaProvider,
    // Guards
    RoleGuard,
  ],
  exports: [AdminMetricsService],
})
export class AdminMetricsModule {}

