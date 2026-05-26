import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const merchant = await prisma.merchant.upsert({
    where: { slug: 'demo-merchant' },
    update: {},
    create: {
      name: 'Demo Merchant',
      ntn: 'NTN12345',
      slug: 'demo-merchant',
      address: '123 Demo Street',
      category: 'restaurant',
      contactNumber: '0123456789',
    },
  });

  const branch = await prisma.branch.findFirst({
    where: {
      merchantId: merchant.id,
      name: 'Main Branch',
    },
  });

  if (!branch) {
    await prisma.branch.create({
      data: {
        merchantId: merchant.id,
        name: 'Main Branch',
        address: '123 Demo Street',
        contactNumber: '0123456789',
        city: 'Karachi',
        openingTimeMinutes: 480,
        closingTimeMinutes: 1320,
      },
    });
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminActor = await prisma.actor.upsert({
    where: {
      merchantId_email: { merchantId: merchant.id, email: 'admin@demo.com' },
    },
    update: {},
    create: {
      merchantId: merchant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
    },
  });

  // Ensure an admin role exists for this merchant and assign it to the seeded actor
  const adminRole = await prisma.role.upsert({
    where: {
      merchantId_roleType: {
        merchantId: merchant.id,
        roleType: RoleType.admin,
      },
    },
    update: {},
    create: {
      merchantId: merchant.id,
      roleType: RoleType.admin,
      description: 'admin role',
    },
  });

  await prisma.actorRole.upsert({
    where: {
      merchantId_actorId: { merchantId: merchant.id, actorId: adminActor.id },
    },
    update: {},
    create: {
      merchantId: merchant.id,
      actorId: adminActor.id,
      roleId: adminRole.id,
    },
  });

  // Create an area and zone. We avoid inserting PostGIS geometry directly so this
  // script can run even if the database doesn't have the PostGIS extension. The
  // `coordinatesWkt` field stores a WKT representation which you can later convert
  // to geometry with PostGIS functions if the extension is available.
  const area = await prisma.area.upsert({
    where: { name_city: { name: 'Demo Area', city: 'Karachi' } },
    update: {},
    create: {
      name: 'Demo Area',
      city: 'Karachi',
    },
  });

  await prisma.zone.upsert({
    where: { areaId_name: { areaId: area.id, name: 'Demo Zone' } },
    update: {},
    create: {
      areaId: area.id,
      name: 'Demo Zone',
      // small sample polygon WKT
      coordinatesWkt:
        'POLYGON((67.0 24.0,67.1 24.0,67.1 24.1,67.0 24.1,67.0 24.0))',
    },
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
