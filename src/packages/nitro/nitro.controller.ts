import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NitroService } from './nitro.service';
import { CreateNitroDtoClass, UpdateNitroDtoClass } from './dto/nitro.dto';

@ApiTags('nitro')
@Controller('nitro')
export class NitroController {
  constructor(private readonly nitroService: NitroService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói Nitro mới' })
  @ApiResponse({
    status: 201,
    description: 'Gói Nitro đã được tạo thành công',
  })
  create(@Body() createNitroDto: CreateNitroDtoClass) {
    return this.nitroService.create(createNitroDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả gói Nitro active' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách gói Nitro',
  })
  findAll() {
    return this.nitroService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin gói Nitro theo ID' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin gói Nitro',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy gói Nitro',
  })
  findOne(@Param('id') id: string) {
    return this.nitroService.findOne(id);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Lấy thông tin gói Nitro theo SKU' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin gói Nitro',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy gói Nitro',
  })
  findBySku(@Param('sku') sku: string) {
    return this.nitroService.findBySku(sku);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói Nitro' })
  @ApiResponse({
    status: 200,
    description: 'Gói Nitro đã được cập nhật',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy gói Nitro',
  })
  update(@Param('id') id: string, @Body() updateNitroDto: UpdateNitroDtoClass) {
    return this.nitroService.update(id, updateNitroDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa gói Nitro (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'Gói Nitro đã được xóa',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy gói Nitro',
  })
  remove(@Param('id') id: string) {
    return this.nitroService.remove(id);
  }

  @Post('buy/:userId/:nitroId')
  @ApiOperation({ summary: 'Mua gói Nitro' })
  @ApiResponse({
    status: 201,
    description: 'Gói Nitro đã được mua thành công',
  })
  buy(@Param('userId') userId: string, @Param('nitroId') nitroId: string) {
    return this.nitroService.buyNitro(userId, nitroId);
  }
}
