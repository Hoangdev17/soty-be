// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SnowflakeID } from 'src/utils/snowflake';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private snowflake: SnowflakeID;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Không cần override $transaction nữa vì extension sẽ xử lý

  /**
   * Các helper methods cho Snowflake ID
   * Không ảnh hưởng đến code hiện có, nhưng có thể được sử dụng khi cần
   */
  generateSnowflakeId(): string {
    return this.snowflake.generate().toString();
  }

  getIdFromTimestamp(timestamp: Date): string {
    const epochMilli = timestamp.getTime();
    const delta = epochMilli - this.snowflake['offset'];

    // Đảm bảo delta không âm
    if (delta < 0) return '0';

    const binaryTimestamp = delta.toString(2).padStart(42, '0');
    const binaryId = binaryTimestamp + '0'.repeat(22); // 10 bits cho mid, 12 bits cho seq

    return BigInt('0b' + binaryId).toString();
  }

  /**
   * Helper cho việc tìm các bản ghi theo khoảng thời gian
   * Sử dụng metadata từ Snowflake ID
   */
  findByTimeRange(
    model: string,
    options: {
      startDate: Date;
      endDate: Date;
      where?: any;
      orderBy?: any;
      include?: any;
      skip?: number;
      take?: number;
    },
  ): Promise<any[]> {
    const startId = this.getIdFromTimestamp(options.startDate);
    const endId = this.getIdFromTimestamp(options.endDate);

    return this[model].findMany({
      where: {
        ...options.where,
        id: {
          gte: startId,
          lte: endId,
        },
      },
      orderBy: options.orderBy || { id: 'asc' },
      include: options.include,
      skip: options.skip,
      take: options.take,
    });
  }
}
