import { Module } from '@nestjs/common';
import { CondominiosService } from '../application/services/condominios.service';
import { TicketsService } from '../application/services/tickets.service';
import { PostsService } from '../application/services/posts.service';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';
import { TicketsRepository } from '../infrastructure/repositories/tickets.repository';
import { PostsRepository } from '../infrastructure/repositories/posts.repository';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { ComunicacionController } from 'src/controllers/comunicacion.controller';
import { CondominiosRepository } from 'src/infrastructure/repositories/condominios.repository';

@Module({
  controllers: [ComunicacionController],
  providers: [
    // Application Services
    CondominiosService,
    TicketsService,
    PostsService,
    // Infrastructure Repositories
    CondominiosRepository,
    TicketsRepository,
    PostsRepository,
    // Guards
    RoleGuard,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [TicketsService, PostsService],
})
export class ComunicacionModule {}

