<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

API Vekino - Sistema multi-tenant para gestión de condominios con NestJS, Better Auth y Prisma.

### Características

- **Sistema Multi-Tenant**: Cada condominio tiene su propia base de datos separada
- **Autenticación**: Sistema de autenticación con Better Auth
- **Roles**: 
  - **SUPERADMIN**: Acceso a todas las bases de datos y gestión de condominios
  - **ADMIN**: Administradores dentro de cada condominio
  - **USER**: Usuarios regulares dentro de cada condominio
  - **TENANT**: Arrendatarios dentro de cada condominio

### Arquitectura

- **Base de datos maestra**: Contiene información de condominios y superadministradores
- **Bases de datos de condominios**: Cada condominio tiene su propia base de datos con sus usuarios, sesiones y datos
- **Gestión dinámica**: El sistema crea y gestiona bases de datos dinámicamente para cada condominio

## Project setup

```bash
$ npm install
```

### Configuración de variables de entorno

Crea un archivo `.env` con las siguientes variables:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@host:26257/defaultdb?sslmode=require

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-change-in-production

# AWS S3 (para subida de imágenes)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

### Migraciones

Primero, aplica las migraciones a la base de datos maestra:

```bash
npx prisma migrate dev
```




Esto creará las tablas necesarias en la base de datos maestra, incluyendo el modelo `Condominio`.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Uso del API

### 1. Registrar un Superadministrador

```bash
POST /auth/superadmin/register
Content-Type: application/json

{
  "name": "Super Admin",
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. Iniciar sesión como Superadministrador

```bash
POST /auth/superadmin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 3. Crear un Condominio

```bash
POST /condominios
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Condominio Las Flores",
  "nit": "123456789",
  "address": "Calle 123",
  "city": "Bogotá",
  "country": "Colombia",
  "timezone": "AMERICA_BOGOTA",
  "primaryColor": "#3B82F6",
  "subscriptionPlan": "BASICO",
  "unitLimit": 100,
  "logo": <archivo de imagen> (opcional, se convierte automáticamente a WebP)
}
```

**Nota**: El logo se procesa automáticamente:
- Se convierte a formato WebP para reducir el tamaño
- Se redimensiona a máximo 800x800px manteniendo la proporción
- Se sube a AWS S3 y se guarda la URL en la base de datos

Esto creará:
- Un nuevo registro en la base de datos maestra
- Una nueva base de datos para el condominio
- El esquema de Prisma se aplicará automáticamente

### 4. Crear usuarios en un condominio

```bash
POST /condominios/{condominioId}/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@condominio.com",
  "password": "password123",
  "role": "ADMIN"
}
```

Roles disponibles para usuarios de condominio:
- `ADMIN`: Administrador del condominio
- `USER`: Usuario regular
- `TENANT`: Arrendatario

### 5. Listar usuarios de un condominio

```bash
GET /condominios/{condominioId}/users
Authorization: Bearer <token>
```

### 6. Listar todos los condominios (solo SUPERADMIN)

```bash
GET /condominios
Authorization: Bearer <token>
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
