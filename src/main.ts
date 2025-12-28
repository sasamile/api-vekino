import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SubdomainInterceptor } from "./config/interceptors/subdomain.interceptor";
import { BigIntSerializerInterceptor } from "./config/interceptors/bigint-serializer.interceptor";
import cookieParser from "cookie-parser";
import { SwaggerModule } from "@nestjs/swagger";
import { swaggerConfig } from "./config/swagger/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // requerido para Better Auth
  });

  // Habilitar cookie parser para leer cookies correctamente
  app.use(cookieParser());

  // Habilitar validación global (antes del prefijo para que Swagger funcione correctamente)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Interceptor global para detectar subdominios
  app.useGlobalInterceptors(new SubdomainInterceptor());
  
  // Interceptor global para serializar BigInt a Number (necesario para CockroachDB)
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());

  // Prefijo global removido - las rutas están directamente en la raíz
  // app.setGlobalPrefix('api', {
  //   exclude: ['docs', 'docs-json'],
  // });

  // Si tendrás frontend separado, habilita CORS con credentials:
  // Permitir cualquier subdominio de localhost para desarrollo
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Permitir localhost y cualquier subdominio de localhost
      // Incluir tanto api-* como subdominios normales
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://vekino.site",
        "http://localhost:3001",
        /^http:\/\/.*\.localhost:\d+$/, // Cualquier subdominio de localhost (api-*, condominio-*, etc.)
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        return allowed.test(origin);
      });
      
      callback(null, isAllowed);
    },
    credentials: true,
  });

  // Configuración de Swagger/OpenAPI (centralizada)
  const config = swaggerConfig;

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Limpiar tags duplicados generados automáticamente por Swagger
  // Swagger genera tags basados en el nombre del controlador, pero queremos usar solo nuestros tags explícitos
  if (document.paths) {
    Object.keys(document.paths).forEach((path) => {
      Object.keys(document.paths[path]).forEach((method) => {
        const operation = document.paths[path][method];
        if (operation.tags && Array.isArray(operation.tags)) {
          // Remover tags que empiezan con mayúscula (generados automáticamente)
          // y mantener solo los tags en minúscula que definimos explícitamente
          operation.tags = operation.tags.filter((tag: string) => {
            // Mantener solo tags que están en minúscula o que empiezan con minúscula
            return tag === tag.toLowerCase() || tag.startsWith(tag[0].toLowerCase());
          });
          // Si hay múltiples tags, mantener solo el primero (el que definimos explícitamente)
          if (operation.tags.length > 1) {
            // Priorizar tags que definimos explícitamente
            const explicitTags = ['auth', 'condominios', 'condominios-users', 'unidades'];
            const explicitTag = operation.tags.find((tag: string) => explicitTags.includes(tag));
            operation.tags = explicitTag ? [explicitTag] : [operation.tags[0]];
          }
        }
      });
    });
  }

  // Configurar Swagger UI (accesible en /docs, excluido del prefijo para evitar conflictos)
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "API Vekino - Documentación",
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Servir la especificación OpenAPI en formato JSON para Scalar.com
  // Accesible en /docs-json (excluido del prefijo)
  app.getHttpAdapter().get("/docs-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(document);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
