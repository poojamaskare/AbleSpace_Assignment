import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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

export class JoinProjectDto {
  /** Exactly six digits — anything else never matches a code, so it is rejected
   *  here rather than spending a database lookup and a rate-limit slot. */
  @Trim()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'A join code is six digits' })
  code!: string;
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
