import { Priority } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** Columns a new project starts with, mirroring the Figma board. Seed content
 *  only — the owner renames, reorders, adds and deletes them freely. */
export const STARTER_COLUMNS = ['To Do', 'Doing', 'Completed', 'On Hold'];

/** Labels a new project starts with, mirroring the Figma detail screen. Seed
 *  content only — the owner manages labels through /projects/:id/labels. */
export const STARTER_LABELS = ['Research', 'Design', 'Development', 'Testing', 'Deployment'];

/** Tasks mirroring the Figma board so a fresh guest sees a populated app
 *  rather than an empty state that reads as broken. */
const SEED_TASKS: {
  column: string;
  title: string;
  description?: string;
  priority: Priority;
  labels: string[];
  dueInDays: number;
}[] = [
  {
    column: 'To Do',
    title: 'Write API Documentation',
    description:
      'Create clear and detailed API documentation to guide developers in using the inventory and sales metrics features effectively.',
    priority: Priority.HIGH,
    labels: ['Research', 'Design', 'Development', 'Testing', 'Deployment'],
    dueInDays: 3,
  },
  {
    column: 'To Do',
    title: 'Implement Search Function',
    priority: Priority.MEDIUM,
    labels: ['Development'],
    dueInDays: 5,
  },
  {
    column: 'To Do',
    title: 'Deploy to Production',
    priority: Priority.URGENT,
    labels: ['Deployment'],
    dueInDays: 7,
  },
  {
    column: 'Doing',
    title: 'Code Review Completed',
    priority: Priority.MEDIUM,
    labels: ['Development'],
    dueInDays: 2,
  },
  {
    column: 'Doing',
    title: 'Design Mockups Finalized',
    priority: Priority.LOW,
    labels: ['Design'],
    dueInDays: 4,
  },
  {
    column: 'Completed',
    title: 'Feature Testing Passed',
    priority: Priority.MEDIUM,
    labels: ['Testing'],
    dueInDays: 1,
  },
  {
    column: 'Completed',
    title: 'UI Design Updated',
    priority: Priority.LOW,
    labels: ['Design'],
    dueInDays: 6,
  },
  {
    column: 'Completed',
    title: 'Security Audit Scheduled',
    priority: Priority.HIGH,
    labels: ['Research'],
    dueInDays: 9,
  },
  {
    column: 'On Hold',
    title: 'UI Review Pending',
    priority: Priority.LOW,
    labels: ['Design'],
    dueInDays: 12,
  },
  {
    column: 'On Hold',
    title: 'Backend Integration',
    priority: Priority.HIGH,
    labels: ['Development'],
    dueInDays: 14,
  },
];

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Fill an existing project with the design's example tasks.
 *
 * Split out from user signup so any newly created project gets the same
 * starting content — a project whose board is empty on arrival reads as broken
 * rather than as new. Safe to call only on an empty project; it appends.
 *
 * Positions are spaced by 1000 so drag-and-drop can insert at the midpoint
 * between neighbours without renumbering siblings.
 */
export async function seedProjectTasks(
  prisma: PrismaService,
  projectId: string,
  userId: string,
) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { columns: true, labels: true },
  });

  const labelByName = new Map(project.labels.map((l) => [l.name, l.id]));
  const columnByName = new Map(project.columns.map((c) => [c.name, c.id]));
  const positionInColumn = new Map<string, number>();

  for (const task of SEED_TASKS) {
    const columnId = columnByName.get(task.column);
    if (!columnId) continue;

    const position = (positionInColumn.get(task.column) ?? 0) + 1000;
    positionInColumn.set(task.column, position);

    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: daysFromNow(task.dueInDays),
        position,
        projectId: project.id,
        columnId,
        reporterId: userId,
        assignees: { connect: { id: userId } },
        labels: {
          connect: task.labels
            .map((name) => labelByName.get(name))
            .filter((id): id is string => Boolean(id))
            .map((id) => ({ id })),
        },
      },
    });
  }

  return project;
}
