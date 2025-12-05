const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const link = 'https://www.facebook.com/share/v/1Bi9rF3Lna/';
  const theme = 'Prashan First Publish';
  const speaker = 'Prashan';
  const title = theme; // use theme as title to ensure it's visible
  const date = new Date('2025-11-23');

  try {
    const created = await prisma.sermon.create({
      data: {
        title,
        speaker,
        date,
        dateOnly: new Date(new Date(date).setUTCHours(0,0,0,0)),
        link,
        status: 'published',
        tagsJson: JSON.stringify({ theme })
      }
    });
    console.log('Created sermon:', created);
  } catch (e) {
    console.error('Error creating sermon:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) run();

module.exports = { run };