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
import { UpsertLabelDto } from './dto/label.dto';
import { LabelsService } from './labels.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get('projects/:projectId/labels')
  findAll(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
    return this.labels.findAll(userId, projectId);
  }

  @Post('projects/:projectId/labels')
  create(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertLabelDto,
  ) {
    return this.labels.create(userId, projectId, dto);
  }

  @Patch('labels/:id')
  rename(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpsertLabelDto,
  ) {
    return this.labels.rename(userId, id, dto);
  }

  @Delete('labels/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.labels.remove(userId, id);
  }
}
