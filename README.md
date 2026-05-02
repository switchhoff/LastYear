# LastYear 📅

> A shared memory app — relive what you and your partner were doing exactly one year ago today.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-App_Router-black?logo=nextdotjs" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
</p>

---

LastYear is a private shared app for two people. Every day it surfaces memories from exactly one year ago — photos, notes, moments you saved together. You can react with emoji, chat on each memory, and write a one-sentence caption about what's shown. Designed to be a quiet, personal daily ritual.

---

## Features

### 📖 Daily Memory Feed
- Shows the memorable date from exactly one year ago
- Carousel of memory cards — swipe through the day
- Each card shows the date, context, and any saved content

### 💬 Shared Chat
- Both users can chat on any memory
- New message indicator — unread badge per memory
- Chat is private between the two users only

### 🎉 Reactions
- Emoji reactions on each memory
- Each user's reaction saved and displayed
- Live updates — see your partner's reaction appear in real time

### ✍️ Captions
- Write a one-sentence note on each memory
- Edit your caption any time
- Timestamped and attributed per user

### 🔔 Notifications
- Push notification when your partner reacts or sends a message

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, Turbopack) |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth |
| Notifications | Firebase Cloud Messaging |
| UI | shadcn/ui + Tailwind CSS |
| Calendar | `react-day-picker` Carousel |
| Language | TypeScript |

---

## Project Structure

```
src/
  app/
    page.tsx              # Main memory feed + chat UI
    layout.tsx
  components/
    loading-spinner.tsx
    FirebaseErrorListener.tsx
  lib/
    firebase-service.ts   # Firestore queries, reactions, chat
    memorable-dates.ts    # Date logic — "one year ago today"
    notifications.ts      # Push notification helpers
  firebase/
    index.ts              # Firebase init + hooks
    non-blocking-updates.tsx
```

---

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # fill in Firebase config
npm run dev    # localhost:9002
```

**Required env vars** — see `.env.local.example`:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY   # for push notifications
```

> Private app — two fixed user accounts. Not designed for general signup.
