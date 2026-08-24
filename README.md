# Open World CRM

Management system for a language/education centre: cohorts, students, daily
attendance registers, staff, salary advances, an internal inbox, and parent
notifications over a Telegram bot.

React 19 · Vite 6 · TypeScript · Tailwind 4 · Cloud Firestore · Capacitor

---

## Security status — read this first

The app **does not use Firebase Authentication yet**. It compares passwords in
the browser and stores them as plain fields on the `users` documents, which
means `request.auth` is always `null` and `firestore.rules` cannot be tightened
without locking everyone out. The rules are therefore still fully open.

**Do not put real student data in this system until that is fixed.**

The migration, in order:

1. Firebase Console → Authentication → enable Email/Password.
2. Create an account there for the director and for each teacher.
3. Replace `loginWithCredentials` in `src/context/AuthContext.tsx` with
   `signInWithEmailAndPassword`, and read the role from `users/{uid}`.
4. Delete the `password` field from the `User` type and from every document.
5. `mv firestore.rules.production firestore.rules && firebase deploy --only firestore:rules`

Until then, treat the database as public.

---

## Setup

```bash
npm install
cp .env.example .env      # then fill it in — see the table below
npm run dev               # http://localhost:3000
```

Node 20 or newer.

### Creating the first administrator

There is no default account and the app no longer seeds itself. Create the
first admin deliberately:

```bash
ADMIN_EMAIL=director@example.uz ADMIN_PASSWORD='<a strong password>' \
  ADMIN_NAME='Firstname Lastname' \
  npm run seed:admin
```

Further teachers are added from the admin panel.

---

## Environment variables

Anything prefixed `VITE_` is **inlined into the browser bundle** and readable by
every visitor. Never put a secret behind that prefix.

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | server | for parent notifications | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | server | for the parent bot | Shared secret verified on every inbound update |
| `FIREBASE_SERVICE_ACCOUNT` | server | for push notifications | Service account JSON on one line |
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

- Firebase Authentication (above) — everything else depends on it.
- The nine Firestore listeners in `DataContext` fetch whole collections with no
  `where`/`limit`. At ~300 students this exceeds the Spark free tier's 50,000
  daily reads within a morning.
- Attendance is written to three collections (`attendance`, `attendance_records`,
  `sessions`) non-atomically, and one shared snapshot handler replaces the whole
  state, so the last collection to emit wins.
- No student tuition, payments or debt tracking, and no salary field to check an
  advance against.
- No tests and no CI.
