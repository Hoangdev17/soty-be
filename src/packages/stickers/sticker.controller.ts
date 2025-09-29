import {
	Controller,
	Post,
	Get,
	Patch,
	Delete,
	Param,
	Body,
    UseGuards,
} from '@nestjs/common';
import { GuildStickerService } from './sticker.service';
import { CreateGuildStickerDto } from './dto/create-sticker.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RequireAdministrator, RequireManageGuild } from '../community/decorators/permission-shortcuts.decorator';
import { UpdateGuildStickerDto } from './dto/update-sticker.dto';

@ApiTags('Guild Stickers')
@Controller('guild-stickers')
export class GuildStickerController {
	constructor(private readonly stickerService: GuildStickerService) {}

	@Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @RequireManageGuild()
    @RequireAdministrator()
	async create(
		@Body() body: CreateGuildStickerDto,
	) {
		return this.stickerService.create(body);
	}

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @RequireManageGuild()
    @RequireAdministrator()
    async update(
        @Param('id') id: string,
        @Body() body: UpdateGuildStickerDto,
    ) {
        return this.stickerService.update(id, body);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findAll() {
        return this.stickerService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async findOne(@Param('id') id: string) {
        return this.stickerService.findOne(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @RequireManageGuild()
    @RequireAdministrator()
    async remove(@Param('id') id: string) {
        return this.stickerService.findOne(id);
    }

}
