import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { isPreset, randomAvatar } from './avatars';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { createStarterWorkspace } from './starter-workspace';

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Google sign-in. The browser runs the GIS popup and sends us the one-time
   * code; we redeem it here because that step needs the client secret.
   *
   * The id_token comes straight back from Google's token endpoint over TLS in
   * response to a secret-authenticated request, so its payload is trusted as-is
   * — no signature check and no google-auth-library needed. (Google documents
   * this for the server-side code flow; a token received from a *client* would
   * have to be verified.)
   */
  async loginWithGoogle(code: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Google sign-in is not configured');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        // GIS popup flow: the code was minted against this literal, not a URL.
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      throw new UnauthorizedException('Google rejected the sign-in');
    }

    const { id_token } = (await res.json()) as { id_token?: string };
    if (!id_token) throw new UnauthorizedException('Google returned no identity');

    const profile = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64url').toString(),
    ) as GoogleProfile;

    if (!profile.email || !profile.email_verified) {
      throw new UnauthorizedException('That Google account has no verified email');
    }

    // Email is the identity key here, matching the schema's unique constraint.
    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            // A picked preset survives the next sign-in; refreshing it from
            // Google here would silently undo the user's choice.
            avatarUrl: isPreset(existing.avatarUrl)
              ? existing.avatarUrl
              : (profile.picture ?? existing.avatarUrl),
          },
        })
      : await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name ?? profile.email.split('@')[0],
            avatarUrl: profile.picture ?? randomAvatar(),
          },
        });

    if (!existing) await createStarterWorkspace(this.prisma, user.id);

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: this.toPublicUser(user),
    };
  }

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
        avatarUrl: randomAvatar(),
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
        avatarUrl: dto.avatarUrl,
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
