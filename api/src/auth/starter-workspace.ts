import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { withUniqueCode } from '../projects/join-code';

/**
 * Columns a new project is created with.
 *
 * This is structure, not content: a task must belong to a column, so a project
 * with none cannot accept its first task and the board has nothing to render.
 * Every one can be renamed, reordered or deleted by the owner. No tasks and no
 * labels are created — the user enters those.
 */
export const STARTER_COLUMNS = ['To Do', 'Doing', 'Completed', 'On Hold'];

/**
 * Creates a project, its starter columns, its join code and the creator's
 * membership in one write — every project needs all four, and a project whose
 * creator is not a member is one nobody can open.
 */
export async function createProject(
  prisma: PrismaService,
  data: {
    userId: string;
    name: string;
    position: number;
    priority?: Prisma.ProjectCreateInput['priority'];
    dueDate?: Date;
  },
  include?: Prisma.ProjectInclude,
) {
  return withUniqueCode((code) =>
    prisma.project.create({
      data: {
        name: data.name,
        code,
        priority: data.priority,
        dueDate: data.dueDate,
        leadId: data.userId,
        position: data.position,
        members: { create: { userId: data.userId } },
        columns: {
          create: STARTER_COLUMNS.map((name, i) => ({
            name,
            position: (i + 1) * 1000,
          })),
        },
      },
      include,
    }),
  );
}

/** A new user's first project. Empty by design. */
export async function createStarterWorkspace(
  prisma: PrismaService,
  userId: string,
) {
  return createProject(prisma, { userId, name: 'My Project', position: 1000 });
}
