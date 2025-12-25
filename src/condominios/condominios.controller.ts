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
    // IMPORTANTE: Si el frontend está en un dominio diferente (ej: localhost:3001),
    // necesitamos configurar la cookie de manera especial
    
    if (result.data?.session?.token) {
      const host = req.headers.host || req.hostname;
      const hostWithoutPort = host?.split(':')[0] || '';
      const origin = req.headers.origin;
      
      console.log('Estableciendo cookie - Host recibido:', host, 'Origin:', origin);
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Detectar si el request viene de un dominio diferente (cross-origin)
      const isCrossOrigin = origin && !origin.includes(hostWithoutPort);
      
      // Configuración de cookie optimizada para evitar advertencias del navegador
      // Validar que expiresAt sea una fecha válida
      let expiresDate: Date;
      try {
        expiresDate = new Date(result.data.session.expiresAt);
        if (isNaN(expiresDate.getTime())) {
          // Si la fecha no es válida, usar 30 días desde ahora
          expiresDate = new Date();
          expiresDate.setDate(expiresDate.getDate() + 30);
          console.warn('Fecha de expiración inválida, usando 30 días desde ahora');
        }
        // Verificar que la fecha no sea en el pasado
        if (expiresDate.getTime() < Date.now()) {
          expiresDate = new Date();
          expiresDate.setDate(expiresDate.getDate() + 30);
          console.warn('Fecha de expiración en el pasado, usando 30 días desde ahora');
        }
      } catch (e) {
        // Si hay error, usar 30 días desde ahora
        expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 30);
        console.warn('Error al parsear fecha de expiración, usando 30 días desde ahora');
      }
      
      console.log('Fecha de expiración de la cookie:', expiresDate.toISOString());
      
      // Calcular maxAge en milisegundos (convertir a segundos para la cookie)
      const maxAgeSeconds = Math.floor((expiresDate.getTime() - Date.now()) / 1000);
      
      // Detectar si el frontend y backend están en subdominios diferentes de .localhost
      const originHost = origin ? new URL(origin).hostname.split(':')[0] : null;
      
      // Limpiar y normalizar dominios (remover doble .localhost.localhost si existe)
      const cleanOriginHost = originHost ? originHost.replace(/\.localhost\.localhost$/g, '.localhost') : null;
      const normalizedBackendHost = hostWithoutPort.replace(/\.localhost\.localhost$/g, '.localhost');
      
      // Detectar si están en el MISMO dominio exacto (solo diferente puerto)
      const isExactSameDomain = cleanOriginHost && cleanOriginHost === normalizedBackendHost;
      
      // Detectar si están en subdominios del mismo dominio base (para producción)
      // Ejemplo: api.eduamidsoft.com y app.eduamidsoft.com comparten .eduamidsoft.com
      const backendDomainParts = normalizedBackendHost.split('.');
      const frontendDomainParts = cleanOriginHost ? cleanOriginHost.split('.') : [];
      const isSameDomainBase = isProduction && 
                               backendDomainParts.length >= 2 && 
                               frontendDomainParts.length >= 2 &&
                               backendDomainParts.slice(-2).join('.') === frontendDomainParts.slice(-2).join('.') &&
                               normalizedBackendHost !== cleanOriginHost;
      
      const isBothSubdomains = cleanOriginHost && 
                               normalizedBackendHost.includes('.localhost') && 
                               cleanOriginHost.includes('.localhost') &&
                               cleanOriginHost !== normalizedBackendHost &&
                               !isExactSameDomain;
      
      const cookieOptions: any = {
        httpOnly: true,
        secure: false, // En desarrollo, no usar secure (requiere HTTPS)
        expires: expiresDate,
        maxAge: maxAgeSeconds,
        path: '/',
      };
      
      // Configurar sameSite según el contexto
      if (isProduction) {
        cookieOptions.secure = true; // En producción siempre usar secure (HTTPS)
        if (isExactSameDomain || isSameDomainBase) {
          // Mismo dominio o mismo dominio base - usar 'lax' (mejor para cookies compartidas)
          cookieOptions.sameSite = 'lax';
          console.log('✅ Producción: Mismo dominio base detectado');
          console.log('   Backend:', normalizedBackendHost);
          console.log('   Frontend:', cleanOriginHost);
          console.log('   ✅ Usando SameSite=Lax para compartir cookies entre subdominios');
        } else {
          // Cross-origin en producción - usar 'none' con 'secure'
          cookieOptions.sameSite = isCrossOrigin ? 'none' : 'lax';
        }
      } else {
        // En desarrollo
        cookieOptions.sameSite = 'lax';
        if (isExactSameDomain) {
          console.log('✅ PERFECTO: Frontend y backend en el mismo dominio exacto');
          console.log('   Backend:', normalizedBackendHost + ':3000');
          console.log('   Frontend:', cleanOriginHost + ':3001');
          console.log('   ✅ Las cookies funcionarán correctamente y persistirán después de actualizar');
        } else if (isBothSubdomains) {
          console.log('⚠️  Subdominios diferentes detectados');
          console.log('   Backend:', normalizedBackendHost);
          console.log('   Frontend:', cleanOriginHost);
          if (originHost && originHost.includes('.localhost.localhost')) {
            console.log('   ⚠️  ERROR: El frontend tiene doble .localhost.localhost');
            console.log('   📋 CORRIGE: El frontend debe usar:', normalizedBackendHost);
          }
          console.log('   ⚠️  Las cookies NO funcionarán entre subdominios diferentes en desarrollo');
          console.log('   📋 SOLUCIÓN: Usa el mismo dominio exacto para frontend y backend');
        }
      }
      
      // Configurar domain para compartir cookies entre subdominios
      // IMPORTANTE: 
      // - En desarrollo: Chrome rechaza cookies con Domain=.localhost, NO establecer domain
      // - En producción: Establecer domain para compartir entre subdominios del mismo dominio base
      //   Ejemplo: api.eduamidsoft.com y app.eduamidsoft.com comparten cookies con domain=.eduamidsoft.com
      if (isProduction && normalizedBackendHost.includes('.')) {
        if (isSameDomainBase) {
          // Compartir cookies entre subdominios del mismo dominio base
          const parts = normalizedBackendHost.split('.');
          if (parts.length >= 2) {
            // Usar los últimos dos segmentos (ej: .eduamidsoft.com)
            cookieOptions.domain = '.' + parts.slice(-2).join('.');
            console.log('✅ Producción: Dominio establecido para compartir cookies:', cookieOptions.domain);
            console.log('   Esto permite compartir cookies entre subdominios del mismo dominio base');
            console.log('   Ejemplo: api.eduamidsoft.com ↔ app.eduamidsoft.com');
            console.log('   Ejemplo: api-condominio.eduamidsoft.com ↔ condominio.eduamidsoft.com');
          }
        } else if (isExactSameDomain) {
          // Mismo dominio exacto en producción - no establecer domain (funcionará automáticamente)
          console.log('✅ Producción: Mismo dominio exacto - no se necesita domain');
        }
      } else if (normalizedBackendHost.includes('.localhost') && !normalizedBackendHost.startsWith('localhost')) {
        // En desarrollo con .localhost
        if (isExactSameDomain) {
          console.log('✅ Desarrollo: Mismo dominio exacto detectado');
          console.log('   Backend:', normalizedBackendHost + ':3000');
          console.log('   Frontend:', cleanOriginHost + ':3001');
          console.log('   ✅ Las cookies funcionarán correctamente y persistirán');
          console.log('   ✅ No se necesita configurar domain - mismo dominio, diferente puerto');
          // NO establecer domain - no es necesario y Chrome lo rechazaría
        } else {
          console.log('⚠️  Desarrollo: NO estableciendo domain para evitar rechazo de Chrome');
          console.log('   Chrome rechaza cookies con Domain=.localhost');
          console.log('   La cookie será específica de:', normalizedBackendHost);
          console.log('   📋 SOLUCIÓN: El frontend debe usar el mismo dominio exacto que el backend');
          console.log('   Ejemplo: Si el backend es condominio-las-flores.localhost:3000,');
          console.log('            el frontend debe ser condominio-las-flores.localhost:3001');
          console.log('   💡 Alternativa: Configurar un proxy en el frontend');
          // NO establecer domain
        }
      } else if (normalizedBackendHost === 'localhost') {
        console.log('ℹ️  localhost detectado (sin subdominio)');
        console.log('   La cookie solo funcionará en localhost');
      } else {
        console.log('ℹ️  No se estableció domain - cookie solo funcionará en:', normalizedBackendHost);
      }
      
      // Establecer la cookie ANTES de enviar la respuesta
      // Construir el header Set-Cookie manualmente para tener control total
      try {
        // Construir el valor de la cookie manualmente
        const cookieValue = result.data.session.token;
        
        // Construir las partes del header Set-Cookie
        const cookieParts: string[] = [
          `better-auth.session_token=${cookieValue}`,
          `Path=${cookieOptions.path}`,
        ];
        
        // Agregar Max-Age (en segundos)
        if (cookieOptions.maxAge) {
          cookieParts.push(`Max-Age=${cookieOptions.maxAge}`);
        }
        
        // Agregar Expires (formato RFC 1123)
        if (cookieOptions.expires) {
          cookieParts.push(`Expires=${expiresDate.toUTCString()}`);
        }
        
        // Agregar Domain si está definido
        if (cookieOptions.domain) {
          cookieParts.push(`Domain=${cookieOptions.domain}`);
        }
        
        // Agregar HttpOnly
        if (cookieOptions.httpOnly) {
          cookieParts.push('HttpOnly');
        }
        
        // Agregar Secure
        if (cookieOptions.secure) {
          cookieParts.push('Secure');
        }
        
        // Agregar SameSite
        if (cookieOptions.sameSite) {
          cookieParts.push(`SameSite=${cookieOptions.sameSite.charAt(0).toUpperCase() + cookieOptions.sameSite.slice(1)}`);
        }
        
        // Construir el header completo
        const setCookieHeader = cookieParts.join('; ');
        
        // Establecer el header directamente
        res.setHeader('Set-Cookie', setCookieHeader);
        
        console.log('✅ Cookie establecida exitosamente (usando setHeader manual)');
        console.log('   Nombre: better-auth.session_token');
        console.log('   Valor:', cookieValue.substring(0, 50) + '...');
        console.log('   Dominio del request:', normalizedBackendHost);
        console.log('   Origin del frontend:', origin || 'no especificado');
        if (isExactSameDomain) {
          console.log('   ✅ ESTADO: Cookie configurada correctamente para mismo dominio');
          console.log('   ✅ Las cookies se almacenarán y persistirán después de actualizar');
        }
        console.log('   Header Set-Cookie completo:', setCookieHeader.substring(0, 200) + '...');
        
        // Verificar que la cookie se estableció en los headers
        const verifyHeader = res.getHeader('Set-Cookie');
        if (verifyHeader) {
          console.log('✅ Header Set-Cookie verificado en la respuesta');
          if (Array.isArray(verifyHeader)) {
            console.log('   Set-Cookie header (verificado):', verifyHeader[0].substring(0, 200) + '...');
          } else {
            console.log('   Set-Cookie header (verificado):', String(verifyHeader).substring(0, 200) + '...');
          }
        } else {
          console.error('❌ ERROR: Header Set-Cookie NO encontrado después de establecerlo');
        }
        
        // Información adicional para debugging
        console.log('📋 Información de la cookie:');
        console.log('   - Expira en:', expiresDate.toISOString());
        console.log('   - Tiempo restante:', Math.floor(maxAgeSeconds / 86400), 'días');
        console.log('   - httpOnly:', cookieOptions.httpOnly);
        console.log('   - secure:', cookieOptions.secure);
        console.log('   - sameSite:', cookieOptions.sameSite);
        console.log('   - domain:', cookieOptions.domain || '(no establecido - específico del host)');
        console.log('   - path:', cookieOptions.path);
        console.log('   - maxAge:', cookieOptions.maxAge, 'segundos');
        
        if (isExactSameDomain) {
          console.log('✅ PERFECTO: Frontend y backend en el mismo dominio exacto');
          console.log('   ✅ Las cookies se almacenarán correctamente en el navegador');
          console.log('   ✅ Las cookies se enviarán automáticamente en cada request');
          console.log('   ✅ Las cookies persistirán después de actualizar la página');
          console.log('   ✅ No hay advertencias de Chrome - configuración ideal');
        } else if (isBothSubdomains && !isProduction) {
          console.log('ℹ️  Desarrollo: Frontend y backend en subdominios diferentes de .localhost');
          console.log('   ⚠️  IMPORTANTE: La cookie NO se compartirá automáticamente en desarrollo');
          console.log('   📋 SOLUCIÓN RECOMENDADA: Usar el mismo dominio exacto para frontend y backend');
          console.log('   Ejemplo: Backend: condominio-las-flores.localhost:3000');
          console.log('            Frontend: condominio-las-flores.localhost:3001 (mismo dominio, diferente puerto)');
          console.log('   💡 Alternativa: Configurar proxy en el frontend');
          console.log('      server: { proxy: { "/api": "http://condominio-las-flores.localhost:3000" } }');
        } else if (isSameDomainBase && isProduction) {
          console.log('✅ Producción: Frontend y backend en subdominios del mismo dominio base');
          console.log('   La cookie se compartirá automáticamente gracias a domain=' + cookieOptions.domain);
          console.log('   Ejemplo: api.eduamidsoft.com ↔ app.eduamidsoft.com');
        }
      } catch (error) {
        console.error('❌ ERROR al establecer cookie:', error);
        // Fallback: intentar con res.cookie() si setHeader falla
        try {
          console.log('⚠️  Intentando fallback con res.cookie()...');
      res.cookie('better-auth.session_token', result.data.session.token, cookieOptions);
          console.log('✅ Cookie establecida con res.cookie() como fallback');
        } catch (fallbackError) {
          console.error('❌ ERROR también en fallback:', fallbackError);
        }
      }
      
      // Advertencia si el request viene de un dominio diferente
      if (isCrossOrigin) {
        const originHost = origin ? new URL(origin).hostname : 'desconocido';
        const isOriginLocalhost = originHost === 'localhost';
        const isBackendSubdomain = hostWithoutPort.includes('.localhost');
        
        if (isOriginLocalhost && isBackendSubdomain) {
          console.warn('⚠️  ADVERTENCIA: Request cross-origin entre localhost y *.localhost');
          console.warn('   Frontend:', origin);
          console.warn('   Backend:', host);
          console.warn('   ❌ Las cookies NO funcionarán entre localhost y *.localhost');
          console.warn('   ℹ️  En desarrollo: El frontend también debe usar un subdominio (ej: condominio-las-flores.localhost:3001)');
          console.warn('   ℹ️  En producción: Ambos usarán el mismo dominio base y funcionará correctamente');
        } else if (isBothSubdomains && !isProduction) {
          console.warn('⚠️  ADVERTENCIA: Request cross-origin entre subdominios .localhost (desarrollo)');
          console.warn('   Frontend:', origin);
          console.warn('   Backend:', host);
          console.warn('   ⚠️  Chrome rechaza cookies con Domain=.localhost');
          console.warn('   📋 La cookie se establece sin domain, solo funcionará en el dominio exacto del backend');
          console.warn('   💡 SOLUCIÓN: Usa el mismo subdominio para frontend y backend en desarrollo');
          console.warn('   Ejemplo: condominio-las-flores.localhost:3000 (backend)');
          console.warn('            condominio-las-flores.localhost:3001 (frontend)');
        } else if (isBothSubdomains && isProduction) {
          console.log('✅ Producción: Request cross-origin entre subdominios del mismo dominio base');
          console.log('   Frontend:', origin);
          console.log('   Backend:', host);
          console.log('   ✅ La cookie se compartirá gracias a domain=' + cookieOptions.domain);
        } else {
          console.warn('⚠️  ADVERTENCIA: Request cross-origin detectado');
          console.warn('   Frontend:', origin);
          console.warn('   Backend:', host);
        }
      }
    } else {
      console.error('❌ ERROR: No se encontró token de sesión en result.data.session.token');
      console.log('Result data:', JSON.stringify(result.data, null, 2));
    }
    
    // IMPORTANTE: Enviar la respuesta DESPUÉS de establecer la cookie
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

