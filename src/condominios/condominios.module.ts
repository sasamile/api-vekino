import { Module, forwardRef } from '@nestjs/common';
import { CondominiosController } from './condominios.controller';
import { CondominiosService } from './condominios.service';
import { CondominiosUsersService } from './condominios-users.service';
import { ResidentesService } from './residentes.service';
import { UnidadesService } from './unidades.service';
import { ResidentesController } from './residentes.controller';
import { UnidadesController } from './unidades.controller';
import { RoleGuard } from '../guards/require-role.guard';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';

@Module({
  controllers: [
    CondominiosController,
    ResidentesController,
    UnidadesController,
  ],
  providers: [
    CondominiosService,
    CondominiosUsersService,
    ResidentesService,
    UnidadesService,
    RoleGuard,
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [CondominiosService, DatabaseManagerService],
})
export class CondominiosModule {}

