import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Trim } from '../../common/trim.decorator';

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
}
