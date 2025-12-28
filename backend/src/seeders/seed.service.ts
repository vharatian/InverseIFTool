import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seedAdminUser(): Promise<void> {
    // Check if admin user already exists
    const existingAdmin = await this.userRepository.findOne({
      where: { isAdmin: true },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = this.userRepository.create({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      isEmailVerified: true,
      isAdmin: true,
    });

    await this.userRepository.save(adminUser);

    console.log(`Admin user created: ${adminUser.email}`);
    console.log(`Admin password: ${adminPassword}`);
  }

  async seed(): Promise<void> {
    console.log('Starting database seeding...');
    await this.seedAdminUser();
    console.log('Database seeding completed');
  }
}
