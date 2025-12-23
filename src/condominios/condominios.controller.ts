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
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
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
} from '../guards/require-role.guard';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Subdomain } from '../decorators/subdomain.decorator';


@ApiTags('condominios')
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
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({
    summary: 'Crear un nuevo condominio',
    description: 'Crea un nuevo condominio con su base de datos dedicada. Requiere rol SUPERADMIN.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCondominioDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Condominio creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async create(
    @Body() createCondominioDto: CreateCondominioDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.condominiosService.createCondominio(createCondominioDto, logo);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los condominios',
    description: 'Retorna una lista de todos los condominios registrados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de condominios obtenida exitosamente',
  })
  async findAll() {
    return this.condominiosService.findAll();
  }

  // Rutas específicas de usuarios - DEBEN ir antes de las rutas con :id
  // El condominio se obtiene automáticamente del subdominio
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Crear un nuevo usuario en el condominio',
    description: 'Crea un nuevo usuario en el condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.',
  })
  @ApiBody({ type: CreateCondominioUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o subdominio no detectado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
  })
  async createUser(
    @Body() createUserDto: CreateCondominioUserDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.createUserInCondominio(
      condominioId,
      createUserDto,
      req,
    );
  }

  @Get('users')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Obtener todos los usuarios del condominio',
    description: 'Retorna una lista de todos los usuarios del condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
  })
  async getUsers(@Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.getUsersInCondominio(condominioId);
  }

  @Get('users/:userId')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async getUser(@Param('userId') userId: string, @Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.getUserInCondominio(
      condominioId,
      userId,
    );
  }

  @Patch('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.updateUserRoleInCondominio(
      condominioId,
      userId,
      role,
    );
  }

  @Put('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @UseInterceptors(FileInterceptor('image'))
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateCondominioUserDto,
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.updateUserInCondominio(
      condominioId,
      userId,
      updateUserDto,
      req,
      imageFile,
    );
  }

  @Patch('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @UseInterceptors(FileInterceptor('image'))
  async patchUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateCondominioUserDto,
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.updateUserInCondominio(
      condominioId,
      userId,
      updateUserDto,
      req,
      imageFile,
    );
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  async deleteUser(@Param('userId') userId: string, @Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.deleteUserInCondominio(
      condominioId,
      userId,
    );
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
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() updateCondominioDto: UpdateCondominioDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.condominiosService.updateCondominio(
      id,
      updateCondominioDto,
      logo,
    );
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
  @ApiOperation({
    summary: 'Iniciar sesión como usuario de condominio',
    description: 'Autentica un usuario de condominio y establece una sesión. El condominio se detecta automáticamente del subdominio si no se proporciona condominioId.',
  })
  @ApiBody({ type: LoginCondominioUserDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'juan.perez@example.com',
          name: 'Juan Pérez',
          role: 'ADMIN',
        },
        session: {
          token: 'session_token',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  async login(
    @Body() loginDto: LoginCondominioUserDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Si viene condominioId en el body, usarlo; si no, el servicio lo detectará del subdominio
    const result = await this.condominiosUsersService.loginUserInCondominio(
      loginDto.condominioId || null,
      loginDto,
      req,
    );
    
    // Establecer la cookie usando res.cookie() de Express
    // NO establecemos el atributo Domain para que la cookie use automáticamente
    // el dominio del request (condominio-las-flores.localhost)
    if (result.data?.session?.token) {
      const host = req.headers.host || req.hostname;
      const hostWithoutPort = host?.split(':')[0] || '';
      
      console.log('Estableciendo cookie - Host recibido:', host, 'Host sin puerto:', hostWithoutPort);
      
      // Para subdominios, NO establecer Domain - dejar que el navegador use el dominio del request
      // Esto hace que la cookie funcione solo en ese subdominio específico
      // Si queremos que funcione en todos los subdominios, usaríamos Domain=.localhost
      const cookieOptions: any = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        expires: new Date(result.data.session.expiresAt),
        path: '/',
        // NO establecer domain - el navegador usará automáticamente el dominio del request
        // Esto hace que la cookie funcione solo en condominio-las-flores.localhost
      };
      
      // Solo para producción con múltiples subdominios, establecer Domain
      // En desarrollo, no establecer Domain para que funcione en el subdominio específico
      if (process.env.NODE_ENV === 'production' && hostWithoutPort.includes('.') && !hostWithoutPort.includes('.localhost')) {
        const parts = hostWithoutPort.split('.');
        if (parts.length > 2) {
          cookieOptions.domain = '.' + parts.slice(-2).join('.');
          console.log('Dominio establecido para producción:', cookieOptions.domain);
        }
      }
      
      res.cookie('better-auth.session_token', result.data.session.token, cookieOptions);
      
      console.log('Cookie establecida - dominio del request:', hostWithoutPort, 'opciones:', JSON.stringify(cookieOptions));
    }
    
    return res.json(result.data || result);
  }

  /**
   * Establece las cookies desde los headers Set-Cookie de Better Auth
   * Usa setHeader directamente para evitar doble codificación
   */
  private setCookiesFromHeaders(
    headers: Headers | undefined,
    res: Response,
  ): void {
    if (!headers) {
      console.warn('No se recibieron headers para establecer cookies');
      return;
    }

    const setCookieHeaders = headers.get('set-cookie');
    if (!setCookieHeaders) {
      console.warn('No se encontró header Set-Cookie en los headers');
      return;
    }

    // Establecer los headers Set-Cookie directamente sin modificar
    // para evitar doble codificación del valor
    if (Array.isArray(setCookieHeaders)) {
      setCookieHeaders.forEach((cookie) => {
        console.log('Estableciendo cookie:', cookie.substring(0, 100) + '...');
        res.setHeader('Set-Cookie', cookie);
      });
    } else {
      console.log('Estableciendo cookie:', setCookieHeaders.substring(0, 100) + '...');
      res.setHeader('Set-Cookie', setCookieHeaders);
    }
  }

  /**
   * Obtiene el ID del condominio desde el subdominio del request
   */
  private async getCondominioIdFromSubdomain(req: Request): Promise<string> {
    const subdomain = (req as any).subdomain;
    
    if (!subdomain) {
      throw new BadRequestException(
        'No se pudo identificar el condominio. El subdominio es requerido.',
      );
    }

    const condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
    
    if (!condominio) {
      throw new NotFoundException(
        `Condominio no encontrado para el subdominio: ${subdomain}`,
      );
    }

    return condominio.id;
  }
}

