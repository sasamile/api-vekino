import { Module, forwardRef } from '@nestjs/common';
import { CondominiosService } from '../application/services/condominios.service';
import { CondominiosUsersService } from '../application/services/condominios-users.service';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';
import { UnidadesService } from '../application/services/unidades.service';
import { UnidadesRepository } from '../infrastructure/repositories/unidades.repository';
import { CondominiosRepository } from '../infrastructure/repositories/condominios.repository';
import { CondominioUsersRepository } from '../infrastructure/repositories/condominio-users.repository';
import { SchemaMigrationService } from '../infrastructure/services/schema-migration.service';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { CondominiosController } from 'src/controllers/condominios.controller';
import { UnidadesController } from 'src/controllers/unidades.controller';

@Module({
  controllers: [
    CondominiosController,
    UnidadesController,
  ],
  providers: [
    // Application Services
    CondominiosService,
    CondominiosUsersService,
    UnidadesService,
    // Infrastructure Repositories
    CondominiosRepository,
    CondominioUsersRepository,
    UnidadesRepository,
    // Infrastructure Services
    SchemaMigrationService,
    // Guards
    RoleGuard,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [CondominiosService, DatabaseManagerService],
})
export class CondominiosModule {}

