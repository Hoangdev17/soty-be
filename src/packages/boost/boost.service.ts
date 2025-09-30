import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBoostDto, UpdateBoostDto } from './dto/boost.dto';
import { SnowflakeID } from '../../utils/snowflake';

@Injectable()
export class BoostService {
  constructor(
    private prisma: PrismaService,
    private readonly snowFlake: SnowflakeID,
  ) {}

  async create(createBoostDto: CreateBoostDto) {
    // Check if user already has a boost (global)
    return await this.prisma.boost.create({
      data: {
        id: this.snowFlake.generate(),
        nitroUsed: createBoostDto.nitroUsed || 0,
        level: createBoostDto.level || 1,
        perks: createBoostDto.perks,
        expiresAt: createBoostDto.expiresAt,
      },
    });
  }

  async update(id: string, updateBoostDto: UpdateBoostDto) {
    const boost = await this.prisma.boost.findUnique({ where: { id } });
    if (!boost) {
      throw new NotFoundException(`Boost with ID ${id} not found`);
    }

    return await this.prisma.boost.update({
      where: { id },
      data: updateBoostDto,
    });
  }
  async buyBoost(
    guildId: string,
    boostId: string,
    userId: string,
    paymentId: string,
  ) {
    const boost = await this.prisma.boost.findUnique({
      where: { id: boostId },
    });

    if (!boost) {
      throw new NotFoundException(`Boost package with ID ${boostId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.guild.update({
        where: { id: guildId },
        data: {
          premiumTier: boost.level,
        },
      });

      await tx.boostPurchase.create({
        data: {
          id: this.snowFlake.generate(),
          guildId,
          userId,
          boostId: boostId,
          amount: boost.amount,
          status: 1,
          paymentId: paymentId,
        },
      });
    });
  }
}
