/**
 * Permissions Configuration for SRH Ambassador CMS
 * 
 * This file defines the permission structure for each user role.
 * These permissions need to be configured in the Strapi admin panel
 * or can be set programmatically using a seed script.
 */

const ROLE_PERMISSIONS = {
  // Anonymous/Public Role - Minimal read-only access
  public: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne'],
    club: ['find', 'findOne'],
    'news-item': ['find', 'findOne'],
  },

  // Authenticated Base Role - All users have these permissions
  authenticated: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne'],
    club: ['find', 'findOne'],
    'news-item': ['find', 'findOne'],
  },

  // Student Role
  // Students can:
  // - View events, clubs, news
  // - Create club submissions
  // - Join clubs (read memberships)
  // - Attend events (read attendances)
  student: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne'],
    club: ['find', 'findOne', 'create', 'update'],
    'news-item': ['find', 'findOne'],
  },

  // Exchange Student Role
  // Exchange students can:
  // - View events, clubs, news
  // - Join clubs (but cannot create clubs)
  // - Attend events
  // - LIMITED user operations (view profiles)
  'exchange-student': {
    user: ['find', 'findOne'],
    event: ['find', 'findOne'],
    club: ['find', 'findOne', 'update'],
    'news-item': ['find', 'findOne'],
  },

  // Professor Role
  // Professors can:
  // - View all content
  // - Publish news articles
  // - Create events
  // - Manage club resources
  professor: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne', 'create', 'update'],
    club: ['find', 'findOne'],
    'news-item': ['find', 'findOne', 'create', 'update', 'delete'],
  },

  // Teacher Role
  // Similar to Professor but with slightly less permissions
  // - View all content
  // - Publish news articles
  // - Create events
  teacher: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne', 'create', 'update'],
    club: ['find', 'findOne'],
    'news-item': ['find', 'findOne', 'create', 'update'],
  },

  // Ambassador Role (Special Student Group)
  // Ambassadors can:
  // - Approve/reject club submissions
  // - Manage club members and events
  // - Publish news articles
  // - View and manage users (within their clubs)
  // - Moderate content
  ambassador: {
    user: ['find', 'findOne'],
    event: ['find', 'findOne', 'create', 'update'],
    club: ['find', 'findOne', 'create', 'update'],
    'news-item': ['find', 'findOne', 'create', 'update'],
  },

  // Admin Role
  // Admins can:
  // - Full CRUD on users, clubs, events, news
  // - Cannot delete admins or change super admin status
  admin: {
    user: ['find', 'findOne', 'create', 'update'],
    event: ['find', 'findOne', 'create', 'update', 'delete'],
    club: ['find', 'findOne', 'create', 'update', 'delete'],
    'news-item': ['find', 'findOne', 'create', 'update', 'delete'],
  },

  // Super Admin Role
  // Super Admins can:
  // - Full CRUD on all content types
  // - Manage user roles
  // - Access admin panel settings
  'super-admin': {
    user: ['find', 'findOne', 'create', 'update', 'delete'],
    event: ['find', 'findOne', 'create', 'update', 'delete'],
    club: ['find', 'findOne', 'create', 'update', 'delete'],
    'news-item': ['find', 'findOne', 'create', 'update', 'delete'],
  },
};

module.exports = ROLE_PERMISSIONS;
