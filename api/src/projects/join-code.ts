import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';

/** Six digits, zero-padded, from a CSPRNG — a join code is the only thing
 *  standing between a stranger and a team's board. */
export const joinCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * Runs a write with a freshly generated code, re-rolling if the code is already
 * taken. Codes are unique, so both creating a project and rotating its code can
 * lose that race — rare, but a failed request over a coin flip is worse than a
 * retry. Used by create and rotate alike.
 */
export async function withUniqueCode<T>(write: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(joinCode());
    } catch (error) {
      const collided =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attempt < 5;

      if (!collided) throw error;
    }
  }
}
