import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@dncr.ae' } });
  if (existing) {
    console.log('Admin user already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@dncr.ae',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Admin user created:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
