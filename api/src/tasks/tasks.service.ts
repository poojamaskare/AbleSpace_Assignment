import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { positionFor } from './position';

const TASK_INCLUDE = {
  assignees: { select: { id: true, name: true, avatarUrl: true } },
  labels: { select: { id: true, name: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every mutation routes through here. Ownership is checked by joining to the
   * project's lead rather than trusting an id from the client — otherwise any
   * authenticated guest could edit another guest's task by guessing an id.
   */
  private async assertOwnedTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        columnId: true,
        projectId: true,
        project: { select: { leadId: true } },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.project.leadId !== userId) {
      throw new ForbiddenException('Not your task');
    }
    return task;
  }

  private async assertOwnedColumn(userId: string, columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { id: true, projectId: true, project: { select: { leadId: true } } },
    });

    if (!column) throw new NotFoundException('Column not found');
    if (column.project.leadId !== userId) {
      throw new ForbiddenException('Not your column');
    }
    return column;
  }

  /**
   * Labels are project-scoped, so a labelId from the client must be proven to
   * belong to the same project before it is connected — otherwise the scoping
   * added to the Label model is trivially bypassed through this field.
   */
  private async assertLabelsInProject(projectId: string, labelIds: string[]) {
    if (labelIds.length === 0) return;

    const found = await this.prisma.label.count({
      where: { projectId, id: { in: labelIds } },
    });

    if (found !== new Set(labelIds).size) {
      throw new BadRequestException('One or more labels do not belong to this project');
    }
  }

  findOne(userId: string, id: string) {
    return this.assertOwnedTask(userId, id).then(() =>
      this.prisma.task.findUnique({
        where: { id },
        include: {
          ...TASK_INCLUDE,
          reporter: { select: { id: true, name: true, avatarUrl: true } },
          subtasks: { orderBy: { position: 'asc' }, include: TASK_INCLUDE },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      }),
    );
  }

  async create(userId: string, dto: CreateTaskDto) {
    const column = await this.assertOwnedColumn(userId, dto.columnId);
    await this.assertLabelsInProject(column.projectId, dto.labelIds ?? []);

    const last = await this.prisma.task.findFirst({
      where: { columnId: dto.columnId, parentId: dto.parentId ?? null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as Priority) ?? Priority.NONE,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        parentId: dto.parentId,
        position: positionFor(last ? [last.position] : [], last ? 1 : 0),
        projectId: column.projectId,
        columnId: column.id,
        reporterId: userId,
        // Default the creator as assignee: an unowned task is a task nobody
        // picks up, and it keeps new cards visually consistent with seeded ones.
        assignees: { connect: { id: userId } },
        labels: dto.labelIds?.length
          ? { connect: dto.labelIds.map((id) => ({ id })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.assertOwnedTask(userId, id);
    if (dto.labelIds) await this.assertLabelsInProject(task.projectId, dto.labelIds);

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority as Priority | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        labels: dto.labelIds ? { set: dto.labelIds.map((i) => ({ id: i })) } : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnedTask(userId, id);
    await this.prisma.task.delete({ where: { id } });
  }

  /** Drag-and-drop: move a task to `index` within `columnId`. */
  async move(userId: string, id: string, dto: MoveTaskDto) {
    await this.assertOwnedTask(userId, id);
    await this.assertOwnedColumn(userId, dto.columnId);

    const siblings = await this.prisma.task.findMany({
      where: { columnId: dto.columnId, parentId: null, id: { not: id } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    return this.prisma.task.update({
      where: { id },
      data: {
        columnId: dto.columnId,
        position: positionFor(
          siblings.map((s) => s.position),
          Math.min(dto.index, siblings.length),
        ),
      },
      include: TASK_INCLUDE,
    });
  }
}
