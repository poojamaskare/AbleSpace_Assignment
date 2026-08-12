import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * The single access rule for everything project-scoped: tasks, columns,
 * labels, comments and the realtime rooms all route through here.
 *
 * It replaced `project.leadId === userId`, which was duplicated across six
 * services — with shared projects that test locks every teammate out, and
 * fixing it per caller would leave whichever caller was missed still broken.
 */
export async function assertMember(
  prisma: PrismaService,
  userId: string,
  projectId: string,
) {
  if (!(await isMember(prisma, userId, projectId))) {
    throw new ForbiddenException('You are not a member of this project');
  }
}

export async function isMember(
  prisma: PrismaService,
  userId: string,
  projectId: string,
) {
  const member = await prisma.projectMember.findUnique({
    // Compound primary key — a single indexed lookup, cheap enough to run on
    // every mutation rather than folding membership into each caller's query.
    where: { projectId_userId: { projectId, userId } },
    select: { userId: true },
  });

  return member !== null;
}

/** Prisma `where` fragment for "projects this user can see". */
export const memberOf = (userId: string) => ({
  members: { some: { userId } },
});
