# Sunrise Moonrise

[![Built with Claude](https://img.shields.io/badge/Built_with-Claude-7F77DD?style=flat-square)](https://claude.ai)

![Sunrise Moonrise](banner.png)

A standalone, deployable build of the Sunrise Moonrise opportunities
tracker — the same app, packaged to run as a plain static website instead
of inside Claude.ai.

**One UI note:** the Board tab's kanban columns (Saved → In Progress →
Submitted → ... → Withdrawn) scroll **horizontally** rather than wrapping
or stacking — there are 11 statuses, so it's wider than one screen. A fade
with an arrow appears on the right edge whenever there's more to scroll
to. If you'd rather not scroll horizontally at all, the **Not Yet
Applied**, **In Progress**, and **Applied** tabs give the same data as
plain vertical lists.

## What's in here

- `index.html` — the page that loads the app. This is all GitHub Pages
  needs to serve.
- `bundle.js` — the entire app, pre-built: React, ReactDOM, lucide-react,
  and the tracker itself, all in one file. **You don't need to run a
  build to deploy this as-is.**
- `src/App.jsx` — the actual source code, if you want to edit the app.
- `src/entry.jsx` — the small file that mounts `App.jsx` onto the page.
- `package.json` — dependencies and the `build` script, only needed if
  you edit `src/App.jsx` and want to regenerate `bundle.js`.

## Deploy as-is (no build needed)

1. Push this whole folder to a GitHub repository.
2. In the repo's **Settings → Pages**, set the source to the branch/folder
   containing `index.html` (root, or a `/docs` folder if you move it there).
3. GitHub will publish it at `https://<your-username>.github.io/<repo-name>/`.

That's it — `bundle.js` is already built, so there's no npm install or
compile step required just to publish it.

## If you want to edit the app

```
npm install
# edit src/App.jsx
npm run build     # regenerates bundle.js
npm run serve      # preview at http://localhost:8080
```

## About data storage

Inside Claude.ai, this app saves through Claude's own private storage,
tied to your account. **This standalone build can't do that** — there's no
Claude account to attach to outside claude.ai. Instead, it automatically
falls back to the browser's own `localStorage`.

Once deployed to GitHub Pages, the app does persist data — but only
through the browser's own `localStorage`, not through any account or
server. That means:

- **Persists:** across page reloads, closing/reopening the tab, restarting
  the browser — as long as it's the same browser on the same device.
- **Does NOT persist across:** different browsers, different devices,
  incognito/private windows, or if the person clears their browser's site
  data/cache.
- **No cloud sync.** Two people (or the same person on their phone vs.
  laptop) visiting the same GitHub Pages URL will each get their own
  separate, disconnected local copy — not a shared one.

It's "persistent" in the sense of surviving normal day-to-day use, but not
durable the way an account-backed app is. **Export → Export as JSON** is
the real safety net — it's how someone would actually back up or move
their data between devices.

The first time anyone opens the page with nothing saved yet (a fresh
browser, or after clearing storage), it automatically loads with sample
data pre-populated. **That sample data doesn't disappear or get
overwritten automatically** — it stays right alongside anything real you
add, each entry marked with a small **"Sample"** tag, until you delete it
yourself with that card's trash icon. Nothing gets cleared on your behalf.

## Credits

Built in collaboration with [Claude](https://claude.ai) (Anthropic).
