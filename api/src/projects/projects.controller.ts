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
import { CreateProjectDto, JoinProjectDto, UpdateProjectDto } from './dto/project.dto';
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

  @Get(':id/members')
  findMembers(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.projects.findMembers(userId, id);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(userId, dto);
  }

  // Declared before :id routes would matter if this were a GET — kept adjacent
  // to create because the two are the halves of one screen.
  @Post('join')
  @HttpCode(200)
  join(@CurrentUser() userId: string, @Body() dto: JoinProjectDto) {
    return this.projects.join(userId, dto.code);
  }

  /** Lead-only: replaces a leaked code without disturbing current members. */
  @Post(':id/code')
  @HttpCode(200)
  rotateCode(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.projects.rotateCode(userId, id);
  }

  @Delete(':id/members/me')
  @HttpCode(204)
  leave(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.projects.leave(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.projects.remove(userId, id);
  }
}
