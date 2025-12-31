import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  HttpException,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(
    @Body() body: { email: string; name: string; password: string },
  ) {
    try {
      const { email, name, password } = body;
      const user = await this.authService.register(email, name, password);
      // Auto-login after successful registration
      return this.authService.login({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error) {
      throw new HttpException('Registration failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    try {
      return await this.authService.refreshAccessToken(body.refresh_token);
    } catch (error) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req) {
    try {
      await this.authService.revokeRefreshToken(req.user.userId);
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new HttpException(
        'Logout failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
