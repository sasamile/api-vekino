import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterSuperadminDto } from './dto/superadmin/register-superadmin.dto';
import { LoginSuperadminDto } from './dto/superadmin/login-superadmin.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('auth')
@Controller('superadmin')
@AllowAnonymous() // Permitir acceso sin autenticación para estos endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un nuevo superadministrador',
    description: `Crea una nueva cuenta de superadministrador en el sistema.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/api/superadmin/register' \\
--header 'Content-Type: application/json' \\
--data-raw '{
    "email": "nspes2020@gmail.com",
    "password": "Sa722413.",
    "name": "Santiago Suescun"
}'
\`\`\``,
  })
  @ApiBody({ type: RegisterSuperadminDto })
  @ApiResponse({
    status: 201,
    description: 'Superadministrador registrado exitosamente',
    type: AuthResponseDto,
    example: {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@vekino.com',
        name: 'Juan Pérez',
        role: 'SUPERADMIN',
      },
      session: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresAt: '2024-12-31T23:59:59.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de registro inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['email debe ser un correo electrónico válido', 'password debe tener al menos 8 caracteres'],
        error: 'Bad Request',
      },
    },
  })
  async register(
    @Body() dto: RegisterSuperadminDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.registerSuperadmin(dto, req);
    this.setCookiesFromHeaders(result.headers, res);
    return res.json(result.data || result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión como superadministrador',
    description: `Autentica un superadministrador y establece una sesión.

**Ejemplo de uso con curl:**
\`\`\`bash
curl --location 'http://localhost:3000/api/superadmin/login' \\
--header 'Content-Type: application/json' \\
--data-raw '{
    "email": "nspes2020@gmail.com",
    "password": "Sa722413."
}'
\`\`\``,
  })
  @ApiBody({ type: LoginSuperadminDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    type: AuthResponseDto,
    example: {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@vekino.com',
        name: 'Juan Pérez',
        role: 'SUPERADMIN',
      },
      session: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
  async login(
    @Body() dto: LoginSuperadminDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.loginSuperadmin(dto, req);
    this.setCookiesFromHeaders(result.headers, res);
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
    if (!headers) return;

    const setCookieHeaders = headers.get('set-cookie');
    if (!setCookieHeaders) return;

    // Establecer los headers Set-Cookie directamente sin modificar
    // para evitar doble codificación del valor
    if (Array.isArray(setCookieHeaders)) {
      setCookieHeaders.forEach((cookie) => {
        res.setHeader('Set-Cookie', cookie);
      });
    } else {
      res.setHeader('Set-Cookie', setCookieHeaders);
    }
  }
}
