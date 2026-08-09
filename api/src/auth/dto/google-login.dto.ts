import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleLoginDto {
  /** One-time authorization code from Google Identity Services (popup flow). */
  @IsString()
  @IsNotEmpty()
  code!: string;
}
