# Vivid Flow

A macOS creative workspace for AI ideation, moodboards, and connected visual workflows.

[Visit the website](https://hellojulian.github.io/vivid-flow/) · [Download the latest release](https://github.com/hellojulian/vivid-flow/releases/latest)

## Install the app

Download the universal DMG from Releases, open it, and drag Vivid Flow into Applications. The build includes Apple Silicon and Intel binaries. See the current release notes for supported macOS versions and verification details.

The app is Developer ID signed but not notarized. See the release notes and [Apple's instructions](https://support.apple.com/en-au/102445) for opening an app you trust.

Open Settings and enter your own fal API key. Generation uses your fal account and credits. The app stores content locally; reference media and prompts used for generation are sent to fal.

## Website

`site/` contains the static website and its local images, fonts, and published runtime assets. It is deployed to GitHub Pages by `.github/workflows/pages.yml`. Application files, runtime data, and API keys are not part of this repository or deployment.

The export preserves the published page's responsive layout and interactions. Host-only badge, analytics, and editor bootstrap are excluded. `site/hosting.css` fixes small-screen navigation clipping. Export provenance is recorded in `reports/export.json`.

### Preview

```sh
node scripts/preview.mjs
```

Open `http://127.0.0.1:3320/vivid-flow/`.

### Refresh from the published page

After publishing changes in Framer:

```sh
npm ci
npm run export
npm run check
```

Review desktop/mobile layout and interactions before committing. The exporter mirrors assets into `site/`; GitHub Pages does not depend on the original asset CDN at runtime. It uses `/vivid-flow/` as the project base path.

Push reviewed changes to `main` to deploy. A deployment can also be started from the Actions page using **Deploy Vivid Flow website**.
