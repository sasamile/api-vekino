import { Module, forwardRef } from '@nestjs/common';
import { FinanzasService } from '../application/services/finanzas.service';
import { FinanzasRepository } from '../infrastructure/repositories/finanzas.repository';
import { WompiService } from '../infrastructure/services/wompi.service';
import { FinanzasController } from '../controllers/finanzas.controller';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { CondominiosModule } from './condominios.module';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [FinanzasController],
  providers: [
    // Application Services
    FinanzasService,
    // Infrastructure Repositories
    FinanzasRepository,
    // Infrastructure Services
    WompiService,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    // Guards
    RoleGuard,
  ],
  exports: [FinanzasService],
})
export class FinanzasModule {}

