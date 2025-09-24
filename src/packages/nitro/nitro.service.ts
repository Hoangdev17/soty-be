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
}
