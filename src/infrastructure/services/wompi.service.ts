import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface WompiPaymentRequest {
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method: {
    type: string;
    installments?: number;
  };
  reference: string;
  redirect_url?: string;
  customer_data?: {
    email: string;
    full_name: string;
    phone_number?: string;
    legal_id?: string;
  };
  shipping_address?: {
    address_line_1: string;
    city: string;
    country: string;
    region?: string;
    postal_code?: string;
  };
}

export interface WompiPaymentResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    payment_method: {
      type: string;
      extra: {
        bin: string;
        name: string;
        brand: string;
        exp_year: string;
        exp_month: string;
        card_holder: string;
      };
    };
    reference: string;
    payment_link_id: string;
    created_at: string;
    finalized_at?: string;
    status_message?: string;
    shipping_address?: any;
    redirect_url?: string;
    payment_source?: {
      type: string;
      token: string;
      acceptance_token: string;
    };
  };
}

export interface WompiTransactionResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    payment_method_type: string;
    reference: string;
    created_at: string;
    finalized_at?: string;
    status_message?: string;
  };
}

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly baseUrl: string;
  private readonly isTestMode: boolean;

  constructor() {
    this.publicKey = process.env.WOMPI_PUBLIC_KEY || 'pub_test_FQpQe6Se7zTpgKT6BNFEI0GbdBUI2SG3';
    this.privateKey = process.env.WOMPI_PRIVATE_KEY || 'prv_test_Uz9eJmlsuYjN0tJeTjUmU39yGLpMdnyG';
    this.isTestMode = process.env.WOMPI_TEST_MODE === 'true' || !this.privateKey;
    
    // URL base de Wompi (sandbox o producción)
    this.baseUrl = this.isTestMode
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1';

    if (!this.publicKey) {
      this.logger.warn('WOMPI_PUBLIC_KEY no está configurado. Los pagos no funcionarán.');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Crea una transacción de pago en Wompi
   */
  async createPayment(request: WompiPaymentRequest): Promise<WompiPaymentResponse> {
    try {
      this.logger.log(`Creando pago en Wompi para referencia: ${request.reference}`);

      const response = await this.axiosInstance.post<WompiPaymentResponse>(
        '/transactions',
        request,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      this.logger.log(
        `Pago creado exitosamente. ID: ${response.data.data.id}, Status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error al crear pago en Wompi: ${error.message}`,
        error.response?.data,
      );
      throw new BadRequestException(
        `Error al crear pago en Wompi: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Crea un link de pago en Wompi (para pagos desde el frontend)
   */
  async createPaymentLink(
    amountInCents: number,
    currency: string,
    reference: string,
    customerEmail: string,
    customerName: string,
    redirectUrl?: string,
  ): Promise<WompiPaymentResponse> {
    const paymentRequest: WompiPaymentRequest = {
      amount_in_cents: amountInCents,
      currency: currency || 'COP',
      customer_email: customerEmail,
      payment_method: {
        type: 'CARD',
      },
      reference: reference,
      redirect_url: redirectUrl,
      customer_data: {
        email: customerEmail,
        full_name: customerName,
      },
    };

    return this.createPayment(paymentRequest);
  }

  /**
   * Consulta el estado de una transacción en Wompi
   */
  async getTransactionStatus(transactionId: string): Promise<WompiTransactionResponse> {
    try {
      this.logger.log(`Consultando estado de transacción: ${transactionId}`);

      const response = await this.axiosInstance.get<WompiTransactionResponse>(
        `/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error al consultar transacción en Wompi: ${error.message}`,
        error.response?.data,
      );
      throw new BadRequestException(
        `Error al consultar transacción: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Valida la firma de un webhook de Wompi
   */
  validateWebhookSignature(
    signature: string,
    eventId: string,
    timestamp: string,
    data: any,
  ): boolean {
    // Implementar validación de firma según documentación de Wompi
    // Por ahora retornamos true, pero deberías implementar la validación real
    this.logger.warn('Validación de firma de webhook no implementada completamente');
    return true;
  }

  /**
   * Obtiene la URL de redirección para el pago
   */
  getPaymentRedirectUrl(transactionId: string): string {
    return `${this.baseUrl}/transactions/${transactionId}`;
  }
}

