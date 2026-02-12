# Verified Sound A&R – Representation Platform

Production-ready Next.js 14+ (App Router) experience for Verified Sound.

## Install

```bash
yarn install
```

## Configure environment

```bash
cp .env.example .env.local
```

Fill in Firebase client values in `.env.local`.

## Run locally

```bash
yarn dev
```

## Build

```bash
yarn build
```

## Deploy to Firebase Hosting (App Hosting preferred)

> Project placeholder: **verifiedsound-aec78**

1. Install Firebase CLI (one-time):
   ```bash
   npm install -g firebase-tools
   ```
2. Authenticate:
   ```bash
   firebase login
   ```
3. Initialize App Hosting (recommended for Next.js SSR):
   ```bash
   firebase init hosting
   ```
   - Select **App Hosting** when prompted.
   - Choose your Firebase project (verifiedsound-aec78).
4. Deploy:
   ```bash
   firebase deploy
   ```

For classic Hosting (static export), ensure routing and SSR requirements are satisfied before deployment.
