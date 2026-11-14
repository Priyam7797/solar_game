# Data Used & Simulation Scaling (`DATA_USED.md`)

All domain configs live inside `src/data/` JSON files so teachers and developers can inspect exact NASA values alongside kid-friendly gameplay approximations.

## Datasets & Honesty Policy (`LIVE` vs `ARCHIVED`)
1. **NASA DONKI Solar Flare Events** (`src/data/donkiEvents.json`, `server.ts` `/api/donki`):
   - **Live Mode (`LIVE`)**: When the player chooses `LIVE` or clicks `Sync /api/donki Feed`, `/api/donki` queries `https://api.nasa.gov/DONKI/FLR` server-side using `NASA_API_KEY` (or `DEMO_KEY`) with a 15-minute in-memory cache. Live API endpoints are **flagged unverified offline** and automatically fall back to bundled historical DONKI events if rate-limited (`HTTP 429`) or offline.
   - **Archived Mode (`ARCHIVED`)**: Bundled records (including historical May 2024 `AR 3664 X8.7` and October 2024 `AR 3842 X9.0` events) are always labeled with an explicit `ARCHIVED` badge and are never represented as real-time telemetry.

2. **NASA Open Science Data Repository (OSDR)** (`src/data/osdrHealthCards.json`):
   - Curated 10-card deck summarizing real published NASA GeneLab / Human Research Program findings (bone loss, muscle atrophy, Twins Study immune changes, SANS fluid shifts, Veggie red/blue LEDs, root hypoxia, water-tank proton shielding, circadian rhythm, and ECLSS microbiology), all tagged `ARCHIVED`.

3. **Site Environments: Moon & Mars** (`src/data/sites.json`):
   - **Real vs Simplified**:
     - Moon surface light/dark cycle is modeled as 14 sunlit sols + 14 night sols (~28 sols vs ~29.5 Earth days) so students experience lunar night battery trade-offs directly.
     - Mars sol duration is 24h 39m; Curiosity RAD (~0.67 mSv/day) surface dose is used as baseline. Earth–Mars one-way radio delay (3–22 real minutes) is represented visually over ~6 seconds with an explicit light-time transit label so kids experience asynchronous decision-making without waiting 20 real minutes.

4. **Life Support & Core Resources** (`src/data/resources.json`):
   - Crew Oxygen consumption: `0.84 kg / crew / sol` (NASA ISS ECLSS baseline).
   - Crew Water use: `2.5 L / crew / sol` with `95%–98.5%` closed-loop recycling.
   - Food rations: Crew starts with ~90 days of non-renewable stored rations (`foodRations`), making Greenhouse construction + Garden Guide care essential for sustained colonies.
   - Shielding: Hidden cumulative dose in mSv compared against NASA's `250 mSv` mission caution benchmark, surfaced safely via the HUD `SHIELD` meter.
