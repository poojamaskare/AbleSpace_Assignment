import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthenticatedRequest } from './jwt-auth.guard';

/** Reads the user id JwtAuthGuard put on the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
