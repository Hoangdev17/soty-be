import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { PaginationDto } from 'src/core/validations/pagination.validation';
import { PAGINATION_LIMIT, PAGINATION_OFFSET } from 'src/core/constants';
import {
  ActiveDecoratorDto,
  CreateDecoratorDto,
  OrderDecorationDto,
  UpdateDecoratorDto,
} from './dto';

@Injectable()
export class CollectiblesService {
  constructor(
    private prisma: PrismaService,
    private readonly snowflakeService: SnowflakeID,
  ) {}

  private getPaginationOptions(paginationDto: PaginationDto) {
    const offset = Math.max(0, paginationDto.offset ?? PAGINATION_OFFSET);
    const limit = Math.min(
      100,
      Math.max(1, paginationDto.limit ?? PAGINATION_LIMIT),
    ); // Max 100, min 1

    return {
      skip: offset,
      take: limit,
      offset,
      limit,
    };
  }

  async create(dtos: CreateDecoratorDto[], userId: string) {
    const data = dtos.map((dto) => ({
      id: this.snowflakeService.generate(),
      ...dto,
      userId,
    }));

    return await this.prisma.decoratorAsset.createMany({
      data,
    });
  }

  async findAll(
    paginationDto: PaginationDto,
    assetType: string,
    userId: string,
  ) {
    const { skip, take, offset, limit } =
      this.getPaginationOptions(paginationDto);
    const {
      q,
      sort = 'createdAt',
      order = 'desc',
      minPrice,
      maxPrice,
    } = paginationDto;

    const parsedMinPrice =
      minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMaxPrice =
      maxPrice !== undefined ? Number(maxPrice) : undefined;

    const searchQuery = q || '';

    const whereClause: any = {
      isDeleted: false,
    };

    if (typeof assetType !== 'undefined') {
      whereClause.assetType = Number(assetType);

      // Get user's purchased asset IDs if filtering by purchased items
      const userPurchasedAssetIds = await this.getUserPurchasedAssetIds(
        userId,
        assetType,
      );

      whereClause.id = {
        notIn: userPurchasedAssetIds,
      };
    }

    // Add search filter
    if (searchQuery) {
      whereClause.OR = [
        {
          name: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Add price filters
    if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
      whereClause.price = {};

      if (parsedMinPrice !== undefined) {
        whereClause.price.gte = parsedMinPrice;
      }

      if (parsedMaxPrice !== undefined) {
        whereClause.price.lte = parsedMaxPrice;
      }
    }

    // Validate sorting options
    const validSortFields = ['price', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // Execute queries
    const [decorator, total] = await Promise.all([
      this.prisma.decoratorAsset.findMany({
        where: whereClause,
        orderBy: [{ [sortField]: sortOrder }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.decoratorAsset.count({ where: whereClause }),
    ]);

    return {
      decorator,
      limit,
      offset,
      total,
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.decoratorAsset.findUnique({
      where: { id, isDeleted: false },
    });
    if (!asset) throw new NotFoundException('Decorator not found');
    return asset;
  }

  async update(id: string, dto: UpdateDecoratorDto) {
    return await this.prisma.decoratorAsset.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return await this.prisma.decoratorAsset.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async order(userId: string, dto: OrderDecorationDto) {
    const reference = await this.prisma.decoratorAsset.findUnique({
      where: { id: dto.decorationId },
    });

    if (!reference) throw new NotFoundException('Collectibles not found');

    const purchasedDecorator = await this.prisma.decoratorCollection.findUnique(
      {
        where: {
          userId_assetId: {
            userId,
            assetId: dto.decorationId,
          },
        },
      },
    );
    if (purchasedDecorator) {
      throw new BadRequestException('You have already purchased this item.');
    }

    // Since no payment services, assume free or handle differently
    // For now, directly record the purchase
    return this.recordCollectiblesPurchase({
      userId,
      referenceId: dto.decorationId,
      amount: reference.price,
    });
  }

  /**
   * API: Get all active Collectibles purchased by a specific user.
   */
  async getUserCollectibles(
    userId: string,
    category?: string,
    paginationDto?: PaginationDto,
  ) {
    const { skip, take, offset, limit } = paginationDto
      ? this.getPaginationOptions(paginationDto)
      : { skip: 0, take: undefined, offset: 0, limit: undefined };

    const result = await this.prisma.decoratorCollection.findMany({
      where: {
        userId,
        asset: category
          ? {
              assetType: Number(category),
            }
          : undefined,
      },
      include: {
        asset: true,
      },
      skip,
      take,
    });

    const total = await this.prisma.decoratorCollection.count({
      where: {
        userId,
        asset: category
          ? {
              assetType: Number(category),
            }
          : undefined,
      },
    });

    return {
      collectibles: result,
      limit,
      offset,
      total,
    };
  }

  async recordCollectiblesPurchase(data: {
    userId: string;
    referenceId: string;
    amount: number;
  }) {
    try {
      let result;
      if (data.userId && data.referenceId) {
        result = await this.prisma.decoratorCollection.create({
          data: {
            id: this.snowflakeService.generate(),
            userId: data.userId,
            assetId: data.referenceId,
            purchasePrice: data.amount,
            acquiredAt: new Date(),
          },
        });
      }

      return result;
    } catch (error) {
      throw new BadRequestException('Bad request', error.message);
    }
  }

  async activeDecoration(payload: {
    userId: string;
    decoratorId: string;
    dto: ActiveDecoratorDto;
  }) {
    const decoration = await this.prisma.decoratorAsset.findUnique({
      where: {
        id: payload.decoratorId,
      },
    });

    if (!decoration) {
      throw new NotFoundException('Not found Decoration');
    }

    const decoratorCollection =
      await this.prisma.decoratorCollection.findUnique({
        where: {
          userId_assetId: {
            userId: payload.userId,
            assetId: decoration.id,
          },
        },
      });
    if (!decoratorCollection) {
      throw new BadRequestException('The Decoration has not been purchased.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (payload.dto.isActive) {
        await tx.decoratorCollection.updateMany({
          where: {
            userId: payload.userId,
            asset: {
              assetType: decoration.assetType,
            },
            id: {
              not: decoratorCollection.id,
            },
          },
          data: {
            isActive: false,
          },
        });
      }

      return await tx.decoratorCollection.update({
        where: { id: decoratorCollection.id },
        data: {
          isActive: Boolean(payload.dto.isActive),
        },
      });
    });
  }

  private async getUserPurchasedAssetIds(
    userId: string,
    assetType: string,
  ): Promise<string[]> {
    const purchasedAssets = await this.prisma.decoratorCollection.findMany({
      where: {
        userId,
        asset: {
          assetType: Number(assetType),
        },
      },
      select: {
        assetId: true,
      },
    });

    return purchasedAssets
      .map(({ assetId }) => assetId)
      .filter((id): id is string => id !== null);
  }
}
