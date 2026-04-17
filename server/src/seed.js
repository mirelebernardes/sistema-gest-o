import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Cria o estúdio
  const studio = await prisma.studio.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'InkMaster Studio',
      address: 'Rua das Tatuagens, 123',
      phone: '(11) 9999-0000',
      email: 'contato@inkmaster.com.br',
      hours: JSON.stringify({
        weekdays: { start: '09:00', end: '19:00' },
        saturday: { start: '10:00', end: '18:00' }
      }),
      notifications: JSON.stringify({
        lowStock: true,
        sessionReminders: true,
        whatsappAuto: false,
        postTattooInstructions: true
      })
    }
  });

  // Cria usuário admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      id: 1,
      studioId: studio.id,
      name: 'Admin',
      role: 'admin',
      phone: '11999990000',
      password: adminPassword
    }
  });

  // Cria usuário recepção
  const receptionPassword = await bcrypt.hash('recep123', 10);
  await prisma.user.upsert({
    where: { name: 'Recepção' },
    update: {},
    create: {
      studioId: studio.id,
      name: 'Recepção',
      role: 'reception',
      phone: '11999991111',
      password: receptionPassword
    }
  });

  // Cria artista
  const artist = await prisma.artist.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      studioId: studio.id,
      name: 'Carlos Mendes',
      specialty: 'Realismo',
      phone: '11999998888',
      commission: 60,
      notificationSettings: JSON.stringify({ enabled: true, autoSend: false })
    }
  });

  // Cria cliente de exemplo
  const client = await prisma.client.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      studioId: studio.id,
      name: 'Maria Silva',
      phone: '11987654321',
      email: 'maria@email.com'
    }
  });

  console.log('✅ Seed concluído!');
  console.log(`   Estúdio: ${studio.name}`);
  console.log(`   Admin: ${admin.name} / senha: admin123`);
  console.log(`   Recepção: Recepção / senha: recep123`);
  console.log(`   Artista: ${artist.name}`);
  console.log(`   Cliente: ${client.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
