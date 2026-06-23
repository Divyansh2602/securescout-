import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: { name: 'Demo Bank', slug: 'demo-org', plan: 'enterprise', maxUsers: 100, maxScans: 10000 },
  });

  const passwordHash = await bcrypt.hash('Admin@SecurePass123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@securescout.dev' },
    update: {},
    create: {
      email: 'admin@securescout.dev',
      passwordHash, name: 'Demo Admin',
      role: 'ORG_ADMIN', orgId: org.id, emailVerified: true,
    },
  });

  console.log('✅ Seed complete. Login: admin@securescout.dev / Admin@SecurePass123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
