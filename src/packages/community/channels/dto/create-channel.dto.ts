import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ApiProperty } from "@nestjs/swagger";
import { ChannelType } from "@prisma/client";

export const createChannelSchema = z.object({
    name: z.string().min(1).max(100).describe('Tên của kênh'),
    nsfw: z.boolean().default(false).describe('Kênh dành cho nội dung người lớn'),
    topic: z.string().max(1024).optional().describe('Chủ đề của kênh'),
    position: z.number().int().min(0).describe('Vị trí của kênh trong danh sách'),
    type: z.enum(ChannelType).describe('Loại kênh (văn bản hoặc thoại)'),
    manageable: z.boolean().default(true).describe('Kênh có thể được quản lý bởi người dùng'),
    isPrivate: z.boolean().default(false).describe('Kênh có phải là kênh riêng tư hay không'),
    rateLimitPerUser: z.number().int().min(0).max(120).optional().describe('Giới hạn tốc độ gửi tin nhắn cho người dùng (giây)'),
    viewAble: z.boolean().describe('Kênh có thể xem được bởi mọi người'),
    recipients: z.array(z.string()).optional().describe('Danh sách ID người nhận (dành cho kênh thoại)'),
    maxMembers: z.number().int().min(1).max(99).optional().describe('Số lượng người dùng tối đa trong kênh thoại'),
    deletable: z.boolean().default(true).describe('Kênh có thể bị xóa hay không'),
    deleted: z.boolean().default(false).describe('Kênh đã bị xóa hay chưa'),
    allowUserIds: z.array(z.string()).optional(),
    allowRoleIds: z.array(z.string()).optional(),
});

export class CreateChannelDto extends createZodDto(createChannelSchema) {
    @ApiProperty({
    example: "general",
    description: "Tên của kênh",
  })
  name: string;

  @ApiProperty({
    example: false,
    description: "Kênh dành cho nội dung người lớn",
  })
  nsfw: boolean;

  @ApiProperty({
    example: "Nơi thảo luận chung",
    description: "Chủ đề của kênh",
    required: false,
  })
  topic?: string;

  @ApiProperty({
    example: 1,
    description: "Vị trí của kênh trong danh sách",
    required: false,
  })
  position: number;

  @ApiProperty({
    example: 'GUILD_TEXT',
    description: "Loại kênh (văn bản hoặc thoại)",
  })
  type: ChannelType;

  @ApiProperty({
    example: true,
    description: "Kênh có thể được quản lý bởi người dùng",
  })
  manageable: boolean;

  @ApiProperty({
    example: false,
    description: "Kênh có phải là kênh riêng tư hay không",
  })
  isPrivate: boolean;

  @ApiProperty({
    example: 5,
    description: "Giới hạn tốc độ gửi tin nhắn cho người dùng (giây)",
    required: false,
  })
  rateLimitPerUser?: number;

  @ApiProperty({
    example: true,
    description: "Kênh có thể xem được bởi mọi người",
  })
  viewAble: boolean;

  @ApiProperty({
    example: ["9876543210", "1122334455"],
    description: "Danh sách ID người nhận (dành cho kênh thoại)",
    required: false,
  })
  recipients?: string[];

  @ApiProperty({
    example: 50,
    description: "Số lượng người dùng tối đa trong kênh thoại",
    required: false,
  })
  maxMembers?: number;

  @ApiProperty({
    example: true,
    description: "Kênh có thể bị xóa hay không",
  })
  deletable: boolean;

  @ApiProperty({
    example: false,
    description: "Kênh đã bị xóa hay chưa",
  })
  deleted: boolean;

  @ApiProperty({
    example: ["1234567890", "0987654321"],
    description: "Danh sách ID người dùng được phép truy cập kênh (dành cho kênh riêng tư)",
    required: false,
  })
  allowUserIds?: string[];

  @ApiProperty({
    example: ["roleId1", "roleId2"],
    description: "Danh sách ID vai trò được phép truy cập kênh (dành cho kênh riêng tư)",
    required: false,
  })
  allowRoleIds?: string[];
}