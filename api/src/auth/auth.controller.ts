import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('guest')
  @HttpCode(200)
  loginAsGuest() {
    return this.auth.loginAsGuest();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() userId: string) {
    return this.auth.findById(userId);
  }
}
