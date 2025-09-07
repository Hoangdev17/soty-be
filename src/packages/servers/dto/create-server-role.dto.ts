import { IsString, IsOptional, IsBoolean, IsInt, Min, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServerRoleDto {
  @ApiProperty({
    description: 'Tên role',
    example: 'Moderator',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Màu sắc role (hex)',
    example: '#ff0000',
    default: '#99aab5',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Vị trí role (cao hơn = quyền cao hơn)',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    description: 'Có thể mention role này không',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isMentionable?: boolean;

  @ApiPropertyOptional({
    description: 'Role có được hiển thị riêng biệt không',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHoisted?: boolean;

  @ApiPropertyOptional({
    description: 'Quyền hạn của role (bitfield)',
    example: 8,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  permissions?: number;
}
