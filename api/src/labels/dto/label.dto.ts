import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertLabelDto {
  @IsString()
  @MinLength(1, { message: 'Label name cannot be empty' })
  @MaxLength(40)
  name!: string;
}
