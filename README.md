# diy-guides-authoring-tool

Create and maintain DIY guides from a local folder.

The tool is a Chrome-focused GitHub Pages app. Authors clone a guide
repository locally, open the authoring site, open a guide folder, and edit
`guide.mdx` with a live preview before saving changes back to disk.

## Current capabilities

- Opens on a **Guides** home page that lists previously edited guides as cards
  (title, folder, difficulty, last edited) in a responsive 1 / 3 / 5 column grid,
  plus an "Open guide folder" button for opening an arbitrary folder.
- Uses hash-based routing (`#/guide/:id`) so each guide has its own URL and a
  refresh lands the author back on the guide they were editing.
- Opens a guide folder with Chrome's File System Access API and remembers every
  opened folder in IndexedDB as a recents entry.
- Re-prompts for folder access with an "Allow Access" modal when Chrome has
  dropped read/write permission (for example, after a refresh).
- Offers to create `guide.mdx` and `images/.gitkeep` when an opened folder does
  not have a guide yet.
- Loads `guide.mdx` into an inline step editor where the real
  `@openpawlabs/diy-guides-ui` `GuideStep` is the editing surface.
- Edits step titles and bullet text inline, sets bullet color/variant from the
  marker, adds/reorders/removes steps and bullets, and uploads up to three images
  per step (drag/click into the empty frame, "+" tile, click-to-replace, remove).
- Shows the guide header (title, difficulty, time estimate, meta) in a compact
  "Guide details" card above the editor, and keeps the intro, tools and parts,
  and callouts in an "Overview" tab placed before the numbered steps.
- Keeps raw MDX available (with a compiled preview) for custom content and guide
  shapes the structured editor does not support yet.
- Imports images into `images/` under a sanitized, de-duplicated file name and
  resolves `./images/...` paths from the selected guide folder.
- Mirrors unsaved edits to IndexedDB so a refresh or dropped permission never
  loses work, and restores them automatically on the next load.
- Hashes the loaded `guide.mdx` and, when the file changes on disk while edits
  are pending, prompts the author to keep their edits or reload from disk.
- Saves edits back to `guide.mdx` (serialized only on save) and warns before
  leaving with unsaved changes.
- Builds as a static site for GitHub Pages at `https://openpawlabs.github.io/diy-guides-authoring-tool/`.

## Development

Requires [pnpm](https://pnpm.io/) and a current Chrome or Chromium browser.

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

The File System Access API works on secure origins. Vite's `localhost` dev
server is supported for local testing.

## Deployment

GitHub Pages is deployed from the `dist/` build artifact by
`.github/workflows/deploy-pages.yml`. In repository settings, configure Pages to
use GitHub Actions.
