import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ServerDiscoveryQueryDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm',
    example: 'gaming',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Số trang',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng kết quả mỗi trang',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo',
    example: 'memberCount',
    enum: ['memberCount', 'createdAt', 'name'],
    default: 'memberCount',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'memberCount' | 'createdAt' | 'name' = 'memberCount';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
