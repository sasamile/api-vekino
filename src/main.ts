import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SubdomainInterceptor } from "./condominios/interceptors/subdomain.interceptor";
import { BigIntSerializerInterceptor } from "./common/interceptors/bigint-serializer.interceptor";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

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

  // Prefijo global /api para todos los endpoints (después de interceptores pero antes de Swagger)
  // Excluir Swagger del prefijo para evitar conflictos con Better Auth
  app.setGlobalPrefix('api', {
    exclude: ['docs', 'docs-json'],
  });

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

  // Configuración de Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle("API Vekino")
    .setDescription(
      `API para gestión de condominios

## Sistema de Subdominios

Esta API utiliza un sistema de subdominios para identificar condominios. Los endpoints de usuarios y unidades requieren que se acceda a través del subdominio del condominio.

### Ejemplos de URLs:
- **Desarrollo local**: \`http://condominio-las-flores.localhost:3000\`
- **Producción**: \`https://condominio-las-flores.tudominio.com\`

### Endpoints que requieren subdominio:
- Todos los endpoints bajo \`/api/condominios/users\` (excepto \`/api/condominios/login\`)
- Todos los endpoints bajo \`/api/unidades\`
- \`GET /api/condominios/config\`

### Endpoints que NO requieren subdominio:
- \`POST /api/superadmin/*\` - Autenticación de superadministradores
- \`POST /api/condominios\` - Crear condominio (requiere SUPERADMIN)
- \`GET /api/condominios\` - Listar todos los condominios
- \`GET /api/condominios/{id}\` - Obtener condominio por ID
- \`POST /api/condominios/login\` - Login de usuarios (detecta subdominio automáticamente)
- \`GET /api/condominios/validate-subdomain/{subdomain}\` - Validar subdominio

### Autenticación:
- **Superadministradores**: Usan \`/api/superadmin/login\` y obtienen un token JWT
- **Usuarios de condominios**: Usan \`/api/condominios/login\` y obtienen una cookie de sesión
- Las cookies de sesión funcionan solo en el subdominio específico del condominio`
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Token de autenticación JWT",
        in: "header",
      },
      "JWT-auth",
    )
    .addCookieAuth("better-auth.session_token", {
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
      description: "Cookie de sesión de Better Auth",
    })
    .addServer("http://localhost:3000/api", "Servidor base (sin subdominio) - Para endpoints de superadmin y creación de condominios")
    .addServer("http://condominio-las-flores.localhost:3000/api", "Servidor con subdominio - Para endpoints de usuarios y unidades (ejemplo)")
    .addTag("auth", "Autenticación - Endpoints de autenticación de superadministradores")
    .addTag("condominios", "Condominios - Gestión de condominios")
    .addTag("condominios-users", "Condominios - Usuarios - Gestión de usuarios de condominios")
    .addTag("unidades", "Unidades - Gestión de unidades residenciales")
    .build();

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
