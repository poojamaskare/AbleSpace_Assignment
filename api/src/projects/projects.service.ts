import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority } from '@prisma/client';

import { STARTER_COLUMNS } from '../auth/starter-workspace';
import { PrismaService } from '../prisma/prisma.service';
import { positionFor } from '../tasks/position';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

/** Fields every task-shaped response returns, so the board, the list view and
 *  the detail screen all read the same shape. */
const TASK_INCLUDE = {
  assignees: {
    select: { id: true, name: true, avatarUrl: true },
  },
  labels: { select: { id: true, name: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Projects the user leads. Guests only ever see their own. */
  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { leadId: userId },
      orderBy: { position: 'asc' },
      include: {
        lead: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  /**
   * The board: columns in order, each with its top-level tasks in order.
   * Subtasks are excluded (parentId: null) — they belong to the detail screen,
   * not the board.
   */
  async findBoard(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, leadId: userId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              where: { parentId: null },
              orderBy: { position: 'asc' },
              include: TASK_INCLUDE,
            },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * A new project gets the same starting columns and labels a guest's first
   * project does, so it is immediately usable instead of an empty shell.
   */
  async create(userId: string, dto: CreateProjectDto) {
    const last = await this.prisma.project.findFirst({
      where: { leadId: userId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.project.create({
      data: {
        name: dto.name,
        priority: (dto.priority as Priority) ?? Priority.NONE,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        leadId: userId,
        position: positionFor(last ? [last.position] : [], last ? 1 : 0),
        // Columns only — a task needs somewhere to live. Tasks and labels are
        // the user's to create.
        columns: {
          create: STARTER_COLUMNS.map((name, i) => ({ name, position: (i + 1) * 1000 })),
        },
      },
      include: {
        lead: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.assertOwned(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        priority: dto.priority as Priority | undefined,
        // null clears the date; undefined leaves it untouched.
        dueDate:
          dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        lead: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async remove(userId: string, projectId: string) {
    await this.assertOwned(userId, projectId);

    const remaining = await this.prisma.project.count({ where: { leadId: userId } });
    // Deleting the last project would leave /tasks with nothing to open onto.
    if (remaining <= 1) {
      throw new BadRequestException('You need at least one project');
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  private async assertOwned(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, leadId: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.leadId !== userId) throw new ForbiddenException('Not your project');
    return project;
  }

  /** The user's default project — what /tasks opens onto. */
  async findDefault(userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { leadId: userId },
      orderBy: { position: 'asc' },
    });

    if (!project) throw new NotFoundException('No project found');
    return this.findBoard(userId, project.id);
  }
}
