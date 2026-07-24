# CONFIGURE: Adjusting Demo Content in Strapi

## 1) Start backend and open admin
1. In [backend/](/C:/Users/Tosh/Documents/GitHub/srh-ambassador/backend), run `npm run dev`.
2. Open `http://localhost:1337/admin`.
3. Sign in with your Strapi admin account.

## 2) Where to edit content
- News: **Content Manager -> News**
- Clubs: **Content Manager -> Club**
- Events: **Content Manager -> Event**
- User profiles used by frontend roles: **Content Manager -> User**

## 3) News visibility control
In each News entry, set **visibility** to:
- `all` -> visible to all signed-in roles
- `student` -> visible only to Student role
- `professor` -> visible only to Professor role

## 4) Club workflow fields
For each Club entry, edit:
- `shortDescription` (card text)
- `detailedDescription` (expanded read-more content)
- `minimumMembers` / `maximumMembers`
- `specialEquipmentRequired`
- `meetingFrequency`
- `recommendedFor`
- `signupNotes`
- `approvalStatus` (`pending`, `approved`, `rejected`)
- `ambassadorFeedback` (for change requests)
- `submittedBy`, `members`, `ambassadors` relations

Only `approved` clubs are shown in the main student/exchange club list.

## 5) Roles and permissions
Go to **Settings -> Users & Permissions plugin -> Roles**.
Verify each role can access only intended endpoints:
- Student: create/update own club submissions, read content
- Exchange Student: read content, join clubs (club update)
- Ambassador: approve/reject/suggest changes for clubs, manage content
- Professor/Teacher/Admin/Super Admin: broader content management

## 6) Reseed demo users/content
To reset demo data, run in [backend/](/C:/Users/Tosh/Documents/GitHub/srh-ambassador/backend):

```bash
npm run seed:roles
```

This reseeds sample users, roles, permissions, and demo News/Clubs/Events.
