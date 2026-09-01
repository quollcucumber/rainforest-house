# Cow Bay airstrip nursery house — booking site

A small React + Firebase site for booking the Cow Bay airstrip nursery house. Guests create an
account, book their dates, edit or cancel their own booking, and comment on the state of the house.
The caretaker accounts can manage every booking.

## Behaviour

- **Accounts** — Firebase Auth email/password sign-up, sign-in and password reset. Signing up sends a
  confirmation email; the address is unusable until the link in it is opened.
- **Allowlist** — the caretakers keep two collections, `allowedEmails/{address}` and
  `allowedDomains/{domain}` (document id is the lower-cased value), managed from a caretaker-only
  panel on the site. An account may read and write nothing — not even the calendar — unless its
  confirmed address is on `allowedEmails`, or its domain is on `allowedDomains`. The three caretaker
  addresses are always allowed. Only caretakers may list or change the allowlist; anybody else may
  only check the two entries that match their own address, so the site can explain the lockout.
- **Calendar** — needs an allowed account: `bookings` and `nights` are readable only by those, and
  hold dates plus the booking name. Email addresses and notes live in `bookingDetails`, readable by
  the guest and the caretakers only, and shown in the UI to the caretakers.
- **Booking** — pick arrival/departure dates and guest count; past dates are rejected.
- **No overlaps** — each booked night is a document in `nights` keyed by the date (`nights/2026-03-01`).
  The rules allow creating one but never overwriting one, so a booking is written in a batch that
  claims every night it needs and fails as a whole if any is held. Two bookings therefore cannot
  overlap even if two people submit at the same moment. A departure day is not a claimed night, so
  one guest can leave on the day the next arrives.
- **Three week limit** — a stay longer than 21 nights pops up:
  `To make a booking over 3 weeks, please contact arainforest@greatcactus.org or vrainforest@greatcactus.org`
  and the booking cannot be submitted.
- **Caretaker accounts** — `rainforest@greatcactus.org`, `vrainforest@greatcactus.org` and
  `arainforest@greatcactus.org` may book any length of stay and can edit, cancel, reinstate or
  delete anybody's booking.
- **Comments** — anybody with an allowed account can post a rating and a comment at any time, optionally
  attached to one of their own bookings. The comment list is readable by everyone and shows a name
  only; the commenter's email address lives in `commentDetails`, readable by that commenter and the
  caretakers, and shown in the UI to the caretakers.

The allowlist, the email confirmation, the 21-night limit, the caretaker permissions and the
no-overlap rule are enforced in
`firestore.rules` as well as in the UI, so they hold even if somebody talks to Firestore directly.

## Photographs

`public/images/` holds three CC0 (public domain) photographs of the Daintree rainforest in far north
Queensland, from Wikimedia Commons — cropped and re-compressed for the web:

| file | source |
| --- | --- |
| `rainforest-hero.jpg` | [Daintree Rainforest 4](https://commons.wikimedia.org/wiki/File:Daintree_Rainforest_4.jpg) by Killerscene |
| `rainforest-creek.jpg` | [Daintree Rainforest 2](https://commons.wikimedia.org/wiki/File:Daintree_Rainforest_2.jpg) by Killerscene |
| `rainforest-understorey.jpg` | [Daintree Rainforest 3](https://commons.wikimedia.org/wiki/File:Daintree_Rainforest_3.jpg) by Killerscene |

They show the surrounding rainforest, not the house — the page says so. Replace them with photographs
of the house whenever there are some.

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
