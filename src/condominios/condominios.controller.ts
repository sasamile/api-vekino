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
import { CondominioResponseDto, CondominioListResponseDto } from './dto/condominio-response.dto';
import { CondominioUserResponseDto, CondominioUserListResponseDto, LoginResponseDto } from './dto/condominio-user-response.dto';
import {
  RequireRole,
  RequireCondominioAccess,
  RoleGuard,
} from '../guards/require-role.guard';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Subdomain } from '../decorators/subdomain.decorator';


@Controller('condominios')
export class CondominiosController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly condominiosUsersService: CondominiosUsersService,
  ) {}

  @ApiTags('condominios')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({
    summary: 'Crear un nuevo condominio',
    description: `Crea un nuevo condominio con su base de datos dedicada. Requiere rol SUPERADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://localhost:3000/condominios' \\
--header 'Authorization: Bearer TU_TOKEN_AQUI' \\
--form 'name="Condominio Las Flores"' \\
--form 'nit="123456789"' \\
--form 'address="Calle 123 #45-67"' \\
--form 'city="Bogotá"' \\
--form 'country="Colombia"' \\
--form 'timezone="AMERICA_BOGOTA"' \\
--form 'frontSubdomain="condominio-las-flores"' \\
--form 'primaryColor="#3B82F6"' \\
--form 'subscriptionPlan="BASICO"' \\
--form 'unitLimit="100"' \\
--form 'planExpiresAt="2025-12-31T23:59:59Z"' \\
--form 'activeModules="[\"reservas\",\"documentos\",\"pqrs\"]"' \\
--form 'logo=@"/ruta/a/imagen.jpg"'
\`\`\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCondominioDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Condominio creado exitosamente',
    type: CondominioResponseDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Condominio Las Flores',
      nit: '900123456-7',
      address: 'Calle 123 #45-67',
      city: 'Bogotá',
      country: 'Colombia',
      frontSubdomain: 'las-flores',
      subdomain: 'condominio1',
      logo: 'https://example.com/logo.png',
      primaryColor: '#3B82F6',
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['name debe ser una cadena de texto', 'name no debe estar vacío'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permisos para realizar esta acción',
        error: 'Forbidden',
      },
    },
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

  @ApiTags('condominios')
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los condominios',
    description: `Retorna una lista de todos los condominios registrados en el sistema.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/condominios' \\
--header 'Content-Type: application/json'
\`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de condominios obtenida exitosamente',
    type: [CondominioResponseDto],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Condominio Las Flores',
        nit: '900123456-7',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        country: 'Colombia',
        frontSubdomain: 'las-flores',
        subdomain: 'condominio1',
        logo: 'https://example.com/logo.png',
        primaryColor: '#3B82F6',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
    ],
  })
  async findAll() {
    return this.condominiosService.findAll();
  }

  // Rutas específicas de usuarios - DEBEN ir antes de las rutas con :id
  // El condominio se obtiene automáticamente del subdominio
  @ApiTags('condominios-users')
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Crear un nuevo usuario en el condominio',
    description: `Crea un nuevo usuario en el condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.
- Ejemplo: \`http://condominio-las-flores.localhost:3000/condominios/users\`
- El subdominio se detecta automáticamente del header \`Host\` de la petición.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "name": "Juan Pérez",
    "email": "juan.perez@email.com",
    "password": "Password123",
    "role": "PROPIETARIO",
    "firstName": "Juan",
    "lastName": "Pérez",
    "tipoDocumento": "CC",
    "numeroDocumento": "1234567890",
    "telefono": "3001234567",
    "unidadId": "93e0ef39-855a-454b-b612-02e70d74e924"
}'
\`\`\``,
  })
  @ApiBody({ type: CreateCondominioUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: CondominioUserResponseDto,
    example: {
      id: '93e0ef39-855a-454b-b612-02e70d74e924',
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      role: 'PROPIETARIO',
      firstName: 'Juan',
      lastName: 'Pérez',
      tipoDocumento: 'CC',
      numeroDocumento: '1234567890',
      telefono: '3001234567',
      unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
      createdAt: '2024-12-23T10:30:00.000Z',
      updatedAt: '2024-12-23T10:30:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o subdominio no detectado',
    schema: {
      example: {
        statusCode: 400,
        message: 'No se pudo identificar el condominio. El subdominio es requerido.',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permisos para realizar esta acción',
        error: 'Forbidden',
      },
    },
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

  @ApiTags('condominios-users')
  @Get('users')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Obtener todos los usuarios del condominio',
    description: `Retorna una lista de todos los usuarios del condominio detectado del subdominio. Requiere rol SUPERADMIN o ADMIN.

**Importante**: Este endpoint debe ser llamado desde el subdominio del condominio.
- Ejemplo: \`http://condominio-las-flores.localhost:3000/condominios/users\`

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
\`\`\``,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: [CondominioUserResponseDto],
    example: [
      {
        id: '93e0ef39-855a-454b-b612-02e70d74e924',
        name: 'Juan Pérez',
        email: 'juan.perez@email.com',
        role: 'PROPIETARIO',
        firstName: 'Juan',
        lastName: 'Pérez',
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        telefono: '3001234567',
        unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
      },
      {
        id: '4e666f6a-4cf2-4abd-96d1-2562c5eac4f8',
        name: 'María García',
        email: 'maria.garcia@email.com',
        role: 'ADMIN',
        firstName: 'María',
        lastName: 'García',
        tipoDocumento: 'CC',
        numeroDocumento: '9876543210',
        telefono: '3009876543',
        unidadId: null,
        createdAt: '2024-12-20T08:15:00.000Z',
        updatedAt: '2024-12-20T08:15:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permisos para realizar esta acción',
        error: 'Forbidden',
      },
    },
  })
  async getUsers(@Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.getUsersInCondominio(condominioId);
  }

  @ApiTags('condominios-users')
  @Get('users/:userId')
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Obtener un usuario específico del condominio',
    description: 'Retorna la información detallada de un usuario específico del condominio. Requiere rol SUPERADMIN o ADMIN.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Usuario obtenido exitosamente',
    type: CondominioUserResponseDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      role: 'ADMIN',
      firstName: 'Juan',
      lastName: 'Pérez',
      tipoDocumento: 'CC',
      numeroDocumento: '1234567890',
      telefono: '+57 300 123 4567',
      unidadId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Usuario no encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN o ADMIN',
  })
  async getUser(@Param('userId') userId: string, @Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.getUserInCondominio(
      condominioId,
      userId,
    );
  }

  @ApiTags('condominios-users')
  @Patch('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Actualizar el rol de un usuario',
    description: `Actualiza el rol de un usuario específico en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}/role' \\
--header 'Content-Type: application/json' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--data-raw '{
    "role": "ADMIN"
}'
\`\`\``,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'],
          example: 'ADMIN',
        },
      },
    },
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
    type: CondominioUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado',
  })
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

  @ApiTags('condominios-users')
  @Put('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Actualizar un usuario (PUT)',
    description: `Actualiza completamente la información de un usuario en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--form 'name="Juan Pérez"' \\
--form 'email="juan.perez@example.com"' \\
--form 'identificationNumber="1234567890"' \\
--form 'image=@"/ruta/a/imagen.jpg"'
\`\`\``,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCondominioUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: CondominioUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado',
  })
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

  @ApiTags('condominios-users')
  @Patch('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Actualizar parcialmente un usuario (PATCH)',
    description: `Actualiza parcialmente la información de un usuario en el condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl (multipart/form-data):**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI' \\
--form 'image=@"/ruta/a/nueva-imagen.jpg"'
\`\`\``,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCondominioUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: CondominioUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado',
  })
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

  @ApiTags('condominios-users')
  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole(['SUPERADMIN', 'ADMIN'])
  @RequireCondominioAccess()
  @ApiOperation({
    summary: 'Eliminar un usuario del condominio',
    description: `Elimina un usuario del condominio. Requiere rol SUPERADMIN o ADMIN.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location --request DELETE 'http://condominio-las-flores.localhost:3000/condominios/users/{userId}' \\
--header 'Cookie: better-auth.session_token=TU_TOKEN_AQUI'
\`\`\``,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario a eliminar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
    schema: {
      example: {
        message: 'Usuario eliminado exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado',
  })
  async deleteUser(@Param('userId') userId: string, @Req() req: Request) {
    const condominioId = await this.getCondominioIdFromSubdomain(req);
    return this.condominiosUsersService.deleteUserInCondominio(
      condominioId,
      userId,
    );
  }

  @ApiTags('condominios')
  @Get(':id')
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  @ApiOperation({
    summary: 'Obtener un condominio por ID',
    description: 'Retorna la información detallada de un condominio específico. Requiere rol SUPERADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del condominio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Condominio obtenido exitosamente',
    type: CondominioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Condominio no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async findOne(@Param('id') id: string) {
    return this.condominiosService.findOneSafe(id);
  }

  @ApiTags('condominios')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({
    summary: 'Actualizar un condominio',
    description: 'Actualiza la información de un condominio. Requiere rol SUPERADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del condominio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCondominioDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Condominio actualizado exitosamente',
    type: CondominioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Condominio no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado',
  })
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

  @ApiTags('condominios')
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  @ApiOperation({
    summary: 'Desactivar un condominio',
    description: 'Desactiva un condominio sin eliminarlo. Requiere rol SUPERADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del condominio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Condominio desactivado exitosamente',
    type: CondominioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Condominio no encontrado',
  })
  async deactivate(@Param('id') id: string) {
    return this.condominiosService.deactivateCondominio(id);
  }

  @ApiTags('condominios')
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard)
  @RequireRole('SUPERADMIN')
  @ApiOperation({
    summary: 'Eliminar un condominio',
    description: 'Elimina permanentemente un condominio. Requiere rol SUPERADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del condominio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Condominio eliminado exitosamente',
    schema: {
      example: {
        message: 'Condominio eliminado exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Condominio no encontrado',
  })
  async delete(@Param('id') id: string) {
    return this.condominiosService.deleteCondominio(id);
  }

  // Validación de subdominio en tiempo real
  @ApiTags('condominios')
  @Get('validate-subdomain/:subdomain')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Validar disponibilidad de subdominio',
    description: 'Valida si un subdominio está disponible para uso',
  })
  @ApiParam({
    name: 'subdomain',
    description: 'Subdominio a validar',
    example: 'las-flores',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la validación',
    schema: {
      example: {
        available: true,
        message: 'Subdominio disponible',
      },
    },
  })
  async validateSubdomain(@Param('subdomain') subdomain: string) {
    return this.condominiosService.validateSubdomain(subdomain);
  }

  // Obtener configuración visual del condominio (logo, color)
  @ApiTags('condominios')
  @Get('config')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Obtener configuración visual del condominio',
    description: 'Retorna la configuración visual (logo, color) del condominio detectado del subdominio',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración obtenida exitosamente',
    schema: {
      example: {
        logo: 'https://example.com/logo.png',
        primaryColor: '#3B82F6',
        name: 'Condominio Las Flores',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Subdominio no detectado',
  })
  async getConfig(@Subdomain() subdomain: string | null) {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    return this.condominiosService.getCondominioConfig(subdomain);
  }

  // Endpoint de login para usuarios de condominios (ADMIN y USER)
  // El condominioId es opcional: si no se proporciona, se detecta del subdominio
  @ApiTags('condominios-users')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Iniciar sesión como usuario de condominio',
    description: `Autentica un usuario de condominio y establece una sesión. El condominio se detecta automáticamente del subdominio si no se proporciona condominioId.

**Importante**: Este endpoint puede ser llamado desde el subdominio del condominio o desde el servidor base.
- Con subdominio: \`http://condominio-las-flores.localhost:3000/condominios/login\` (recomendado)
- Sin subdominio: \`http://localhost:3000/condominios/login\` (debe incluir \`condominioId\` en el body)

La sesión se establece mediante una cookie que funciona solo en el subdominio específico.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://condominio-las-flores.localhost:3000/condominios/login' \\
--header 'Content-Type: application/json' \\
--data-raw '{
  "email": "nspes2022@gmail.com",
  "password": "password123"
}'
\`\`\``,
  })
  @ApiBody({ type: LoginCondominioUserDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    type: LoginResponseDto,
    example: {
      user: {
        id: '93e0ef39-855a-454b-b612-02e70d74e924',
        name: 'Juan Pérez',
        email: 'juan.perez@email.com',
        role: 'PROPIETARIO',
        firstName: 'Juan',
        lastName: 'Pérez',
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        telefono: '3001234567',
        unidadId: '93e0ef39-855a-454b-b612-02e70d74e924',
        createdAt: '2024-12-23T10:30:00.000Z',
        updatedAt: '2024-12-23T10:30:00.000Z',
      },
      session: {
        token: '14fa228c-6584-461b-bf44-2c08fcfb666f.b5363e75-1f55-47e7-aa64-4bfd34fe9a82',
        expiresAt: '2024-12-31T23:59:59.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
    schema: {
      example: {
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o subdominio no detectado',
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

