# SOL BASE: Moon & Mars Outpost Trainer

An interactive browser game designed for ages 7–12 (grades 3–6) for the NASA Space Apps Challenge **"Junior Astronaut Mission Trainer"**, teaching authentic NASA systems engineering trade-offs through play.

## Core Gameplay Features

- **Two Playable Sites**:
  - **Moon (Shackleton Crater)**: 14-day sunlit / 14-day dark lunar cycle, abrasive electrostatic dust, extreme -170°C lunar nights, ~1.3s Earth comms link.
  - **Mars (Jezero Crater)**: 24h 39m sols, regional/global dust storms dimming solar flux, 3–22 minute Earth–Mars light-time communications delay (`Message in Transit`).
- **3 Core Resources + 1 Safety Meter (Zero Free Choices)**:
  - **POWER** (Battery kWh + net solar/nuclear output)
  - **LIFE SUPPORT** (Oxygen + Water combined bar with tap-to-expand split)
  - **FOOD** (~90 days starting emergency rations transitioning to Greenhouse production)
  - **SHIELD** (Structural + storm shelter radiation blocking tied to crew dose)
  - Every card displays amount, rate per sol, sols remaining, green/yellow/red status, and color-independent icons (`✓`, `▲`, `⚠`).
- **Pre-Action Cost Cards**: Every building and Rover Expedition opens a plain-language Cost Card showing **WHAT YOU GAIN**, **WHAT YOU PAY**, **WHAT IT MIGHT RISK LATER**, and Sol build duration.
- **Time-Lapse (`1x`, `2x`, `5x`, `10x`) & 6 Interactive Crisis Puzzles**: Simulation auto-pauses when a crisis arrives (`Solar Flare`, `Dust Storm`, `Power Failure`, `Micrometeoroid Hull Leak`, `ECLSS Recycler Jam`, `Greenhouse Crop Problem`) with 1-fail ARIA hints and non-punishing recovery setbacks.
- **NASA Veggie Garden Guide, Daily Priority Board, ARIA Guide & Voice, Tap-to-Open Glossary, OSDR Health Cards, Co-op & Classroom Mode**.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Optionally set `NASA_API_KEY` in environment variables for live NASA DONKI space weather sync via `/api/donki` (uses bundled authentic archived NASA DONKI records cleanly if unavailable).

## Testing & Verification

```bash
npx --yes tsx --test src/game/simulation.test.ts src/game/tutorial.test.ts
npm run build
```
