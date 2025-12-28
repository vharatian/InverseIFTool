import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seeders/seed.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seedService = app.get(SeedService);
  await seedService.seed();

  await app.close();
  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
