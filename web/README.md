# Dashboard (`web/`)

The React + Vite control board that operates normalized AI reviews. See the project
[README](../README.md) ([日本語](../README.ja.md)) for the full overview.

## Scripts

```bash
npm install         # install dependencies
npm run dev         # dev server with the review API bundled in (hot reload)
npm run build       # type-check and build for production (output: dist/)
npm run preview     # preview the production build
npm run lint        # run oxlint
npm run collect     # static-hosting aggregation into public/reviews/ (optional)
```

## Data flow

At runtime the app calls `GET /api/findings` and `POST /api/state`. In dev these
are served by a Vite middleware (`reviewApi` in `vite.config.ts`); in production they
are served by `ai-review-manager serve`, which also serves the built `dist/`.

If the API is unavailable (e.g. static hosting), the app falls back to reading
`public/reviews/index.json` in read-only mode (no decision write-back). Stack:
React 19, Vite, Tailwind CSS v4, oxlint.
