# com_ambassador — Laragon Setup Guide

This guide walks you through installing and testing the `com_ambassador` Joomla component on a local Laragon + Joomla 5.x development environment.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Laragon (latest) | Running with Apache + MySQL + PHP 8.1+ |
| Joomla 5.x | Installed under Laragon — check your URL in the Laragon tray |
| Joomla local URL | Check Laragon tray → folder name + `.test`, e.g. `http://joomla-cms.test` |
| Node.js 18+ | For running the Next.js frontend |

> **No Composer needed.** The API uses only built-in PHP features (no external packages).

---

## Step 1 — Package the component

Open a terminal, navigate to `joomla-backend/` and run:

```bash
php package.php
```

This creates `joomla-backend/com_ambassador.zip`.

**Alternative (no PHP on PATH):** manually ZIP the contents inside `joomla-backend/administrator/` and `joomla-backend/api/` plus the `com_ambassador.xml` manifest into a single `com_ambassador.zip`.

---

## Step 2 — Install the component in Joomla

1. Log in to your Joomla admin panel (e.g. `http://joomla-cms.test/administrator`)
2. Go to **System → Install → Extensions**
3. Choose **Upload Package File** tab
4. Upload `joomla-backend/com_ambassador.zip`
5. Joomla installs the component and runs the SQL install script automatically (creates all `#__ambassador_*` tables)

---

## Step 3 — Run database setup scripts via phpMyAdmin

Open phpMyAdmin: `http://localhost/phpmyadmin`

Select your Joomla database, then run each script using the **Import** tab:

### 3a. Create User Groups
Import: `joomla-backend/sql/setup_usergroups.sql`

Creates 7 role groups: Student, ExchangeStudent, Professor, Teacher, Ambassador, Admin, SuperAdmin.

### 3b. Seed sample users
Import: `joomla-backend/sql/seed_users.sql`

Inserts the 7 demo accounts from `USERS.MD` with group assignments and role metadata.

> **Important:** These scripts use the table prefix `jos_`. If your Joomla uses a different prefix  
> (check `$dbprefix` in `configuration.php`), find-replace `jos_` with yours before importing.

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

## Step 4 — Install the standalone API entry point

The API is served by a **standalone PHP file** (`srh-api/index.php`). This bypasses Joomla's complex routing entirely and is much easier to get running.

### 4a. Copy the file

Copy `joomla-backend/standalone/srh-api/index.php` into a new `srh-api/` folder in your Joomla root:

```
C:\laragon\www\joomla-cms\srh-api\index.php    ← create this
```

(Replace `joomla-cms` with your actual Joomla folder name.)

### 4b. Add one line to Joomla's `.htaccess`

Open `C:\laragon\www\joomla-cms\.htaccess` and add this line **before** the final `RewriteRule .* index.php [L]` line:

```apache
# SRH Ambassador standalone API
RewriteRule ^srh-api(/.*)?$ srh-api/index.php [L,QSA]
```

It should look like this at the end of the rewrite block:

```apache
# SRH Ambassador standalone API — must be BEFORE the Joomla catch-all
RewriteRule ^srh-api(/.*)?$ srh-api/index.php [L,QSA]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule .* index.php [L]
```

### 4c. Reload Apache

In the Laragon tray: right-click → Apache → Reload.

### 4d. Test the health endpoint

Open this in your browser:

```
http://joomla-cms.test/srh-api/health
```

You should see JSON like:
```json
{"status":"ok","api":"com_ambassador","joomla_root":"C:/laragon/www/joomla-cms","time":"..."}
```

If you see JSON — the API is wired up correctly. If you see a Joomla 404 page — check the `.htaccess` edit.

---

## Step 5 — Add sample content (manual)

Add a few categories and tags so the frontend dropdowns have options:

1. **Categories:** Joomla admin → **Content → Categories → New**
   - Set the **Component** field to `com_ambassador`
   - Create 2–3 categories, e.g. "Campus News", "Events & Activities", "Club Announcements"

2. **Tags:** Joomla admin → **Components → Tags → New**
   - Create 3–5 tags, e.g. "Sports", "Academic", "Culture", "Technology", "Social"

---

## Step 6 — Configure the frontend

Create (or edit) `frontend/.env.local`:

```
NEXT_PUBLIC_JOOMLA_API_URL=http://joomla-cms.test
```

Replace `http://joomla-cms.test` with your actual Laragon Joomla URL if yours is different.  
To find it: Laragon tray → left-click → your site name.

---

## Step 7 — Run the frontend

```bash
cd frontend
npm install   # only needed once
npm run dev
```

Browse to `http://localhost:3000`.

---

## Step 8 — Verify

Walk through the 6 functional requirements:

1. Visit `/clubs` — clubs listing (empty until you add sample data)
2. Log in as `student.sophia@srh.de` / `Student1234!` — profile should load with Student role
3. As student: go to `/clubs/new` and submit a club proposal
4. Log in as `ambassador.lars@srh.de` / `Ambassador1234!` — Manage tab should show pending club
5. As ambassador: approve/reject the club proposal
6. As professor (`prof.thomas@srh.de`): go to Manage → Create News / Create Event

---

## Troubleshooting

**"NetworkError" or login fails immediately:**
- Confirm your `.env.local` has the right URL (`http://joomla-cms.test`, not `http://joomla.test`)
- Visit `http://joomla-cms.test/srh-api/health` directly in your browser — if this shows Joomla 404, the `.htaccess` rule is missing or in the wrong place
- Reload Apache after every `.htaccess` change

**Health endpoint returns Joomla 404:**
- The `.htaccess` line is in the wrong place or was not saved
- Make sure the line is BEFORE `RewriteRule .* index.php [L]`

**Health endpoint returns PHP error about "Joomla root not found":**
- The `srh-api/` folder is not inside your Joomla root
- Check that `srh-api/index.php` is at `C:\laragon\www\joomla-cms\srh-api\index.php`

**Login returns 401:**
- Double-check email + password match the credentials table above
- Run the seed script again if unsure

**"Table doesn't exist" PHP errors:**
- The install SQL failed — in phpMyAdmin, manually import `administrator/components/com_ambassador/sql/install.mysql.sql` (replace `#__` with your table prefix)

**Wrong table prefix:**
- Check `$dbprefix` in `C:\laragon\www\joomla-cms\configuration.php`
- All SQL scripts default to `jos_` — find-replace if your prefix is different
