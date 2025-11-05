import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ProjectManagement {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowFlake: SnowflakeID,
  ) {}

  async getProjectListInCommunity(communityId: string) {
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { communityId: communityId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.project.count({
        where: { communityId: communityId },
      }),
    ]);

    return { projects, total };
  }

  async createProject(dto: CreateProjectDto, guildId: string, ownerId: string) {
    const project = await this.prisma.project.create({
      data: {
        id: this.snowFlake.generate(),
        communityId: guildId,
        ownerId: ownerId,
        ...dto,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return project;
  }

  async getProjectById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return project;
  }

  async updateProject(dto: UpdateProjectDto, projectId: string) {
    return await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...dto,
      },
    });
  }

  async deleteProject(projectId: string) {
    return await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  async createTask(projectId: string, dto: CreateTaskDto) {
    return await this.prisma.task.create({
      data: {
        id: this.snowFlake.generate(),
        ...dto,
        projectId: projectId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  async updateTask(projectId: string, dto: UpdateTaskDto, taskId: string) {
    const res = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...dto,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return res;
  }

  async getTaskById(taskId: string) {
    return await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  async deleteTask(taskId: string) {
    return await this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}
