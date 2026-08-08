import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.projects.findAll(userId);
  }

  @Get('default/board')
  findDefault(@CurrentUser() userId: string) {
    return this.projects.findDefault(userId);
  }

  @Get(':id/board')
  findBoard(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.projects.findBoard(userId, id);
  }
}
