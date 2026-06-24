# diy-guides-authoring-tool

Create and maintain DIY guide chapters from a local folder.

The tool is a Chrome-focused GitHub Pages app. Authors clone a guide
repository locally, open the authoring site, grant access to a chapter folder,
and edit `guide.mdx` with a live preview before saving changes back to disk.

## Current capabilities

- Explains the local workflow: clone a guide repo, open Chrome, grant folder access, then use git outside the tool.
- Opens an existing chapter folder with Chrome's File System Access API.
- Offers to create `guide.mdx` when an opened folder does not have one.
- Starts a new chapter by creating `guide.mdx` and `images/.gitkeep`.
- Remembers the last folder handle in IndexedDB and prompts authors to re-open it when permission is stale.
- Loads `guide.mdx` into an inline step editor where the real
  `@openpawlabs/diy-guides-ui` `GuideStep` is the editing surface.
- Edits step titles and bullet text inline, sets bullet color/variant from the
  marker, adds/reorders/removes steps and bullets, and uploads up to three images
  per step (drag/click into the empty frame, "+" tile, click-to-replace, remove).
- Keeps guide-level details (header, intro, tools and parts, callouts) in a
  collapsible "Guide details" form.
- Keeps raw MDX available (with a compiled preview) for custom content and guide
  shapes the structured editor does not support yet.
- Imports images into `images/` under a sanitized, de-duplicated file name and
  resolves `./images/...` paths from the selected chapter folder.
- Saves edits back to `guide.mdx` (serialized only on save) and warns before
  closing or leaving with unsaved changes.
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
