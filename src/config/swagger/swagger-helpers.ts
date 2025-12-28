import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { swaggerOperations } from './swagger.config';
import { swaggerExamples } from './swagger-examples';

/**
 * Helpers para simplificar el uso de decoradores de Swagger en los controladores
 */

/**
 * Obtiene la configuración de operación de Swagger para un endpoint específico
 */
export function getSwaggerOperation(
  domain: 'auth' | 'condominios' | 'condominiosUsers' | 'unidades',
  operation: string,
) {
  const domainOps = swaggerOperations[domain];
  return domainOps?.[operation] || null;
}

/**
 * Obtiene el ejemplo de Swagger para un endpoint específico
 */
export function getSwaggerExample(
  domain: 'auth' | 'condominios' | 'condominiosUsers' | 'unidades',
  operation: string,
  type: 'success' | 'error' | 'forbidden' | 'partial' = 'success',
) {
  const domainExamples = swaggerExamples[domain];
  if (!domainExamples || !domainExamples[operation]) {
    return undefined;
  }
  return domainExamples[operation][type];
}

/**
 * Decorador simplificado para ApiOperation usando la configuración centralizada
 */
export function ApiOperationFromConfig(
  domain: 'auth' | 'condominios' | 'condominiosUsers' | 'unidades',
  operation: string,
) {
  const config = getSwaggerOperation(domain, operation);
  if (!config) {
    return ApiOperation({ summary: operation });
  }
  return ApiOperation({
    summary: config.summary,
    description: config.description,
  });
}

/**
 * Decorador simplificado para ApiResponse usando la configuración centralizada
 */
export function ApiResponseFromConfig(
  domain: 'auth' | 'condominios' | 'condominiosUsers' | 'unidades',
  operation: string,
  status: number,
  options?: {
    type?: any;
    exampleType?: 'success' | 'error' | 'forbidden' | 'partial';
  },
) {
  const config = getSwaggerOperation(domain, operation);
  if (!config || !config.responses || !config.responses[status]) {
    return ApiResponse({ status, description: `Response ${status}` });
  }

  const responseConfig = config.responses[status];
  const exampleType = options?.exampleType || 
    (status >= 200 && status < 300 ? 'success' : 
     status === 403 ? 'forbidden' : 
     status === 400 ? 'error' : 'error');
  
  const example = getSwaggerExample(domain, operation, exampleType);

  return ApiResponse({
    status,
    description: responseConfig.description,
    type: options?.type || responseConfig.type,
    schema: responseConfig.schema,
    example: example,
  });
}

