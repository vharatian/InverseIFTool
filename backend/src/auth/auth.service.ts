import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

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
    return {
      access_token: this.jwtService.sign(payload),
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
}
