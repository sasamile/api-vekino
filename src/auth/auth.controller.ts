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
import { AuthService } from './auth.service';
import { RegisterSuperadminDto } from './dto/superadmin/register-superadmin.dto';
import { LoginSuperadminDto } from './dto/superadmin/login-superadmin.dto';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('auth/superadmin')
@AllowAnonymous() // Permitir acceso sin autenticación para estos endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
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
