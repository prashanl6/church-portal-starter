require('./load-env-from-dotenv.cjs').loadEnvFromProjectRoot();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Helper to get the last N Sundays
function getLastSundays(count) {
  const sundays = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = (dayOfWeek === 0 ? 0 : dayOfWeek);
  
  for (let i = 0; i < count; i++) {
    const sunday = new Date(today);
    sunday.setDate(sunday.getDate() - daysUntilSunday - (i * 7));
    sundays.push(sunday);
  }
  return sundays;
}

async function seed() {
  const users = [
    { name: 'Admin One', email: 'admin1@example.com', role: 'admin', password: 'Admin@123' },
    { name: 'Admin Two', email: 'admin2@example.com', role: 'admin', password: 'Admin@123' },
    { name: 'Admin Three', email: 'admin3@example.com', role: 'admin', password: 'Admin@123' },
    { name: 'Admin Four', email: 'admin4@example.com', role: 'admin', password: 'Admin@123' },
    { name: 'Staff', email: 'staff@example.com', role: 'staff', password: 'Staff@123' },
    { name: 'Staff Two', email: 'staff2@example.com', role: 'staff', password: 'Staff@123' },
    { name: 'Staff Three', email: 'staff3@example.com', role: 'staff', password: 'Staff@123' },
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      create: { name: u.name, email: u.email, role: u.role, passwordHash: hash },
      update: {}
    });
  }
  
  // Clear existing notices
  await prisma.notice.deleteMany({});
  
  // Create 5 notices for the last 5 Sundays
  const sundays = getLastSundays(5);
  const noticeTemplates = [
    {
      title: 'Sunday Worship Service',
      bodyHtml: `<div style="font-family: serif; line-height: 1.6; max-width: 800px;">
        <h1>Sunday Worship Service</h1>
        <p>Join us for our weekly Sunday worship service.</p>
        <h2>Service Details:</h2>
        <ul>
          <li><strong>Time:</strong> 10:00 AM</li>
          <li><strong>Location:</strong> Main Sanctuary</li>
          <li><strong>Duration:</strong> 60 minutes</li>
        </ul>
        <h2>What to Expect:</h2>
        <p>Join us for a time of worship, prayer, and a message from God's Word. We have a wonderful praise band and an inspiring sermon.</p>
        <p>All are welcome! Bring your family and friends.</p>
      </div>`
    },
    {
      title: 'Community Outreach Program',
      bodyHtml: `<div style="font-family: serif; line-height: 1.6; max-width: 800px;">
        <h1>Community Outreach Program</h1>
        <p>This Sunday, we are organizing a community outreach program to help those in need.</p>
        <h2>Activities:</h2>
        <ul>
          <li>Food Drive Collection</li>
          <li>Community Cleanup</li>
          <li>Prayer with Families in Need</li>
        </ul>
        <h2>How to Help:</h2>
        <p>Volunteers needed! Please sign up at the welcome desk or contact our volunteer coordinator.</p>
        <p><em>Every act of kindness makes a difference in our community.</em></p>
      </div>`
    },
    {
      title: 'Baptism Sunday Celebration',
      bodyHtml: `<div style="font-family: serif; line-height: 1.6; max-width: 800px;">
        <h1>Baptism Sunday Celebration</h1>
        <p>This Sunday is a special occasion as we celebrate the baptism of new members of our faith community.</p>
        <h2>Schedule:</h2>
        <ul>
          <li>10:00 AM - Regular Worship Service</li>
          <li>11:00 AM - Baptism Ceremony (Outdoor Pool)</li>
          <li>12:00 PM - Fellowship Celebration with Lunch</li>
        </ul>
        <p>Come celebrate with us as we welcome these new believers!</p>
      </div>`
    },
    {
      title: 'Youth Group Meeting & Game Night',
      bodyHtml: `<div style="font-family: serif; line-height: 1.6; max-width: 800px;">
        <h1>Youth Group Meeting & Game Night</h1>
        <p>Calling all youth (ages 13-18)! Join us for an exciting game night this Sunday.</p>
        <h2>Event Details:</h2>
        <ul>
          <li><strong>Time:</strong> 6:00 PM - 8:30 PM</li>
          <li><strong>Location:</strong> Youth Center</li>
          <li><strong>Activities:</strong> Games, Snacks, Fellowship</li>
        </ul>
        <p>Bring your friends! Sign up forms available at the welcome desk.</p>
      </div>`
    },
    {
      title: 'Prayer & Praise Service',
      bodyHtml: `<div style="font-family: serif; line-height: 1.6; max-width: 800px;">
        <h1>Prayer & Praise Service</h1>
        <p>Join us for a special evening of prayer and praise focused on intercession and worship.</p>
        <h2>Service Details:</h2>
        <ul>
          <li><strong>Time:</strong> 7:00 PM</li>
          <li><strong>Location:</strong> Chapel</li>
          <li><strong>Focus:</strong> Prayer for our community and nation</li>
        </ul>
        <h2>What to Bring:</h2>
        <p>Bring your Bible and your prayers. This is an intimate time of worship and intercession.</p>
        <p>All are welcome to participate and pray.</p>
      </div>`
    }
  ];
  
  for (let i = 0; i < sundays.length; i++) {
    await prisma.notice.create({
      data: {
        title: noticeTemplates[i].title,
        bodyHtml: noticeTemplates[i].bodyHtml,
        weekOf: sundays[i],
        status: 'published'
      }
    });
  }
  
  console.log('Seed complete - 5 notices created for the last 5 Sundays');
}

module.exports = { seed };
