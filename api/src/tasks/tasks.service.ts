import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { positionFor } from './position';

const TASK_INCLUDE = {
  assignees: { select: { id: true, name: true, avatarUrl: true } },
  labels: { select: { id: true, name: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

/** Human-readable priority names for the activity feed. */
const PRIORITY_LABELS: Record<Priority, string> = {
  NONE: 'No priority',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** Maps an optional-nullable date field onto a Prisma update value. */
function toDateUpdate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined; // field absent — no change
  if (value === null) return null; // explicit null — clear the column
  return new Date(value);
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Every mutation routes through here. Ownership is checked by joining to the
   * project's lead rather than trusting an id from the client — otherwise any
   * authenticated guest could edit another guest's task by guessing an id.
   */
  private async assertOwnedTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      // Selects everything the callers need (ownership, placement, and the
      // fields the activity feed narrates) so update() needs no second read.
      select: {
        id: true,
        columnId: true,
        projectId: true,
        title: true,
        priority: true,
        dueDate: true,
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

  async create(userId: string, dto: CreateTaskDto, originSocketId?: string) {
    // A subtask lives wherever its parent lives; only top-level tasks need a
    // column from the client.
    let columnId = dto.columnId;
    if (dto.parentId) {
      const parent = await this.assertOwnedTask(userId, dto.parentId);
      columnId = parent.columnId;
    }

    if (!columnId) {
      throw new BadRequestException('columnId is required for a top-level task');
    }

    // One query for ownership AND the trailing position — each extra round
    // trip to the database costs real latency on every card created.
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: {
        id: true,
        projectId: true,
        project: { select: { leadId: true } },
        tasks: {
          where: { parentId: dto.parentId ?? null },
          orderBy: { position: 'desc' },
          take: 1,
          select: { position: true },
        },
      },
    });

    if (!column) throw new NotFoundException('Column not found');
    if (column.project.leadId !== userId) throw new ForbiddenException('Not your column');

    await this.assertLabelsInProject(column.projectId, dto.labelIds ?? []);
    const last = column.tasks[0];

    const created = await this.prisma.task.create({
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

    this.realtime.emit(column.projectId, 'task.created', created, originSocketId);
    return created;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
    originSocketId?: string,
  ) {
    const task = await this.assertOwnedTask(userId, id);
    if (dto.labelIds) await this.assertLabelsInProject(task.projectId, dto.labelIds);

    // Read the fields we narrate before writing, so the activity entry can name
    // what actually changed rather than just what was sent.
    const before = task;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority as Priority | undefined,
        // null means "clear it", undefined means "leave it alone". Collapsing
        // both to undefined would make clearing a date silently do nothing.
        startDate: toDateUpdate(dto.startDate),
        dueDate: toDateUpdate(dto.dueDate),
        labels: dto.labelIds ? { set: dto.labelIds.map((i) => ({ id: i })) } : undefined,
      },
      include: TASK_INCLUDE,
    });

    await this.recordChanges(id, userId, before, updated);
    this.realtime.emit(task.projectId, 'task.updated', updated, originSocketId);
    return updated;
  }

  /** Narrate the field changes the design's Updates panel shows. */
  private async recordChanges(
    taskId: string,
    actorId: string,
    before: { priority: Priority; dueDate: Date | null; title: string },
    after: { priority: Priority; dueDate: Date | null; title: string },
  ) {
    const messages: string[] = [];

    if (before.priority !== after.priority) {
      messages.push(
        `changed priority from ${PRIORITY_LABELS[before.priority]} to ${PRIORITY_LABELS[after.priority]}`,
      );
    }

    if (before.dueDate?.getTime() !== after.dueDate?.getTime()) {
      messages.push(
        after.dueDate
          ? `set the due date to ${after.dueDate.toISOString().slice(0, 10)}`
          : 'removed the due date',
      );
    }

    if (before.title !== after.title) {
      messages.push(`renamed this task from "${before.title}"`);
    }

    if (messages.length === 0) return;

    await this.prisma.activity.createMany({
      data: messages.map((message) => ({ taskId, actorId, message })),
    });
  }

  async remove(userId: string, id: string, originSocketId?: string) {
    const task = await this.assertOwnedTask(userId, id);
    await this.prisma.task.delete({ where: { id } });
    this.realtime.emit(task.projectId, 'task.deleted', { id }, originSocketId);
  }

  /** Drag-and-drop: move a task to `index` within `columnId`. */
  async move(
    userId: string,
    id: string,
    dto: MoveTaskDto,
    originSocketId?: string,
  ) {
    const task = await this.assertOwnedTask(userId, id);
    await this.assertOwnedColumn(userId, dto.columnId);

    const siblings = await this.prisma.task.findMany({
      where: { columnId: dto.columnId, parentId: null, id: { not: id } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    const moved = await this.prisma.task.update({
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

    this.realtime.emit(task.projectId, 'task.moved', moved, originSocketId);
    return moved;
  }
}
