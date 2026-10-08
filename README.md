# Gully XI — گلی الیون

One over. One street. Your city.

Urdu-first street cricket for a phone session the length of a tea break. This repository is the playable web prototype and the Google Play design. It is not a gambling game: no cash-out, no betting, no entry fees.

## Play

```bash
npm install
npm run dev
```

Open the local site. Urdu is the default. Switch with **English**. Tap **پہلی گیند** and hit when the ring is green.

- Tap the pitch to swing.
- Hold, swipe up, or arm **چھکا** for a lofted shot.
- Swipe down or arm **دفاع** to block.
- Space swings. Arrow up lofts. Arrow down defends.

Street coins, the city ladder, friend codes (`GXI-KHI-…`), and rupee prices are stored on this device. Sponsor cards are sample placements, not live ads. Rupee buttons are a Play Billing preview and do not charge a card.

## Design

The full Play Store spec — sessions, cities, ads, PKR cosmetics, retention, and what is out of scope — is in [DESIGN.md](DESIGN.md).

## Production note

The shipping game is planned as a Unity Android app under 80MB, offline quick-over, AdMob / LevelPlay, and Google Play Billing in PKR. This repo is the browser vertical slice of that design so the loop can be played before an engine port.
