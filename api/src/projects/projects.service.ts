import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority } from '@prisma/client';

import { createProject } from '../auth/starter-workspace';
import { PrismaService } from '../prisma/prisma.service';
import { positionFor } from '../tasks/position';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { withUniqueCode } from './join-code';
import { assertMember, memberOf } from './membership';

/** Fields every task-shaped response returns, so the board, the list view and
 *  the detail screen all read the same shape. */
const TASK_INCLUDE = {
  assignees: {
    select: { id: true, name: true, avatarUrl: true },
  },
  labels: { select: { id: true, name: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

/** Every project-shaped response: the row in the list and the one returned
 *  after create or join all read the same. */
const PROJECT_INCLUDE = {
  lead: { select: { id: true, name: true, avatarUrl: true } },
  members: {
    orderBy: { joinedAt: 'asc' },
    // The UI stacks a handful of faces and counts the rest, so the whole list
    // is never needed — `_count` carries the total.
    take: 8,
    select: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
  _count: { select: { tasks: true, members: true } },
} as const;

@Injectable()
export class ProjectsService {
  /** userId → attempts in the current window. See assertJoinAttemptAllowed. */
  private readonly joinAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Projects the user belongs to — their own, plus any they joined by code. */
  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: memberOf(userId),
      orderBy: { position: 'asc' },
      include: PROJECT_INCLUDE,
    });
  }

  /**
   * The board: columns in order, each with its top-level tasks in order.
   * Subtasks are excluded (parentId: null) — they belong to the detail screen,
   * not the board.
   */
  async findBoard(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...memberOf(userId) },
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
      where: memberOf(userId),
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    // Columns, join code and the creator's membership all come from the shared
    // creator — a guest's first project is made the same way.
    return createProject(
      this.prisma,
      {
        userId,
        name: dto.name,
        priority: (dto.priority as Priority) ?? Priority.NONE,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        position: positionFor(last ? [last.position] : [], last ? 1 : 0),
      },
      PROJECT_INCLUDE,
    );
  }

  /**
   * Join by code. Idempotent: entering a code you already hold reopens the
   * project instead of erroring, which is what someone re-pasting a code from
   * chat expects.
   */
  async join(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isGuest: true },
    });

    // A guest session is a throwaway identity nobody can recognise on a shared
    // board, and it disappears with the browser — checked before the rate limit
    // so a guest cannot burn their own allowance discovering this.
    if (user.isGuest) {
      throw new ForbiddenException(
        'Sign in with Google to join a shared project',
      );
    }

    this.assertJoinAttemptAllowed(userId);

    const project = await this.prisma.project.findUnique({
      where: { code },
      select: { id: true },
    });

    // Same message either way — a distinct "wrong code" reply would let an
    // enumerator tell live codes from dead ones.
    if (!project) throw new NotFoundException('No project found for that code');

    await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      create: { projectId: project.id, userId },
      update: {},
    });

    return this.prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: PROJECT_INCLUDE,
    });
  }

  /**
   * Six digits is a million codes — small enough to walk through at speed, so
   * guessing is capped rather than left open.
   *
   * ponytail: in-memory counter, so it resets on deploy and is per-instance.
   * Fine for one dyno; move to Redis if the API ever runs more than one.
   */
  private assertJoinAttemptAllowed(userId: string) {
    const now = Date.now();
    const attempt = this.joinAttempts.get(userId);

    if (!attempt || now > attempt.resetAt) {
      this.joinAttempts.set(userId, { count: 1, resetAt: now + 60_000 });
      return;
    }

    if (++attempt.count > 10) {
      throw new BadRequestException('Too many attempts — wait a minute and retry');
    }
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    // Any member can rename or re-prioritise; only the lead can delete.
    await assertMember(this.prisma, userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        priority: dto.priority as Priority | undefined,
        // null clears the date; undefined leaves it untouched.
        dueDate:
          dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: PROJECT_INCLUDE,
    });
  }

  /**
   * Rotates the join code — the answer to a code leaking into a public channel.
   *
   * Membership is a table of its own, so replacing the code revokes nothing:
   * everyone already in stays in, and only people holding the old code are shut
   * out. Lead-only, since it is the lead's board to close.
   */
  async rotateCode(userId: string, projectId: string) {
    await this.assertOwned(userId, projectId);

    return withUniqueCode((code) =>
      this.prisma.project.update({
        where: { id: projectId },
        data: { code },
        include: PROJECT_INCLUDE,
      }),
    );
  }

  /**
   * Leaving is how a joined member gets a project out of their list; deleting
   * it outright would take the board away from the whole team.
   */
  async leave(userId: string, projectId: string) {
    await assertMember(this.prisma, userId, projectId);

    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { leadId: true },
    });

    if (project.leadId === userId) {
      throw new BadRequestException('You lead this project — delete it instead');
    }

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async remove(userId: string, projectId: string) {
    await this.assertOwned(userId, projectId);

    const remaining = await this.prisma.project.count({ where: memberOf(userId) });
    // Deleting the last project would leave /tasks with nothing to open onto.
    if (remaining <= 1) {
      throw new BadRequestException('You need at least one project');
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  /** The people who can be assigned work on this board. */
  async findMembers(userId: string, projectId: string) {
    await assertMember(this.prisma, userId, projectId);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { joinedAt: 'asc' },
      select: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return members.map((m) => m.user);
  }

  /** Deletion stays with the lead — a joined member can only leave. */
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
      where: memberOf(userId),
      orderBy: { position: 'asc' },
    });

    if (!project) throw new NotFoundException('No project found');
    return this.findBoard(userId, project.id);
  }
}
