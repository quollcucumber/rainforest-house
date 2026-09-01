# Fern Hollow — rainforest nursery house booking site

A small React + Firebase site for booking a house in the rainforest, on a native plant nursery.
Guests create an account, book their dates, edit or cancel their own booking, and leave a comment
about the state of the house after their stay. The caretaker accounts can manage every booking.

## Behaviour

- **Accounts** — Firebase Auth email/password sign-up, sign-in and password reset.
- **Booking** — pick arrival/departure dates and guest count; overlapping dates and past dates are
  rejected.
- **Three week limit** — a stay longer than 21 nights pops up:
  `To make a booking over 3 weeks, please contact arainforest@greatcactus.org or vrainforest@greatcactus.org`
  and the booking cannot be submitted.
- **Caretaker accounts** — `rainforest@greatcactus.org`, `vrainforest@greatcactus.org` and
  `arainforest@greatcactus.org` may book any length of stay and can edit, cancel, reinstate or
  delete anybody's booking.
- **Comments** — once a stay's departure date has passed, that guest can post a rating and a
  comment about the condition of the house. The comment list is readable by everyone.

Both the 21-night limit and the caretaker permissions are enforced in `firestore.rules` as well as
in the UI, so they hold even if somebody talks to Firestore directly.

## Local development

```bash
npm install
npm run dev
```

The committed `.env` already points at the `rainforest-nursery-booking` Firebase project (these
identifiers are public — they ship in the browser bundle). Use `.env.local` to override them, e.g.
to point at a different project or at the emulators.

To run against the Firebase emulators instead of a real project, set `VITE_USE_EMULATORS=true` in
`.env.local` and start them in another terminal:

```bash
npx firebase-tools emulators:start --project demo-rainforest-house --only auth,firestore
```

## Deploying to Firebase

The project is `rainforest-nursery-booking` (see `.firebaserc`). One-off setup in the
[Firebase console](https://console.firebase.google.com/project/rainforest-nursery-booking):

1. Enable **Authentication → Sign-in method → Email/Password**.
2. Create a **Firestore** database (production mode — deploying replaces the default rules with
   `firestore.rules`).
3. Enable **Hosting**.

Then, from a machine logged in to Firebase:

```bash
npx firebase login
npm run build
npx firebase deploy           # hosting + firestore rules
```

The caretaker accounts (`rainforest@`, `vrainforest@`, `arainforest@greatcactus.org`) get their
extra powers by signing up through the site like anyone else — the email address is what the rules
check.

The site is a single-page app: `firebase.json` rewrites all routes to `index.html` and serves the
Vite build from `dist/`.

## Scripts

| command | purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run lint` | eslint |
| `npm test` | booking rule unit tests (node:test) |
| `npm run test:rules` | Firestore security rules tests against the emulator (needs JDK 21+) |
