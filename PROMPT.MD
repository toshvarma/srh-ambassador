# SRH Ambassador Project Prompt (Conversation Summary)

Use this prompt to continue the SRH Ambassador project exactly in line with all prior decisions and implementation work.

---

## Project Goal
Build a **university CMS** for SRH using:
- **Backend:** Strapi
- **Frontend:** Next.js

The system must support:
- Multi-role access control
- EN/DE multilingual content
- University workflows for clubs, events, users, and news
- SRH-inspired visual style (orange, black, white)

---

## Original Requirements Agreed
1. At least 3 Strapi data types (implemented with more than 3): **Users, Events, Clubs, News**
2. Frontend that can both display and populate these data types
3. Role and rights management
4. Multilingual support (English + German)
5. User role set:
   - Student
   - Exchange Student
   - Professor
   - Teacher
   - Ambassador
   - Admin
   - Super Admin
6. Example workflow:
   - Students submit club ideas
   - Ambassadors approve/reject/suggest changes
   - Exchange students can view/join clubs but not create them

---

## What Was Implemented

### Backend (Strapi)
- Stabilized content-type naming/registry issues (including `news-item` naming consistency).
- Fixed relation wiring and schema startup blockers.
- Added/updated content models and relationships for:
  - Users
  - Clubs
  - Events
  - News Items
- Added club workflow fields (short + detailed descriptions, member limits, equipment, feedback, etc.).
- Added news visibility field:
  - `all`
  - `student`
  - `professor`
- Implemented/updated role permissions and seed automation.
- Rewrote seed script to:
  - Reset/seed roles and permissions
  - Remove duplicate/extra users
  - Keep one sample user per role
  - Seed multilingual mock content (news/clubs/events)
  - Clean legacy content older than 2 days from legacy tables

### Frontend (Next.js)
- Authentication flow (login/signup/session refresh/logout) wired to Strapi auth.
- Role-aware capability logic integrated.
- EN/DE localization context and dictionary support.
- Data list/detail/management UX across main sections.
- **Anonymous gating** implemented:
  - If signed out, show only a site description + sign-in button.
- Clubs workflow UI implemented:
  - Student club submission form with rich fields
  - Auto-filled creator context from signed-in profile
  - Ambassador moderation queue (approve/reject/suggest changes + feedback)
  - Approved club cards with rounded layout + read-more + join action
- News listing now applies role-based visibility filtering.
- Footer social links removed.
- Theme normalized away from blue to orange/black/white palette.

### Documentation Added
- [USERS.MD](/C:/Users/Tosh/Documents/GitHub/srh-ambassador/USERS.MD): sample role accounts + login credentials
- [CONFIGURE.MD](/C:/Users/Tosh/Documents/GitHub/srh-ambassador/CONFIGURE.MD): how to edit content/roles/workflows in Strapi

---

## Major Issues Encountered and Fixed
1. Strapi startup failure due to plural/content-type uniqueness conflicts.
2. Strapi key vs singularName mismatch for News.
3. Frontend runtime error from Turbopack/SWC helper module resolution (fixed via cache/dependency cleanup and rerun).
4. App routing conflicts and runtime loading inconsistencies.
5. Type/build failures during workflow expansion (fixed and revalidated).

---

## Current Seeded Demo State
- Exactly **7 sample users** (one per role) in auth + CMS user tables.
- News seeded with locale coverage and visibility scenarios:
  - Public (all roles)
  - Student-only
  - Professor-only
- Clubs seeded with:
  - Approved clubs visible for browsing/joining
  - Pending club for ambassador moderation workflow
- Event content seeded for demo traversal.

---

## Validation Already Run
- Backend seed script: success
- Backend build: success
- Frontend lint: pass (warnings only for `<img>` optimization)
- Frontend build: success
- Runtime/auth/RBAC smoke checks:
  - Student login/content
  - Professor login/content
  - Exchange student club join behavior
  - Ambassador moderation behavior
  - Anonymous gating behavior

---

## Working Style Expected for Next Agent
1. Preserve existing architecture and naming conventions.
2. Keep all role workflows functional.
3. Preserve EN/DE support.
4. Run checks after each significant change (build/lint/runtime/API smoke tests).
5. Do not reintroduce blue palette or footer social links.
6. Maintain one-sample-user-per-role structure unless explicitly changed.

---

## Suggested Next Steps
1. Add end-to-end UI tests for role workflows (student submit, ambassador moderate, exchange join).
2. Replace direct `<img>` usage with `next/image` where practical.
3. Add upload-based club/gallery image UX (currently URL space is available; media upload can be expanded).
4. Tighten per-record authorization rules in backend controllers/policies if stricter ownership checks are needed.
5. Add editorial status tooling in frontend manage views for better content lifecycle control.

---

## Quick Resume Prompt
“Continue the SRH Ambassador CMS project from its current state. Keep Strapi + Next.js architecture, preserve EN/DE localization, maintain one sample user per role, and retain the student→ambassador club workflow and role-based news visibility. First run backend/frontend checks, then implement any remaining UX and authorization refinements without breaking existing behavior.”
