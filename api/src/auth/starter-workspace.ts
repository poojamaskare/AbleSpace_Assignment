import { PrismaService } from '../prisma/prisma.service';

/**
 * Columns a new project is created with.
 *
 * This is structure, not content: a task must belong to a column, so a project
 * with none cannot accept its first task and the board has nothing to render.
 * Every one can be renamed, reordered or deleted by the owner. No tasks and no
 * labels are created — the user enters those.
 */
export const STARTER_COLUMNS = ['To Do', 'Doing', 'Completed', 'On Hold'];

/** A new user's first project. Empty by design. */
export async function createStarterWorkspace(
  prisma: PrismaService,
  userId: string,
) {
  return prisma.project.create({
    data: {
      name: 'My Project',
      leadId: userId,
      position: 1000,
      columns: {
        create: STARTER_COLUMNS.map((name, i) => ({ name, position: (i + 1) * 1000 })),
      },
    },
  });
}
