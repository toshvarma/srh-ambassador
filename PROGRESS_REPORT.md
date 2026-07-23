# SRH Ambassador — Joomla Migration Progress Report

**Date:** 2026-07-23  
**Branch:** `joomla-branch`  
**Original backend:** Strapi (Node.js) in `backend/`  
**New backend:** Joomla 5 + custom PHP REST API in `joomla-backend/`  
**Frontend:** Next.js in `frontend/` (unchanged except the data-fetching adapter)

---

## How to Start Everything Up

### Prerequisites (one-time)
- Laragon installed and running
- Joomla installed at `C:\laragon\www\joomla-cms\`
- MySQL database `srh_db` with prefix `srhub_` created and seeded (see below)
- `srh-api/` folder copied into `C:\laragon\www\joomla-cms\srh-api\`
- Node.js installed, `npm install` run inside `frontend/`

---

### Step 1 — Start Laragon

1. Open **Laragon**
2. Click **Start All** (starts Apache + MySQL)
3. Verify the tray icon shows green

---

### Step 2 — Verify the API is alive

Open your browser and visit:

```
http://joomla-cms.test/srh-api/index.php/health
```

You should see JSON like:
```json
{
  "data": {
    "status": "ok",
    "api": "srh-ambassador",
    "db": "srh_db",
    "prefix": "srhub_",
    ...
  }
}
```

If you see a PHP error or blank page, check that `srh-api/index.php` is present in the Joomla root.

---

### Step 3 — Start the Frontend

Open a terminal in VS Code (or PowerShell) and run:

```powershell
cd C:\Users\Tosh\Documents\GitHub\srh-ambassador\frontend
npm run dev
```

The frontend starts at:
```
http://localhost:3000
```

Make sure `frontend/.env.local` contains:
```
NEXT_PUBLIC_JOOMLA_API_URL=http://joomla-cms.test
```

---

### Key Links

| What | URL |
|------|-----|
| **Frontend app** | http://localhost:3000 |
| **Joomla Admin** | http://joomla-cms.test/administrator |
| **API health check** | http://joomla-cms.test/srh-api/index.php/health |
| **API clubs list** | http://joomla-cms.test/srh-api/index.php/clubs |
| **API events list** | http://joomla-cms.test/srh-api/index.php/events |
| **API news list** | http://joomla-cms.test/srh-api/index.php/news-items |
| **API debug tables** | http://joomla-cms.test/srh-api/index.php/debug/tables |
| **Database (phpMyAdmin)** | http://joomla-cms.test/phpmyadmin |

---

### Demo User Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | student.sophia@srh.de | Student1234! |
| Exchange Student | exchange.emma@srh.de | Exchange1234! |
| Professor | prof.thomas@srh.de | Professor1234! |
| Teacher | teacher.anna@srh.de | Teacher1234! |
| **Ambassador** | ambassador.lars@srh.de | Ambassador1234! |
| Admin | admin.klaus@srh.de | Admin1234! |
| Super Admin | superadmin@srh.de | SuperAdmin1234! |

> Ambassador role is the most important for the demo — can approve/reject clubs and create news/events.

---

### If the Database Is Empty (fresh start)

Run these SQL scripts in order via **phpMyAdmin** (`http://joomla-cms.test/phpmyadmin` → select `srh_db` → SQL tab):

1. `joomla-backend/sql/setup_usergroups.sql` — creates 7 User Groups
2. Run the DROP + CREATE block from `joomla-backend/sql/fix_tables.sql` — creates all 8 ambassador tables
3. Run the user_meta INSERT block (just the INSERT INTO srhub_ambassador_user_meta statements) — seeds profile data for the 7 demo users

Then create sample content:
- **Categories:** `http://joomla-cms.test/administrator` → Content → Categories → New (create 2–3)
- **Tags:** `http://joomla-cms.test/administrator/index.php?option=com_tags` → New (create 3–5)
- **Clubs/News/Events:** use the frontend after logging in

---

## What Was Built — Phase by Phase

### Phase 0 — Repository Hygiene
**Commit:** `6c6ed2d3`

- Added root `.gitignore` (covers `node_modules/`, `.env*`, build artefacts)
- Removed ~70,000 previously committed `node_modules` files from git history
- **Why:** The repo had `node_modules` committed, making it enormous and unusable

---

### Phase 1 — Laragon Environment Documentation
**Commit:** `4fe2d4c3`

- Created `joomla-backend/SETUP.md` — full setup guide for Laragon
- Created `.env.joomla.example` — documents `NEXT_PUBLIC_JOOMLA_API_URL`
- **Why:** Docker was ruled out; Laragon is the target environment

---

### Phase 2 — Database SQL Scripts
**Commit:** `4fe2d4c3`

- `joomla-backend/sql/setup_usergroups.sql` — creates 7 User Groups in Joomla's ACL
- `joomla-backend/sql/seed_users.sql` — inserts 7 demo users with bcrypt password hashes
- **Why:** No signup flow exists; all accounts are pre-created for the demo

---

### Phase 3 — Joomla Component Scaffold
**Commit:** `694921b8`

- Created full Joomla 5 MVC component structure under `joomla-backend/`
- SQL install/uninstall scripts for 8 database tables
- Component manifest `com_ambassador.xml`
- **Why:** Joomla requires a registered component to expose REST endpoints via its Web Services API

---

### Phase 4 — REST API Controllers
**Commit:** `a7827359`

- 8 controllers in `joomla-backend/api/components/com_ambassador/src/Controller/`
- Endpoints covering all 6 functional requirements (clubs, events, news, auth, users, upload)
- **Why:** These implement the Joomla Web Services API approach

---

### Phase 5 — Frontend Adapter
**Commit:** `adb930b8`

- `frontend/lib/strapi.ts`: Added `PATH_MAP` routing Strapi-style paths to Joomla API paths; `STRAPI_URL` now reads `NEXT_PUBLIC_JOOMLA_API_URL`
- `frontend/lib/auth.ts`: Login/fetchMe now call the Joomla API; `signup()` replaced with stub
- `frontend/components/ClubNewPage.tsx`: Upload URL updated
- **Why:** All page components remain unchanged; only the data-fetching layer was swapped

---

### Phase 6 — Documentation
**Commit:** `1c46deea`

- `MIGRATION_MAPPING.md` — full content-type disposition table (in-scope vs out-of-scope Strapi types)
- `MIGRATION_LOG.md` — detailed log of each phase

---

### Hotfix Series — Debugging & Stabilisation
**Commits:** `5a2f3657` through `6dcec353`

These fixes were required after discovering the Joomla Web Services API approach had problems in the Laragon environment:

| Commit | Problem | Fix |
|--------|---------|-----|
| `5a2f3657` | Joomla Web Services API requires `services.php` registration that was never built; `firebase/php-jwt` required Composer which is extra setup | Replaced with `joomla-backend/standalone/srh-api/index.php` — 100% self-contained PHP file, no Composer, no Joomla framework bootstrap, PDO directly |
| `10974069` | Frontend URLs still pointed to `/api/index.php/v1/ambassador/*` | Updated `PATH_MAP` in `strapi.ts` to `/srh-api/index.php/*` |
| `570bf5f2` | SETUP.md was outdated | Rewrote for standalone API approach |
| `a490b3b2` | `.htaccess` rewrite loop caused 404s | Switched to PATH_INFO URLs (`/srh-api/index.php/clubs`) — Apache serves the real file directly, no rewrite needed |
| `7882c251` | PowerShell wrote BOM before `<?php`, breaking `declare(strict_types=1)` | Used `[System.IO.File]::WriteAllText` with `UTF8Encoding($false)` |
| `79985df6` | PHP notices from Laragon's `display_errors=On` were prepended to JSON | Added `error_reporting(0)` and `ini_set('display_errors','0')` |
| `04597dbe` | Empty responses instead of JSON errors | Added `set_exception_handler()` so all uncaught exceptions return JSON; added debug endpoints |
| `d9faa4a0` | Tables named `#srhub_ambassador_*` (literal `#`) instead of `srhub_ambassador_*` | Root cause: install SQL used `#srhub_` instead of `#__`. Added `fix_tables.sql` to recreate with correct names |
| `43de674a` | `RENAME TABLE IF EXISTS` is invalid MySQL syntax | Removed rename logic; just DROP + CREATE |
| `6dcec353` | Authorization header not passed to PHP in Apache CGI mode | `jwtVerify()` now checks `HTTP_AUTHORIZATION`, `REDIRECT_HTTP_AUTHORIZATION`, and `getallheaders()`; added `srh-api/.htaccess` with `SetEnvIf` |

---

## Current Architecture

### How the API Works

```
Browser (localhost:3000)
    ↓  fetch()
Next.js frontend (frontend/lib/strapi.ts + auth.ts)
    ↓  HTTP requests to http://joomla-cms.test/srh-api/index.php/*
Standalone PHP API (C:\laragon\www\joomla-cms\srh-api\index.php)
    ↓  PDO queries
MySQL database (srh_db) — Joomla tables + srhub_ambassador_* tables
```

The active API file is a **single self-contained PHP file** (~650 lines). It:
- Reads `configuration.php` from the Joomla root for DB credentials and JWT secret
- Uses PDO directly (no Joomla framework, no Composer)
- Implements HS256 JWT inline
- Routes by `$_SERVER['PATH_INFO']` (Apache serves the real file; PHP sees `/clubs` etc.)
- Returns `{"data": ...}` matching Strapi v5 response shape

---

## Differences Between Strapi and Joomla Backends

| Feature | Strapi (original) | Joomla (new) |
|---------|-------------------|--------------|
| **Framework** | Node.js / TypeScript | PHP / Joomla 5 |
| **API style** | Strapi v5 REST (`/api/clubs`) | Custom PHP REST (`/srh-api/index.php/clubs`) |
| **Auth** | Strapi JWT (via `/api/auth/local`) | Custom HS256 JWT (via `/srh-api/index.php/auth/login`) |
| **JWT secret** | Strapi's own config | Derived from Joomla's `$secret` in `configuration.php` |
| **User management** | Strapi Users & Permissions plugin | Joomla native users + `srhub_ambassador_user_meta` |
| **Roles** | Strapi role on user record | `app_role` field in `ambassador_user_meta` table |
| **Categories** | Custom `news-category` content type | Joomla native `#__categories` (extension=`com_ambassador`) |
| **Tags** | Custom `news-tag` content type | Joomla native `#__tags` |
| **Clubs** | Strapi collection | `srhub_ambassador_clubs` table |
| **Events** | Strapi collection | `srhub_ambassador_events` table |
| **News** | Strapi collection | `srhub_ambassador_news` table |
| **Club membership** | Strapi relation | `srhub_ambassador_club_members` join table |
| **Event attendance** | Strapi relation | `srhub_ambassador_event_attendees` join table |
| **Media/images** | Strapi Media Library (`/uploads/`) | Joomla Media Manager (`/images/ambassador/`) |
| **Response shape** | `{"data": {"id": 1, "documentId": "abc", "attributes": {...}}}` | `{"data": {"id": 1, "documentId": "1", ...}}` (flat, no `attributes`) |
| **Signup** | Available via Strapi | Disabled — accounts pre-created only |
| **Admin UI** | Strapi Admin Panel | Joomla Administrator |
| **Port** | localhost:1337 | joomla-cms.test (Laragon virtual host) |

### Intentional Simplifications in Joomla Build
- No `visibility` field on news (was unused by frontend)
- No `courseLabel` field on news (was unused by frontend)  
- No `club_ambassadors` join table (relation never queried by frontend)
- `documentId` is the string of the numeric database ID (e.g. `"42"`) instead of a UUID — the frontend only uses it for equality comparisons so this is transparent

---

## What Is Left To Complete

### Must-do before demo video

- [ ] **Add sample content via the frontend:**
  - Log in as `student.sophia@srh.de` → propose a club (tests Req 3)
  - Log in as `ambassador.lars@srh.de` → approve it in Manage tab (tests Req 4)
  - Log in as `student.sophia@srh.de` → join the approved club (tests Req 2)
  - Log in as `ambassador.lars@srh.de` → create a news article (tests Req 5)
  - Log in as `ambassador.lars@srh.de` → create an event (tests Req 5)
  - Log in as any user → view club list and club detail (tests Req 1)

- [ ] **Verify German nav strings** — toggle EN↔DE in the frontend and confirm menu labels switch (Home/Startseite, Clubs, News, Events, Manage/Verwalten, Profile/Profil, Login/Anmelden). The translation strings already exist in `frontend/lib/i18n.ts` — this just needs a visual check.

### Nice-to-have (not required for demo)

- [ ] Add more sample categories and tags for richer news/event demo
- [ ] Upload a cover image to a club to verify the media upload endpoint works end-to-end
- [ ] Update `MIGRATION_LOG.md` with the final "Phase 7: i18n verification" and "Phase 8: testing" entries

### Out of scope (confirmed)

- News/event editing or deletion from the frontend
- Full German localisation of content fields
- Data migration from Strapi
- Production deployment
- Merging `joomla-branch` into `main`

---

## File Map — What Lives Where

```
srh-ambassador/
├── backend/                          Strapi backend — UNTOUCHED, leave as-is
├── frontend/
│   ├── lib/
│   │   ├── strapi.ts                 MODIFIED — PATH_MAP, JOOMLA_API_URL
│   │   └── auth.ts                   MODIFIED — login/fetchMe use Joomla API
│   ├── components/
│   │   └── ClubNewPage.tsx           MODIFIED — upload URL only
│   └── .env.local                    YOUR LOCAL FILE — set NEXT_PUBLIC_JOOMLA_API_URL
├── joomla-backend/
│   ├── SETUP.md                      Full setup guide
│   ├── sql/
│   │   ├── setup_usergroups.sql      Creates 7 User Groups
│   │   ├── seed_users.sql            Inserts 7 demo users
│   │   └── fix_tables.sql            Creates ambassador tables (run if tables missing)
│   ├── standalone/
│   │   └── srh-api/
│   │       ├── index.php             THE ACTIVE API — copy to Joomla root
│   │       └── .htaccess             Passes Authorization header to PHP
│   └── administrator/components/com_ambassador/
│       └── sql/
│           └── install.mysql.sql     Reference SQL (for reinstalling component)
├── MIGRATION_LOG.md                  Phase-by-phase log of decisions
├── MIGRATION_MAPPING.md              Strapi→Joomla content type map
├── PROGRESS_REPORT.md                This file
└── .env.joomla.example               Documents required env vars
```

---

## Quick Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `{"error":"configuration.php not found"}` | `srh-api/` is not inside the Joomla root | Move `srh-api/` to `C:\laragon\www\joomla-cms\srh-api\` |
| `{"error":"DB connection failed"}` | Wrong DB credentials | Check `configuration.php` — `$host`, `$db`, `$user`, `$password` |
| `{"error":"...Column not found..."}` | Tables have old column names | Run DROP + CREATE block from `fix_tables.sql` in phpMyAdmin |
| `{"error":"Unauthorized"}` on `/users` | Authorization header not reaching PHP | Confirm `srh-api/.htaccess` is present in the Joomla root |
| `JSON.parse` error in browser | PHP outputting non-JSON | Visit the endpoint directly in browser — exception handler returns JSON error |
| Pages load but show no data | Tables are empty | Add content via frontend or phpMyAdmin |
| Frontend still calling `localhost:1337` | `.env.local` not set | Add `NEXT_PUBLIC_JOOMLA_API_URL=http://joomla-cms.test` to `frontend/.env.local` and restart `npm run dev` |
