import { Module, forwardRef } from '@nestjs/common';
import { ReportesService } from '../application/services/reportes.service';
import { ReportesRepository } from '../infrastructure/repositories/reportes.repository';
import { ReportesController } from '../controllers/reportes.controller';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { CondominiosModule } from './condominios.module';
import { PrismaProvider } from '../config/prisma.provider';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [ReportesController],
  providers: [
    // Application Services
    ReportesService,
    // Infrastructure Repositories
    ReportesRepository,
    // Config Services
    PrismaProvider,
    // Guards
    RoleGuard,
  ],
  exports: [ReportesService],
})
export class ReportesModule {}

