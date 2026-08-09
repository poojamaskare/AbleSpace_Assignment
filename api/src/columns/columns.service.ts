import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { positionFor } from '../tasks/position';
import { CreateColumnDto, MoveColumnDto, UpdateColumnDto } from './dto/column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  private async assertOwnedProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, leadId: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.leadId !== userId) throw new ForbiddenException('Not your project');
    return project;
  }

  private async assertOwnedColumn(userId: string, columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: {
        id: true,
        projectId: true,
        position: true,
        project: { select: { leadId: true } },
      },
    });

    if (!column) throw new NotFoundException('Column not found');
    if (column.project.leadId !== userId) throw new ForbiddenException('Not your column');
    return column;
  }

  async create(
    userId: string,
    projectId: string,
    dto: CreateColumnDto,
    originSocketId?: string,
  ) {
    await this.assertOwnedProject(userId, projectId);

    const last = await this.prisma.column.findFirst({
      where: { projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const created = await this.prisma.column.create({
      data: {
        name: dto.name.trim(),
        projectId,
        position: positionFor(last ? [last.position] : [], last ? 1 : 0),
      },
      select: { id: true, name: true, position: true },
    });

    this.realtime.emit(projectId, 'column.created', created, originSocketId);
    return created;
  }

  async rename(
    userId: string,
    columnId: string,
    dto: UpdateColumnDto,
    originSocketId?: string,
  ) {
    const column = await this.assertOwnedColumn(userId, columnId);

    const renamed = await this.prisma.column.update({
      where: { id: columnId },
      data: { name: dto.name?.trim() },
      select: { id: true, name: true, position: true },
    });

    this.realtime.emit(column.projectId, 'column.updated', renamed, originSocketId);
    return renamed;
  }

  /** Reorder a column, using the same sparse-position scheme as tasks. */
  async move(
    userId: string,
    columnId: string,
    dto: MoveColumnDto,
    originSocketId?: string,
  ) {
    const column = await this.assertOwnedColumn(userId, columnId);

    const siblings = await this.prisma.column.findMany({
      where: { projectId: column.projectId, id: { not: columnId } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });

    const moved = await this.prisma.column.update({
      where: { id: columnId },
      data: {
        position: positionFor(
          siblings.map((s) => s.position),
          Math.min(dto.index, siblings.length),
        ),
      },
      select: { id: true, name: true, position: true },
    });

    this.realtime.emit(column.projectId, 'column.moved', moved, originSocketId);
    return moved;
  }

  async remove(userId: string, columnId: string, originSocketId?: string) {
    const column = await this.assertOwnedColumn(userId, columnId);

    const remaining = await this.prisma.column.count({
      where: { projectId: column.projectId },
    });
    // A board with no columns has nowhere to put a task and no way back —
    // refuse rather than leave the project in a dead state.
    if (remaining <= 1) {
      throw new BadRequestException('A project needs at least one column');
    }

    // Tasks cascade with the column; the client is warned before calling this.
    await this.prisma.column.delete({ where: { id: columnId } });
    this.realtime.emit(
      column.projectId,
      'column.deleted',
      { id: columnId },
      originSocketId,
    );
  }
}
