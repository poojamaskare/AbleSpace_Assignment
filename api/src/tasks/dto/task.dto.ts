import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Trim } from '../../common/trim.decorator';

export enum PriorityDto {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTaskDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** Omit for a subtask — it inherits its parent's column and project. */
  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Set to nest this task as a subtask of another. */
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  // Nullable on purpose: null clears the date, absent leaves it unchanged.
  // @IsOptional() skips validation for both null and undefined.
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class MoveTaskDto {
  /** Destination column — may be the same column for a reorder. */
  @IsString()
  columnId!: string;

  /** Zero-based index the task should occupy in the destination column. */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  index!: number;
}
