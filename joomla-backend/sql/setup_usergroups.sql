-- =============================================================================
-- setup_usergroups.sql
-- Creates 7 SRH Ambassador User Groups in Joomla.
-- Run once via phpMyAdmin IMPORT against your Joomla database.
--
-- IMPORTANT: Replace `jos_` with your actual Joomla table prefix if different.
-- Check configuration.php → $dbprefix to confirm.
-- =============================================================================

-- Find the "Registered" group ID (Joomla default, parent for all custom groups)
-- Default Joomla install: Registered = id 2
-- We insert with parent_id = 2 (Registered). Adjust if your setup differs.

INSERT INTO `jos_usergroups` (`parent_id`, `lft`, `rgt`, `title`) VALUES
  (2, 0, 0, 'Student'),
  (2, 0, 0, 'ExchangeStudent'),
  (2, 0, 0, 'Professor'),
  (2, 0, 0, 'Teacher'),
  (2, 0, 0, 'Ambassador'),
  (2, 0, 0, 'Admin'),
  (2, 0, 0, 'SuperAdmin');

-- Rebuild the nested-set (lft/rgt) values.
-- Joomla recalculates these automatically on next admin load,
-- but the following call forces an immediate rebuild if you run it from CLI:
--   php /path/to/joomla/cli/joomla.php grouprebuild
--
-- Via phpMyAdmin you can skip this — Joomla will self-heal on next page load.
