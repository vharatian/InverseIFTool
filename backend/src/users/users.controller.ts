import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AdminGuard } from '../auth/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post()
  async createUser(
    @Body() userData: { email: string; name: string; isAdmin?: boolean },
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new HttpException(
        'User with this email already exists',
        HttpStatus.CONFLICT,
      );
    }

    return this.usersService.create(userData);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    userData: Partial<{ email: string; name: string; isAdmin?: boolean }>,
  ): Promise<User> {
    const updatedUser = await this.usersService.update(id, userData);
    if (!updatedUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return updatedUser;
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const deleted = await this.usersService.delete(id);
    if (!deleted) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, message: 'User deleted successfully' };
  }
}
