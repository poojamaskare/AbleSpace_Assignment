import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { assertCanEdit, assertMember } from '../projects/membership';
import { UpsertLabelDto } from './dto/label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnedProject(userId: string, projectId: string, write = true) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    await (write
      ? assertCanEdit(this.prisma, userId, projectId)
      : assertMember(this.prisma, userId, projectId));
    return project;
  }

  private async assertOwnedLabel(userId: string, labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: { id: true, projectId: true },
    });

    if (!label) throw new NotFoundException('Label not found');
    await assertCanEdit(this.prisma, userId, label.projectId);
    return label;
  }

  async findAll(userId: string, projectId: string) {
    // A read: a guest viewing a shared board still needs the label list to
    // render the chips on its cards.
    await this.assertOwnedProject(userId, projectId, false);
    return this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(userId: string, projectId: string, dto: UpsertLabelDto) {
    await this.assertOwnedProject(userId, projectId);

    const name = dto.name.trim();
    const existing = await this.prisma.label.findUnique({
      where: { projectId_name: { projectId, name } },
    });
    // Names are unique per project, so surface the clash rather than letting
    // the database constraint bubble up as a 500.
    if (existing) throw new ConflictException(`Label "${name}" already exists`);

    return this.prisma.label.create({
      data: { name, projectId },
      select: { id: true, name: true },
    });
  }

  async rename(userId: string, labelId: string, dto: UpsertLabelDto) {
    const label = await this.assertOwnedLabel(userId, labelId);
    const name = dto.name.trim();

    const clash = await this.prisma.label.findUnique({
      where: { projectId_name: { projectId: label.projectId, name } },
    });
    if (clash && clash.id !== labelId) {
      throw new ConflictException(`Label "${name}" already exists`);
    }

    return this.prisma.label.update({
      where: { id: labelId },
      data: { name },
      select: { id: true, name: true },
    });
  }

  async remove(userId: string, labelId: string) {
    await this.assertOwnedLabel(userId, labelId);
    // The implicit join rows go with it; tasks themselves are untouched.
    await this.prisma.label.delete({ where: { id: labelId } });
  }
}
