import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Put,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';

import { PaginationDto } from 'src/core/validations/pagination.validation';
import { CollectiblesService } from './collectibles.service';

import {
  ActiveDecoratorDto,
  CreateDecoratorDto,
  OrderDecorationDto,
  UpdateDecoratorDto,
} from './dto';

@ApiTags('collectibles')
@Controller('collectibles')
export class CollectiblesController {
  constructor(private readonly collectiblesService: CollectiblesService) {}

  @Post('decoration')
  @ApiOperation({ summary: 'Create a new Decoration' })
  @ApiCookieAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: [CreateDecoratorDto],
    examples: {
      single: {
        summary: 'Create single decoration',
        value: [
          {
            assetType: 1,
            name: 'Cool Nameplate',
            description: 'A shiny decoration item',
            price: 100,
            salePrice: 80,
            metadata: { color: 'blue', animation: true },
            expiresAt: '2025-12-31T00:00:00.000Z',
          },
        ],
      },
      multiple: {
        summary: 'Create multiple decorations',
        value: [
          {
            assetType: 0,
            name: 'Nameplate 1',
            price: 50,
          },
          {
            assetType: 1,
            name: 'Avatar Decoration',
            price: 200,
            metadata: { glow: true },
          },
        ],
      },
    },
  })
  async createDecoration(
    @Body() dto: CreateDecoratorDto[],
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.collectiblesService.create(dto, req.user.id);
  }

  @Post('decoration/:decoratorId/active')
  @ApiOperation({ summary: 'Active Decoration' })
  @ApiCookieAuth('cookie-auth')
  @UseGuards(JwtAuthGuard)
  async activeDecoration(
    @Req() req: AuthenticatedRequest,
    @Param('decoratorId') decoratorId: string,
    @Body() dto: ActiveDecoratorDto,
  ) {
    return await this.collectiblesService.activeDecoration({
      userId: req.user.id,
      decoratorId,
      dto,
    });
  }

  @Get('getAll')
  @ApiOperation({ summary: 'get all decoration' })
  @ApiCookieAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'assetType', required: false })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('assetType') assetType: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.collectiblesService.findAll(
      pagination,
      assetType,
      req.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get decoration By Id' })
  async findOne(@Param('id') id: string) {
    return this.collectiblesService.findOne(id);
  }

  @Put(':id')
  @ApiCookieAuth('cookie-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update decoration' })
  async update(@Param('id') id: string, @Body() data: UpdateDecoratorDto) {
    return this.collectiblesService.update(id, data);
  }

  @Delete(':id')
  @ApiCookieAuth('cookie-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove decoration' })
  async remove(@Param('id') id: string) {
    return this.collectiblesService.remove(id);
  }

  @Post('order')
  @ApiOperation({ summary: 'Order decoration or avatar effect' })
  @ApiCookieAuth('cookie-auth')
  @UseGuards(JwtAuthGuard)
  async order(
    @Req() req: AuthenticatedRequest,
    @Body() dto: OrderDecorationDto,
  ) {
    return this.collectiblesService.order(req.user.id, dto);
  }

  @Get('/user/@me')
  @ApiOperation({ summary: 'Get user owned decorations or effects' })
  @ApiCookieAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'category',
    required: false,
    description:
      'Filter by assetType (0: nameplate, 1: avatar, 2: profile_effect)',
    example: 1,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Pagination limit',
    example: 20,
  })
  async getUserDecorations(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query() paginationQuery?: PaginationDto,
  ) {
    return this.collectiblesService.getUserCollectibles(
      req.user.id,
      category,
      paginationQuery,
    );
  }
}
