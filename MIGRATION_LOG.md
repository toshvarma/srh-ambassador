# MIGRATION_LOG.md
# SRH Ambassador — Joomla Migration Log

---

## 2026-07-23 — Phase 0: Repository Hygiene

**What was done:**
- Created root `.gitignore` covering `node_modules/`, `.env*`, `joomla-backend/vendor/`, `frontend/.next/`, OS artefacts, and IDE files.
- Ran `git rm -r --cached node_modules` to remove ~70,000 previously tracked `node_modules` entries from the git index (7.9 million lines of deletions). `node_modules` is now correctly gitignored.
- Committed as a standalone commit on `joomla-branch` (`chore: add root .gitignore and remove node_modules from version control`).

**Decisions made:**
- Root `.gitignore` does not suppress `frontend/.gitignore` or `backend/.gitignore` — those remain intact.
- `joomla-backend/vendor/` is gitignored because Composer packages should be installed locally, not committed.

---

## 2026-07-23 — Phase 1: Laragon Environment Documentation

**What was done:**
- Created `joomla-backend/SETUP.md` — complete step-by-step Laragon setup guide covering: Composer install, component packaging, Joomla extension install, phpMyAdmin SQL imports, CORS `.htaccess` configuration, sample categories/tags, frontend env var, and a troubleshooting section.
- Created `.env.joomla.example` at repo root documenting `NEXT_PUBLIC_JOOMLA_API_URL`.

**Decisions made:**
- No Docker Compose. Environment is Laragon (Apache + MySQL + PHP on Windows).
- CORS is handled via `.htaccess` `Header set Access-Control-Allow-Origin` directives, which requires Apache `mod_headers` (enabled by default in Laragon).

---

## 2026-07-23 — Phase 2: Database Setup Scripts

**What was done:**
- Created `joomla-backend/sql/setup_usergroups.sql`: inserts 7 User Groups (Student, ExchangeStudent, Professor, Teacher, Ambassador, Admin, SuperAdmin) as children of Joomla's "Registered" group (parent_id=2).
- Created `joomla-backend/sql/seed_users.sql`: inserts 7 demo users from `USERS.MD` into `#__users` (bcrypt `$2a$10$` hashed passwords, compatible with PHP `password_verify()`), maps each to their group via `#__user_usergroup_map` (using subquery joins so it's prefix-agnostic), and inserts `#__ambassador_user_meta` rows with first/last names and `app_role` values.
- Table prefix in scripts defaults to `jos_` — instructions in SETUP.md explain how to change it if the Joomla install uses a different prefix.

**Decisions made:**
- Password hashes generated with `bcryptjs` (`$2a$` prefix) — PHP's `password_verify()` accepts `$2a$`, `$2b$`, and `$2y$` interchangeably.
- No signup flow implemented. User registration is out of scope — all accounts are pre-created via seed scripts.

---

## 2026-07-23 — Phase 3 & 4: com_ambassador Component + REST API

**What was done:**
- Created full Joomla 5 component structure under `joomla-backend/`:
  - `com_ambassador.xml` — package manifest
  - `administrator/components/com_ambassador/` — admin bootstrap + SQL install/uninstall
  - `api/components/com_ambassador/src/` — REST API controllers + helpers
  - `components/com_ambassador/access.xml` — site-facing stub (required by Joomla)
  - `composer.json` — requires `firebase/php-jwt ^6.10`
  - `package.php` — packaging script that creates `com_ambassador.zip`

- **SQL install script** creates 8 tables: `#__ambassador_clubs`, `#__ambassador_club_members`, `#__ambassador_events`, `#__ambassador_event_tags`, `#__ambassador_event_attendees`, `#__ambassador_news`, `#__ambassador_news_tags`, `#__ambassador_user_meta`.

- **REST API endpoints** implemented in `api/components/com_ambassador/src/Controller/`:
  - `AuthController` — `POST /v1/ambassador/auth/login`, `GET /v1/ambassador/users/me`
  - `UsersController` — `GET /v1/ambassador/users` (with email/documentId filters)
  - `ClubsController` — full CRUD + join/leave + approval workflow
  - `EventsController` — full CRUD + attendees
  - `NewsController` — full CRUD
  - `CategoriesController` — `GET /v1/ambassador/news-categories` (wraps `#__categories WHERE extension='com_ambassador'`)
  - `TagsController` — `GET /v1/ambassador/news-tags` (wraps `#__tags`)
  - `UploadController` — `POST /v1/ambassador/upload` (saves to `/images/ambassador/`, returns `[{url}]`)
  - `index.php` — central router/dispatcher

- **Helpers**: `JwtHelper` (HS256 JWT, derived from Joomla's own `$secret`), `DbHelper` (UUID, slug, tag/category/user fetching), `ResponseHelper` (standardised `{ data: [...] }` responses matching Strapi shape).

**Decisions made:**
- JWT secret derived from `hash('sha256', 'srh_ambassador_jwt_' . $joomlaSecret)` so no extra env var is needed.
- All responses return `documentId` = stringified numeric ID (e.g. `"42"`). The frontend's existing `normalizeEntry` logic spreads both `attributes` and the entry itself, so the flat Joomla response is a drop-in replacement for Strapi v5's format.
- `findByDocumentId()` in each controller accepts EITHER `document_id` (CHAR(36) UUID) OR numeric `id` cast to string, for maximum compatibility.
- `club_ambassadors` join table was omitted — not actually needed by any of the 6 functional requirements (the "ambassadors" relation in the Strapi schema is never queried by any frontend page).

---

## 2026-07-23 — Phase 5: Frontend Adapter

**What was done:**
- `frontend/lib/strapi.ts`:
  - `STRAPI_URL` now reads from `NEXT_PUBLIC_JOOMLA_API_URL` (falls back to `NEXT_PUBLIC_STRAPI_URL` then `http://joomla.test`).
  - Added `PATH_MAP` constant mapping 7 Strapi-style paths to `com_ambassador` API paths.
  - `toApiPath()` rewritten to use `PATH_MAP` prefix matching; handles both exact paths and paths with ID suffixes (e.g. `/clubs/some-doc-id`).
  - Error message text de-branded from "Strapi request failed" → "Request failed".
  - All exported function signatures unchanged.

- `frontend/lib/auth.ts`:
  - `TOKEN_KEY` changed from `strapi_token` → `joomla_token`.
  - `login()` now calls `POST /api/index.php/v1/ambassador/auth/login`; role resolved from login response directly (no second round-trip needed).
  - `fetchMe()` now calls `GET /api/index.php/v1/ambassador/users/me`; role resolved from response.
  - `signup()` replaced with a stub that throws a clear error ("User registration is not available").
  - All exported function signatures unchanged.

- `frontend/components/ClubNewPage.tsx`:
  - `STRAPI_URL` constant renamed to `JOOMLA_API_URL`, reads from `NEXT_PUBLIC_JOOMLA_API_URL`.
  - Upload URL changed from `${STRAPI_URL}/api/upload` → `${JOOMLA_API_URL}/api/index.php/v1/ambassador/upload`.
  - No other changes to this component.

**Notes for manual testing:**
- Set `NEXT_PUBLIC_JOOMLA_API_URL=http://joomla.test` in `frontend/.env.local` before running `npm run dev`.
- The Strapi backend remains fully intact in `backend/`; to switch back, change the env var to `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337` and revert the adapter files.

---

## Phase 6: MIGRATION_MAPPING.md

**What was done:**
- Created `MIGRATION_MAPPING.md` at repo root with full content-type disposition table and role mapping.

---

## Phase 7: i18n Verification (status: pending manual check)

**Findings from code review:**
- `lib/i18n.ts` already contains full German translations for ALL navigation/menu keys: `navHome`, `navNews`, `navEvents`, `navClubs`, `navUsers`, `navManage`, `login`, `logout`, `signup`, `profile`, plus all form labels and status strings.
- `LocaleContext.tsx` toggles locale via `localStorage` key `srh_locale` — entirely client-side, unaffected by backend swap.
- No new translation strings were needed. Zero changes to i18n system.
- **Manual check needed:** Run `npm run dev`, toggle EN↔DE, confirm nav labels switch correctly.

---

## Remaining manual steps before demo recording

1. **Install the component:**
   - Run `composer install` in `joomla-backend/`
   - Run `php package.php` to create `com_ambassador.zip`
   - Install via Joomla admin → Extensions → Install

2. **Run SQL scripts** (via phpMyAdmin):
   - `setup_usergroups.sql`
   - `seed_users.sql` (after component is installed)

3. **Configure CORS** in Joomla root `.htaccess` (see SETUP.md Step 6)

4. **Add sample content** in Joomla admin:
   - 2–3 Categories (`Content → Categories`, extension = `com_ambassador`)
   - 3–5 Tags (`Components → Tags`)
   - A few clubs, news items, and events directly in the database or via the frontend once auth works

5. **Set env var:** `NEXT_PUBLIC_JOOMLA_API_URL=http://joomla.test` in `frontend/.env.local`

6. **Run frontend:** `cd frontend && npm run dev`

7. **Walk through 6 functional requirements** and record video

---

## Known risks / rough edges

- **Table prefix:** SQL scripts default to `jos_`. If Laragon Joomla uses a different prefix, find-replace in phpMyAdmin before importing.
- **`com_tags` REST:** Joomla's native `/api/index.php/v1/tags` endpoint exists but has ACL restrictions. The component's `/news-tags` endpoint queries `#__tags` directly, bypassing ACL — fine for this demo use case.
- **CORS preflight:** Apache must have `mod_headers` enabled. This is default in Laragon but can be verified in `C:\laragon\bin\apache\...\conf\httpd.conf` (look for `LoadModule headers_module`).
- **JWT expiry:** Tokens are valid for 30 days. For a demo this is fine; production would need refresh token logic.
- **`resolveProfile` in auth.ts:** The original function was kept but is now effectively bypassed — login and fetchMe both get role from the API response directly without a second `/users?email=X` call. The function still exists (exported) so any code importing it won't break.
