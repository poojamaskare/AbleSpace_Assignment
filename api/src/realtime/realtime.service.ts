import { Injectable } from '@nestjs/common';

import { RealtimeGateway, projectRoom } from './realtime.gateway';

/** Events broadcast to a project's room. */
export type RealtimeEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted'
  | 'column.created'
  | 'column.updated'
  | 'column.moved'
  | 'column.deleted';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Announce a change to everyone watching a project.
   *
   * `originSocketId` is the socket that caused the change, sent by the client
   * as an X-Socket-Id header. It is excluded from the broadcast: that client
   * already applied the change optimistically, and echoing it back would
   * either duplicate the item or fight the in-flight local state.
   */
  emit(
    projectId: string,
    event: RealtimeEvent,
    payload: unknown,
    originSocketId?: string,
  ) {
    const room = this.gateway.server?.to(projectRoom(projectId));
    if (!room) return; // gateway not ready (e.g. during tests)

    if (originSocketId) {
      room.except(originSocketId).emit(event, payload);
    } else {
      room.emit(event, payload);
    }
  }
}
