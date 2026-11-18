# Close the Books – project context

Browser game for a Finance Operations team (~125 people), handed out before Christmas as a warm-up for an AI event in January 2027. Must be **finished by mid-December 2026**. Players do NOT have Claude access: it must be a plain website, no installs.

## Message the game must carry
Volume keeps growing; you cannot scale it with people. ESSA (eliminate, simplify, standardize, automate) is the foundation to fix processes; AI is the extra enabler on top. Goal: people become AI-native and upskilled in using AI in daily work, so the team can handle more volume.

## Status (18 Nov 2026)
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
