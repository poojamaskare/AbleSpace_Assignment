import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../common/trim.decorator';

export class CreateCommentDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(2000)
  body!: string;

  /** Set to reply to an existing comment. */
  @IsOptional()
  @IsString()
  parentId?: string;
}
