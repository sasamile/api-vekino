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

  // Habilitar validación global
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

  // Si tendrás frontend separado, habilita CORS con credentials:
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  });

  // Configuración de Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle("API Vekino")
    .setDescription("API para gestión de condominios")
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
    .addServer("http://localhost:3000", "Servidor de desarrollo")
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

  // Configurar Swagger UI (puedes acceder a /api para ver la documentación)
  SwaggerModule.setup("api", app, document, {
    customSiteTitle: "API Vekino - Documentación",
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
    `,
  });

  // Servir la especificación OpenAPI en formato JSON para Scalar.com
  // Puedes acceder a /api-json para obtener el JSON y subirlo a Scalar.com
  app.getHttpAdapter().get("/api-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(document);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
