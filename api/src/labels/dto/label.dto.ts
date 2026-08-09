import { IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../common/trim.decorator';

export class UpsertLabelDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Label name cannot be empty' })
  @MaxLength(40)
  name!: string;
}
