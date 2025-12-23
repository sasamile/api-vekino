import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * Interceptor que extrae el subdominio del request y lo agrega al objeto request
 * para que esté disponible en los controladores y servicios
 */
@Injectable()
export class SubdomainInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extraer subdominio del header Host
    const subdomain = this.extractSubdomainFromRequest(request);

    // Agregar el subdominio al request para uso posterior
    (request as any).subdomain = subdomain;

    return next.handle();
  }

  /**
   * Extrae el subdominio del request basado en el header Host
   */
  private extractSubdomainFromRequest(req: Request): string | null {
    // Obtener el host del header Host o X-Forwarded-Host
    const host =
      (req.headers['x-forwarded-host'] as string) ||
      req.headers.host ||
      req.hostname;

    if (!host) {
      return null;
    }

    // Remover el puerto si existe (ej: localhost:3000)
    const hostWithoutPort = host.split(':')[0];

    // Dividir por puntos
    const parts = hostWithoutPort.split('.');

    // Si hay más de 2 partes, el subdominio es la primera
    // Ej: condominio1.tudominio.com -> condominio1
    if (parts.length > 2) {
      return parts[0];
    }

    // Si es localhost o IP, no hay subdominio
    if (
      hostWithoutPort === 'localhost' ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)
    ) {
      return null;
    }

    // Si hay exactamente 2 partes, podría ser un subdominio en desarrollo
    // Ej: condominio1.localhost -> condominio1
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    return null;
  }
}

