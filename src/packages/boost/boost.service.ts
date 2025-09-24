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
}
