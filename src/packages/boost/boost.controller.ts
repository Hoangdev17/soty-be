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
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BoostService } from './boost.service';
import { CreateBoostDtoClass, UpdateBoostDtoClass } from './dto/boost.dto';

@ApiTags('boost')
@Controller('boost')
@ApiBearerAuth()
export class BoostController {
  constructor(private readonly boostService: BoostService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo boost mới cho guild' })
  @ApiResponse({
    status: 201,
    description: 'Boost đã được tạo thành công',
  })
  create(@Body() createBoostDto: CreateBoostDtoClass) {
    return this.boostService.create(createBoostDto);
  }
}
