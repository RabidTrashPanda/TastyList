# TastyList

TastyList is a privacy-first static web app for building food preference profiles, comparing two or three people, and checking a dish against the active profile.

## Features

- Multiple profiles stored in the current browser
- Stable profile IDs, so renaming a profile does not break its data
- Local and imported guest profiles
- Two-person and three-person comparison tables
- Versioned full backup and restore
- Individual profile import/export
- Share codes for quick profile exchange
- Dish and ingredient matching
- No account, server, database, tracking, or build step

## Run locally

Use any static file server. ES modules do not reliably run from a direct `file://` URL.

```bash
npm run serve
```

Then open the address shown in the terminal.

## Tests

```bash
npm test
```

## GitHub Pages

This repository is deployable directly from the root folder.

1. Open repository **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)`.
4. Save.

The included CI workflow runs the Node test suite for pull requests and pushes to `main`.

## Data and privacy

Profiles are saved under the `tastylist.state` local-storage key in the current browser and origin. Clearing site data removes them unless a backup was exported.

Share codes and exported profile files contain the profile's ratings, preparation preferences, and notes. Treat them as personal data.

## Repository layout

- `index.html` — application shell
- `assets/css/` — application styling
- `assets/js/` — catalog, storage, comparison, sharing, dish matching, and UI modules
- `tests/` — Node test suite for storage and comparison logic
- `docs/` — architecture and storage notes
- `.github/workflows/` — continuous integration

## Catalog maintenance

The food catalog is in `assets/js/catalog.js`. Each item has a stable `key`. Preserve existing keys after release so stored profiles continue to map to the same food.

## License

MIT
