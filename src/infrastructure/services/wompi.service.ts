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
    this.publicKey ='pub_test_FQpQe6Se7zTpgKT6BNFEI0GbdBUI2SG3';
    this.privateKey = 'prv_test_Uz9eJmlsuYjN0tJeTjUmU39yGLpMdnyG';
    this.isTestMode = true;
    
    // URL base de Wompi (sandbox o producción)
    this.baseUrl = this.isTestMode
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1';

    if (!this.publicKey) {
      this.logger.warn('WOMPI_PUBLIC_KEY no está configurado. Los pagos no funcionarán.');
    }

    if (!this.privateKey) {
      this.logger.warn('WOMPI_PRIVATE_KEY no está configurado. Los pagos no funcionarán.');
    }

    this.logger.log(`Wompi configurado en modo: ${this.isTestMode ? 'SANDBOX (pruebas)' : 'PRODUCCIÓN'}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);
    
    // Advertencia si está usando credenciales por defecto
    if (this.privateKey === 'prv_test_Uz9eJmlsuYjN0tJeTjUmU39yGLpMdnyG' || 
        this.publicKey === 'pub_test_FQpQe6Se7zTpgKT6BNFEI0GbdBUI2SG3') {
      this.logger.warn('⚠️  Estás usando credenciales de prueba por defecto. Estas pueden no ser válidas.');
      this.logger.warn('⚠️  Configura WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY en tus variables de entorno con credenciales válidas de Wompi.');
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
      if (!this.privateKey) {
        throw new BadRequestException('WOMPI_PRIVATE_KEY no está configurado. No se puede crear el pago.');
      }

      this.logger.log(`Creando pago en Wompi para referencia: ${request.reference}`);
      this.logger.debug(`Request: ${JSON.stringify(request, null, 2)}`);

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
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorDetails = error.response?.data || {};
      
      this.logger.error(
        `Error al crear pago en Wompi: ${errorMessage}`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: errorDetails,
          request: {
            reference: request.reference,
            amount: request.amount_in_cents,
            email: request.customer_email,
          },
        },
      );

      // Mensaje más específico según el tipo de error
      if (error.response?.status === 401) {
        const errorData = error.response?.data;
        const errorDetail = errorData?.error?.message || errorData?.message || 'Credenciales inválidas';
        
        this.logger.error('Error 401 - Autenticación fallida con Wompi', {
          privateKeyPrefix: this.privateKey?.substring(0, 10) + '...',
          isTestMode: this.isTestMode,
          baseUrl: this.baseUrl,
          errorDetail,
        });
        
        throw new BadRequestException(
          `Error de autenticación con Wompi (401): ${errorDetail}. Verifique que WOMPI_PRIVATE_KEY esté configurado correctamente y que las credenciales sean válidas para el entorno ${this.isTestMode ? 'SANDBOX' : 'PRODUCCIÓN'}.`,
        );
      }

      if (error.response?.status === 422) {
        const errorData = error.response?.data;
        const errorDetail = errorData?.error?.message || errorData?.message || 'Datos inválidos';
        const validationErrors = errorData?.error?.messages || errorData?.messages || [];
        
        this.logger.error('Error 422 - Validación fallida en Wompi', {
          errorDetail,
          validationErrors,
          request: {
            reference: request.reference,
            amount: request.amount_in_cents,
            email: request.customer_email,
          },
        });
        
        const errorMsg = validationErrors.length > 0
          ? `Error de validación: ${validationErrors.join(', ')}`
          : `Error de validación: ${errorDetail}`;
        
        throw new BadRequestException(
          `Error al crear pago en Wompi (422): ${errorMsg}. Verifique que todos los campos sean válidos.`,
        );
      }

      throw new BadRequestException(
        `Error al crear pago en Wompi: ${errorMessage}`,
      );
    }
  }

  /**
   * Crea un link de pago en Wompi (para pagos desde el frontend)
   * Usa el endpoint de payment_links para crear un link que el usuario puede usar
   */
  async createPaymentLink(
    amountInCents: number,
    currency: string,
    reference: string,
    customerEmail: string,
    customerName: string,
    redirectUrl?: string,
  ): Promise<WompiPaymentResponse> {
    try {
      if (!this.privateKey) {
        throw new BadRequestException('WOMPI_PRIVATE_KEY no está configurado. No se puede crear el link de pago.');
      }

      if (!customerEmail || !customerEmail.includes('@')) {
        throw new BadRequestException('El email del cliente es requerido y debe ser válido');
      }

      if (!customerName || customerName.trim().length === 0) {
        throw new BadRequestException('El nombre del cliente es requerido');
      }

      if (amountInCents <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }

      this.logger.log(`Creando link de pago en Wompi para referencia: ${reference}`);

      // Para crear un link de pago, necesitamos crear una transacción
      // El payment_method puede ser opcional o especificar solo el tipo
      const paymentRequest: any = {
        amount_in_cents: amountInCents,
        currency: currency || 'COP',
        customer_email: customerEmail,
        reference: reference,
        customer_data: {
          email: customerEmail,
          full_name: customerName,
        },
      };

      // Agregar redirect_url si está disponible
      if (redirectUrl) {
        paymentRequest.redirect_url = redirectUrl;
      }

      // Para links de pago, podemos especificar el método de pago o dejarlo abierto
      // Intentamos primero sin especificar el método completo para generar un link
      paymentRequest.payment_method = {
        type: 'CARD',
      };

      this.logger.debug(`Payment request: ${JSON.stringify(paymentRequest, null, 2)}`);

      // Intentar crear la transacción que generará un link de pago
      const response = await this.axiosInstance.post<WompiPaymentResponse>(
        '/transactions',
        paymentRequest,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      this.logger.log(
        `Link de pago creado exitosamente. ID: ${response.data.data.id}, Status: ${response.data.data.status}`,
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorDetails = error.response?.data || {};
      
      this.logger.error(
        `Error al crear link de pago en Wompi: ${errorMessage}`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: errorDetails,
          request: {
            reference,
            amount: amountInCents,
            email: customerEmail,
            name: customerName,
          },
        },
      );

      // Re-lanzar errores de BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Manejar errores específicos
      if (error.response?.status === 401) {
        throw new BadRequestException(
          'Error de autenticación con Wompi. Verifique que WOMPI_PRIVATE_KEY esté configurado correctamente.',
        );
      }

      if (error.response?.status === 422) {
        const errorData = errorDetails?.error || {};
        const validationMessages = errorData?.messages || {};
        
        // Formatear los mensajes de validación
        const formattedErrors: string[] = [];
        if (typeof validationMessages === 'object') {
          Object.keys(validationMessages).forEach((field) => {
            const fieldErrors = Array.isArray(validationMessages[field])
              ? validationMessages[field]
              : [validationMessages[field]];
            fieldErrors.forEach((msg: string) => {
              formattedErrors.push(`${field}: ${msg}`);
            });
          });
        }
        
        const errorMsg = formattedErrors.length > 0
          ? formattedErrors.join('; ')
          : errorMessage || 'Error de validación desconocido';
        
        this.logger.error('Error 422 - Detalles completos:', {
          errorData,
          validationMessages,
          formattedErrors,
          fullResponse: errorDetails,
        });
        
        throw new BadRequestException(
          `Error al crear link de pago en Wompi (422): ${errorMsg}`,
        );
      }

      throw new BadRequestException(
        `Error al crear link de pago en Wompi: ${errorMessage}`,
      );
    }
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

