import { Module, forwardRef } from '@nestjs/common';
import { CondominiosService } from '../application/services/condominios.service';
import { TicketsService } from '../application/services/tickets.service';
import { PostsService } from '../application/services/posts.service';
import { ChatService } from '../application/services/chat.service';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';
import { TicketsRepository } from '../infrastructure/repositories/tickets.repository';
import { PostsRepository } from '../infrastructure/repositories/posts.repository';
import { ChatRepository } from '../infrastructure/repositories/chat.repository';
import { RoleGuard } from 'src/config/guards/require-role.guard';
import { ComunicacionController } from 'src/controllers/comunicacion.controller';
import { CondominiosRepository } from 'src/infrastructure/repositories/condominios.repository';
import { CondominiosModule } from './condominios.module';

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [ComunicacionController],
  providers: [
    // Application Services
    CondominiosService,
    TicketsService,
    PostsService,
    ChatService,
    // Infrastructure Repositories
    CondominiosRepository,
    TicketsRepository,
    PostsRepository,
    ChatRepository,
    // Guards
    RoleGuard,
    // Config Services
    PrismaProvider,
    DatabaseManagerService,
    S3Service,
    ImageProcessingService,
  ],
  exports: [TicketsService, PostsService, ChatService],
})
export class ComunicacionModule {}

