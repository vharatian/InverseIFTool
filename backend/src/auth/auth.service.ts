import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: AuthUser) {
    const payload = { email: user.email, sub: user.id, name: user.name };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async register(email: string, name: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      name,
      password: hashedPassword,
      isEmailVerified: false,
      isAdmin: false, // Regular registration always creates non-admin users
    });
    return this.userRepository.save(user);
  }

  async findOrCreateGoogleUser(profile: any): Promise<User> {
    const { id, emails, displayName, photos } = profile;

    let user = await this.userRepository.findOne({ where: { googleId: id } });

    if (!user) {
      // Check if user exists with same email
      const existingUser = await this.userRepository.findOne({
        where: { email: emails[0].value },
      });

      if (existingUser) {
        // Link Google account to existing user
        existingUser.googleId = id;
        existingUser.avatar = photos?.[0]?.value;
        user = await this.userRepository.save(existingUser);
      } else {
        // Create new user
        user = this.userRepository.create({
          email: emails[0].value,
          name: displayName,
          googleId: id,
          avatar: photos?.[0]?.value,
          isEmailVerified: true,
          isAdmin: false, // OAuth users start as non-admin
        });
        user = await this.userRepository.save(user);
      }
    }

    return user;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...result } = user;
    return result as User;
  }

  /**
   * Generate a new refresh token for a user
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    // Revoke existing refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    // Generate new refresh token
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }

  /**
   * Validate and refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenEntity || tokenEntity.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = tokenEntity.user;
    const payload = { email: user.email, sub: user.id, name: user.name };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Revoke refresh token (for logout)
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }
}
