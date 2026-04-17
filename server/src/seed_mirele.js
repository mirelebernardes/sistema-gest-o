import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed para usuário mirele...');

  // 1. Criar o Negócio (Business)
  const business = await prisma.business.upsert({
    where: { publicId: 'MIRELE_TEST_STU' },
    update: {},
    create: {
      name: 'Mirele Studio',
      type: 'tattoo',
      publicId: 'MIRELE_TEST_STU',
      isActive: true,
      modules: 'agenda,financeiro,clientes,profissionais,captação,anamnese,portfólio,estoque'
    }
  });

  // 2. Criar a senha hash
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 3. Criar o Usuário mirele
  const mirele = await prisma.user.upsert({
    where: { email: 'contato@mirele.com' },
    update: {
      password: hashedPassword,
      businessId: business.id
    },
    create: {
      name: 'mirele',
      email: 'contato@mirele.com',
      password: hashedPassword,
      businessId: business.id,
      role: 'admin'
    }
  });

  console.log('✅ Seed finalizado com sucesso!');
  console.log(`   Usuário: ${mirele.name}`);
  console.log(`   Email: ${mirele.email}`);
  console.log(`   Negócio: ${business.name}`);
  console.log(`   Public ID: ${business.publicId}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
