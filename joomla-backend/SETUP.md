# com_ambassador — Laragon Setup Guide

This guide walks you through installing and testing the `com_ambassador` Joomla component on a local Laragon + Joomla 5.x development environment.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Laragon (latest) | Running with Apache + MySQL + PHP 8.1+ |
| Joomla 5.x | Installed under Laragon (e.g. `C:\laragon\www\joomla`) |
| Joomla local URL | e.g. `http://joomla.test` or `http://localhost/joomla` |
| Node.js 18+ | For running the Next.js frontend |
| Composer | Available in Laragon terminal or system PATH |

---

## Step 1 — Install Composer dependencies

Open the Laragon terminal (or any terminal with PHP on PATH), navigate to the `joomla-backend/` directory in this repo, and run:

```bash
cd path\to\srh-ambassador\joomla-backend
composer install
```

This installs `firebase/php-jwt` into `joomla-backend/vendor/`. The `vendor/` directory is gitignored; you must run this once before packaging.

---

## Step 2 — Package the component

A packaging script is included. From the `joomla-backend/` directory run:

```bash
php package.php
```

This creates `joomla-backend/com_ambassador.zip`.

Alternatively on Windows:
1. Select all folders/files inside `joomla-backend/` (administrator, api, components, com_ambassador.xml, vendor)
2. Right-click → Send to → Compressed (zipped) folder → name it `com_ambassador.zip`

---

## Step 3 — Install the component in Joomla

1. Log in to your Joomla admin panel: `http://joomla.test/administrator`
2. Go to **System → Install → Extensions**
3. Choose **Upload Package File** tab
4. Upload `joomla-backend/com_ambassador.zip`
5. Joomla will install the component and run the SQL install script automatically (creates all `#__ambassador_*` tables)

---

## Step 4 — Enable Joomla Web Services API

1. In Joomla admin: **System → Manage → Plugins**
2. Search for `webservices` — enable all plugins found (especially `plg_webservices_com_ambassador` if listed)
3. Also ensure **System → API Access** is enabled (Joomla 5: it's on by default)

---

## Step 5 — Run database setup scripts via phpMyAdmin

Open phpMyAdmin: `http://localhost/phpmyadmin`

Select your Joomla database (e.g. `joomla`), then run each script using the **Import** tab:

### 5a. Create User Groups
Import: `joomla-backend/sql/setup_usergroups.sql`

This creates the 7 role groups: Student, ExchangeStudent, Professor, Teacher, Ambassador, Admin, SuperAdmin.

### 5b. Seed sample users
Import: `joomla-backend/sql/seed_users.sql`

This inserts the 7 demo accounts from `USERS.MD` with correct group assignments and role metadata.

> **Important:** These scripts use the table prefix `jos_`. If your Joomla installation uses a different prefix (visible in `configuration.php` as `$dbprefix`), you will need to find-replace `jos_` with your prefix before importing.

**Sample credentials (from USERS.MD):**

| Role | Email | Password |
|------|-------|----------|
| Student | student.sophia@srh.de | Student1234! |
| Exchange Student | exchange.emma@srh.de | Exchange1234! |
| Professor | prof.thomas@srh.de | Professor1234! |
| Teacher | teacher.anna@srh.de | Teacher1234! |
| Ambassador | ambassador.lars@srh.de | Ambassador1234! |
| Admin | admin.klaus@srh.de | Admin1234! |
| Super Admin | superadmin@srh.de | SuperAdmin1234! |

---

## Step 6 — Configure CORS (allow Next.js frontend)

The Next.js frontend runs on `http://localhost:3000` and calls your Joomla API. Joomla must allow this cross-origin request.

Open your Joomla installation's root `.htaccess` file (e.g. `C:\laragon\www\joomla\.htaccess`) and add these lines at the very top, before any other rules:

```apache
# Allow CORS for local Next.js frontend
Header set Access-Control-Allow-Origin "http://localhost:3000"
Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Authorization"
Header set Access-Control-Allow-Credentials "true"

RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]
```

Then in Laragon: **right-click tray icon → Apache → Reload**.

---

## Step 7 — Add sample content (manual)

After the component is installed and users are seeded, add a few sample categories and tags manually via the Joomla admin so the Manage page dropdowns have options:

1. **Categories:** Joomla admin → **Content → Categories → New**
   - Create 2–3 categories. In the **Component** field (or Extension field), type `com_ambassador`
   - Example: "Campus News", "Events & Activities", "Club Announcements"

2. **Tags:** Joomla admin → **Components → Tags → New**
   - Create 3–5 tags. Example: "Sports", "Academic", "Culture", "Technology", "Social"

---

## Step 8 — Configure the frontend

In `frontend/.env.local`, set:

```
NEXT_PUBLIC_JOOMLA_API_URL=http://joomla.test
```

(Replace `http://joomla.test` with your actual Laragon Joomla URL if different.)

---

## Step 9 — Run the frontend

```bash
cd frontend
npm install   # only needed once
npm run dev
```

Browse to `http://localhost:3000`.

---

## Step 10 — Verify

Walk through the 6 functional requirements:

1. Visit `/clubs` — you should see the clubs listing (empty until you add sample clubs)
2. Log in as `student.sophia@srh.de` / `Student1234!` — profile should load with Student role
3. As student: go to `/clubs/new` and submit a club proposal
4. Log in as `ambassador.lars@srh.de` / `Ambassador1234!` — the Manage tab should appear with the pending club
5. As ambassador: approve/reject the club proposal
6. As professor (`prof.thomas@srh.de`): go to Manage → Create News / Create Event

---

## Troubleshooting

**CORS errors in browser console:**
- Check that the `.htaccess` edits in Step 6 are at the very top of the file
- Reload Apache in Laragon after every `.htaccess` change

**"Component not found" or 404 from API:**
- Confirm the component is installed (Joomla admin → System → Manage → Extensions → search "ambassador")
- Confirm `plg_webservices_com_ambassador` plugin is enabled

**"Table doesn't exist" errors:**
- The install SQL may have failed. Go to phpMyAdmin and manually import `joomla-backend/sql/install.mysql.sql` against your Joomla database (replace `#__` with your table prefix, e.g. `jos_`)

**Login returns 401:**
- Check that the JWT secret in `joomla-backend/api/components/com_ambassador/src/Controller/AuthController.php` matches what's set (default: uses a secret from Joomla's configuration.php secret field)

**Wrong table prefix:**
- Check `$dbprefix` in `C:\laragon\www\joomla\configuration.php`
- All SQL scripts use `jos_` as the example prefix — replace with yours if different
