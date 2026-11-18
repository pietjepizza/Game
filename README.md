# Close the Books

A browser game for the Finance Operations team, season 2026. Volume grows every year, the team doesn't. You close the books in three acts:

1. **Manual**: tap every entry before it hits the period-end close line. The volume triples until it can't be done by hand.
2. **ESSA**: pick two of Eliminate, Simplify, Standardize and Automate, and close again with a better process.
3. **AI-native**: AI posts the volume. You handle complex deals and catch AI errors. Two quick upskilling questions before this act decide how accurate the AI is.

**Play:** https://pietjepizza.github.io/Game/ (about 3 minutes, works on phone and desktop, no install).

## Leaderboard

Shared online leaderboard with three prize categories:

- 🏆 **Score**: highest total score.
- ⚡ **Fastest**: lowest average time to post an entry by hand (at least 30 entries).
- 🔍 **Reviewer**: AI errors caught in Act 3, minus correct AI drafts rejected.

Only each player's best result per category counts. The season closes on the date in the `settings` table (default 31 January 2027).

The backend is a Supabase project (EU, Frankfurt). The website uses the public publishable key. The tables cannot be read or written directly: all access goes through three database functions defined in `supabase/setup.sql`, which reject implausible scores, too-short games and rapid repeat submissions.

### Useful admin queries (Supabase SQL editor)

```sql
-- Top 10 per category
select * from leaderboard('v2', 'score', false, 10);
select * from leaderboard('v2', 'avg_ms', true, 10);
select * from leaderboard('v2', 'review', false, 10);

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
