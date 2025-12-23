import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para obtener el subdominio del request
 * Uso: @Subdomain() subdomain: string
 */
export const Subdomain = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.subdomain || null;
  },
);

