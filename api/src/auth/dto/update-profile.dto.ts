import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../common/trim.decorator';
import { AVATAR_PRESETS } from '../avatars';

export class UpdateProfileDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Trim()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  username?: string;

  /** Only one of ours: an arbitrary URL here would let anyone point every
   *  teammate's avatar at a host of their choosing. */
  @IsOptional()
  @IsIn(AVATAR_PRESETS)
  avatarUrl?: string;
}
