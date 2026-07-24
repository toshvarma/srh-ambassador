# MIGRATION_MAPPING.md
# SRH Ambassador — Strapi → Joomla Content-Type Disposition

Confirmed 2026-07-23. This is the authoritative record of which Strapi content types were
ported to Joomla and which were excluded.

---

## In-Scope Content Types (ported to Joomla)

| Strapi Type      | Joomla Implementation                                              | Notes |
|------------------|--------------------------------------------------------------------|-------|
| `club`           | `#__ambassador_clubs` (custom table in `com_ambassador`)          | Full fields: title, descriptions, cover image, contact email, member limits, meeting frequency, approval workflow (status/feedback/rejection), submitter + reviewer relations. Join tables: `#__ambassador_club_members`. |
| `event`          | `#__ambassador_events` (custom table in `com_ambassador`)         | Full fields: title, descriptions, location, datetime, thumbnail, author. Category links to Joomla `#__categories`. Tags via `#__ambassador_event_tags` join to Joomla `#__tags`. Attendees via `#__ambassador_event_attendees`. |
| `news-item`      | `#__ambassador_news` (custom table in `com_ambassador`)           | Full fields: title, excerpt, content, featured image URL, status (draft/published/archived), visibility, course label. Category links to Joomla `#__categories`. Tags via `#__ambassador_news_tags` join to Joomla `#__tags`. |
| `news-category`  | Joomla built-in `#__categories` (`extension = 'com_ambassador'`) | Not a custom table — uses Joomla's native category system. REST endpoint wraps a filtered `#__categories` query. |
| `news-tag`       | Joomla built-in `#__tags` (`com_tags`)                           | Not a custom table — uses Joomla's native tag system. REST endpoint wraps `#__tags`. |
| `user` (custom)  | Joomla `#__users` + `#__user_usergroup_map` + `#__ambassador_user_meta` | Role stored as Joomla User Group title AND in `user_meta.app_role`. JWT issued by `com_ambassador` auth endpoint includes the role string, which the frontend maps through existing `getCapabilities()` logic unchanged. |

---

## Out-of-Scope Content Types (excluded from Joomla build)

| Strapi Type        | Reason for Exclusion |
|--------------------|----------------------|
| `article`          | Strapi blog scaffold ("Create your blog content"). Not referenced by any frontend page component. |
| `author`           | Strapi blog scaffold ("Create authors for your content"). Linked only to `article`. |
| `category`         | Strapi blog scaffold, links only to `article`. Distinct from `news-category` which is in scope. |
| `global`           | Strapi single-type scaffold ("Define global settings"). Not referenced by any frontend page. |
| `about`            | Strapi single-type scaffold ("Write about yourself"). Not referenced by any frontend page. |
| `profile`          | The frontend never calls the `profile` content type. Auth resolution calls the custom `user` type directly by email. Confirmed in `auth.ts:resolveProfile`. |
| `announcement`     | Has relations to `club` and `profile`, supports i18n, but is not called by any frontend page component and is not part of the 6 functional requirements. Excluded after owner confirmation. |
| `news-article`     | A parallel/earlier news implementation. Frontend exclusively calls `/news-items` (the `news-item` type). `news-article` has completely different fields (username, headline, articleStatus, whenCreated/Uploaded/Published) and is never called by any page. Excluded after owner confirmation. |
| `news-media`       | Linked only to `news-article`. Excluded because `news-article` is excluded. |
| `news-translation` | Linked only to `news-article`. Excluded because `news-article` is excluded. |

---

## Role Mapping

| Strapi `role` enum value | Joomla User Group | `getCapabilities()` result |
|--------------------------|-------------------|---------------------------|
| `Student`                | Student           | canSubmitClubIdea |
| `ExchangeStudent`        | ExchangeStudent   | canSubmitClubIdea |
| `Professor`              | Professor         | canManageNews, canManageEvents |
| `Teacher`                | Teacher           | canManageNews, canManageEvents |
| `Ambassador`             | Ambassador        | canApproveClubIdea, canManageNews, canManageEvents, canManageClubs |
| `Admin`                  | Admin             | all capabilities |
| `SuperAdmin`             | SuperAdmin        | all capabilities |

Role resolution: `com_ambassador` auth endpoint reads `app_role` from `#__ambassador_user_meta`. Falls back to Joomla User Group title if `app_role` is blank.
