const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== DB-Level Uniqueness Constraint Verification ===\n');

  console.log('Existing sermons:');
  const existing = await prisma.sermon.findMany({ select: { id: true, title: true, dateOnly: true } });
  console.log(existing);

  console.log('\nAttempting to create duplicate sermon for same dateOnly...');
  try {
    const dup = await prisma.sermon.create({
      data: {
        title: 'Test Duplicate',
        speaker: 'Test',
        date: new Date('2025-11-23'),
        dateOnly: new Date('2025-11-22'),
        link: 'https://fb.com/test',
        status: 'published'
      }
    });
    console.log('❌ ERROR: Should have been rejected but created id=' + dup.id);
    process.exitCode = 1;
  } catch (e) {
    console.log('✓ EXPECTED ERROR (unique constraint rejected duplicate):');
    console.log('  Message:', e.message.split('\n')[0]);
  }

  await prisma.$disconnect();
}

if (require.main === module) verify();
