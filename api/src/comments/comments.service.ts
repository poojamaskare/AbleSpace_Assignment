import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/comment.dto';

const AUTHOR = { select: { id: true, name: true, avatarUrl: true } } as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnedTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, project: { select: { leadId: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.project.leadId !== userId) throw new ForbiddenException('Not your task');
    return task;
  }

  async create(userId: string, taskId: string, dto: CreateCommentDto) {
    await this.assertOwnedTask(userId, taskId);

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { taskId: true, parentId: true },
      });

      if (!parent || parent.taskId !== taskId) {
        throw new BadRequestException('Parent comment does not belong to this task');
      }
      // The design shows one level of replies; deeper nesting has no UI and
      // would render as an unbounded indent.
      if (parent.parentId) {
        throw new BadRequestException('Replies cannot be nested further');
      }
    }

    return this.prisma.comment.create({
      data: {
        body: dto.body,
        taskId,
        authorId: userId,
        parentId: dto.parentId,
      },
      include: { author: AUTHOR },
    });
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    // Only the author can delete their own comment, even on your own task.
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Not your comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
