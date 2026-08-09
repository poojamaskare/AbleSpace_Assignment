import { Controller, Get } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health check for the platform and for waking a sleeping instance.
   * Touches the database so a green response means the API can actually serve
   * requests, not merely that the process is up.
   */
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
