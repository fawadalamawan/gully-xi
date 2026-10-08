# Gully XI — Play Store design

Working title: **Gully XI — Street Cricket**  
Urdu store name: **گلی الیون**  
Tagline EN: One over. One street. Your city.  
Tagline UR: ایک اوور۔ ایک گلی۔ تمہارا شہر۔

A 60–90 second street-cricket batting game with a light team meta, city rivalries, and friend challenges. Built for 2GB RAM phones, playable offline, monetized mainly by rewarded ads and Rs 50–500 cosmetics.

This is not real-money gaming. No entry fees, no cash-out, no betting, no “earn PKR by playing.”

## Why this, for Pakistan

Cricket is the default sport. A single over matches a bus ride, a load-shedding gap, or a tea break. The social loop is a WhatsApp code, not a heavy guild chat. Art is the gali, the tape-ball, the rooftop water tank, and the chai stall — cultural, not religious imagery. Prices are in rupees.

## Player

- Age 16–30, male-skewed core, a growing casual segment.
- Cities: Karachi, Lahore, Faisalabad, Rawalpindi, Multan, Hyderabad, Peshawar, Quetta, Islamabad.
- Phones: Infinix, Tecno, Realme, Redmi, Samsung A-series. 2–4GB RAM, Android 8+.
- Urdu UI by default, English toggle, Roman Urdu callouts (`chaucca!`, `chakka!`, `shabash`).
- Pays rarely. Will watch 15–30 seconds for an extra over, a saved wicket, or a rare bat skin.

## Core loop

1. Pick a street: Karachi rooftop, Lahore gali, Multan ground, Quetta hill lane, Islamabad park.
2. The ball comes in. Tap timing: early is an edge, perfect is a boundary, late is a miss.
3. Six legal balls. One wicket ends the over. Score against par (Karachi 12, Lahore 10, Multan 14, Quetta 11, Islamabad 13).
4. Par made: street coins and rank points. Short: a rewarded placement can replay that same seed.
5. Meta: widen the timing window with coins, hire a harder local bowler for a higher coin multiplier, unlock a street.

## Controls

- One thumb. Tap to swing. Hold or swipe up to loft. Swipe down to defend.
- Arm buttons for loft and defend so the first session can stay tap-only.
- No twin-stick, no gyro, no account wall. Guest first. The first lesson is three balls, then home.

## Modes

| Mode | Rule |
|---|---|
| Quick over | 6 balls vs CPU. Offline. |
| Street derby | Best of 3 overs. One energy per over. Home city pays +20% coins. |
| Friend challenge | `GXI-CITY-SEED-SCORE`. Same balls. Higher score gets a cosmetic crate. No cash. Timing upgrades are off so the bat you bought cannot decide it. |
| City ladder | Weekly board per city. Resets Monday 00:00 Asia/Karachi. Prototype fills the board with named shadows plus your best over. |
| Street league | 6-week cosmetic track. Rs 149 pass preview. The free track never requires the pass. |

## Progression and economy

- **Street coins** — soft, from play.
- **Glow tokens** — hard, from sample rewarded cards and the rare crate roll.
- Bats, boards, and celebrations are cosmetic. The timing window is bought with coins only, capped, and small (about +14ms per level, five levels). Paid bats do not add timing. Friend challenges ignore the window upgrade.
- **Energy:** 5 overs, one back every 20 minutes, cap 5. A rewarded card grants one over, max 8 cards a day. The game never hard-locks behind a paywall.
- **Crate odds, shown before open:** 70% 50 coins, 22% 1 glow token, 8% a cosmetic you don’t own (else 80 coins). No hidden odds.
- **Day 1 gift:** rare sea tape after 5 finished overs.
- **Day 7:** city-crest board if the first open was at least 6 PKT midnights ago.
- **Daily:** one free crate per Asia/Karachi date.

## Monetization (Pakistan-first)

Target 70–80% of revenue from ads.

- Rewarded: extra over, double coins, crate, save one wicket per over. Production: AdMob + Unity LevelPlay, with Pangle and Meta if fill is weak.
- Interstitial: only after every 3rd successful over, never on a failed par, never in the first session, never more than one every 4 minutes. If the ad is not ready, play continues.
- Banner: off during play. Home only if it does not cover the play button. The prototype keeps the play button clear and does not ship a banner.
- Starter tape Rs 50: 7 days without interstitials + sea tape.
- Coin pouches: Rs 100 / 250 / 500 → 400 / 1200 / 2800 coins.
- Street pass Rs 149.
- Production billing is Google Play Billing in PKR. Do not sell the same items off-store and inside the app. A later JazzCash or Easypaisa web shop may grant a cosmetic entitlement only for items that are not also sold in-app.
- The prototype’s rupee buttons do not charge anyone. They unlock the entitlement locally and say so.

Out of scope forever for this product: real-money Ludo, Teen Patti cash, color prediction, slots, wallets, refer-and-earn PKR.

## Retention and live ops

- Push, production only: max 2 a day, Urdu, 7–9pm PKT. Example: “لاہور کراچی سے 40 رنز آگے ہے۔”
- The home ticker in the prototype is the same line, from a weekly city pulse, not a real notification.
- First 90 days, cultural not worship assets, and no PSL or PCB marks: week 1 Karachi vs Lahore, week 3 tape-ball festival, week 6 “Street League” cosmetics, week 10 a respectful seasonal pack with no religious symbol sold as power.

## Tech

**Production**

- Unity 2022 LTS, URP. AAB under 80MB. Extra streets as asset packs.
- 30 FPS low tier, 60 mid. Under 80 draw calls in play.
- Offline quick-over. Sync the score when data returns.
- Local save + optional Play Games. Guest first.
- Portrait. 16:9 through 20:9. Touch targets 48dp.
- Urdu with a Nastaliq-safe fallback to Noto Naskh Arabic. English toggle.
- Firebase + one MMP. Events: `tutorial_complete`, `over_end`, `ad_reward`, `iap`, `d1_return`.
- Crash-free 99.5% on Android 8–14, including low RAM.

**This repo**

- Browser vertical slice of the same loop: canvas, one thumb, Urdu/English, local save, sample ads, PKR preview shop, friend codes, ladder, street league.
- Audio is original synthesis: tape thwack, a short cheer, a quiet original bed. No azan. No Coke Studio stems.
- Callouts stay Roman Urdu on the pitch so they read at a glance.

## Art

Stylized dusk. Concrete, water tank, wires, tape-ball (white tape, not a leather Test ball). South Asian batters, short hair and tied hair, same hit box. High-contrast type for sunlight. Women and men both play. No stereotypes, no religious iconography as a mechanic.

## Tutorial

- Ball 1: the ball holds in the green ring. “جب حلقہ سبز ہو، ٹیپ کرو۔” A miss repeats the ball.
- Ball 2: a forced perfect loft. Six.
- Ball 3: the player alone, a wider window, a miss cannot end the lesson on a wicket.
- Then home. Skip exists so the game is not a trap.

## Store listing

- Icon: tape-ball and stumps on a dusk wall.
- Screenshots: Urdu first, then English. Score, city, and an Rs price in one frame.
- Short description: گلی کرکٹ۔ 1 اوور، 1 منٹ۔ دوست کو WhatsApp پر چیلنج کرو۔
- Category Sports. Everyone. Ads yes. IAP yes.
- Privacy policy required. Do not mark the app children-directed if ads are personalized.

## 90-day targets (Pakistan UA)

- D1 at least 35%, D7 at least 12%.
- Ads ARPDAU about $0.03–0.08. IAP conversion 0.8–1.5%.
- CPI on TikTok, Meta, and YouTube Shorts under $0.12.
- Kill or rework if D1 is under 25% after the first 10k installs.

## Prototype vs production

| Piece | Prototype | Production |
|---|---|---|
| Match | Playable | Same rules in Unity |
| Ads | Timed sponsor card, 8/day | AdMob + LevelPlay |
| IAP | Local unlock, no charge | Play Billing, PKR |
| Ladder | Weekly shadows + your best | Server board, still no cash |
| Friends | Code encodes seed and score | Same code, WhatsApp share |
| Account | None | Guest first, Play Games optional |
