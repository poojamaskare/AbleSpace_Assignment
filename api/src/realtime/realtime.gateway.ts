import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';

/** Everyone viewing one project shares a room; changes are announced to it. */
export const projectRoom = (projectId: string) => `project:${projectId}`;

type AuthedSocket = Socket & { userId?: string };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // Long-poll fallback matters on hosts that terminate idle upgrades.
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sockets authenticate with the same JWT the REST API uses — an unverified
   * socket could otherwise subscribe to any project's room and read every
   * change broadcast to it.
   */
  async handleConnection(client: AuthedSocket) {
    const token = client.handshake.auth?.token as string | undefined;

    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token ?? '', {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      client.userId = sub;
    } catch {
      client.disconnect(true);
    }
  }

  /** Join a project's room, but only after proving ownership. */
  @SubscribeMessage('project:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() projectId: string,
  ) {
    if (!client.userId || typeof projectId !== 'string') return { ok: false };

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, leadId: client.userId },
      select: { id: true },
    });

    if (!project) return { ok: false };

    // One room at a time: switching projects should stop the old feed.
    for (const room of client.rooms) {
      if (room !== client.id) await client.leave(room);
    }

    await client.join(projectRoom(projectId));
    this.logger.debug(`socket ${client.id} joined ${projectRoom(projectId)}`);
    return { ok: true };
  }
}
