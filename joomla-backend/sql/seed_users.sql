-- =============================================================================
-- seed_users.sql
-- Inserts the 7 SRH Ambassador demo users into Joomla.
-- Run via phpMyAdmin IMPORT after running setup_usergroups.sql.
--
-- IMPORTANT: Replace `jos_` with your actual table prefix if different.
-- Check configuration.php → $dbprefix to confirm.
--
-- Credentials (from USERS.MD):
--   student.sophia@srh.de    / Student1234!
--   exchange.emma@srh.de     / Exchange1234!
--   prof.thomas@srh.de       / Professor1234!
--   teacher.anna@srh.de      / Teacher1234!
--   ambassador.lars@srh.de   / Ambassador1234!
--   admin.klaus@srh.de       / Admin1234!
--   superadmin@srh.de        / SuperAdmin1234!
-- =============================================================================

-- ── 1. Insert Joomla user accounts ───────────────────────────────────────────

INSERT INTO `jos_users`
  (`name`, `username`, `email`, `password`, `block`, `sendEmail`,
   `registerDate`, `lastvisitDate`, `activation`, `params`, `requireReset`)
VALUES
  ('Sophia Student',   'student.sophia',   'student.sophia@srh.de',
   '$2a$10$b3W5.5WfnjwgqJv1JS15m.A26kBpLfXLN4jAaw2wM6zSGm8uHWVBy',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Emma Exchange',    'exchange.emma',    'exchange.emma@srh.de',
   '$2a$10$b07agBaj8B4S1tNrO..hEOsZVnbDNFQ3t0ZTyPg4SpwODKR/ag2RO',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Thomas Professor', 'prof.thomas',      'prof.thomas@srh.de',
   '$2a$10$GP3qAon/CZ7.gAXM71OmquogboHGpm/0QnGGQnRMORY8PegPGpkxq',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Anna Teacher',     'teacher.anna',     'teacher.anna@srh.de',
   '$2a$10$JJEMJ6T6yGMGNiCunbkZiuOOPwVecNxMLRdY8.r81KSvccD9R8C8G',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Lars Ambassador',  'ambassador.lars',  'ambassador.lars@srh.de',
   '$2a$10$CV.2euwrnuRwREzxn/lguez40hNEsHbvq2NkDapxycfLZop9RjacG',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Klaus Admin',      'admin.klaus',      'admin.klaus@srh.de',
   '$2a$10$i46.rper/e35LlfDqTyoxeTBvFVeiWjpkc2uDSBEM/WXthTDCefhe',
   0, 0, NOW(), NULL, '', '{}', 0),

  ('Super Admin',      'superadmin',       'superadmin@srh.de',
   '$2a$10$gYYjpLknCMvFgrTFcT2uleLxHx0yC3VTxp0AgxgAiJP1QXMoyEDGO',
   0, 0, NOW(), NULL, '', '{}', 0);

-- ── 2. Map users to their User Groups ────────────────────────────────────────
-- Uses subqueries so this works regardless of the auto-generated group IDs.

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'student.sophia@srh.de'   AND g.title = 'Student';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'exchange.emma@srh.de'    AND g.title = 'ExchangeStudent';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'prof.thomas@srh.de'      AND g.title = 'Professor';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'teacher.anna@srh.de'     AND g.title = 'Teacher';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'ambassador.lars@srh.de'  AND g.title = 'Ambassador';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'admin.klaus@srh.de'      AND g.title = 'Admin';

INSERT INTO `jos_user_usergroup_map` (`user_id`, `group_id`)
SELECT u.id, g.id FROM `jos_users` u, `jos_usergroups` g
  WHERE u.email = 'superadmin@srh.de'       AND g.title = 'SuperAdmin';

-- ── 3. Insert ambassador_user_meta rows ──────────────────────────────────────
-- This table is created by the com_ambassador install SQL.
-- Run this AFTER installing the component.

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Sophia',  'Student',   'Student'        FROM `jos_users` WHERE email = 'student.sophia@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Emma',    'Exchange',  'ExchangeStudent' FROM `jos_users` WHERE email = 'exchange.emma@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Thomas',  'Professor', 'Professor'      FROM `jos_users` WHERE email = 'prof.thomas@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Anna',    'Teacher',   'Teacher'        FROM `jos_users` WHERE email = 'teacher.anna@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Lars',    'Ambassador','Ambassador'     FROM `jos_users` WHERE email = 'ambassador.lars@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Klaus',   'Admin',     'Admin'          FROM `jos_users` WHERE email = 'admin.klaus@srh.de';

INSERT INTO `jos_ambassador_user_meta` (`user_id`, `first_name`, `last_name`, `app_role`)
SELECT id, 'Super',   'Admin',     'SuperAdmin'     FROM `jos_users` WHERE email = 'superadmin@srh.de';
