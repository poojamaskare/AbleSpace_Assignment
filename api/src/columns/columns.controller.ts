import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ColumnsService } from './columns.service';
import { CreateColumnDto, MoveColumnDto, UpdateColumnDto } from './dto/column.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post('projects/:projectId/columns')
  create(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columns.create(userId, projectId, dto);
  }

  @Patch('columns/:id')
  rename(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columns.rename(userId, id, dto);
  }

  @Patch('columns/:id/move')
  move(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: MoveColumnDto,
  ) {
    return this.columns.move(userId, id, dto);
  }

  @Delete('columns/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.columns.remove(userId, id);
  }
}
