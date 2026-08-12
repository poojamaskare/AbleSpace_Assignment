import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    // Prisma 7 requires an explicit driver adapter; the connection string is no
    // longer read from schema.prisma. Neon's pooled endpoint needs SSL, which
    // the URL's `sslmode=require` already carries.
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        // Neon cuts idle connections (compute suspends after ~5 min); a socket
        // the pool still believes in fails the next query with "Connection
        // terminated unexpectedly". Retire ours first so the pool dials a fresh
        // one instead of handing out a corpse.
        idleTimeoutMillis: 10_000,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
