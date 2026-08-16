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

/**
 * The write gate: a member who is allowed to change the board.
 *
 * A guest keeps full control of the projects they lead — their own starter
 * workspace is theirs. On a board they joined with someone else's code they can
 * watch but not touch: a guest identity is anonymous and disappears with the
 * browser, so edits made under it cannot be attributed or undone by the team.
 *
 * One query answers all three questions (member? guest? lead?) because the
 * membership row can reach both the project and the user.
 */
export async function assertCanEdit(
  prisma: PrismaService,
  userId: string,
  projectId: string,
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: {
      project: { select: { leadId: true } },
      user: { select: { isGuest: true } },
    },
  });

  if (!member) {
    throw new ForbiddenException('You are not a member of this project');
  }

  if (member.user.isGuest && member.project.leadId !== userId) {
    throw new ForbiddenException(
      'Guests can view a shared board but not change it — sign in with Google to edit',
    );
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
