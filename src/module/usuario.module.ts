import { Module, forwardRef } from '@nestjs/common';
import { CondominiosService } from '../application/services/condominios.service';
import { UsuarioService } from '../application/services/usuario.service';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';
import { UsuarioPagosRepository } from '../infrastructure/repositories/usuario-pagos.repository';
import { UsuarioReservasRepository } from '../infrastructure/repositories/usuario-reservas.repository';
import { ReservasRepository } from '../infrastructure/repositories/reservas.repository';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { UsuarioController } from 'src/controllers/usuario.controller';
import { CondominiosRepository } from 'src/infrastructure/repositories/condominios.repository';
import { CondominiosModule } from './condominios.module';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [UsuarioController],
  providers: [
    // Application Services
    CondominiosService,
    UsuarioService,
    // Infrastructure Repositories
    CondominiosRepository,
    UsuarioPagosRepository,
    UsuarioReservasRepository,
    ReservasRepository,
    // Guards
    RoleGuard,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [UsuarioService],
})
export class UsuarioModule {}

