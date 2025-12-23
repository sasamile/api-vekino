import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor que convierte BigInt a Number para que puedan ser serializados en JSON
 * CockroachDB puede devolver algunos valores como BigInt (especialmente COUNT)
 */
@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.transformBigInt(data)),
    );
  }

  /**
   * Transforma recursivamente todos los BigInt y Date en un objeto
   * - BigInt -> Number
   * - Date -> ISO string
   */
  private transformBigInt(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Si es un BigInt, convertirlo a Number
    if (typeof obj === 'bigint') {
      return Number(obj);
    }

    // Si es un Date, convertirlo a ISO string
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Si es un array, transformar cada elemento
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformBigInt(item));
    }

    // Si es un objeto, verificar si es un objeto Date de CockroachDB/PostgreSQL
    // Estos objetos tienen propiedades como year, month, day, etc.
    if (typeof obj === 'object') {
      // Verificar si es un objeto Timestamp de CockroachDB/PostgreSQL
      // Estos objetos suelen tener propiedades como 'getTime' o métodos de fecha
      if (obj.constructor && obj.constructor.name === 'Date') {
        return new Date(obj).toISOString();
      }

      // Si el objeto tiene propiedades que parecen ser de fecha (year, month, day)
      // pero no es un Date estándar, intentar convertirlo
      if (
        typeof obj.getTime === 'function' ||
        (typeof obj.year === 'number' && typeof obj.month === 'number')
      ) {
        try {
          return new Date(obj).toISOString();
        } catch {
          // Si falla, continuar con la transformación normal
        }
      }

      // Transformar cada propiedad del objeto
      const transformed: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          transformed[key] = this.transformBigInt(obj[key]);
        }
      }
      return transformed;
    }

    // Para cualquier otro tipo, devolverlo tal cual
    return obj;
  }
}

