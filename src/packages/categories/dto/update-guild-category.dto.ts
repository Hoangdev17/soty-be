import { PartialType } from '@nestjs/mapped-types';
import { CreateGuildCategoryDto } from './create-guild-category.dto';

export class UpdateGuildCategoryDto extends PartialType(CreateGuildCategoryDto) {}
