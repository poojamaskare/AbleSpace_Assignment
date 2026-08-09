import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { Trim } from '../../common/trim.decorator';

export class CreateColumnDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Column name cannot be empty' })
  @MaxLength(60)
  name!: string;
}

export class UpdateColumnDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Column name cannot be empty' })
  @MaxLength(60)
  name?: string;
}

export class MoveColumnDto {
  /** Zero-based position the column should occupy in the board. */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  index!: number;
}
