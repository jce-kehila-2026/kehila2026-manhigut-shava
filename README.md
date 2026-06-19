# Manhigut Shava — Graduate Management Platform

A web application for **The Movement for Equal Leadership** (התנועה למנהיגות שווה), an NGO promoting young women's public and political leadership. The platform serves as a secure internal network for program graduates to connect, share, and be managed by NGO staff.

---

## Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Privacy and Security](#privacy-and-security)
- [Team](#team)
- [Contacts](#contacts)

---

## Overview

The platform replaces manual Excel-based graduate tracking with a centralized, permission-controlled web application. It gives graduates a space to maintain profiles and connect with peers, while giving NGO administrators full oversight of the community.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, Vite |
| Backend / Database | Firebase (Firestore, Authentication, Storage, Cloud Functions) |
| Testing | Playwright |
| Deployment | Firebase Hosting |

---

## Features

**Authentication**
- Email registration with OTP verification
- Google OAuth sign-in
- Role-based access control (member / admin)

**Graduate Profiles**
- Personal profile with photo upload and in-browser image cropping
- Fields: name, city, profession, academic background, bio, political interests, LinkedIn
- Demographic fields: region, campus, degree, identity, ethnicity

**Community Feed**
- Post creation with image attachments and embedded links
- Comments and reactions
- Post moderation (edit / delete by author or admin)

**Real-time Chat**
- Direct messaging between graduates
- Online presence indicators

**Member Directory**
- Search and filter graduates by name, profession, city, and interest tags
- Peer-matching based on shared tags and background

**Admin Dashboard**
- Overview statistics: total members, verified accounts, active this week, total posts
- User management: edit, delete, promote to admin, revoke admin, set granular permissions
- Content moderation: review and remove posts
- Activity log: full audit trail of user actions (signup, login, post, comment, etc.)
- Report queue: review member-submitted reports with resolve / dismiss actions
- Analytics: top professions, cities, sectors, religious identities, regions

**Internationalization and Theming**
- Hebrew, Arabic, and English language support
- Light and dark mode

---

## Project Structure

```
/
  frontend/           React application
    src/
      components/     Reusable UI components
      hooks/          Custom React hooks
      utils/          Shared utility functions
      *.jsx           Page-level components (Auth, Dashboard, Profile, Community, Chat, Admin, Support)
      firebase.js     Firebase client configuration
    public/           Static assets
  functions/          Firebase Cloud Functions (admin operations, activity logging)
  firestore.rules     Firestore security rules
  storage.rules       Firebase Storage security rules
  firebase.json       Firebase project configuration
```

---

## Local Setup

**Prerequisites:** Node.js 18+, a Firebase project with Authentication, Firestore, Storage, and Cloud Functions enabled.

```bash
git clone <repo-url>
cd kehila2026-manhigut-shava/frontend
cp .env.example .env
# Fill in your Firebase project credentials in .env
npm install
npm run dev
```

**Environment variables** (see `frontend/.env.example`):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Privacy and Security

The platform is an internal tool for verified graduates and NGO staff only.

- Profile information is visible to all members. Ethnicity and background fields are optional and each user controls whether they are shown publicly or kept private.
- Admin permissions are granular: each admin account can be scoped to specific actions (manage users, manage content, view logs, export data, etc.).
- Firebase security rules enforce access control at the database and storage level.
- Secrets are never committed to the repository; all credentials are managed via environment variables and Firebase project settings.

---

## Handover Checklist

- [ ] Deployed URL and admin credentials shared securely with NGO staff
- [ ] Non-profit staff added as repo collaborators or repo transferred
- [ ] HANDOVER.md completed with maintenance steps and Firebase console access

---

## Team

| Name | GitHub | Student ID |
| :--- | :--- | :--- |
| Joelle Zanbil (Team Lead) | joelleza | 215037862 |
| Salman Nairoukh | SalmanNa | 326084506 |
| Shahd Karawi | Shahdka02 | 213324270 |
| Abed Abuserrieh | abedab | 213695380 |

---

## Contacts

- **Project lead:** Joelle Zanbil — joellezanbil2911@gmail.com
- **NGO contact:** Nitzan Senior Schneior — anitzan86@gmail.com / 058-627-7762

---

## License

MIT License
