import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users in DB:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
  } catch (err) {
    console.error('DB Test Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
