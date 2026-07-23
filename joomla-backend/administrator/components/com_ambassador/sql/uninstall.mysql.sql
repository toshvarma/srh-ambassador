-- =============================================================================
-- uninstall.mysql.sql  –  drops all com_ambassador tables
-- =============================================================================
DROP TABLE IF EXISTS `#__ambassador_news_tags`;
DROP TABLE IF EXISTS `#__ambassador_news`;
DROP TABLE IF EXISTS `#__ambassador_event_attendees`;
DROP TABLE IF EXISTS `#__ambassador_event_tags`;
DROP TABLE IF EXISTS `#__ambassador_events`;
DROP TABLE IF EXISTS `#__ambassador_club_members`;
DROP TABLE IF EXISTS `#__ambassador_clubs`;
DROP TABLE IF EXISTS `#__ambassador_user_meta`;
