import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private snowFlakeId: SnowflakeID, // instance
  ) {}

  async createUser() {
    return this.prisma.user.create({
      data: {
        id: this.snowFlakeId.generate(), // OK
        name: 'hoang',
      },
    });
  }
}
