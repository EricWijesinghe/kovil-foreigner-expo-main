# KOVIL — mobile app

Apartment and room finding app for foreigners living in Korea (students, EPS workers, professionals).
Expo SDK 57 · React Native 0.86 · expo-router · TypeScript.

## Features
- Onboarding: language (20 languages, incl. RTL Urdu), persona, location.
- Home: "where am I?" with nearby homes, persona tips, Korean rental glossary.
- Map: OpenStreetMap (Leaflet in a WebView) — no Google Play services needed.
- Areas: neighbourhoods and universities, with listings per district.
- Listings: filters, radius search, detail with machine translation of the Korean description, save, text the agent.
- Tools: deposit ↔ monthly rent converter, monthly cost, legal agent-fee cap, contract checklist.
- Account: phone verification (SMS) → email sign-up, secure token storage, server-side sign-out.

## Develop
```bash
npm install
npx expo start --android
npm test        # jest
npx tsc --noEmit && npx expo lint
```
The release build talks to `https://api.kovil.co.kr` (set via `EXPO_PUBLIC_API_URL`).

## Release
`npx expo prebuild -p android`, then `./gradlew assembleRelease bundleRelease` with the upload keystore
passed as `-Pandroid.injected.signing.*` properties. Keystores are never committed.
