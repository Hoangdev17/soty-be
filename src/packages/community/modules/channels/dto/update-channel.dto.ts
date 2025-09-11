import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRoleSchema } from '../../roles/dto/create-role.dto';

// ========== ZOD SCHEMA ==========
export const UpdateRoleSchema = CreateRoleSchema.partial();

// ========== DTO ==========
export class UpdateChannelDto extends createZodDto(UpdateRoleSchema) {
  @ApiPropertyOptional({ example: 'general', description: 'Tên của kênh' })
  name?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Kênh dành cho nội dung người lớn',
  })
  nsfw?: boolean;

  @ApiPropertyOptional({
    example: 'Nơi thảo luận chung',
    description: 'Chủ đề của kênh',
  })
  topic?: string;

  @ApiPropertyOptional({
    example: 'TEXT',
    description: 'Loại kênh (văn bản hoặc thoại)',
  })
  type?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Kênh có thể được quản lý bởi người dùng',
  })
  manageable?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Giới hạn tốc độ gửi tin nhắn cho người dùng (giây)',
  })
  rateLimitPerUser?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Kênh có thể xem được bởi mọi người',
  })
  viewAble?: boolean;

  @ApiPropertyOptional({
    example: ['9876543210', '1122334455'],
    description: 'Danh sách ID người nhận (dành cho kênh thoại)',
  })
  recepients?: string[];

  @ApiPropertyOptional({
    example: 50,
    description: 'Số lượng người dùng tối đa trong kênh thoại',
  })
  maxMembers?: number;

  @ApiPropertyOptional({
    example: '2025-09-08T10:00:00.000Z',
    description: 'Thời gian tạo kênh',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    example: true,
    description: 'Kênh có thể bị xóa hay không',
  })
  deleteable?: boolean;

  @ApiPropertyOptional({ example: null, description: 'Thời gian xóa kênh' })
  deletedAt?: Date;

  @ApiPropertyOptional({
    example: false,
    description: 'Kênh đã bị xóa hay chưa',
  })
  deleted?: boolean;
}
