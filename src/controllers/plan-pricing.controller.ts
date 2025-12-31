import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PlanPricingService } from '../application/services/plan-pricing.service';
import { RequireRole, RoleGuard } from '../config/guards/require-role.guard';
import { CreatePlanPricingDto } from '../domain/dto/plan-pricing/create-plan-pricing.dto';
import { UpdatePlanPricingDto } from '../domain/dto/plan-pricing/update-plan-pricing.dto';
import { PlanPricingResponseDto } from '../domain/dto/plan-pricing/plan-pricing-response.dto';
import { SubscriptionPlan } from '../domain/dto/condominios/create-condominio.dto';

@Controller('plan-pricing')
@UseGuards(RoleGuard)
@RequireRole('SUPERADMIN')
@ApiTags('plan-pricing')
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('better-auth.session_token')
export class PlanPricingController {
  constructor(private readonly planPricingService: PlanPricingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear precio de plan',
    description: 'Crea un nuevo precio de plan. Solo un precio por tipo de plan.',
  })
  @ApiResponse({
    status: 201,
    description: 'Precio de plan creado exitosamente',
    type: PlanPricingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ya existe un precio para este plan',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async create(
    @Body() createDto: CreatePlanPricingDto,
  ): Promise<PlanPricingResponseDto> {
    return this.planPricingService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los precios de planes',
    description: 'Retorna todos los precios de planes configurados',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Solo retornar precios activos',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios obtenida exitosamente',
    type: [PlanPricingResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<PlanPricingResponseDto[]> {
    const activeOnlyBool = activeOnly === 'true';
    return this.planPricingService.findAll(activeOnlyBool);
  }

  @Get(':plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener precio de un plan específico',
    description: 'Retorna el precio configurado para un tipo de plan',
  })
  @ApiParam({
    name: 'plan',
    enum: SubscriptionPlan,
    description: 'Tipo de plan',
    example: SubscriptionPlan.BASICO,
  })
  @ApiResponse({
    status: 200,
    description: 'Precio obtenido exitosamente',
    type: PlanPricingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró precio para este plan',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async findByPlan(
    @Param('plan') plan: SubscriptionPlan,
  ): Promise<PlanPricingResponseDto> {
    return this.planPricingService.findByPlan(plan);
  }

  @Put(':plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar precio de plan',
    description: 'Actualiza el precio y configuración de un plan existente',
  })
  @ApiParam({
    name: 'plan',
    enum: SubscriptionPlan,
    description: 'Tipo de plan',
    example: SubscriptionPlan.BASICO,
  })
  @ApiResponse({
    status: 200,
    description: 'Precio actualizado exitosamente',
    type: PlanPricingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró precio para este plan',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async update(
    @Param('plan') plan: SubscriptionPlan,
    @Body() updateDto: UpdatePlanPricingDto,
  ): Promise<PlanPricingResponseDto> {
    return this.planPricingService.update(plan, updateDto);
  }

  @Delete(':plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar precio de plan',
    description: 'Elimina la configuración de precio de un plan',
  })
  @ApiParam({
    name: 'plan',
    enum: SubscriptionPlan,
    description: 'Tipo de plan',
    example: SubscriptionPlan.BASICO,
  })
  @ApiResponse({
    status: 200,
    description: 'Precio eliminado exitosamente',
    schema: {
      example: {
        message: 'Precio eliminado exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró precio para este plan',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Se requiere rol SUPERADMIN',
  })
  async delete(@Param('plan') plan: SubscriptionPlan): Promise<{ message: string }> {
    await this.planPricingService.delete(plan);
    return { message: 'Precio eliminado exitosamente' };
  }
}

