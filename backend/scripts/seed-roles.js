/**
 * Seed script to initialize roles and sample users
 * 
 * This script:
 * 1. Creates custom roles (Student, Exchange Student, Professor, Teacher, Ambassador, Admin, Super Admin)
 * 2. Sets up permissions for each role
 * 3. Creates sample users for testing
 * 
 * Usage: npm run seed:roles
 */

'use strict';

const rolePermissionConfig = {
  'Student': {
    description: 'Students can submit club ideas and join clubs and events',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne'],
      'api::club.club': ['find', 'findOne', 'create'],
      'api::news-article.news-article': ['find', 'findOne'],
    }
  },
  'Exchange Student': {
    description: 'Exchange students can view and join clubs and events but cannot create',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne'],
      'api::club.club': ['find', 'findOne'],
      'api::news-article.news-article': ['find', 'findOne'],
    }
  },
  'Professor': {
    description: 'Professors can create and manage events and publish news',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update'],
      'api::club.club': ['find', 'findOne'],
      'api::news-article.news-article': ['find', 'findOne', 'create', 'update', 'delete'],
    }
  },
  'Teacher': {
    description: 'Teachers can create and manage events and publish news',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update'],
      'api::club.club': ['find', 'findOne'],
      'api::news-article.news-article': ['find', 'findOne', 'create', 'update'],
    }
  },
  'Ambassador': {
    description: 'Ambassadors can approve club submissions and manage clubs and events',
    permissions: {
      'api::user.user': ['find', 'findOne'],
      'api::event.event': ['find', 'findOne', 'create', 'update'],
      'api::club.club': ['find', 'findOne', 'create', 'update'],
      'api::news-article.news-article': ['find', 'findOne', 'create', 'update'],
    }
  },
  'Admin': {
    description: 'Admins can manage all content with full CRUD operations',
    permissions: {
      'api::user.user': ['find', 'findOne', 'create', 'update'],
      'api::event.event': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::club.club': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::news-article.news-article': ['find', 'findOne', 'create', 'update', 'delete'],
    }
  },
  'Super Admin': {
    description: 'Super admins have full access to all content and settings',
    permissions: {
      'api::user.user': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::event.event': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::club.club': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::news-article.news-article': ['find', 'findOne', 'create', 'update', 'delete'],
    }
  }
};

const sampleUsers = [
  {
    username: 'john_student',
    email: 'john.mueller@srh.de',
    password: 'Test1234!',
    firstName: 'John',
    lastName: 'Müller',
    role: 'Student',
    roleName: 'Student',
    status: 'active',
    universityAffiliation: 'Computer Science',
    enrollmentYear: 2023
  },
  {
    username: 'emma_exchange',
    email: 'emma.garcia@srh.de',
    password: 'Test1234!',
    firstName: 'Emma',
    lastName: 'García',
    role: 'Exchange Student',
    roleName: 'Exchange Student',
    status: 'active',
    universityAffiliation: 'Business Administration',
    enrollmentYear: 2024
  },
  {
    username: 'prof_schmidt',
    email: 'prof.schmidt@srh.de',
    password: 'Test1234!',
    firstName: 'Dr. Thomas',
    lastName: 'Schmidt',
    role: 'Professor',
    roleName: 'Professor',
    status: 'active',
    universityAffiliation: 'Engineering Faculty'
  },
  {
    username: 'teacher_weber',
    email: 'teacher.weber@srh.de',
    password: 'Test1234!',
    firstName: 'Anna',
    lastName: 'Weber',
    role: 'Teacher',
    roleName: 'Teacher',
    status: 'active',
    universityAffiliation: 'Languages Department'
  },
  {
    username: 'ambassador_lars',
    email: 'lars.ambassador@srh.de',
    password: 'Test1234!',
    firstName: 'Lars',
    lastName: 'Krause',
    role: 'Ambassador',
    roleName: 'Ambassador',
    status: 'active',
    universityAffiliation: 'Computer Science',
    enrollmentYear: 2022
  },
  {
    username: 'admin_becker',
    email: 'admin.becker@srh.de',
    password: 'Test1234!',
    firstName: 'Klaus',
    lastName: 'Becker',
    role: 'Admin',
    roleName: 'Admin',
    status: 'active',
    universityAffiliation: 'Administration'
  },
  {
    username: 'superadmin',
    email: 'superadmin@srh.de',
    password: 'SuperSecure1234!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'Super Admin',
    roleName: 'Super Admin',
    status: 'active',
    universityAffiliation: 'IT Administration'
  }
];

async function seedRoles() {
  // Check if roles have already been created
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  
  const rolesHaveBeenCreated = await pluginStore.get({ key: 'rolesCreated' });
  
  if (rolesHaveBeenCreated) {
    console.log('Roles have already been created. Skipping...');
    return;
  }

  try {
    console.log('Creating custom roles...');
    
    // Create each custom role
    for (const [roleName, roleConfig] of Object.entries(rolePermissionConfig)) {
      try {
        // Check if role already exists
        const existingRole = await strapi
          .query('plugin::users-permissions.role')
          .findOne({
            where: { name: roleName }
          });
        
        if (existingRole) {
          console.log(`  ✓ Role "${roleName}" already exists`);
          continue;
        }
        
        // Create the role
        const role = await strapi
          .query('plugin::users-permissions.role')
          .create({
            data: {
              name: roleName,
              description: roleConfig.description,
              type: 'custom'
            }
          });
        
        console.log(`  ✓ Created role: ${roleName}`);
        
        // Set up permissions for the role
        for (const [controller, actions] of Object.entries(roleConfig.permissions)) {
          for (const action of actions) {
            await strapi
              .query('plugin::users-permissions.permission')
              .create({
                data: {
                  action: `${controller}.${action}`,
                  role: role.id,
                  enabled: true
                }
              });
          }
        }
        
        console.log(`    Permissions set for ${roleName}`);
      } catch (error) {
        console.error(`Error creating role ${roleName}:`, error.message);
      }
    }
    
    // Mark roles as created
    await pluginStore.set({ key: 'rolesCreated', value: true });
    console.log('✓ All roles created successfully');
  } catch (error) {
    console.error('Error during role creation:', error);
  }
}

async function seedUsers() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  
  const usersHaveBeenCreated = await pluginStore.get({ key: 'usersCreated' });
  
  if (usersHaveBeenCreated) {
    console.log('Sample users have already been created. Skipping...');
    return;
  }

  try {
    console.log('Creating sample users...');
    
    for (const userData of sampleUsers) {
      try {
        // Check if user already exists
        const existingUser = await strapi
          .query('plugin::users-permissions.user')
          .findOne({
            where: { email: userData.email }
          });
        
        if (existingUser) {
          console.log(`  ✓ User ${userData.email} already exists`);
          continue;
        }
        
        // Get the role ID
        const role = await strapi
          .query('plugin::users-permissions.role')
          .findOne({
            where: { name: userData.roleName }
          });
        
        if (!role) {
          console.error(`  ✗ Role ${userData.roleName} not found for user ${userData.email}`);
          continue;
        }
        
        // Create the user in users-permissions
        const newUser = await strapi
          .query('plugin::users-permissions.user')
          .create({
            data: {
              username: userData.username,
              email: userData.email,
              password: userData.password,
              confirmed: true,
              blocked: false,
              role: role.id
            }
          });
        
        // Create corresponding User entry in our User collection type
        await strapi.documents('api::user.user').create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            universityAffiliation: userData.universityAffiliation,
            enrollmentYear: userData.enrollmentYear || null,
          }
        });
        
        console.log(`  ✓ Created user: ${userData.email} (${userData.roleName})`);
      } catch (error) {
        console.error(`  ✗ Error creating user ${userData.email}:`, error.message);
      }
    }
    
    // Mark users as created
    await pluginStore.set({ key: 'usersCreated', value: true });
    console.log('✓ Sample users created successfully');
  } catch (error) {
    console.error('Error during user creation:', error);
  }
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'warn';

  try {
    await seedRoles();
    await seedUsers();
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
