import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT email, COUNT(*) 
    FROM "User" 
    GROUP BY email 
    HAVING COUNT(*) > 1
  `;
  console.log('Duplicate Emails:', duplicates);
  
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true, studioId: true } });
  console.log('All Users:', allUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
