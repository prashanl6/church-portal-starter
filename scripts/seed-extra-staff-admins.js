/**
 * Upsert 2 extra admins + 2 extra staff (does not touch notices or other data).
 * Run: npm run seed:extra-users
 * Loads .env from project root (last DATABASE_URL wins if duplicated).
 */
require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env in the project root.');
  process.exit(1);
}

const prisma = new PrismaClient();

const extraUsers = [
  { name: 'Admin Three', email: 'admin3@example.com', role: 'admin', password: 'Admin@123' },
  { name: 'Admin Four', email: 'admin4@example.com', role: 'admin', password: 'Admin@123' },
  { name: 'Staff Two', email: 'staff2@example.com', role: 'staff', password: 'Staff@123' },
  { name: 'Staff Three', email: 'staff3@example.com', role: 'staff', password: 'Staff@123' },
];

async function main() {
  for (const u of extraUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      create: { name: u.name, email: u.email, role: u.role, passwordHash: hash },
      update: { name: u.name, role: u.role, passwordHash: hash },
    });
    console.log('OK:', u.email, '(' + u.role + ')');
  }
  console.log('\nDone. Log in at /login with the emails above.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
