# Close the Books – project context

Browser game for a Finance Operations team (~125 people), handed out before Christmas as a warm-up for an AI event in January 2027. Must be **finished by mid-December 2026**. Players do NOT have Claude access: it must be a plain website, no installs.

## Message the game must carry
Volume keeps growing; you cannot scale it with people. ESSA (eliminate, simplify, standardize, automate) is the foundation to fix processes; AI is the extra enabler on top. Goal: people become AI-native and upskilled in using AI in daily work, so the team can handle more volume.

## Status (v3.8)
Educational layer, texts in `content.js` (`window.CTB_CONTENT`; reviewed by the owner): 39 AI cards (ids 1-40 without 29, price-sensitive one removed), `firstCards` [1,21,5,23] then random unowned; deck in localStorage `deck`, overlay `#deckbox` from home and end. Lesson on the end screen per outcome (`lessons[].when`: dup, noboost, R, C, IC, U, P, flawless). Optional bonus quiz after a close (`#quizbox`): 3 true/false statements from 3 themes, 20 s total, +150 per right answer, cumulative AI IQ in localStorage `aiiq`; the run is resubmitted with the bonus (waits for the 5 s server window) and stats `quiz_right`, `ai_iq`; third leaderboard tab AI IQ (metric `ai_iq`). Classification labels: Non-business, Public, Confidential, Company secret, Top secret. "Other approved tools" stays generic; everyone has full Copilot in Office; questions go to "your manager".

## Status (v3.7)
Owner: messages were distracting and took playfield; HUD too tall. Now: compact one-row HUD (clock, streak + multiplier, score, small pause/sound buttons; time bar as a 2 px line; "Posted"/"First time right" removed from HUD), playfield starts right under it (~56 px from top). Messages are one short line (`#gbanner`) just below the close line, replacing the "PERIOD-END CLOSE" label while shown; all 29 verified to fit one line at 320 px, so keep new ones short. The first card of each new kind carries a small label (TAGS: 3 TAPS, 2 TAPS, FAST · 1 TAP, WAIT FOR APPROVED, DON'T POST, LET IT PASS), drawn above all cards. Duplicate fairness: a tap on a duplicate within 12 px of a real entry posts the real entry.

## Status (v3.6)
Intro rebuilt as four acts (~6.7 s, timings in `T` in game.js) inside letterbox bars with a WD-1 23:58 -> WD3 17:00 close clock: 1) ledger wall (procedural journal rows, camera pull-back, rows turning red "UNMATCHED"), beats "Every month. / More volume. / Same team." + VOLUME vs TEAM; 2) match cut: ledger clipped by an ellipse that lands on the wafer; 3) EUV source: tin droplets, pre-pulse, main pulse, plasma flash labelled 13.5 nm, mirror, beam slam + shockwave; 4) title printed with a scanline + chromatic edges, tagline "Manual work alone won't close this. / ESSA first. Then AI.", letterbox out, fade into home (`INTRO.fade`).

## Status (v3.5)
In-game messages moved from mid-field (owner: hard to read with entries falling through) to a fixed DOM strip `#gbanner` right under the HUD. The playfield starts below that strip (`MSG_STRIP` = 58 px, room for two lines; CSS caps messages at two lines). All 28 messages verified to fit in two lines at 320 px, so keep new messages short.

## Status (v3.4)
Cinematic intro (INTRO in game.js): gate screen `#s-intro` (tap/Enter, unlocks audio) -> 0.6-3.4 s entry words stream to the centre with VOLUME ×1.0→×3.0 vs TEAM ×1.0 counters and "Manual work alone won't close this." -> 3.4 s implosion -> 3.9 s fast EUV beam impact (flash, shake, shockwave ring `V.ring`, music filter fully open) -> wafer grows (easeBack) and dies light up from the centre (`V.light`) -> 5.4 s home with `.fast` animation delays. Skip button / Esc; auto-skipped for reduced motion and `?skipintro` (all test scripts use it).

## Status (v3.3)
Elements from popular games (mechanics only): streak (gap <= 1.6 s; 10/25/50 -> x1.2/1.5/2), clutch (+50% when posted in the last 12% above the line), month-end spikes at 38 s and 68 s (3 s warning, 6 s at 1.8x volume, +200 x time multiplier when survived), personal best per mode in localStorage (`pb-<mode>`, HUD + banner), career rank (Intern 0, Junior Accountant 750, Accountant 2000, Senior Accountant 3500, Controller 5500, Finance Director 8000, CFO 11000), Play again + Share result (Wordle-style text with 10-block timeline; navigator.share on touch, else clipboard). If a duplicate and a real entry overlap under the finger, the real entry is posted. Server cap raised to 800 points per posted entry. Banners sit mid-field.

## Status (v3.2)
Seven entry kinds (KIND in game.js, each with points, booster charge, first-appearance time and weight): R journal entry (1 tap), C complex (3), IC intercompany (2), X AI-ready (locked, may pass), U urgent (1 tap, falls 1.6x), P awaiting approval (locked until halfway, then 1 tap), D duplicate (must NOT be posted: tapping it fails the close, letting it pass = +10). Each new kind gets an immediate on-screen explanation. Boosters explained: "How it works" panel on home (boosters + entries), effect label on each button, first-ready message per booster, booster list in pause. Taps hit the topmost card actually touched; duplicates never via the tap margin. Banners draw behind entries. Deadline wins at 90 s. Playfield top follows the HUD height.

## Status (v3.1)
First time right: one missed journal entry or complex deal fails the close immediately (freeze + "Close failed · materiality unknown", then end screen). AI-ready cards never fail the close. Surviving 90 s = "Flawless close" + 50% bonus. Score is still saved for failed closes (duration = time played; server minimum 3 s, resubmit window 5 s). Gentler start: rate .8→3.8/s, fall 5.0→3.4 s. AI preview offered from 30 s when busy (or at 55 s).

## Status (v3, 18 Nov 2026)
Owner asked for simpler/shorter: v3 = one 90 s round, four ESSA power buttons (charge by posting by hand), locked AI button (one 3 s AI preview per game in season 1), locked "AI-ready" cards, AI tip on end screen, leaderboard score + entries (metric `posted`) with names. Seasons: `settings.season` = 's1' now; set to 's2' at the January event to unlock AI (submit_run only accepts the active season or 'test'). `?s2` previews season 2 in test mode.

## Status (v2, superseded)
v2 is built and live: intro with EUV beam + iridescent wafer, three acts (Manual, ESSA pick-2, AI-native), 2 upskilling questions (pick from 6) that set AI accuracy in act 3, music "Drama", live Supabase leaderboard with 3 categories (score, fastest avg_ms, review). Test with `?test` (mode 'test', kept off the real board). Next: owner review and tuning.

## Owner feedback on v1 (old version, replaced)
- Too childish (snow, arcade combo text) and too hard/complex (10 entry types, focus meter, 3 modes, many upgrades).
- Music is lousy → use **track 5 "Drama" by Holizna (CC0)** for both the start screen and gameplay. Source: `https://opengameart.org/sites/default/files/retro_wave_1.zip` → `Retro Wave 1/01 HoliznaCC0 - Drama.ogg` (opengameart.org is allowed in the environment network). Preview page: `muziek/`.
- Needs a real **wow effect** on opening: high-tech, shiny, futuristic (company is high-tech; wafer background is fine but should look much better).
- Wants **competition**: individual only (no teams), a shared online leaderboard and winners, possibly several categories.

## Agreed direction for v2
- Three short acts (3–4 min total): 1) Manual – you tap everything until it is impossible; 2) ESSA – improvements remove/simplify work; 3) AI-native – you direct AI agents and review their output (catch AI mistakes; human stays accountable).
- Max 4 work types. Remove snow/kiddish effects. Cinematic ~5 s intro (EUV light beam hits wafer, title builds from light), dark neon/glass look, adaptive intensity.
- Optional prompt challenge between acts (pick the best of 3 prompts for a real finance task).
- End screen: teaser + countdown to the January event. Repo is public, so no company name or internal event details unless the owner says so.
- Prize categories: highest score, fastest clean close, best AI orchestrator (most volume with least manual work), sharpest reviewer (most AI errors caught).
- Plan: step 1 new look + intro + act 1 for owner review; step 2 acts 2–3, prompt challenge, leaderboard; step 3 testing/polish.

## Leaderboard backend: Supabase
- `supabase/setup.sql` (tested on PostgreSQL 16): tables `runs`, `settings`; RLS on, no direct table access; RPCs `submit_run(p_player uuid, p_name, p_mode, p_score, p_stats jsonb, p_version)` with plausibility checks, `leaderboard(p_mode, p_metric, p_ascending, p_limit)` (best per player; metric 'score' or a key in stats such as `clean_ms`, `ai_share`, `caught`), `season()`. Season end default 2027-01-31 (in `settings`).
- Website needs the project URL + anon/publishable key (safe to be public). Never use or ask for the service_role/secret key.
- Supabase project `close-the-books`, ref `evdtpvbacpibeasrczhu`, region eu-central-1, org "pietjepizza's Org". setup.sql applied as migration `leaderboard_setup`. Supabase connector is available to Claude sessions; the sandbox network allows `evdtpvbacpibeasrczhu.supabase.co`.

## Hosting
- GitHub Pages serves the `gh-pages` branch: https://pietjepizza.github.io/Game/ . Work on branch `claude/expanded-game-github-hosting-26hroi`, then push the same commit to `gh-pages` to publish.
- The sandbox cannot open github.io; check deploys via the "pages build and deployment" Actions run.

## Communication
Owner writes Dutch; reply in Dutch. Game text is English.
