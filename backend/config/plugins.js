module.exports = ({ env }) => ({
  i18n: {
    enabled: true,
    config: {
      locales: ['en', 'de'],
      defaultLocale: 'en'
    }
  },
  'users-permissions': {
    enabled: true,
    config: {}
  }
});
