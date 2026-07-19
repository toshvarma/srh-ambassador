/**
 * Seed script for SRH Ambassador demo data.
 *
 * Usage: npm run seed:roles
 */
'use strict';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const rolePermissionConfig = {
  Student: {
    description: 'Students can submit club ideas and sign up for approved clubs',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne'],
      'api::club.club': ['find', 'findOne', 'create', 'update'],
      'api::news-item.news-item': ['find', 'findOne'],
    },
  },
  'Exchange Student': {
    description: 'Exchange students can view clubs, events, and news',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne'],
      'api::club.club': ['find', 'findOne', 'update'],
      'api::news-item.news-item': ['find', 'findOne'],
    },
  },
  Professor: {
    description: 'Professors can publish news and manage events',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::club.club': ['find', 'findOne'],
      'api::news-item.news-item': ['find', 'findOne', 'create', 'update', 'delete'],
    },
  },
  Teacher: {
    description: 'Teachers can publish news and manage events',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update'],
      'api::club.club': ['find', 'findOne'],
      'api::news-item.news-item': ['find', 'findOne', 'create', 'update'],
    },
  },
  Ambassador: {
    description: 'Ambassadors can approve/reject club submissions and manage news',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update'],
      'api::club.club': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::news-item.news-item': ['find', 'findOne', 'create', 'update', 'delete'],
    },
  },
  Admin: {
    description: 'Admins can manage all core content',
    permissions: {
      'api::user.user': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::event.event': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::club.club': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::news-item.news-item': ['find', 'findOne', 'create', 'update', 'delete'],
    },
  },
  'Super Admin': {
    description: 'Super admins have full access',
    permissions: {
      'api::user.user': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::event.event': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::club.club': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::news-item.news-item': ['find', 'findOne', 'create', 'update', 'delete'],
    },
  },
};

const sampleUsers = [
  {
    username: 'student_sophia',
    email: 'student.sophia@srh.de',
    password: 'Student1234!',
    firstName: 'Sophia',
    lastName: 'Meyer',
    role: 'Student',
    roleName: 'Student',
    status: 'active',
    universityAffiliation: 'Computer Science',
    enrollmentYear: 2023,
  },
  {
    username: 'exchange_emma',
    email: 'exchange.emma@srh.de',
    password: 'Exchange1234!',
    firstName: 'Emma',
    lastName: 'Garcia',
    role: 'ExchangeStudent',
    roleName: 'Exchange Student',
    status: 'active',
    universityAffiliation: 'Business Administration',
    enrollmentYear: 2024,
  },
  {
    username: 'prof_thomas',
    email: 'prof.thomas@srh.de',
    password: 'Professor1234!',
    firstName: 'Thomas',
    lastName: 'Schmidt',
    role: 'Professor',
    roleName: 'Professor',
    status: 'active',
    universityAffiliation: 'Engineering Faculty',
  },
  {
    username: 'teacher_anna',
    email: 'teacher.anna@srh.de',
    password: 'Teacher1234!',
    firstName: 'Anna',
    lastName: 'Weber',
    role: 'Teacher',
    roleName: 'Teacher',
    status: 'active',
    universityAffiliation: 'Languages Department',
  },
  {
    username: 'ambassador_lars',
    email: 'ambassador.lars@srh.de',
    password: 'Ambassador1234!',
    firstName: 'Lars',
    lastName: 'Krause',
    role: 'Ambassador',
    roleName: 'Ambassador',
    status: 'active',
    universityAffiliation: 'Computer Science',
    enrollmentYear: 2022,
  },
  {
    username: 'admin_klaus',
    email: 'admin.klaus@srh.de',
    password: 'Admin1234!',
    firstName: 'Klaus',
    lastName: 'Becker',
    role: 'Admin',
    roleName: 'Admin',
    status: 'active',
    universityAffiliation: 'Administration',
  },
  {
    username: 'superadmin_srh',
    email: 'superadmin@srh.de',
    password: 'SuperAdmin1234!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'SuperAdmin',
    roleName: 'Super Admin',
    status: 'active',
    universityAffiliation: 'IT Administration',
  },
];

const sampleNews = [
  {
    title: 'New Study Lounge Opens in Building B',
    excerpt: 'A new collaborative lounge with extended opening hours is now available to all students.',
    content:
      'The new study lounge in Building B offers quiet zones, group work tables, and charging stations. It is open from 07:00 to 23:00 every day.',
    visibility: 'all',
    ageMinutes: 60,
  },
  {
    title: 'Campus Mobility App Launch',
    excerpt: 'SRH launched a new app for bus timetables, parking availability, and bike sharing.',
    content:
      'The mobility app helps students and faculty plan routes around campus and across the city, including late evening transport options.',
    visibility: 'all',
    ageMinutes: 40,
  },
  {
    title: 'Welcome Week 2026 Starts Monday',
    excerpt: 'Orientation events, campus tours, and onboarding sessions are now open for registration.',
    content:
      'Welcome Week 2026 begins on Monday. Students can join orientation sessions, library tours, and community meetups throughout the week.',
    visibility: 'all',
    ageMinutes: 20,
  },
  {
    title: 'Professor Briefing: Research Grant Window',
    excerpt: 'Internal grant applications for faculty-led interdisciplinary projects are now open.',
    content:
      'Faculty members can submit pre-proposals for the upcoming research grant cycle. Priority areas include AI, health, and sustainability.',
    visibility: 'professor',
    ageMinutes: 10,
  },
  {
    title: 'Student Opportunity: Peer Mentoring Program',
    excerpt: 'Students can apply to mentor first-year peers for the winter semester.',
    content:
      'Applications are now open for the Peer Mentoring Program. Mentors receive training and a leadership certificate at semester end.',
    visibility: 'student',
    ageMinutes: 0,
  },
];

const sampleClubs = [
  {
    title: 'SRH Robotics Club',
    shortDescription: 'Hands-on robotics projects and weekly prototyping sessions.',
    description: 'Robotics fundamentals, team projects, and competition prep.',
    detailedDescription:
      'The Robotics Club is for students interested in embedded systems, control, and practical engineering. Members build real robots and collaborate on semester challenges.',
    contact_email: 'robotics.club@srh.de',
    minimumMembers: 8,
    maximumMembers: 35,
    specialEquipmentRequired: 'Laptop with development tools. Basic electronics kit recommended.',
    meetingFrequency: 'Weekly (Thursday 18:00)',
    recommendedFor: 'Engineering and Computer Science students',
    signupNotes: 'No previous robotics experience required.',
    approvalStatus: 'approved',
    coverImageUrl: 'https://images.unsplash.com/photo-1581091215367-59ab6dcef4b5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'SRH International Language Exchange',
    shortDescription: 'Practice German and English in guided conversation groups.',
    description: 'Language tandems and cultural exchange activities.',
    detailedDescription:
      'This club helps local and exchange students improve language confidence through weekly themed sessions, games, and peer coaching.',
    contact_email: 'language.exchange@srh.de',
    minimumMembers: 10,
    maximumMembers: 60,
    specialEquipmentRequired: 'None',
    meetingFrequency: 'Weekly (Tuesday 17:30)',
    recommendedFor: 'All students, especially exchange students',
    signupNotes: 'Beginners welcome.',
    approvalStatus: 'approved',
    coverImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'SRH Sustainable Campus Initiative',
    shortDescription: 'Student-led sustainability projects for campus life.',
    description: 'Green events, recycling initiatives, and community awareness.',
    detailedDescription:
      'The Sustainable Campus Initiative proposes practical projects that reduce waste and improve sustainability outcomes on campus.',
    contact_email: 'sustainability.club@srh.de',
    minimumMembers: 6,
    maximumMembers: 30,
    specialEquipmentRequired: 'None',
    meetingFrequency: 'Bi-weekly (Wednesday 18:00)',
    recommendedFor: 'Students interested in sustainability and social impact',
    signupNotes: 'Members can join planning or operations teams.',
    approvalStatus: 'pending',
    ambassadorFeedback: 'Please include a month-by-month plan before final approval.',
    coverImageUrl: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1200&q=80',
  },
];

async function cleanupOldLegacyContent() {
  const cutoffIso = new Date(Date.now() - TWO_DAYS_MS).toISOString();
  const legacyTables = [
    'abouts',
    'announcements',
    'articles',
    'authors',
    'categories',
    'news_articles',
    'news_categories',
    'news_medias',
    'news_tags',
    'news_translations',
    'profiles',
  ];

  for (const table of legacyTables) {
    const hasCreatedAt = await strapi.db.connection.schema.hasColumn(table, 'created_at');
    if (hasCreatedAt) {
      await strapi.db.connection(table).where('created_at', '<', cutoffIso).del();
    }
  }
}

async function seedRoles() {
  console.log('Syncing role permissions...');
  for (const [roleName, roleConfig] of Object.entries(rolePermissionConfig)) {
    let role = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: roleName },
    });

    if (!role) {
      role = await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: roleName,
          description: roleConfig.description,
          type: 'custom',
        },
      });
      console.log(`  ✓ Created role: ${roleName}`);
    }

    await strapi.query('plugin::users-permissions.permission').deleteMany({
      where: { role: role.id },
    });

    for (const [controller, actions] of Object.entries(roleConfig.permissions)) {
      for (const action of actions) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            action: `${controller}.${action}`,
            role: role.id,
            enabled: true,
          },
        });
      }
    }
    console.log(`  ✓ Synced permissions for ${roleName}`);
  }
}

async function cleanupAndSeedUsers() {
  console.log('Resetting sample users...');
  const sampleEmails = new Set(sampleUsers.map((user) => user.email));

  const existingAuthUsers = await strapi.query('plugin::users-permissions.user').findMany({
    where: { provider: 'local' },
    populate: ['role'],
  });

  for (const authUser of existingAuthUsers) {
    if (!sampleEmails.has(authUser.email)) {
      await strapi.query('plugin::users-permissions.user').delete({
        where: { id: authUser.id },
      });
    } else {
      await strapi.query('plugin::users-permissions.user').delete({
        where: { id: authUser.id },
      });
    }
  }

  await strapi.db.query('api::user.user').deleteMany({ where: {} });

  const cmsUserByRole = {};

  for (const userData of sampleUsers) {
    const role = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: userData.roleName },
    });

    if (!role) {
      throw new Error(`Missing role for ${userData.email}: ${userData.roleName}`);
    }

    await strapi.plugins['users-permissions'].services.user.add({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: role.id,
    });

    const cmsUser = await strapi.documents('api::user.user').create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        universityAffiliation: userData.universityAffiliation,
        enrollmentYear: userData.enrollmentYear || null,
      },
    });

    cmsUserByRole[userData.role] = cmsUser;
    console.log(`  ✓ Seeded ${userData.role}: ${userData.email}`);
  }

  return cmsUserByRole;
}

async function cleanupAndSeedContent(cmsUserByRole) {
  console.log('Resetting demo content...');
  await strapi.db.query('api::news-item.news-item').deleteMany({ where: {} });
  await strapi.db.query('api::club.club').deleteMany({ where: {} });
  await strapi.db.query('api::event.event').deleteMany({ where: {} });

  const ambassadorUser = cmsUserByRole.Ambassador;
  const studentUser = cmsUserByRole.Student;
  const professorUser = cmsUserByRole.Professor;

  // Create clubs first so we can reference their documentIds in news
  const createdClubs = {};
  for (const club of sampleClubs) {
    const created = await strapi.documents('api::club.club').create({
      status: 'published',
      locale: 'en',
      data: {
        ...club,
        submittedBy: studentUser.documentId,
        ambassadors: [ambassadorUser.documentId],
        members: [studentUser.documentId],
      },
    });
    createdClubs[club.title] = created;
  }

  const roboticsClubId = createdClubs['SRH Robotics Club']?.documentId;

  // Seed news with per-item timestamps so student-exclusive is the most recent
  for (const item of sampleNews) {
    const author = item.visibility === 'professor' ? professorUser : ambassadorUser;
    const publishedAt = new Date(Date.now() - item.ageMinutes * 60 * 1000).toISOString();
    await strapi.documents('api::news-item.news-item').create({
      status: 'published',
      locale: 'en',
      data: {
        title: item.title,
        excerpt: item.excerpt,
        content: item.content,
        status: 'published',
        visibility: item.visibility,
        author: author.documentId,
        publishedAt,
      },
    });

    await strapi.documents('api::news-item.news-item').create({
      status: 'published',
      locale: 'de',
      data: {
        title: `${item.title} (DE)`,
        excerpt: `${item.excerpt} (DE)`,
        content: `${item.content} (DE)`,
        status: 'published',
        visibility: item.visibility,
        author: author.documentId,
        publishedAt,
      },
    });
  }

  // Seed one club-related news article linked to the Robotics club
  if (roboticsClubId) {
    await strapi.documents('api::news-item.news-item').create({
      status: 'published',
      locale: 'en',
      data: {
        title: 'Robotics Club Wins Regional Competition',
        excerpt: 'SRH Robotics Club took first place at the Baden-Württemberg student robotics challenge.',
        content: 'The SRH Robotics Club competed against 18 universities and placed first in the autonomous navigation category. Congratulations to all members!',
        status: 'published',
        visibility: 'all',
        author: ambassadorUser.documentId,
        relatedClub: roboticsClubId,
        publishedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
    });
  }

  // Seed sample events
  const eventsData = [
    {
      title: 'Campus Orientation Day',
      description: 'Welcome session for all new and exchange students. Campus tour, registration help, and social activities.',
      start_datetime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      location: 'SRH Main Hall',
    },
    {
      title: 'Robotics Club Kickoff Evening',
      description: 'Welcome session for new robotics club members. Introductions, project overview, and first prototyping task.',
      start_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      location: 'SRH Lab Building B',
      club: roboticsClubId,
    },
    {
      title: 'Student Club Fair',
      description: 'Meet all active SRH clubs, talk to current members, and sign up for the semester.',
      start_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      location: 'SRH Atrium',
    },
    {
      title: 'Guest Lecture: AI in Healthcare',
      description: 'Professor Dr. Müller presents cutting-edge research on AI applications in diagnostic medicine.',
      start_datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
      location: 'Lecture Hall C2',
    },
  ];

  for (const ev of eventsData) {
    await strapi.documents('api::event.event').create({
      status: 'published',
      locale: 'en',
      data: {
        ...ev,
        attendees: [studentUser.documentId, ambassadorUser.documentId],
      },
    });
  }

  console.log('  ✓ Seeded demo news, clubs, and event content');
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'warn';

  try {
    await cleanupOldLegacyContent();
    await seedRoles();
    const cmsUserByRole = await cleanupAndSeedUsers();
    await cleanupAndSeedContent(cmsUserByRole);
    console.log('\n✓ Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
