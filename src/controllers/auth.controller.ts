import {
  Controller,
  Post,
  Get,
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

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AuthService } from 'src/application/services/auth.service';
import { RegisterSuperadminDto } from 'src/domain/dto/auth/superadmin/register-superadmin.dto';
import { LoginSuperadminDto } from 'src/domain/dto/auth/superadmin/login-superadmin.dto';
import { AuthResponseDto } from 'src/domain/dto/auth/auth-response.dto';
import { swaggerOperations } from 'src/config/swagger/swagger.config';
import { swaggerExamples } from 'src/config/swagger/swagger-examples';

@ApiTags('auth')
@Controller()
@AllowAnonymous() // Permitir acceso sin autenticación para estos endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('superadmin/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: swaggerOperations.auth.register.summary,
    description: swaggerOperations.auth.register.description,
  })
  @ApiBody({ type: RegisterSuperadminDto })
  @ApiResponse({
    status: 201,
    description: swaggerOperations.auth.register.responses[201].description,
    type: AuthResponseDto,
    example: swaggerExamples.auth.register.success,
  })
  @ApiResponse({
    status: 400,
    description: swaggerOperations.auth.register.responses[400].description,
    example: swaggerExamples.auth.register.error,
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

  @Post('superadmin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: swaggerOperations.auth.login.summary,
    description: swaggerOperations.auth.login.description,
  })
  @ApiBody({ type: LoginSuperadminDto })
  @ApiResponse({
    status: 200,
    description: swaggerOperations.auth.login.responses[200].description,
    type: AuthResponseDto,
    example: swaggerExamples.auth.login.success,
  })
  @ApiResponse({
    status: 401,
    description: swaggerOperations.auth.login.responses[401].description,
    example: swaggerExamples.auth.login.error,
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

  @Get('superadmin/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: swaggerOperations.auth.getCurrentUser.summary,
    description: swaggerOperations.auth.getCurrentUser.description,
  })
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: swaggerOperations.auth.getCurrentUser.responses[200].description,
    type: AuthResponseDto,
    example: swaggerExamples.auth.getCurrentUser.success,
  })
  @ApiResponse({
    status: 403,
    description: swaggerOperations.auth.getCurrentUser.responses[403].description,
    example: swaggerExamples.auth.getCurrentUser.error,
  })
  async getCurrentUser(@Req() req: Request) {
    return this.authService.getCurrentUser(req);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión (unificado)',
    description: 'Cierra la sesión del usuario actual (superadmin o usuario de condominio) y elimina la cookie de sesión. Funciona automáticamente para ambos tipos de usuarios.',
  })
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Sesión cerrada exitosamente',
      },
    },
  })
  async logout(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.logout(req);
    
    // Establecer headers de Better Auth si existen
    if (result.headers) {
      this.setCookiesFromHeaders(result.headers, res);
    }
    
    // Limpiar la cookie manualmente también (para ambos casos)
    res.clearCookie('better-auth.session_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return res.json(result.data);
  }

  @Post('superadmin/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión de superadmin (legacy)',
    description: 'Cierra la sesión del superadmin actual. Este endpoint está deprecado, usa /logout en su lugar.',
    deprecated: true,
  })
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  async logoutSuperadmin(@Req() req: Request, @Res() res: Response) {
    return this.logout(req, res);
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
