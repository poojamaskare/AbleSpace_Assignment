import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

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
