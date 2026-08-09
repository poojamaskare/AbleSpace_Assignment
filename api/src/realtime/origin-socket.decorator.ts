import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The socket id of the client making this request, sent as X-Socket-Id.
 *
 * Lets a broadcast skip the originator — the tab that made the change has
 * already applied it locally, so echoing it back would double-apply.
 */
export const OriginSocket = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const header = ctx.switchToHttp().getRequest<Request>().headers['x-socket-id'];
    return typeof header === 'string' ? header : undefined;
  },
);
