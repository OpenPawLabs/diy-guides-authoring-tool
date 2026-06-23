# diy-guides-authoring-tool

Create and maintain DIY guide chapters from a local folder.
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
