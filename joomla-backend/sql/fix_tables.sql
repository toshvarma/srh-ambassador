-- =============================================================================
-- fix_tables.sql
-- Run this in phpMyAdmin → SQL tab (select your Joomla database first).
--
-- Creates the correct srhub_ambassador_* tables.
-- After running, manually delete any tables starting with #srhub_ if present.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `srhub_ambassador_user_meta` (
  `user_id`    INT(11)      NOT NULL,
  `first_name` VARCHAR(100) NOT NULL DEFAULT '',
  `last_name`  VARCHAR(100) NOT NULL DEFAULT '',
  `app_role`   VARCHAR(32)  NOT NULL DEFAULT 'Student',
  `avatar_url` VARCHAR(512)          DEFAULT NULL,
  `bio`        TEXT                  DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_clubs` (
  `id`                   INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`          CHAR(36)     NOT NULL DEFAULT '',
  `title`                VARCHAR(255) NOT NULL DEFAULT '',
  `slug`                 VARCHAR(255) NOT NULL DEFAULT '',
  `short_description`    VARCHAR(180)          DEFAULT NULL,
  `description`          TEXT                  DEFAULT NULL,
  `cover_image`          VARCHAR(512)          DEFAULT NULL,
  `contact_email`        VARCHAR(255)          DEFAULT NULL,
  `max_members`          INT(11)               DEFAULT 30,
  `max_ambassadors`      INT(11)               DEFAULT 2,
  `ambassador_feedback`  TEXT                  DEFAULT NULL,
  `rejection_reason`     TEXT                  DEFAULT NULL,
  `approval_status`      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `submitted_by`         INT(11)               DEFAULT NULL,
  `reviewed_by`          INT(11)               DEFAULT NULL,
  `state`                TINYINT(4)   NOT NULL DEFAULT 1,
  `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_club_members` (
  `club_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  PRIMARY KEY (`club_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_events` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`      CHAR(36)     NOT NULL DEFAULT '',
  `title`            VARCHAR(255) NOT NULL DEFAULT '',
  `slug`             VARCHAR(255) NOT NULL DEFAULT '',
  `short_description` VARCHAR(220)         DEFAULT NULL,
  `description`      MEDIUMTEXT            DEFAULT NULL,
  `location`         VARCHAR(255)          DEFAULT NULL,
  `start_date`       DATETIME              DEFAULT NULL,
  `end_date`         DATETIME              DEFAULT NULL,
  `meeting_link`     VARCHAR(512)          DEFAULT NULL,
  `cover_image`      VARCHAR(512)          DEFAULT NULL,
  `author_id`        INT(11)               DEFAULT NULL,
  `category_id`      INT(11)               DEFAULT NULL,
  `club_id`          INT(11)               DEFAULT NULL,
  `state`            TINYINT(4)   NOT NULL DEFAULT 1,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_event_tags` (
  `event_id` INT(11) NOT NULL,
  `tag_id`   INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_event_attendees` (
  `event_id` INT(11) NOT NULL,
  `user_id`  INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_news` (
  `id`             INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`    CHAR(36)     NOT NULL DEFAULT '',
  `title`          VARCHAR(255) NOT NULL DEFAULT '',
  `slug`           VARCHAR(255) NOT NULL DEFAULT '',
  `excerpt`        TEXT                  DEFAULT NULL,
  `content`        MEDIUMTEXT            DEFAULT NULL,
  `featured_image` VARCHAR(512)          DEFAULT NULL,
  `category_id`    INT(11)               DEFAULT NULL,
  `club_id`        INT(11)               DEFAULT NULL,
  `author_id`      INT(11)               DEFAULT NULL,
  `state`          TINYINT(4)   NOT NULL DEFAULT 1,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `srhub_ambassador_news_tags` (
  `news_id` INT(11) NOT NULL,
  `tag_id`  INT(11) NOT NULL,
  PRIMARY KEY (`news_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
