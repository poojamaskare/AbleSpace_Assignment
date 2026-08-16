import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';
import { isMember } from '../projects/membership';

/** Everyone viewing one project shares a room; changes are announced to it. */
export const projectRoom = (projectId: string) => `project:${projectId}`;

/** One person with three tabs open is one face on the board, not three. */
export const uniqueViewers = (sockets: { data: { viewer?: Viewer } }[]) => {
  const viewers = new Map<string, Viewer>();

  for (const socket of sockets) {
    const viewer = socket.data.viewer;
    if (viewer) viewers.set(viewer.id, viewer);
  }

  return [...viewers.values()];
};

export type Viewer = { id: string; name: string; avatarUrl: string | null };

/** Who this socket is and where it is watching, so presence can be rebuilt from
 *  the room's sockets without a database round trip.
 *
 *  It lives on `data` rather than on the socket itself because that is the only
 *  part `fetchSockets()` carries back — a plain property would read as
 *  undefined there and presence would always come out empty. */
type SocketData = { viewer?: Viewer; projectId?: string; ready?: Promise<void> };

type AuthedSocket = Socket & { userId?: string; data: SocketData };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // Long-poll fallback matters on hosts that terminate idle upgrades.
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
   *
   * Nest does not await this hook, and the client emits `project:join` the
   * moment `connect` fires — that packet beats the database round trip below,
   * so the promise is parked on the socket for `join` to wait on. Without it
   * every join was rejected for an unauthenticated socket and no client ever
   * entered a room.
   */
  handleConnection(client: AuthedSocket) {
    client.data.ready = this.authenticate(client);
  }

  private async authenticate(client: AuthedSocket) {
    const token = client.handshake.auth?.token as string | undefined;

    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token ?? '', {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      client.userId = sub;

      // Read once at connect: presence is broadcast on every join and leave,
      // and re-reading the name and face each time would be a query per event.
      client.data.viewer = await this.prisma.user.findUniqueOrThrow({
        where: { id: sub },
        select: { id: true, name: true, avatarUrl: true },
      });
    } catch {
      client.disconnect(true);
    }
  }

  /** A closed tab should remove its face from the board it was watching. */
  async handleDisconnect(client: AuthedSocket) {
    if (!client.data.projectId) return;

    // The pointer goes with the tab. Presence alone would leave it stranded
    // mid-board, and a cursor that never moves again reads as a frozen app.
    client.to(projectRoom(client.data.projectId)).emit('cursor:gone', client.id);
    await this.broadcastPresence(client.data.projectId);
  }

  /**
   * Who is looking at this project right now, derived from the sockets in the
   * room. One person with two tabs open is one face, not two.
   */
  private async broadcastPresence(projectId: string) {
    const sockets = (await this.server
      .in(projectRoom(projectId))
      .fetchSockets()) as unknown as AuthedSocket[];

    this.server
      .to(projectRoom(projectId))
      .emit('presence', uniqueViewers(sockets));
  }

  /** Join a project's room, but only after proving membership. */
  @SubscribeMessage('project:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() projectId: string,
  ) {
    await client.data.ready;
    if (!client.userId || typeof projectId !== 'string') return { ok: false };

    if (!(await isMember(this.prisma, client.userId, projectId))) {
      return { ok: false };
    }

    // One room at a time: switching projects should stop the old feed.
    const previous = client.data.projectId;
    for (const room of client.rooms) {
      if (room !== client.id) await client.leave(room);
    }

    await client.join(projectRoom(projectId));
    client.data.projectId = projectId;
    this.logger.debug(`socket ${client.id} joined ${projectRoom(projectId)}`);

    // Both rooms: the board just left loses a face, the one just entered gains
    // one. Broadcasting only the new room would leave a ghost on the old board.
    if (previous && previous !== projectId) {
      client.to(projectRoom(previous)).emit('cursor:gone', client.id);
      await this.broadcastPresence(previous);
    }
    await this.broadcastPresence(projectId);

    return { ok: true };
  }

  /**
   * Where someone's pointer is on the board, relayed to the rest of the room.
   *
   * Deliberately not stored: a cursor is only ever interesting *now*, so a
   * dropped packet costs one frame rather than leaving stale state to reconcile.
   * The identity is stamped here from the authenticated socket — taking a user
   * id from the payload would let any member wear a teammate's face.
   */
  @SubscribeMessage('cursor')
  cursor(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() at: { x: number; y: number },
  ) {
    const { projectId, viewer } = client.data;
    if (!projectId || !viewer) return;
    if (!Number.isFinite(at?.x) || !Number.isFinite(at?.y)) return;

    client.to(projectRoom(projectId)).emit('cursor', {
      // Keyed by socket, not user: two tabs are two pointers, and only the
      // socket id is what `cursor:gone` can identify on disconnect.
      socketId: client.id,
      user: viewer,
      x: at.x,
      y: at.y,
    });
  }
}
