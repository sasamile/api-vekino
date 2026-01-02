import { Module, forwardRef } from '@nestjs/common';
import { CondominiosService } from '../application/services/condominios.service';
import { CondominiosUsersService } from '../application/services/condominios-users.service';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';
import { UnidadesService } from '../application/services/unidades.service';
import { EspaciosComunesService } from '../application/services/espacios-comunes.service';
import { ReservasService } from '../application/services/reservas.service';
import { UnidadesRepository } from '../infrastructure/repositories/unidades.repository';
import { EspaciosComunesRepository } from '../infrastructure/repositories/espacios-comunes.repository';
import { ReservasRepository } from '../infrastructure/repositories/reservas.repository';
import { CondominiosRepository } from '../infrastructure/repositories/condominios.repository';
import { CondominioUsersRepository } from '../infrastructure/repositories/condominio-users.repository';
import { SchemaMigrationService } from '../infrastructure/services/schema-migration.service';
import { CondominioExpirationService } from '../infrastructure/services/condominio-expiration.service';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { CondominiosController } from 'src/controllers/condominios.controller';
import { UnidadesController } from 'src/controllers/unidades.controller';
import { ReservasController } from 'src/controllers/reservas.controller';

@Module({
  controllers: [
    CondominiosController,
    UnidadesController,
    ReservasController,
  ],
  providers: [
    // Application Services
    CondominiosService,
    CondominiosUsersService,
    UnidadesService,
    EspaciosComunesService,
    ReservasService,
    // Infrastructure Repositories
    CondominiosRepository,
    CondominioUsersRepository,
    UnidadesRepository,
    EspaciosComunesRepository,
    ReservasRepository,
    // Infrastructure Services
    SchemaMigrationService,
    CondominioExpirationService,
    // Guards
    RoleGuard,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [CondominiosService, CondominiosUsersService, DatabaseManagerService],
})
export class CondominiosModule {}

