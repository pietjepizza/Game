# Close the Books: Extended

A browser game about the period-end close. Entries fall toward the red close line and you post them before they get there. Volume and complexity grow every year; the team does not.

**Play:** once GitHub Pages is on (see below), the game is at `https://pietjepizza.github.io/Game/`.

## What's in it

- **Three modes**
  - **Campaign 2026–2030**: five year-end closes, each with its own events (fast shipments, audit season, CFO asks, an ERP cutover). You earn improvement points and stars between years.
  - **Endless, beyond 2030**: the volume keeps rising. After every quarter close you pick one of three improvements.
  - **Daily Close**: two minutes with the same entries for everyone that day, plus a daily twist (Audit week, Bots on strike, Duplicate storm, and so on).
- **10 entry types**: manual JE, complex transaction, new business flow, correction, treatment unclear, intercompany pairs, unstructured case, audit request (press and hold), urgent CFO ask, and duplicates (don't post them).
- **10 upgrades** in three groups: ESSA (Eliminate, Simplify, Standardize, Automate), People (Cross-training, Deep work) and AI (Smart matching, Duplicate detection, Copilot, AI agent).
- **Abilities**: Focus fills as you post. Spend it on *Overtime* (slow motion) or *Copilot* (sweeps simple slips).
- **Combo multiplier** up to ×3, **3 difficulty levels**, **stars** per year, **16 achievements**, lifetime stats and high scores per mode.
- Synthesised sound and music, keyboard support (`1`, `2`, `P`/`Esc`), pause, and support for phone and desktop.

Scores and achievements are kept in each player's own browser (localStorage). There is no server.

## Turn on GitHub Pages

1. Open the repository on GitHub, then go to **Settings → Pages**.
2. Under *Build and deployment*, set **Source** to **Deploy from a branch**.
3. Choose the branch with the game (`main` after merging, or the feature branch directly) and the folder **/ (root)**, then click **Save**.
4. After a minute or two the game is live at `https://pietjepizza.github.io/Game/`.

## Files

- `index.html`: screens and layout
- `style.css`: styling
- `game.js`: all game logic, no dependencies and no build step

To play locally, open `index.html` in a browser, or run `python3 -m http.server` in this folder and go to `http://localhost:8000`.
