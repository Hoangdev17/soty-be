import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BotService } from './bot.service';
import { CreateBotDto } from './dto/create-bot.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CreateBotSkillDto } from './dto/create-skill.dto';
import { CreateBotActionDto } from './dto/create-action.dto';
import { CreateBotCommandDto } from './dto/create-command.dto';
import { ProcessMessageDto } from './dto/process-message.dto';
import type { AuthenticatedRequest } from '../../core/auth/dto/request-with-auth.dto';

@ApiTags('Bot')
@Controller('bots')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tát cả bot' })
  async getBot() {
    return this.botService.getBot();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Tạo bot mới' })
  async create(@Req() req, @Body() dto: CreateBotDto) {
    return this.botService.create(dto);
  }

  @Post(':botId/skills')
  @ApiOperation({ summary: 'Thêm skill mới cho bot' })
  @ApiResponse({ status: 201, description: 'Skill created successfully' })
  async createSkill(
    @Param('botId') botId: string,
    @Body() dto: CreateBotSkillDto,
  ) {
    return this.botService.createSkill(botId, dto);
  }

  @Post(':botId/skills/:skillId/actions')
  @ApiOperation({ summary: 'Thêm action cho skill của bot' })
  @ApiResponse({ status: 201, description: 'Action created successfully' })
  async createAction(
    @Param('botId') botId: string,
    @Param('skillId') skillId: string,
    @Body() dto: CreateBotActionDto,
  ) {
    return this.botService.createAction(botId, dto);
  }

  @Post(':botId/commands')
  @ApiOperation({ summary: 'Thêm command cho bot' })
  @ApiResponse({ status: 201, description: 'Command created successfully' })
  async createCommand(
    @Param('botId') botId: string,
    @Body() dto: CreateBotCommandDto,
  ) {
    return this.botService.createCommand(botId, dto);
  }

  @Post(':botId/invite/:communityId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mời bot vào cộng đồng' })
  @ApiResponse({ status: 201, description: 'Bot invited successfully' })
  async inviteBot(
    @Param('botId') botId: string,
    @Param('communityId') communityId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.botService.inviteBot(communityId, req.user.id, botId);
  }

  @Get(':botId/handlers')
  @ApiOperation({ summary: 'Lấy danh sách handlers có sẵn' })
  @ApiResponse({ status: 200, description: 'List of available handlers' })
  async getAvailableHandlers() {
    return {
      handlers: this.botService.getAvailableHandlers(),
    };
  }

  @Get(':botId/executions')
  @ApiOperation({ summary: 'Lấy lịch sử thực thi commands' })
  @ApiResponse({ status: 200, description: 'Command execution history' })
  async getCommandExecutions(@Param('botId') botId: string) {
    return this.botService.getCommandExecutions(botId);
  }

  @Get(':botId/statistics')
  @ApiOperation({ summary: 'Lấy thống kê sử dụng bot' })
  @ApiResponse({ status: 200, description: 'Bot usage statistics' })
  async getBotStatistics(@Param('botId') botId: string) {
    return this.botService.getBotStatistics(botId);
  }

  @Post('process-message')
  @ApiOperation({ summary: 'Xử lý tin nhắn (trigger bot commands)' })
  @ApiResponse({ status: 200, description: 'Message processed successfully' })
  async processMessage(@Body() dto: ProcessMessageDto) {
    await this.botService.handleMessage(dto);
    return { message: 'Message processed' };
  }
}
