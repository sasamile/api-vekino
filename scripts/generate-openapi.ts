import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFileSync } from "fs";
import { join } from "path";

async function generateOpenApiSpec() {
  // Configurar variables de entorno mínimas si no existen
  // Solo necesarias para generar la especificación, no para conectarse realmente
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:26257/dummy?sslmode=require";
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false, // Desactivar logs para este script
  });

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
- Todos los endpoints bajo \`/condominios/users\` (excepto \`/condominios/login\`)
- Todos los endpoints bajo \`/unidades\`
- \`GET /condominios/config\`

### Endpoints que NO requieren subdominio:
- \`POST /auth/superadmin/*\` - Autenticación de superadministradores
- \`POST /condominios\` - Crear condominio (requiere SUPERADMIN)
- \`GET /condominios\` - Listar todos los condominios
- \`GET /condominios/{id}\` - Obtener condominio por ID
- \`POST /condominios/login\` - Login de usuarios (detecta subdominio automáticamente)
- \`GET /condominios/validate-subdomain/{subdomain}\` - Validar subdominio

### Autenticación:
- **Superadministradores**: Usan \`/auth/superadmin/login\` y obtienen un token JWT
- **Usuarios de condominios**: Usan \`/condominios/login\` y obtienen una cookie de sesión
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
    .addServer("http://localhost:3000", "Servidor base (sin subdominio) - Para endpoints de superadmin y creación de condominios")
    .addServer("http://condominio-las-flores.localhost:3000", "Servidor con subdominio - Para endpoints de usuarios y unidades (ejemplo)")
    .addTag("auth", "Autenticación - Endpoints de autenticación de superadministradores")
    .addTag("condominios", "Condominios - Gestión de condominios")
    .addTag("condominios-users", "Condominios - Usuarios - Gestión de usuarios de condominios")
    .addTag("unidades", "Unidades - Gestión de unidades residenciales")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Limpiar tags duplicados generados automáticamente por Swagger
  if (document.paths) {
    Object.keys(document.paths).forEach((path) => {
      Object.keys(document.paths[path]).forEach((method) => {
        const operation = document.paths[path][method];
        if (operation.tags && Array.isArray(operation.tags)) {
          // Remover tags que empiezan con mayúscula (generados automáticamente)
          operation.tags = operation.tags.filter((tag: string) => {
            return tag === tag.toLowerCase() || tag.startsWith(tag[0].toLowerCase());
          });
          // Si hay múltiples tags, mantener solo el que definimos explícitamente
          if (operation.tags.length > 1) {
            const explicitTags = ['auth', 'condominios', 'condominios-users', 'unidades'];
            const explicitTag = operation.tags.find((tag: string) => explicitTags.includes(tag));
            operation.tags = explicitTag ? [explicitTag] : [operation.tags[0]];
          }
        }
      });
    });
  }

  // Crear directorio docs si no existe
  const docsDir = join(process.cwd(), "docs");
  try {
    require("fs").mkdirSync(docsDir, { recursive: true });
  } catch (e) {
    // El directorio ya existe
  }

  // Guardar el archivo OpenAPI
  const outputPath = join(docsDir, "openapi.json");
  writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

  console.log(`✅ Especificación OpenAPI generada en: ${outputPath}`);

  await app.close();
}

generateOpenApiSpec().catch((error) => {
  console.error("❌ Error al generar la especificación OpenAPI:", error);
  process.exit(1);
});

