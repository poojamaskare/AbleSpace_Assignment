import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OriginSocket } from '../realtime/origin-socket.decorator';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.tasks.findOne(userId, id);
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() dto: CreateTaskDto,
    @OriginSocket() socketId?: string,
  ) {
    return this.tasks.create(userId, dto, socketId);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @OriginSocket() socketId?: string,
  ) {
    return this.tasks.update(userId, id, dto, socketId);
  }

  @Patch(':id/move')
  move(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
    @OriginSocket() socketId?: string,
  ) {
    return this.tasks.move(userId, id, dto, socketId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @OriginSocket() socketId?: string,
  ) {
    return this.tasks.remove(userId, id, socketId);
  }
}
