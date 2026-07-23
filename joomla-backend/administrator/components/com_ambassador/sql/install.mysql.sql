-- =============================================================================
-- install.mysql.sql  –  com_ambassador database tables
-- All table names use the #__ prefix (Joomla replaces it with your $dbprefix).
-- =============================================================================

-- ── User metadata (extra fields not in Joomla core #__users) ─────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_user_meta` (
  `user_id`              INT(11)      NOT NULL,
  `first_name`           VARCHAR(100) NOT NULL DEFAULT '',
  `last_name`            VARCHAR(100) NOT NULL DEFAULT '',
  `app_role`             VARCHAR(32)  NOT NULL DEFAULT 'Student',
  `avatar_url`           VARCHAR(512)          DEFAULT NULL,
  `bio`                  TEXT                  DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Clubs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_clubs` (
  `id`                   INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`          CHAR(36)     NOT NULL DEFAULT '',
  `title`                VARCHAR(255) NOT NULL DEFAULT '',
  `slug`                 VARCHAR(255) NOT NULL DEFAULT '',
  `short_description`    VARCHAR(180)          DEFAULT NULL,
  `description`          TEXT                  DEFAULT NULL,
  `detailed_description` MEDIUMTEXT            DEFAULT NULL,
  `cover_image`          VARCHAR(512)          DEFAULT NULL,
  `contact_email`        VARCHAR(255)          DEFAULT NULL,
  `min_members`          INT(11)               DEFAULT 5,
  `max_members`          INT(11)               DEFAULT 30,
  `max_ambassadors`      INT(11)               DEFAULT 2,
  `meeting_frequency`    VARCHAR(255)          DEFAULT NULL,
  `recommended_for`      VARCHAR(255)          DEFAULT NULL,
  `special_equipment`    TEXT                  DEFAULT NULL,
  `signup_notes`         TEXT                  DEFAULT NULL,
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
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_submitted_by` (`submitted_by`),
  KEY `idx_reviewed_by` (`reviewed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Club members (many-to-many users ↔ clubs) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_club_members` (
  `club_id`  INT(11) NOT NULL,
  `user_id`  INT(11) NOT NULL,
  PRIMARY KEY (`club_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_events` (
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
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Event tags (many-to-many events ↔ Joomla tags) ────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_event_tags` (
  `event_id` INT(11) NOT NULL,
  `tag_id`   INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Event attendees (many-to-many users ↔ events) ─────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_event_attendees` (
  `event_id` INT(11) NOT NULL,
  `user_id`  INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── News items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_news` (
  `id`                INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`       CHAR(36)     NOT NULL DEFAULT '',
  `title`             VARCHAR(255) NOT NULL DEFAULT '',
  `slug`              VARCHAR(255) NOT NULL DEFAULT '',
  `excerpt`           TEXT                  DEFAULT NULL,
  `content`           MEDIUMTEXT            DEFAULT NULL,
  `featured_image`    VARCHAR(512)          DEFAULT NULL,
  `category_id`       INT(11)               DEFAULT NULL,
  `club_id`           INT(11)               DEFAULT NULL,
  `author_id`         INT(11)               DEFAULT NULL,
  `state`             TINYINT(4)   NOT NULL DEFAULT 1,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── News tags (many-to-many news ↔ Joomla tags) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `#__ambassador_news_tags` (
  `news_id` INT(11) NOT NULL,
  `tag_id`  INT(11) NOT NULL,
  PRIMARY KEY (`news_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  `user_id`              INT(11)      NOT NULL,
  `first_name`           VARCHAR(100) NOT NULL DEFAULT '',
  `last_name`            VARCHAR(100) NOT NULL DEFAULT '',
  `app_role`             VARCHAR(32)  NOT NULL DEFAULT 'Student',
  `avatar_url`           VARCHAR(512)          DEFAULT NULL,
  `bio`                  TEXT                  DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Clubs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_clubs` (
  `id`                   INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`          CHAR(36)     NOT NULL DEFAULT '',
  `title`                VARCHAR(255) NOT NULL DEFAULT '',
  `slug`                 VARCHAR(255) NOT NULL DEFAULT '',
  `short_description`    VARCHAR(180)          DEFAULT NULL,
  `description`          TEXT                  DEFAULT NULL,
  `detailed_description` MEDIUMTEXT            DEFAULT NULL,
  `cover_image_url`      VARCHAR(512)          DEFAULT NULL,
  `contact_email`        VARCHAR(255)          DEFAULT NULL,
  `min_members`          INT(11)               DEFAULT 5,
  `max_members`          INT(11)               DEFAULT 30,
  `meeting_frequency`    VARCHAR(255)          DEFAULT NULL,
  `recommended_for`      VARCHAR(255)          DEFAULT NULL,
  `special_equipment`    TEXT                  DEFAULT NULL,
  `signup_notes`         TEXT                  DEFAULT NULL,
  `ambassador_feedback`  TEXT                  DEFAULT NULL,
  `rejection_reason`     TEXT                  DEFAULT NULL,
  `approval_status`      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `submitted_by`         INT(11)               DEFAULT NULL,
  `reviewed_by`          INT(11)               DEFAULT NULL,
  `state`                TINYINT(4)   NOT NULL DEFAULT 1,
  `created`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_submitted_by` (`submitted_by`),
  KEY `idx_reviewed_by` (`reviewed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Club members (many-to-many users ↔ clubs) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_club_members` (
  `club_id`  INT(11) NOT NULL,
  `user_id`  INT(11) NOT NULL,
  PRIMARY KEY (`club_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_events` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`      CHAR(36)     NOT NULL DEFAULT '',
  `title`            VARCHAR(255) NOT NULL DEFAULT '',
  `slug`             VARCHAR(255) NOT NULL DEFAULT '',
  `short_description` VARCHAR(220)         DEFAULT NULL,
  `description`      MEDIUMTEXT            DEFAULT NULL,
  `location`         VARCHAR(255)          DEFAULT NULL,
  `start_datetime`   DATETIME              DEFAULT NULL,
  `end_datetime`     DATETIME              DEFAULT NULL,
  `thumbnail_url`    VARCHAR(512)          DEFAULT NULL,
  `author_name`      VARCHAR(255)          DEFAULT NULL,
  `author_id`        INT(11)               DEFAULT NULL,
  `category_id`      INT(11)               DEFAULT NULL,
  `state`            TINYINT(4)   NOT NULL DEFAULT 1,
  `created`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Event tags (many-to-many events ↔ Joomla tags) ────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_event_tags` (
  `event_id` INT(11) NOT NULL,
  `tag_id`   INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Event attendees (many-to-many users ↔ events) ─────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_event_attendees` (
  `event_id` INT(11) NOT NULL,
  `user_id`  INT(11) NOT NULL,
  PRIMARY KEY (`event_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── News items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_news` (
  `id`                INT(11)      NOT NULL AUTO_INCREMENT,
  `document_id`       CHAR(36)     NOT NULL DEFAULT '',
  `title`             VARCHAR(255) NOT NULL DEFAULT '',
  `slug`              VARCHAR(255) NOT NULL DEFAULT '',
  `excerpt`           TEXT                  DEFAULT NULL,
  `content`           MEDIUMTEXT            DEFAULT NULL,
  `featured_image_url` VARCHAR(512)         DEFAULT NULL,
  `category_id`       INT(11)               DEFAULT NULL,
  `author_id`         INT(11)               DEFAULT NULL,
  `status`            ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  `visibility`        ENUM('all','student','professor')    NOT NULL DEFAULT 'all',
  `course_label`      VARCHAR(255)          DEFAULT NULL,
  `published_at`      DATETIME              DEFAULT NULL,
  `created`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_document_id` (`document_id`),
  UNIQUE KEY `idx_slug` (`slug`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── News tags (many-to-many news ↔ Joomla tags) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `#srhub_ambassador_news_tags` (
  `news_id` INT(11) NOT NULL,
  `tag_id`  INT(11) NOT NULL,
  PRIMARY KEY (`news_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
