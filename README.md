# cbud frontend

cbud is an Expo and React Native client for a conversational school-work assistant. It combines Clerk authentication, streamed AI chat, a Canvas LMS connection, detected assignments, and scheduled jobs in one mobile-first interface. An animated `Buddy` character reacts to authentication, typing, thinking, success, and error states throughout the experience.

This repository contains the frontend only. It expects a separate authenticated API for chat, Canvas data, memory, account data, and jobs.

## What is included

- Passwordless email-code sign-in through Clerk
- Email/password sign-up followed by email verification
- Persistent Clerk sessions stored with Expo's secure token cache
- Server-sent event (SSE) chat with Markdown responses
- Visible agent activity and assignment cards inside chat
- Restored chat history for returning users
- Canvas LMS connection using a school Canvas URL and personal access token
- Detected assignment list with due dates, submission status, and Canvas links
- Scheduled agent tasks and reminders with cancellation, chat results, and local notifications
- Memory and account-data deletion controls
- A reusable, accessible animated mascot with gaze and expression presets
- File-based navigation with authentication guards

## Technology

| Area | Implementation |
| --- | --- |
| Application | Expo SDK 57, React Native 0.86, React 19, TypeScript 6 |
| Navigation | Expo Router 57 |
| Authentication | Clerk Expo SDK |
| Networking | Standard `fetch` plus `expo/fetch` for streamed chat |
| Notifications | `expo-notifications` local schedules reconciled with server reminder jobs |
| Rendering | React Native and `react-native-markdown-renderer` |
| Animation | React Native `Animated` API |
| Session storage | Clerk's Expo secure token cache / `expo-secure-store` |
| Tooling | npm, Expo CLI, ESLint 9 |

Expo APIs and commands in this project should be checked against the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/).

## Prerequisites

You will need:

- A Node.js installation supported by Expo SDK 57
- npm
- An iOS simulator with Xcode, an Android emulator with Android Studio, a physical development device, or a web browser
- A Clerk application and its publishable key
- A running cbud backend implementing the API described below
- Optionally, a Canvas LMS account and personal access token

The repository does not include backend services, a database, Clerk configuration, or Canvas credentials.

## Getting started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a local environment file from the provided template:

   ```sh
   cp .env.example .env
   ```

3. Set the public client variables:

   ```dotenv
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_your_clerk_publishable_key
   EXPO_PUBLIC_API_URL=http://localhost:3000
   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_replace_with_your_ios_revenuecat_public_key
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_replace_with_your_android_revenuecat_public_key
   ```

4. Start the Expo development server:

   ```sh
   npm start
   ```

Use the terminal shortcuts from Expo to open the desired target, or use one of the platform scripts below.

> [!IMPORTANT]
> Variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle. The Clerk publishable key,
> API base URL, and platform-specific RevenueCat SDK keys are public. Never place a RevenueCat secret
> key, Clerk secret key, Canvas access token, or other secret in these variables.

### In-app purchase plans

The Plans screen shows only the RevenueCat package backed by the `monthly` product identifier. It displays
the store-localized price and the backend-authorized UTC-month provider-spend allowance: `$0.25` free and
`$2.00` for `class_bud`. These are usage allowances, not prepaid account credit. The backend, not the SDK
entitlement cached in the app, authorizes chat allowance and job creation.

#### RevenueCat and store setup

1. In App Store Connect and Google Play Console, configure the `monthly` auto-renewable subscription for
   `com.dawdty.cbud` at US `$4.99/month`; localized storefront prices may differ.
2. Add the iOS and Android apps to the same RevenueCat project, import `monthly`, and attach it to the
   `class_bud` entitlement. Existing annual subscribers, if any, retain entitlement access until expiry.
3. Attach only the monthly package to the current RevenueCat offering. Do not remove a live annual product
   without first inspecting its active subscribers.
4. Put the iOS and Android public SDK keys above in the respective Expo build environments. Put the
   project-wide RevenueCat secret key only in the backend environment as `REVENUECAT_SECRET_API_KEY`.

`lib/subscriptions.tsx` initializes RevenueCat for the signed-in Clerk user and treats its entitlement as
local purchase presentation only. Purchases and restores use the SDK; a temporary backend propagation delay
is shown as access pending rather than as paid authorization.

Native purchases require a development, preview, or production build; they cannot complete in Expo Go.
Enable the In-App Purchase capability for the iOS target before submitting a build. The Android billing
permission is configured in `app.json`.

### Local API URLs on devices and emulators

`localhost` refers to the device running the app, which is not always the computer running the backend.

- iOS Simulator can generally reach a backend on the Mac through `http://localhost:<port>`.
- Android Emulator commonly reaches the host through `http://10.0.2.2:<port>`.
- A physical device generally needs the computer's LAN address, such as `http://192.168.x.x:<port>`, with both devices on the same network.
- Production builds should use an HTTPS API URL.

Restart the Expo development server after changing `.env` so the new values are bundled.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run ios` | Create/run the native iOS project with `expo run:ios` |
| `npm run android` | Create/run the native Android project with `expo run:android` |
| `npm run web` | Start the web version |
| `npm run lint` | Run Expo's ESLint configuration |

There is currently no automated test script.

## Vercel web deployment

The web export uses Expo Router's single-page output. `vercel.json` exports the web bundle to `dist` and rewrites browser routes to `index.html`; `.vercelignore` excludes local environment files from CLI uploads. The linked Vercel project is `edmundcb0-4544/cbud-demo`, serving `https://cbud-demo.vercel.app`. Its API is `https://api.104.236.252.95.sslip.io`; replace both URLs if the VM is recreated.

Set these **Production** environment variables in the Vercel project before deploying:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Public HTTPS backend origin (no localhost or private LAN address) |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key for the same Clerk application used by the backend |

In the Vercel dashboard, use **Project Settings → Environment Variables** to set them for Production. If deploying Preview builds, set the same variables for Preview too. `EXPO_PUBLIC_` values are bundled at build time, so redeploy after changing either value. Never set backend or Clerk secret keys as public environment variables. Ensure the backend permits browser requests from the Vercel deployment origin.

From this linked repository, deploy with `vercel --prod --archive=tgz --scope edmundcb0-4544`. The archive flag avoids Vercel's CLI per-file upload limit on this repository. On another machine, first run `vercel link --yes --scope edmundcb0-4544 --project cbud-demo` in this repository. Linking with the Vercel CLI can append an OIDC token to `.env.local`; keep that local file out of deployments and version control.

## Application routes

Expo Router uses the files under `app/` as the route map.

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `app/index.tsx` | Renders the authentication portal from `App.tsx`; signed-in users are redirected to `/home` |
| `/home` | `app/home.tsx` | Main chat, prior chat restoration, Canvas connection warning, streamed agent activity, and assignment results |
| `/settings` | `app/settings.tsx` | Navigation menu for assignments, jobs, and preferences |
| `/todos` | `app/todos.tsx` | Sorted detected assignments, submission state, refresh action, and external Canvas links |
| `/jobs` | `app/jobs.tsx` | Scheduled/running/completed/failed refresh and reminder jobs |
| `/preferences` | `app/preferences.tsx` | Canvas connection, memory deletion, account-data deletion, and sign-out |

`app/_layout.tsx` wraps every route in `ClerkProvider`, enables Clerk's secure token cache, and defines a headerless stack. All routes except `/` wait for Clerk to load and redirect signed-out users back to the authentication portal.

## User flows

### Authentication

Existing users request a one-time code by email and verify it in the app. New users provide an email address and password, verify the emailed code, and then enter the authenticated application. The mascot follows the email cursor, closes its eyes for password and verification-code input, and reacts to validation failures.

The custom sign-up form includes Clerk's `clerk-captcha` mount point. On web, this lets visitors complete an interactive bot-protection challenge when Clerk requires one; native clients do not render the browser challenge.

The Clerk dashboard must allow the strategies used by the UI:

- Email-code sign-in
- Password-based sign-up
- Email-address verification by code

### Chat

On entry, `/home` loads the current Canvas connection status and any saved text-message history. Sending a message posts the message and optional conversation ID to the streaming endpoint. The client renders:

- user and assistant Markdown bubbles;
- active/completed tool rounds;
- assignment cards emitted during a response; and
- the final assistant answer supplied by the `done` event.

Images in Markdown are intentionally disabled. Draft `delta` and `reset` events are consumed but not rendered; the UI keeps the activity indicator visible until the final answer arrives.

The chat composer draws its menu icon with three centered bars rather than a font glyph, so its alignment stays consistent between Expo native and React Native Web.

### Canvas assignments

Users connect Canvas from Preferences by entering their school's HTTPS Canvas host and a Canvas personal access token. The UI can open that Canvas instance's `/profile/settings` page to help the user create a token. The token is sent to the backend and cleared from frontend state after a successful connection.

The To-Dos page loads detected assignments, sorts dated items chronologically, places undated items last, displays known submission status, and opens source assignments in Canvas. A refresh request asks the backend to update Canvas data first.

### Jobs

Jobs are created through the conversational assistant's backend tools. The Jobs page lists and refreshes `agent_query`, legacy `refresh_assignments`, and `remind_user` jobs, sorts active work first, and lets users cancel scheduled jobs. Running jobs show a pair of turning gears; the gears remain still when the device's reduced-motion setting is enabled. Agent-job answers are appended to the conversation that scheduled them; Home reloads history whenever it regains focus. After the user enables notification permission, future reminder jobs are mirrored to local device notifications and reconciled whenever the list refreshes. Tapping a cbud reminder opens the Jobs page.

Job execution remains server-owned so schedules are honored when the app is suspended or terminated. The client does not use Expo BackgroundTask for exact job execution because mobile operating systems run those tasks opportunistically rather than at a guaranteed `runAt` time.

### Data controls

Preferences exposes two deletion levels:

- **Clear memory** deletes saved chats and cached assignment context while preserving the Canvas connection.
- **Clear all data** deletes chats, detected assignments, cached context, and scheduled jobs while preserving Canvas authentication and usage/billing records.

Successful deletion emits an in-app event so the mounted chat screen immediately clears its local conversation state. Destructive actions require a native alert on iOS/Android or a browser confirmation dialog on web; canceling leaves the data untouched.

## Backend contract

Every request below requires a Clerk session token in `Authorization: Bearer <token>`. JSON request bodies use `Content-Type: application/json`.

| Method | Path | Frontend expectation |
| --- | --- | --- |
| `GET` | `/integrations/canvas` | `{ connected: false }` or `{ connected: true, connection: { baseUrl, canvasUserName } }` |
| `PUT` | `/integrations/canvas` | Accepts `{ canvasUrl, accessToken }`; returns the Canvas status shape |
| `DELETE` | `/integrations/canvas` | Disconnects the user's Canvas account |
| `GET` | `/chat/history` | `{ conversationId, messages }`, where retained messages have string `id`, `user` or `assistant` role, and string `content` |
| `POST` | `/chat/stream` | Accepts `{ message, conversationId?, deviceTime }`; returns `text/event-stream` |
| `GET` | `/assignments` | `{ assignments: DetectedAssignment[] }` |
| `GET` | `/assignments?refresh=true` | Refreshes upstream data and returns `{ assignments: DetectedAssignment[] }` |
| `GET` | `/jobs` | `{ jobs: AppJob[] }` |
| `DELETE` | `/jobs/:jobId` | Cancels a scheduled job; a successful response may have an empty body |
| `DELETE` | `/memory` | `{ cleared: true }` |
| `DELETE` | `/account-data` | `{ cleared: true, canvasConnectionPreserved: true, jobsCleared: true, usageAndBillingPreserved: true }` |

For chat requests, `deviceTime` has the shape
`{ now: string, timeZone: string | null, utcOffsetMinutes: number }`. It is generated immediately
before each request so relative dates and reminder times use the device's current local clock.

Error responses may include `{ error: string }`; otherwise the client supplies a generic message.

### Chat stream events

The SSE parser supports the following named events:

| Event | Required data | Behavior |
| --- | --- | --- |
| `start` | `conversationId: string` | Stores the active conversation ID |
| `activity` | `round: non-negative integer`, `state: "active" \| "complete"`, optional `toolNames: string[]` | Adds or updates an agent activity row |
| `assignment` | `assignmentId`, `title`, nullable `dueAt`, nullable `htmlUrl` | Adds a deduplicated assignment card |
| `delta` / `reset` | No rendered fields | Accepted but intentionally not displayed |
| `done` | `conversationId`, `message` | Replaces any assistant draft with the final Markdown response and completes the turn |
| `error` | optional `error` | Stops the turn and displays an error |

The stream must end with a valid `done` event. SSE records may use LF or CRLF separators and may contain multiple `data:` lines.

### Shared data shapes

```ts
type DetectedAssignment = {
  memoryKey: string;
  canvasAssignmentId: number | null;
  title: string;
  course: string | null;
  dueAt: string | null;
  htmlUrl: string | null;
  submitted: boolean | null;
};

type AppJob = {
  id: string;
  type: 'agent_query' | 'refresh_assignments' | 'remind_user';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  runAt: string;
  message: string | null;
};
```

Date strings are parsed by JavaScript's `Date` and displayed in the device locale.

## Project structure

```text
.
├── app/                         # Expo Router routes and root providers
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── home.tsx
│   ├── settings.tsx
│   ├── todos.tsx
│   ├── jobs.tsx
│   └── preferences.tsx
├── components/buddy/            # Animated mascot and public presets
│   ├── Buddy.tsx
│   ├── animationPresets.ts
│   ├── presets.tsx
│   ├── types.ts
│   ├── useBuddyAnimation.ts
│   └── index.ts
├── lib/
│   ├── account-data-events.ts   # In-memory deletion notification channel
│   ├── job-notifications.ts     # Device reminder permission and reconciliation
│   ├── responsive-layout.ts     # Shared viewport scaling helpers
│   └── subscriptions.tsx        # RevenueCat subscription state
├── assets/                      # App icons and web favicon
├── App.tsx                      # Authentication portal
├── app.json                     # Expo app and native identifier configuration
├── eslint.config.js
├── package.json
└── tsconfig.json
```

`index.ts` is a conventional Expo registration entry left in the repository, but `package.json` points the actual application entry to `expo-router/entry`.

## Buddy component

The mascot is exported from `components/buddy` and can be used directly or through a preset:

```tsx
import { Buddy, ThinkingBuddy } from './components/buddy';

<Buddy animation="curious" gaze={{ type: 'offset', x: 4, y: -3 }} size={104} />
<ThinkingBuddy accessibilityLabel="cbud is thinking" />
```

`Buddy` accepts:

- `animation`: `idle`, `curious`, `thinking`, `celebrate`, or `error`
- `animationKey`: change this value to replay a one-shot animation
- `eyes`: `open` or `closed`
- `gaze`: a relative `{ type: 'offset', x, y }` or absolute screen `{ type: 'point', x, y }` target
- `size`: logical-pixel width; height scales proportionally
- `accessibilityLabel`: screen-reader text, or `null` when decorative
- `style`: a React Native view style

Convenience exports include `IdleBuddy`, `CuriousBuddy`, `ThinkingBuddy`, `CelebratingBuddy`, `ErrorBuddy`, and `PrivacyBuddy`.

## App configuration

The app is configured as `cbud`, uses the `cbud` URL scheme, locks orientation to portrait, and uses a light interface style. Both native platforms use the application identifier `com.dawdty.cbud`; iOS tablet support is enabled and Android predictive back is currently disabled. Icons and the web favicon live in `assets/`.

If you fork the application, change the bundle identifier/package, app scheme, icons, Clerk application, and backend URL before distributing a build.

## Development notes

- TypeScript strict mode is enabled.
- The UI uses local component state; there is no global state-management library.
- API response data is validated at the route boundary before rendering.
- The visual system is intentionally hand-built with React Native styles and a burgundy/blush palette.
- Accessibility labels and live regions are present on important interactive and status elements.
- Authentication and server data are required for meaningful end-to-end testing.

Before submitting a change, run:

```sh
npm run lint
```

For a fuller check, also start each target you support and manually exercise sign-in, chat streaming, Canvas connect/disconnect, assignment refresh, job loading, deletion confirmations, and sign-out.

## Troubleshooting

### The app throws before the first screen

`app/_layout.tsx` deliberately throws when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent. Confirm `.env` exists, the key is a Clerk publishable key, and Expo was restarted after the file changed.

### API screens show a configuration error

Set `EXPO_PUBLIC_API_URL` to the backend origin without relying on a device-inaccessible `localhost`. A trailing slash is safe; the client removes it.

### Requests return unauthorized

Confirm the user is signed in, the Clerk frontend and backend use compatible Clerk applications, and the backend verifies the bearer token issued by Clerk.

### Chat ends unexpectedly

Confirm the endpoint returns `Content-Type: text/event-stream`, formats events with blank-line separators, and always sends a valid `done` event before closing.

### Canvas does not connect

The frontend accepts only an HTTPS Canvas origin. Verify the school host, create a current personal access token in Canvas profile settings, and inspect the backend's returned `error` value.

## License

This project is distributed under the terms in [LICENSE](./LICENSE).
