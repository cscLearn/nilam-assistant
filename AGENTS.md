# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Tampermonkey-based NILAM assistant and a small Cloudflare Worker backend.

- `tampermonkey/nilam-assistant.user.js`: browser autofill userscript.
- `tampermonkey/nilam-api.user.js`: API-submit userscript that captures an authorized AINS request and reuses it from the page context.
- `worker/src/index.js`: Cloudflare Worker endpoints for session/progress state.
- `worker/wrangler.toml`: Worker entrypoint, compatibility date, and KV binding.
- `README.md`, `CHANGELOG.md`, `TODO.md`: user-facing setup notes, release notes, and pending work.

There is no dedicated test directory yet. Keep generated Wrangler state, local dependencies, and secrets out of Git.

## Build, Test, and Development Commands

- `node --check tampermonkey/nilam-api.user.js`: syntax-check the API userscript.
- `node --check tampermonkey/nilam-assistant.user.js`: syntax-check the autofill userscript.
- `cd worker; npx wrangler dev`: run the Worker locally with Miniflare.
- `cd worker; npx wrangler deploy`: deploy the Worker using `worker/wrangler.toml`.

Run userscripts in a logged-in AINS browser session for manual verification. The API script needs one normal manual NILAM submission before it can capture the request template.

## Coding Style & Naming Conventions

Use plain JavaScript with two-space indentation. Prefer small helper functions over new abstractions. Keep Tampermonkey metadata accurate, especially `@version`, `@match`, `@grant`, and external script URLs.

Use descriptive camelCase names for functions and state fields, such as `fetchHistory`, `todaySubmitCount`, and `submittedTitles`. Keep user-facing panel text concise and consistent within a release.

## Testing Guidelines

At minimum, run `node --check` on every changed `.user.js` or Worker file. For behavior changes, manually verify the panel on `https://ains.moe.gov.my/*`, including token capture, history sync, duplicate blocking, and submit cooldowns. For Worker changes, test the touched endpoint with `wrangler dev` before deploy.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages, often with prefixes such as `feat:` or `fix:`. Examples: `fix: restore auto-fill interval` and `feat: release NILAM API Assistant v0.5.5`.

Pull requests should describe the user-visible change, list manual verification steps, mention affected script versions, and include screenshots for panel/UI changes.

## Security & Configuration Tips

Do not commit `.dev.vars`, `node_modules/`, `.wrangler/`, tokens, captured AINS payloads, or real student data. Treat AINS credentials as page-session data only; do not move them into Worker logs or repository files.
