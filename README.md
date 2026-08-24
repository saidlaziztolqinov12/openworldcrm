# Open World CRM

Management system for a language/education centre: cohorts, students, daily
attendance registers, staff, salary advances, an internal inbox, and parent
notifications over a Telegram bot.

React 19 · Vite 6 · TypeScript · Tailwind 4 · Cloud Firestore · Capacitor

---

## Security status

Authentication is **Firebase Authentication**. Passwords are owned by Firebase
and are never stored in Firestore or shipped in the bundle. Profile documents
are keyed by the Auth UID, and `firestore.rules` decides access from the role on
`users/{request.auth.uid}` — the client cannot grant itself a role.

Before the first deploy:

1. Firebase Console → Authentication → **enable Email/Password**.
2. Put a `FIREBASE_SERVICE_ACCOUNT` in your environment (see the table below).
3. Create the first administrator with `npm run seed:admin` (below). Every other
   account is created from the admin panel.
4. Deploy the rules: `firebase deploy --only firestore:rules`.

Steps 1 and 4 are not optional. Without step 1 nobody can sign in; without step
4 the database is still whatever is currently live in the console, which may
still be fully open.

### Migrating an existing database

Profile documents must be keyed by the Auth UID. Any `users/*` document from
before this change (`admin-1`, `teacher-1755…`) has an id Firebase Auth does not
know, so it cannot sign in and the rules will not match it. Recreate those
accounts: run `npm run seed:admin` for the director, then add the teachers from
the admin panel and delete the old documents. Records that reference a teacher
by id (`groups.teacherId`, `salary_advances.teacherId`) need repointing at the
new UIDs.

## Setup

```bash
npm install
cp .env.example .env      # then fill it in — see the table below
npm run dev               # http://localhost:3000
```

Node 20 or newer.

### Creating the first administrator

This is the only account that cannot be made from inside the app, because
creating staff requires an admin to already exist.

```bash
ADMIN_EMAIL=director@example.uz ADMIN_PASSWORD='<a strong password>' \
  ADMIN_NAME='Firstname Lastname' \
  npm run seed:admin
```

It creates the Firebase Auth user and the matching `users/{uid}` profile with
`role: 'admin'`. Re-running it resets that account's password. Teachers are then
added from the admin panel, which calls `api/users.ts` — creating an Auth user
has to happen server-side, since doing it in the browser would sign the
administrator out and into the account they just created.

Anyone can reset their own password from the **Forgot your password?** link on
the sign-in screen.

## Environment variables

Anything prefixed `VITE_` is **inlined into the browser bundle** and readable by
every visitor. Never put a secret behind that prefix.

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | server | for parent notifications | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | server | for the parent bot | Shared secret verified on every inbound update |
| `FIREBASE_SERVICE_ACCOUNT` | server | **yes** | Service account JSON on one line. Needed for staff account creation, push notifications, and verifying ID tokens on every API route |
| `ALLOWED_ORIGIN` | server | recommended | Comma-separated origins permitted to call the API routes. Add `https://localhost` (Android) and `capacitor://localhost` (iOS) if you ship the mobile app, or its requests are blocked by CORS |
| `VITE_API_BASE_URL` | client | for the mobile build | Absolute API origin; relative paths do not resolve inside the Capacitor WebView |

---

## Deploying

### Vercel

Framework preset **Vite**, build command `npm run build`, output directory
`dist`. Everything in `api/` is deployed as a serverless function; `server.ts`
is not used there — it exists so that local development and self-hosting run the
same handlers.

Set the environment variables above in Project → Settings → Environment
Variables.

### Firestore rules

```bash
firebase deploy --only firestore:rules
```

`firebase.json` and `.firebaserc` are committed, so the rules in this repo are
now actually deployable. Check what is live in the Console before you assume the
two agree.

### Telegram webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-domain>/api/telegram-webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

Verify with `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` — `url`
should match and `last_error_message` should be empty.

### Android

```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```

Set `VITE_API_BASE_URL` before building, otherwise the app cannot reach its own
API. The signing keystore must never be committed — losing it means the app can
never be updated again.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with HMR on port 3000 (`PORT` overrides) |
| `npm run build` | Client into `dist/`, server into `build/` |
| `npm start` | Serve the production build |
| `npm run lint` | `tsc --noEmit` |

---

## Known gaps

Tracked but not yet addressed:

- The nine Firestore listeners in `DataContext` fetch whole collections with no
  `where`/`limit`. At ~300 students this exceeds the Spark free tier's 50,000
  daily reads within a morning.
- Attendance is written to three collections (`attendance`, `attendance_records`,
  `sessions`) non-atomically, and one shared snapshot handler replaces the whole
  state, so the last collection to emit wins.
- No student tuition, payments or debt tracking, and no salary field to check an
  advance against.
- Data residency: Firestore runs outside Uzbekistan. Storing minors' personal
  data there may not satisfy local requirements — worth a legal check. A
  region cannot be changed after a project is created.
- No tests and no CI.
