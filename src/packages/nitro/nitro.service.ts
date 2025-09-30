import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateNitroDto, UpdateNitroDto } from './dto/nitro.dto';
import { SnowflakeID } from '../../utils/snowflake';

@Injectable()
export class NitroService {
  constructor(
    private prisma: PrismaService,
    private snowFlake: SnowflakeID,
  ) {}

  async create(createNitroDto: CreateNitroDto) {
    return this.prisma.nitro.create({
      data: {
        id: this.snowFlake.generate(),
        name: createNitroDto.name,
        sku: createNitroDto.sku,
        description: createNitroDto.description,
        price: createNitroDto.price,
        durationDays: createNitroDto.durationDays,
        metadata: createNitroDto.metadata
          ? JSON.parse(JSON.stringify(createNitroDto.metadata))
          : null,
      } as any,
    });
  }

  async findAll() {
    return this.prisma.nitro.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const nitro = await this.prisma.nitro.findUnique({
      where: { id },
    });

    if (!nitro) {
      throw new NotFoundException(`Nitro package with ID ${id} not found`);
    }

    return nitro;
  }

  async update(id: string, updateNitroDto: UpdateNitroDto) {
    try {
      return await this.prisma.nitro.update({
        where: { id },
        data: updateNitroDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Nitro package with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.nitro.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Nitro package with ID ${id} not found`);
      }
      throw error;
    }
  }

  async findBySku(sku: string) {
    const nitro = await this.prisma.nitro.findUnique({
      where: { sku },
    });

    if (!nitro) {
      throw new NotFoundException(`Nitro package with SKU ${sku} not found`);
    }

    return nitro;
  }

  async buyNitro(userId: string, nitroId: string) {
    const nitro = await this.findOne(nitroId);
    if (!nitro || !nitro.isActive) {
      throw new NotFoundException(
        `Nitro package with ID ${nitroId} not found or inactive`,
      );
    }

    const userNitroExisting = await this.prisma.userNitro.findFirst({
      where: { userId },
      orderBy: { expiry: 'desc' },
    });

    const now = new Date();
    if (nitro.durationDays) {
      if (userNitroExisting) {
        // User đã có nitro, gia hạn từ ngày hết hạn hiện tại
        const grantCount = nitro.price > 50000 ? 2 : 4;
        const currentExpiry =
          userNitroExisting.expiry && userNitroExisting.expiry > now
            ? userNitroExisting.expiry
            : now;
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + nitro.durationDays);

        await this.prisma.userNitro.update({
          where: { id: userNitroExisting.id },
          data: {
            expiry: newExpiry,
            balance: grantCount + userNitroExisting.balance,
            updatedAt: new Date(),
          },
        });

        await this.prisma.nitroPurchase.create({
          data: {
            id: this.snowFlake.generate(),
            userId,
            nitroId,
            amount: nitro.price,
            status: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            premium: {
              active: true,
              expiresAt: newExpiry,
              tier: nitro.price > 50000 ? 2 : 1,
            },
          },
        });
      } else {
        // User chưa có nitro, tạo mới từ ngày hiện tại
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + nitro.durationDays);

        await this.prisma.userNitro.create({
          data: {
            id: this.snowFlake.generate(),
            userId,
            balance: +nitro.price > 50000 ? 2 : 4,
            expiry: newExpiry,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await this.prisma.nitroPurchase.create({
          data: {
            id: this.snowFlake.generate(),
            userId,
            nitroId,
            amount: nitro.price,
            status: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            premium: {
              active: true,
              expiresAt: newExpiry,
              tier: nitro.price > 50000 ? 2 : 1,
            },
          },
        });
      }
    }
  }
}
