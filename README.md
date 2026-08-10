# Sunrise Moonrise

![Sunrise Moonrise](banner.png)

A standalone, deployable build of the Sunrise Moonrise opportunities
tracker — the same app, packaged to run as a plain static website instead
of inside Claude.ai.

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
falls back to the browser's own `localStorage`, which means:

- Data is saved **per browser, per device** — not synced anywhere.
- Clearing your browser's site data for this page will erase it.
- Export → Export as JSON still works exactly the same way, and is the
  right way to back up or move data between devices/browsers.

The first time anyone opens the page with nothing saved yet (a fresh
browser, or after clearing storage), it automatically loads with sample
data pre-populated — it cedes to your own data and dashboard the moment you begin
to save your own data.
 
