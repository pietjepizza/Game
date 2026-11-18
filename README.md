# Close the Books

A browser game for the Finance Operations team. Volume grows, the team doesn't. One 90-second close: tap entries before they hit the period-end close line, and use the four **ESSA power buttons** (Eliminate, Simplify, Standardize, Automate) once they are charged. The **AI button is locked until January**; each game offers one 3-second AI preview, AI-ready entries fall past with a lock, and the end screen gives a practical AI tip.

**Play:** https://pietjepizza.github.io/Game/ (works on phone and desktop, no install).

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
