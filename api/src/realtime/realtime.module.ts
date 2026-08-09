import { Global, Module } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

/** Global so any feature service can broadcast without importing this module. */
@Global()
@Module({
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
