import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { createStarterWorkspace } from './starter-workspace';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Guest login: mint a throwaway user and seed it with its own project so the
   * app opens onto real content. Each guest gets an isolated workspace — no
   * shared demo account whose data other visitors can mutate.
   */
  async loginAsGuest() {
    const id = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: `guest-${id}@pyramid.local`,
        name: 'Guest',
        username: `guest-${id.slice(0, 8)}`,
        isGuest: true,
      },
    });

    await createStarterWorkspace(this.prisma, user.id);

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: this.toPublicUser(user),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      // Email is unique in the schema; surface the clash instead of letting the
      // constraint surface as a 500.
      if (taken && taken.id !== userId) {
        throw new ConflictException('That email is already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
        title: dto.title,
        username: dto.username,
      },
    });

    return this.toPublicUser(user);
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Session no longer valid');
    return this.toPublicUser(user);
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    name: string;
    username: string | null;
    title: string | null;
    avatarUrl: string | null;
    isGuest: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      title: user.title,
      avatarUrl: user.avatarUrl,
      isGuest: user.isGuest,
    };
  }
}
