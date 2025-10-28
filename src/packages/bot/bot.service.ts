import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBotDto } from './dto/create-bot.dto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import * as bcrypt from 'bcrypt';
import { CreateBotSkillDto } from './dto/create-skill.dto';
import { CreateBotCommandDto } from './dto/create-command.dto';
import { CreateBotActionDto } from './dto/create-action.dto';
import { PermissionUtils } from '../community/constants/guild-permissions';
import { convertBigIntToString } from '../../utils/convertBigIntToString';
import { PresenceStatus } from '@prisma/client';
import {
  BotMessageProcessor,
  MessageContext,
} from './handlers/bot-message.processor';
import { BotActionHandler } from './handlers/bot-action.handler';

@Injectable()
export class BotService {
  constructor(
    private prisma: PrismaService,
    private snowFlake: SnowflakeID,
    private messageProcessor: BotMessageProcessor,
    private actionHandler: BotActionHandler,
  ) {}

  async create(dto: CreateBotDto) {
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (existing) throw new BadRequestException('Bot name already exists');

    const password = 'bot';
    const passwordHash = await bcrypt.hash(password, 10);

    const newPresence = {
      status: PresenceStatus.OFFLINE,
      customText: null,
      activities: [],
      lastUpdated: new Date(),
    };

    // Tạo bot mới
    const bot = await this.prisma.user.create({
      data: {
        id: this.snowFlake.generate(),
        ...dto,
        isBot: true,
        passwordHash: passwordHash,
        presence: newPresence,
      },
    });

    return bot;
  }

  async createSkill(botId: string, dto: CreateBotSkillDto) {
    const bot = await this.prisma.user.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new NotFoundException('Bot not found');

    return await this.prisma.botSkill.create({
      data: {
        id: this.snowFlake.generate(),
        botId,
        name: dto.name,
        description: dto.description,
        model: dto.model ?? 'gpt-4',
      },
    });
  }

  async createCommand(botId: string, dto: CreateBotCommandDto) {
    const bot = await this.prisma.user.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new NotFoundException('Bot not found');

    if (dto.skillId) {
      const skill = await this.prisma.botSkill.findUnique({
        where: { id: dto.skillId },
      });
      if (!skill) throw new NotFoundException('Skill not found');
    }

    if (dto.actionId) {
      const action = await this.prisma.botAction.findUnique({
        where: { id: dto.actionId },
      });
      if (!action) throw new NotFoundException('Action not found');
    }

    return this.prisma.botCommand.create({
      data: {
        id: this.snowFlake.generate(),
        botId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType ?? 'PREFIX',
        pattern: dto.pattern,
        skillId: dto.skillId,
        actionId: dto.actionId,
      },
    });
  }

  async createAction(botId: string, dto: CreateBotActionDto) {
    const bot = await this.prisma.user.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new NotFoundException('Bot not found');

    const action = await this.prisma.botAction.create({
      data: {
        id: this.snowFlake.generate(),
        botId,
        name: dto.name,
        handler: dto.handler,
        paramsSchema: dto.paramsSchema,
      },
    });

    return action;
  }

  async getBot() {
    return await this.prisma.user.findMany({
      where: { isBot: true },
      include: {
        BotAction: {
          include: {
            commands: true,
          },
        },
        BotCommand: true,
        BotSkill: true,
      },
    });
  }

  async inviteBot(communityId: string, inviterId: string, botId: string) {
    const bot = await this.prisma.user.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new Error('Invalid bot ID');

    const guild = await this.prisma.guild.findUnique({
      where: { id: communityId },
    });
    if (!guild) throw new Error('Community not found');

    const existing = await this.prisma.guildMember.findFirst({
      where: { guildId: communityId, userId: botId },
    });
    if (existing) throw new Error('Bot already joined this community');

    const everyoneRole = await this.prisma.guildRole.findFirst({
      where: {
        guildId: communityId,
        name: '@everyone',
      },
    });

    if (!everyoneRole) {
      throw new Error('Default role not found for this community');
    }

    // Create guild member
    const memberId = this.snowFlake.generate();
    const botMember = await this.prisma.guildMember.create({
      data: {
        id: memberId,
        guildId: communityId,
        userId: botId,
        permissions: PermissionUtils.getDefaultPermissions(),
      },
    });
    // Assign @everyone role to the new member
    await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowFlake.generate(),
        memberId: memberId,
        roleId: everyoneRole.id,
      },
    });

    // Update guild member count
    await this.prisma.guild.update({
      where: { id: communityId },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    const botMemberFinal = convertBigIntToString(botMember);
    return {
      message: `Bot ${bot.username} joined successfully`,
      botMember: botMemberFinal,
    };
  }

  /**
   * Xử lý tin nhắn mới từ user - trigger bot commands
   */
  async handleMessage(messageContext: MessageContext) {
    return await this.messageProcessor.processMessage(messageContext);
  }

  /**
   * Lấy lịch sử thực thi commands của bot
   */
  async getCommandExecutions(botId: string, limit?: number) {
    return await this.messageProcessor.getCommandExecutions(botId, limit);
  }

  /**
   * Lấy thống kê sử dụng bot
   */
  async getBotStatistics(botId: string) {
    return await this.messageProcessor.getBotStatistics(botId);
  }

  /**
   * Lấy danh sách handlers có sẵn
   */
  getAvailableHandlers() {
    return this.actionHandler.getAvailableHandlers();
  }

  /**
   * Thực thi một action handler trực tiếp (for testing/manual trigger)
   */
  async executeAction(handlerName: string, context: any) {
    return await this.actionHandler.execute(handlerName, context);
  }
}
