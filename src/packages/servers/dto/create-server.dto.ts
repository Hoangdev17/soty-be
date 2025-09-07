import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiProperty({
    description: 'Tên server',
    example: 'My Awesome Server',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả server',
    example: 'Một server tuyệt vời để chat và chơi game',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL icon server',
    example: 'https://example.com/icon.png',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'URL banner server',
    example: 'https://example.com/banner.png',
  })
  @IsOptional()
  @IsString()
  banner?: string;

  @ApiPropertyOptional({
    description: 'Server có public không',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Số lượng thành viên tối đa',
    example: 100000,
    minimum: 1,
    maximum: 1000000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxMembers?: number;
}
