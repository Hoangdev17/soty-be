import { IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerInviteDto {
  @ApiPropertyOptional({
    description: 'Số lần sử dụng tối đa (null = không giới hạn)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Thời gian hết hạn (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
