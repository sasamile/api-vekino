import { Module, forwardRef } from '@nestjs/common';
import { CondominiosController } from './condominios.controller';
import { CondominiosService } from './condominios.service';
import { CondominiosUsersService } from './condominios-users.service';
import { RoleGuard } from './guards/require-role.guard';
import { PrismaProvider } from '../config/prisma.provider';
import { DatabaseManagerService } from '../config/database-manager.service';

@Module({
  controllers: [CondominiosController],
  providers: [
    CondominiosService,
    CondominiosUsersService,
    RoleGuard,
    PrismaProvider,
    DatabaseManagerService,
  ],
  exports: [CondominiosService, DatabaseManagerService],
})
export class CondominiosModule {}

