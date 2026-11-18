# Close the Books

A browser game for the Finance Operations team. Volume grows, the team doesn't. One 90-second close, **first time right**: tap every entry before it hits the period-end close line. Miss a single entry and the close fails, because you can't tell which entry is material. Finish all 90 seconds for a 50% flawless bonus. Seven kinds of entries appear one by one (journal entry, complex deal, intercompany, urgent, awaiting approval, duplicate, AI-ready), each explained on screen the first time. Posting a duplicate also fails the close. Use the four **ESSA power buttons** (Eliminate, Simplify, Standardize, Automate) once they are charged. The **AI button is locked until January**; each game offers one 3-second AI preview, AI-ready entries fall past with a lock, and the end screen gives a practical AI tip.

**Play:** https://pietjepizza.github.io/Game/ (works on phone and desktop, no install).

## Intro

The game opens on a dark gate ("Tap to begin", which also unlocks sound). The ~5-second cinematic that follows tells the story: entries stream in from every side while VOLUME climbs from ×1.0 to ×3.0 and TEAM stays at ×1.0 ("Manual work alone won't close this"), everything implodes, the EUV beam slams into the wafer with a flash and shockwave, and the wafer's dies light up from the centre before the home screen appears. Skip with the button or Esc; it is skipped automatically for players who prefer reduced motion, and with `?skipintro` in the URL.

## How it works in the game

Mechanics borrowed from popular games (mechanics only, no names or looks): a **streak** multiplier for posting quickly in a row (up to ×2), **clutch saves** (+50% for posting just above the line), two announced **month-end spikes** with a bonus for surviving them, a **personal best** shown during the game, a **career rank** from Intern to CFO, **Play again** right at the top of the end screen, and a Wordle-style **Share result** that copies a spoiler-free summary with a 10-block timeline for Teams.


The start screen has a "How it works" panel explaining every booster and entry type; the same booster explanation shows in the pause screen, each booster button shows its effect, and the first time a booster is charged the game says what it does.

## Leaderboard

Shared online leaderboard with names and two prize categories:

- 🏆 **Score**: highest score in one game.
- 📒 **Entries**: most entries posted in one game (by hand, automation and AI).

Only each player's best result per category counts. The season closes on the date in the `settings` table (default 31 January 2027).

## Season 2 in January: unlocking AI

At the event, run this in the Supabase SQL editor:

```sql
update settings set value = 's2' where key = 'season';
update settings set value = '2027-03-31T23:59:00+01:00' where key = 'season_end';   -- pick the end of season 2
```

Everyone who opens the game after that gets season 2: the AI button charges and works, AI-ready entries are handled by an AI agent, and there is a fresh leaderboard. Season 1 scores stay in the database (`mode = 's1'`). Preview season 2 any time with `?s2` (test mode, not on the leaderboard).

The backend is a Supabase project (EU, Frankfurt). The website uses the public publishable key. The tables cannot be read or written directly: all access goes through three database functions defined in `supabase/setup.sql`, which reject implausible scores, too-short games and rapid repeat submissions.

### Useful admin queries (Supabase SQL editor)

```sql
-- Season 1 winners: top 10 per category
select * from leaderboard('s1', 'score', false, 10);
select * from leaderboard('s1', 'posted', false, 10);

-- Close the season now / move the closing date
update settings set value = '2027-01-15T23:59:00+01:00' where key = 'season_end';

-- Remove a player's entries (for example an inappropriate name)
delete from runs where name = 'Example';
```

## Testing

Add `?test` to the URL (`https://pietjepizza.github.io/Game/?test`). Test games are stored in a separate `test` category and never show on the real leaderboard. To clear them: `delete from runs where mode = 'test';`

## Files

- `index.html`: screens and layout
- `style.css`: styling
- `game.js`: game, visuals, sound and leaderboard client (no dependencies, no build step)
- `assets/drama.mp3`: music, "Drama" by Holizna (CC0, via OpenGameArt.org)
- `supabase/setup.sql`: database setup

## Publishing

GitHub Pages serves the `gh-pages` branch. Push the new commit to `gh-pages` and the site updates within a minute or two.
