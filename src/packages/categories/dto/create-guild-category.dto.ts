import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateGuildCategoryDto {
  @ApiProperty({ example: "General" })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number = 0;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  nsfw?: boolean = false;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  permissionsLocked?: boolean = false;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  deletable?: boolean = true;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  deleted?: boolean = false;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  manageable?: boolean = true;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  viewable?: boolean = true;

  @ApiProperty({ example: "b62d9d3f-8a4d-4f4e-8f2c-9c29d29b4d51" })
  @IsString()
  guildId: string;
}

export class UpdateGuildCategoryDto extends PartialType(CreateGuildCategoryDto) {}
