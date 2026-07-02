# NILAM Assistant V2

Tampermonkey helper script and state sync backend for automated AINS NILAM book logging.

## Installation

Install the Tampermonkey script by clicking the following URL (with Tampermonkey extension installed):

```text
https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
```

## Features

- **Seed-Based Book Generator**: Evaluates book fields (title, summary, moral lesson, pages, ISBN) on-the-fly via salted SHA-256 hashes of `profile` + `sessionId` + `currentBookIndex` + `fieldName`. Guaranteed unique, deterministic, and doesn't download 4MB database files.
- **Cloudflare Worker State Sync**: Syncs state to Cloudflare KV. Tracks dynamic session progress and language counters (`langCounters` for BM, EN, ZH balance).
- **Element Selector Calibration**: Allows manual calibration of Date Inputs and 5-Star buttons to save custom CSS selectors locally.
- **Improved UI**: Features a beautiful draggable, collapsible purple controller panel that saves screen coordinates.
- **Automatic Interception**: Wraps `window.fetch` to auto-capture JWT auth credentials and user email profiles.

## Backend Deployment (Cloudflare Worker)

To deploy the state synchronization backend:
1. Navigate to the `worker/` directory.
2. Edit `wrangler.toml` if needed (e.g., compatibility date, namespace binding).
3. Run `npm install` and deploy:
   ```bash
   npx wrangler deploy
   ```
4. Copy your deployed Worker URL and update `WORKER_URL` in the Tampermonkey Userscript header configuration.
