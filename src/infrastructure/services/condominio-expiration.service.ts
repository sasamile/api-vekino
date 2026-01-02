import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CondominiosRepository } from '../repositories/condominios.repository';

/**
 * Servicio para manejar la expiración automática de condominios
 * Ejecuta un cron job diario para desactivar condominios cuyo plan ha vencido
 */
@Injectable()
export class CondominioExpirationService {
  private readonly logger = new Logger(CondominioExpirationService.name);

  constructor(
    private readonly condominiosRepository: CondominiosRepository,
  ) {}

  /**
   * Cron job que se ejecuta diariamente a las 2:00 AM
   * Verifica y desactiva condominios cuyo plan ha vencido
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredCondominios() {
    this.logger.log('Iniciando verificación de condominios vencidos...');

    try {
      const expiredCondominios = await this.condominiosRepository.findExpiredCondominios();

      if (expiredCondominios.length === 0) {
        this.logger.log('No se encontraron condominios vencidos');
        return;
      }

      this.logger.warn(
        `Se encontraron ${expiredCondominios.length} condominios vencidos`,
      );

      const ids = expiredCondominios.map((c) => c.id);
      const result = await this.condominiosRepository.deactivateMultiple(ids);

      this.logger.log(
        `Se desactivaron ${result.count} condominios vencidos: ${ids.join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Error al procesar condominios vencidos:', error);
    }
  }

  /**
   * Método manual para ejecutar la verificación de condominios vencidos
   * Útil para testing o ejecución manual
   */
  async checkAndDeactivateExpired() {
    return this.handleExpiredCondominios();
  }
}

