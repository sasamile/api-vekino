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
@Controller('superadmin')
@AllowAnonymous() // Permitir acceso sin autenticación para estos endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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

  @Post('login')
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

  @Get('me')
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
