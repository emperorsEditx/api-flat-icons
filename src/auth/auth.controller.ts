import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('signin')
  login(@Req() req: Request, @Body() dto: LoginDto) {
    try {
      console.log('AUTH CONTROLLER - /auth/signin - headers:', req.headers);
      console.log('AUTH CONTROLLER - /auth/signin - raw body:', (req as any).rawBody || null);
      console.log('AUTH CONTROLLER - /auth/signin - parsed body:', req.body);
    } catch (e) {
      console.error('Error logging request in auth controller', e);
    }

    return this.authService.login(dto);
  }

  @Post('social-login')
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }
}
