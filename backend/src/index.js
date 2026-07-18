module.exports = {
  register() {},
  bootstrap: async ({ strapi }) => {
    // Create roles if they don't exist
    const roleNames = [
      'Student',
      'Exchange Student',
      'Teacher',
      'Professor',
      'Ambassador',
      'Admin',
      'Super User'
    ];

    for (const name of roleNames) {
      try {
        const existing = await strapi.query('plugin::users-permissions.role').findOne({ where: { name } });
        if (!existing) {
          await strapi.query('plugin::users-permissions.role').create({ data: { name, description: `${name} role` } });
          strapi.log.info(`Created role: ${name}`);
        }
      } catch (e) {
        strapi.log.error(`Role creation check failed for ${name}: ${e.message}`);
      }
    }

    // Helper to create sample entries safely
    async function ensureEntry(uid, where, data) {
      const found = await strapi.entityService.findMany(uid, { filters: where, populate: ['*'] });
      if (found && found.length > 0) return found[0];
      return await strapi.entityService.create(uid, { data });
    }

    try {
      // Seed Clubs (localized)
      const clubs = [
        {
          slug: 'tech-club',
          title_en: 'Tech Club',
          title_de: 'Technik-Club',
          description_en: 'A club for technology enthusiasts.',
          description_de: 'Ein Club fÃ¼r Technikbegeisterte.'
        },
        {
          slug: 'business-club',
          title_en: 'Business Club',
          title_de: 'Business-Club',
          description_en: 'Networking and business workshops.',
          description_de: 'Networking und Business-Workshops.'
        },
        {
          slug: 'culture-club',
          title_en: 'Culture Club',
          title_de: 'Kultur-Club',
          description_en: 'Exploring arts and culture.',
          description_de: 'Kunst und Kultur entdecken.'
        }
      ];

      const createdClubs = [];
      for (const c of clubs) {
        // create English base
        const base = await ensureEntry('api::club.club', { slug: c.slug, locale: 'en' }, {
          title: c.title_en,
          description: c.description_en,
          slug: c.slug,
          locale: 'en'
        });
        // create German localization if not exists
        const deExists = await strapi.entityService.findMany('api::club.club', { filters: { slug: c.slug, locale: 'de' } });
        if (!deExists || deExists.length === 0) {
          await strapi.entityService.create('api::club.club', { data: {
            title: c.title_de,
            description: c.description_de,
            slug: c.slug,
            locale: 'de'
          }});
        }
        createdClubs.push(base);
      }

      // Seed Profiles (users)
      const profiles = [
        { email: 'alice@srh.de', name: 'Alice Schmidt', role: 'Student' },
        { email: 'bob@srh.de', name: 'Bob Mayer', role: 'Ambassador' },
        { email: 'carla@srh.de', name: 'Carla Weber', role: 'Teacher' }
      ];

      for (const p of profiles) {
        const existing = await strapi.entityService.findMany('api::profile.profile', { filters: { email: p.email } });
        if (!existing || existing.length === 0) {
          await strapi.entityService.create('api::profile.profile', { data: { name: p.name, email: p.email, role: p.role } });
        }
      }

      // Seed News
      const newsItems = [
        { slug: 'welcome', title_en: 'Welcome to SRH Ambassador', title_de: 'Willkommen beim SRH Ambassador', summary_en: 'Launch of the ambassador network.', summary_de: 'Start des Botschafternetzwerks.' },
        { slug: 'exchange-program', title_en: 'Exchange Program Open', title_de: 'Austauschprogramm geÃ¶ffnet', summary_en: 'Applications are open now.', summary_de: 'Bewerbungen sind jetzt offen.' },
        { slug: 'career-fair', title_en: 'Career Fair Next Week', title_de: 'Karrieremesse nÃ¤chste Woche', summary_en: 'Meet employers and alumni.', summary_de: 'Treffen Sie Arbeitgeber und Alumni.' },
        { slug: 'hackathon', title_en: 'Student Hackathon', title_de: 'Studenten-Hackathon', summary_en: 'Join the 48-hour challenge.', summary_de: 'Nehmen Sie an der 48-Stunden-Challenge teil.' },
        { slug: 'alumni-meet', title_en: 'Alumni Meetup', title_de: 'Alumni-Treffen', summary_en: 'Reconnect with classmates.', summary_de: 'Treffen Sie ehemalige Kommilitonen.' }
      ];

      for (const n of newsItems) {
        const exists = await strapi.entityService.findMany('api::announcement.news', { filters: { slug: n.slug, locale: 'en' } });
        if (!exists || exists.length === 0) {
          const created = await strapi.entityService.create('api::announcement.news', { data: { title: n.title_en, summary: n.summary_en, slug: n.slug, date: new Date().toISOString(), locale: 'en' } });
          await strapi.entityService.create('api::announcement.news', { data: { title: n.title_de, summary: n.summary_de, slug: n.slug, date: new Date().toISOString(), locale: 'de' } });
        }
      }

      // Seed Events
      const events = [
        { slug: 'orientation', title_en: 'Orientation Day', title_de: 'Orientierungstag', description_en: 'Welcome sessions for new students.', description_de: 'BegrÃ¼ÃŸungsveranstaltungen fÃ¼r neue Studierende.', start: new Date(Date.now()+7*24*3600*1000).toISOString(), end: new Date(Date.now()+7*24*3600*1000+2*3600*1000).toISOString() },
        { slug: 'open-lecture', title_en: 'Open Lecture: AI Trends', title_de: 'Vorlesung: KI-Trends', description_en: 'Guest lecture on AI.', description_de: 'Gastvortrag Ã¼ber KI.', start: new Date(Date.now()+14*24*3600*1000).toISOString(), end: new Date(Date.now()+14*24*3600*1000+90*60*1000).toISOString() },
        { slug: 'career-workshop', title_en: 'Career Workshop', title_de: 'Karriere-Workshop', description_en: 'CV and interview training.', description_de: 'Lebenslauf- und Interviewtraining.', start: new Date(Date.now()+21*24*3600*1000).toISOString(), end: new Date(Date.now()+21*24*3600*1000+3*3600*1000).toISOString() },
        { slug: 'christmas-party', title_en: 'Christmas Party', title_de: 'Weihnachtsfeier', description_en: 'End of year celebration.', description_de: 'Jahresabschlussfeier.', start: new Date(Date.now()+60*24*3600*1000).toISOString(), end: new Date(Date.now()+60*24*3600*1000+4*3600*1000).toISOString() }
      ];

      for (const e of events) {
        const exists = await strapi.entityService.findMany('api::event.event', { filters: { slug: e.slug, locale: 'en' } });
        if (!exists || exists.length === 0) {
          await strapi.entityService.create('api::event.event', { data: { title: e.title_en, description: e.description_en, slug: e.slug, start_datetime: e.start, end_datetime: e.end, locale: 'en' } });
          await strapi.entityService.create('api::event.event', { data: { title: e.title_de, description: e.description_de, slug: e.slug, start_datetime: e.start, end_datetime: e.end, locale: 'de' } });
        }
      }

      strapi.log.info('Seeding completed (attempted).');
    } catch (err) {
      strapi.log.error('Seeding error: ' + err.message);
    }
  }
};

