import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/trim.decorator';
import { PriorityDto } from '../../tasks/dto/task.dto';

export class CreateProjectDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Project name cannot be empty' })
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class UpdateProjectDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Project name cannot be empty' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
