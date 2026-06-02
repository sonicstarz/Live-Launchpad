# CLAUDE.md — Live Launchpad

This file gives Claude Code (and any future helper) the context it needs to work on this project. Read it before making changes.

## What this is

**Live Launchpad** is a rocket-launch website — schedules, news, and reliability info for space launches. It is live at **https://livelaunchpad.com**.

The owner works on this solo and is newer to development. When you explain things, keep it plain: say what you changed, why, and what (if anything) the owner needs to do. Avoid jargon, or define it when you use it.

## How deployment works (the deploy loop)

The site is hosted on **Netlify**, connected to this GitHub repo. Netlify **auto-deploys on every push to the `main` branch** — there is no separate build/publish step to run by hand. The flow is:

1. You change files locally.
2. You `git commit` the changes.
3. You `git push` to `main`.
4. Netlify sees the push, builds, and publishes to livelaunchpad.com automatically (usually within a minute or two).

**Rule of thumb: always commit and push when work is done.** Unpushed work is not live. If a change is finished, it belongs on `main`. Don't leave completed work sitting uncommitted.

Netlify config lives in `netlify.toml` and the `netlify/` directory.

## Pages that exist today

This is a static HTML site — each page is its own `.html` file at the repo root. No build framework, no bundler.

- `index.html` — home page
- `schedule.html` — launch schedule
- `news.html` — launch news
- `index-reliability.html` — rocket/launch reliability info
- `development.html` — development page
- `games.html` — games
- `about.html` — about the site

There is **no dashboard page yet** — if a dashboard is mentioned, it still needs to be built.

## Design direction

Dark, cinematic **"mission-control"** look. Think a launch control room at night. Keep new pages consistent with this.

- **Background:** `#04060c` (near-black, deep space)
- **Accent:** `#ffb627` (amber — used for highlights, key actions, important numbers)
- **Fonts:** **Archivo** for headings/body text, **IBM Plex Mono** for monospace/technical readouts (timers, stats, data)
- **No light mode.** The site is dark-only by design — don't add a light theme or a theme toggle.

## Working notes

- Pages are plain HTML/CSS/JS — edit the `.html` files directly.
- Keep the dark mission-control styling consistent across every page.
- When a task is done: commit and push to `main` so it goes live.
