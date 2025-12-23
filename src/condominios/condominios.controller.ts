import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Delete,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { CondominiosService } from './condominios.service';
import { CondominiosUsersService } from './condominios-users.service';
import { CreateCondominioDto } from './dto/create-condominio.dto';
import { UpdateCondominioDto } from './dto/update-condominio.dto';
import { CreateCondominioUserDto } from './dto/create-condominio-user.dto';
import { UpdateCondominioUserDto } from './dto/update-condominio-user.dto';
import { LoginCondominioUserDto } from './dto/login-condominio-user.dto';
import {
  RequireRole,
  RequireCondominioAccess,
  RoleGuard,
} from './guards/require-role.guard';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Subdomain } from './decorators/subdomain.decorator';


@Controller('condominios')
export class CondominiosController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly condominiosUsersService: CondominiosUsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async create(@Body() createCondominioDto: CreateCondominioDto) {
    return this.condominiosService.createCondominio(createCondominioDto);
  }

  @Get()
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async findAll() {
    return this.condominiosService.findAll();
  }

  @Get(':id')
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async findOne(@Param('id') id: string) {
    return this.condominiosService.findOneSafe(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateCondominioDto: UpdateCondominioDto,
  ) {
    return this.condominiosService.updateCondominio(id, updateCondominioDto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async deactivate(@Param('id') id: string) {
    return this.condominiosService.deactivateCondominio(id);
  }

  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  async delete(@Param('id') id: string) {
    return this.condominiosService.deleteCondominio(id);
  }

  // Validación de subdominio en tiempo real
  @Get('validate-subdomain/:subdomain')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  async validateSubdomain(@Param('subdomain') subdomain: string) {
    return this.condominiosService.validateSubdomain(subdomain);
  }

  // Obtener configuración visual del condominio (logo, color)
  @Get('config')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  async getConfig(@Subdomain() subdomain: string | null) {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    return this.condominiosService.getCondominioConfig(subdomain);
  }

  // Endpoint de login para usuarios de condominios (ADMIN y USER)
  // El condominioId es opcional: si no se proporciona, se detecta del subdominio
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  async login(@Body() loginDto: LoginCondominioUserDto, @Req() req: Request) {
    // Si viene condominioId en el body, usarlo; si no, el servicio lo detectará del subdominio
    return this.condominiosUsersService.loginUserInCondominio(
      loginDto.condominioId || null,
      loginDto,
      req,
    );
  }

  // Endpoints para gestionar usuarios dentro de condominios
  // SUPERADMIN puede gestionar usuarios en cualquier condominio
  // ADMIN solo puede gestionar usuarios en su propio condominio
  @Post(':id/users')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async createUser(
    @Param('id') condominioId: string,
    @Body() createUserDto: CreateCondominioUserDto,
    @Req() req: Request,
  ) {
    return this.condominiosUsersService.createUserInCondominio(
      condominioId,
      createUserDto,
      req,
    );
  }

  @Get(':id/users')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async getUsers(@Param('id') condominioId: string) {
    return this.condominiosUsersService.getUsersInCondominio(condominioId);
  }

  @Get(':id/users/:userId')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async getUser(
    @Param('id') condominioId: string,
    @Param('userId') userId: string,
  ) {
    return this.condominiosUsersService.getUserInCondominio(
      condominioId,
      userId,
    );
  }

  @Patch(':id/users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async updateUserRole(
    @Param('id') condominioId: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.condominiosUsersService.updateUserRoleInCondominio(
      condominioId,
      userId,
      role,
    );
  }

  @Put(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async updateUser(
    @Param('id') condominioId: string,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateCondominioUserDto,
    @Req() req: Request,
  ) {
    return this.condominiosUsersService.updateUserInCondominio(
      condominioId,
      userId,
      updateUserDto,
      req,
    );
  }

  @Patch(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async patchUser(
    @Param('id') condominioId: string,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateCondominioUserDto,
    @Req() req: Request,
  ) {
    return this.condominiosUsersService.updateUserInCondominio(
      condominioId,
      userId,
      updateUserDto,
      req,
    );
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async deleteUser(
    @Param('id') condominioId: string,
    @Param('userId') userId: string,
  ) {
    return this.condominiosUsersService.deleteUserInCondominio(
      condominioId,
      userId,
    );
  }
}

