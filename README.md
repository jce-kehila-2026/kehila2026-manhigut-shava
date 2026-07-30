# BogrotNet — רשת בוגרות מנהיגות שווה

BogrotNet is a private social network for alumnae of the Young Women's Program (YWP / מנהיגות שווה). It lets graduates stay connected, share posts, find mentors, request and offer help, and discover job opportunities within their community.

**Live site:** https://bogrotnet.web.app  
**Firebase project:** `kehila-manhigut-shava`

---

## Team

| Name | GitHub | Student ID |
|------|--------|-----------|
| Joelle Zanbil (Team Lead) | J_Almond | 215037862 |
| Salman Nairoukh | SalmanNa | 326084506 |
| Shahd Karawi | Shahdka02 | 213324270 |

**NGO contact:** Nitzan Senior Schneior — anitzan86@gmail.com / 058-627-7762

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Auth | Firebase Authentication (Email OTP + Google OAuth) |
| Database | Cloud Firestore |
| File storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Email (OTP) | SendGrid via Firebase Cloud Functions |
| Functions runtime | Node.js 20 |

---

## Features

- **Community feed** — posts, reposts, likes, comments, pinned posts, stories
- **Direct messaging** — text and image attachments, real-time updates
- **Help posts** — community-wide help feed; ask for or offer help
- **Help requests** — private targeted help requests between users
- **Mentor / mentee matching** — request and accept mentorship connections
- **Job board** — post and browse job listings
- **Events board** — RSVP to community events
- **Admin panel** — full user management, moderation, activity log, blacklist, report queue, analytics, data export/import
- **Birthday celebrations** — balloon animation on login, community wish wall
- **OTP email verification** and Google OAuth sign-in
- **Profile editor** — avatar and cover photo with in-browser drag-to-crop
- **Multilingual UI** — Hebrew (RTL), English (LTR), Arabic

---

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Firebase CLI: `npm install -g firebase-tools`

### 1. Clone the repository

```bash
git clone <repository-url>
cd kehila2026-manhigut-shava
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Create the environment file

Create a file at `frontend/.env`. **This file must never be committed to git** — it is already listed in `.gitignore`.

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

Find these values in the Firebase console:
**Project Settings → Your apps → Web app → SDK setup and configuration**

### 4. Run the development server

```bash
cd frontend
npm run dev
```

The app opens at http://localhost:5173.

---

## Deployment

Deploy everything (hosting + Firestore rules + Storage rules + Cloud Functions):

```bash
firebase deploy
```

The `predeploy` hook in `firebase.json` automatically runs `npm run build` before uploading, so the deployed site always reflects the latest code.

To deploy only the frontend:

```bash
firebase deploy --only hosting:bogrotnet
```

To deploy only security rules:

```bash
firebase deploy --only firestore:rules,storage
```

---

## Project Structure

```
kehila2026-manhigut-shava/
├── frontend/                   React app (Vite)
│   ├── src/
│   │   ├── components/         Shared UI components
│   │   │   ├── ImageCropper.jsx
│   │   │   ├── SlideshowBanner.jsx
│   │   │   ├── TutorialPopup.jsx
│   │   │   ├── MultiSelectDropdown.jsx
│   │   │   ├── ProfessionPicker.jsx
│   │   │   ├── InstitutionPicker.jsx
│   │   │   └── RegionPicker.jsx
│   │   ├── hooks/
│   │   │   ├── useMessages.js   Real-time conversations listener
│   │   │   └── useIsMobile.js
│   │   ├── utils/
│   │   │   ├── birthday.js      Birthday date helpers
│   │   │   ├── deletePost.js    Cascading post deletion
│   │   │   ├── safeUrl.js       URL sanitizer
│   │   │   └── translateProfile.js
│   │   ├── App.jsx              Root component and routing
│   │   ├── AuthContext.jsx      Firebase auth state provider
│   │   ├── LanguageContext.jsx  RTL / LTR language switcher
│   │   ├── ThemeContext.jsx     Light / dark theme
│   │   ├── firebase.js          Firebase SDK initialization
│   │   ├── activityLogger.js    Admin audit trail helper
│   │   ├── AdminPage.jsx        Full admin panel
│   │   ├── DashboardPage.jsx
│   │   ├── CommunityPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── Supportpage.jsx
│   │   ├── HelpPostFeed.jsx
│   │   ├── LandingPage.jsx
│   │   ├── AuthPage.jsx
│   │   ├── CompleteProfilePage.jsx
│   │   ├── OtpVerificationPage.jsx
│   │   └── TermsPage.jsx
│   ├── public/
│   ├── index.html
│   └── vite.config.js
├── functions/                   Firebase Cloud Functions
│   └── index.js                 SendGrid OTP email sender
├── firestore.rules              Firestore security rules
├── storage.rules                Firebase Storage security rules
├── firebase.json                Firebase project configuration
└── .firebaserc                  Firebase project alias
```

---

## Firebase Services and Security

### Services used

| Service | What it does |
|---------|-------------|
| Authentication | Email OTP login and Google OAuth |
| Firestore | All app data |
| Storage | Profile photos, cover images, post media, chat images |
| Hosting | Serves the React app |
| Cloud Functions | Sends OTP and email-change verification emails via SendGrid |

### Security rules

Both `firestore.rules` and `storage.rules` enforce:

- All reads and writes require a signed-in user
- Users can only modify their own data
- Admin permissions (flagged via `isAdmin: true` in Firestore) unlock elevated actions
- The blacklist collection is publicly readable so login-time checks work before auth
- A catch-all `deny` at the bottom blocks anything not explicitly permitted

### Firestore collections overview

| Collection | Purpose |
|------------|---------|
| `users/{uid}` | User profiles |
| `users/{uid}/private/{doc}` | Contact PII (phone/email) — owner and admin only |
| `users/{uid}/birthdayWishes/{id}` | Birthday wishes |
| `posts/{id}` | Community feed posts |
| `posts/{id}/comments/{id}` | Post comments |
| `conversations/{id}` | DM threads |
| `conversations/{id}/messages/{id}` | Chat messages |
| `helpPosts/{id}` | Community help feed posts |
| `helpPosts/{id}/comments/{id}` | Help post comments |
| `helpRequests/{id}` | Private help requests between users |
| `notifications/{id}` | In-app notifications |
| `networks/{id}` | Connection (follow) relationships |
| `mentorRequests/{id}` | Mentor/mentee matching requests |
| `events/{id}` | Community events |
| `events/{id}/rsvps/{uid}` | Event RSVPs |
| `jobs/{id}` | Job listings |
| `groups/{id}` | Groups / circles |
| `reviews/{id}` | Mentor reviews |
| `activityLogs/{id}` | Admin audit trail |
| `reports/{id}` | User-submitted content reports |
| `blacklist/{id}` | Permanently blocked email addresses |
| `siteSettings/{doc}` | Slideshow images and global settings |
| `otps/{uid}` | Email OTP codes (short-lived) |
| `userNotes/{authorId}/notes/{targetId}` | Private admin notes about users |
| `customProfessions`, `customInstitutions`, `customRegions` | User-contributed dropdown options |

---

## Cost and Paid Services

The app uses the **Firebase Blaze (pay-as-you-go)** plan. Cloud Functions do not run on the free Spark plan.

| Service | Free allowance | Notes |
|---------|---------------|-------|
| Firestore | 50k reads / 20k writes / 1k deletes per day | Monitor as the community grows |
| Firebase Storage | 5 GB stored, 1 GB/day download | Monitor as media accumulates |
| Firebase Hosting | 10 GB storage, 360 MB/day transfer | Typically stays within free limits |
| Cloud Functions | Billed per invocation on Blaze | Only triggered by OTP requests |
| SendGrid | 100 emails/day on free tier | Upgrade if OTP volume increases |

**The organization must provide a credit card in the Firebase console to keep the Blaze plan active.** Blaze also enables automatic daily Firestore backups, which are strongly recommended.

---

## Managing API Keys Safely

1. **`.env` is never committed to git.** It is in `.gitignore` and must stay there.

2. **The Firebase API key** (in `.env`) is a browser-visible identifier — it does not grant database access on its own. All access is controlled by Firestore and Storage security rules. It is safe if those rules are correctly deployed.

3. **The SendGrid API key** is a server secret. It is stored in Firebase Secret Manager and never appears in source code. To set or rotate it:

   ```bash
   firebase functions:secrets:set SENDGRID_KEY
   # Enter the key value when prompted, then redeploy functions
   firebase deploy --only functions
   ```

4. **If a key is compromised:**
   - Firebase API key → regenerate in Firebase console under **Project Settings → Your apps → Regenerate key**
   - SendGrid key → revoke in the SendGrid dashboard, then set a new one with the command above

5. **Rotate all keys whenever** a team member with access leaves the organization.

---

## Handover Steps for the Organization

### GitHub access

1. Go to the repository on GitHub
2. Open **Settings → Collaborators and teams → Add people**
3. Invite the organization's maintainer with the **Admin** role
4. Optionally: keep the development team as **Contributor** for ongoing support

### Firebase access

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project `kehila-manhigut-shava`
3. Open **Project Settings → Users and permissions → Add member**
4. Enter the organization's Google account email and assign the **Owner** role
5. Upgrade to Blaze plan: **Project Settings → Usage and billing → Modify plan**

### SendGrid

The organization will need their own SendGrid account, or access to the existing account. Update the API key with:

```bash
firebase functions:secrets:set SENDGRID_KEY
firebase deploy --only functions
```

---

## Contacts

- **Team lead:** Joelle Zanbil — joellezanbil2911@gmail.com
- **NGO contact:** Nitzan Senior Schneior — anitzan86@gmail.com / 058-627-7762

---

## License

MIT License
