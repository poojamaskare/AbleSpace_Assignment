import { Priority } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const COLUMNS = ['To Do', 'Doing', 'Completed', 'On Hold'];

const LABELS = ['Research', 'Design', 'Development', 'Testing', 'Deployment'];

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
 * Give a newly created user a project with the design's columns and tasks.
 * Position values are spaced by 1000 so drag-and-drop can insert at the
 * midpoint between neighbours without renumbering siblings.
 */
export async function createStarterWorkspace(
  prisma: PrismaService,
  userId: string,
) {
  const labels = await Promise.all(
    LABELS.map((name) =>
      prisma.label.upsert({
        where: { name },
        create: { name },
        update: {},
      }),
    ),
  );
  const labelByName = new Map(labels.map((l) => [l.name, l.id]));

  const project = await prisma.project.create({
    data: {
      name: 'Design Homepage',
      priority: Priority.HIGH,
      leadId: userId,
      dueDate: daysFromNow(30),
      position: 1000,
      columns: {
        create: COLUMNS.map((name, i) => ({ name, position: (i + 1) * 1000 })),
      },
    },
    include: { columns: true },
  });

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
