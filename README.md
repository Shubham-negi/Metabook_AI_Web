# Metabook Unity WebGL Site

This site is ready to host a Unity WebGL export.

## Add your Unity build

1. In Unity, switch the platform to WebGL and build the project.
2. Copy Unity's generated `Build` folder into `dist/Build`.
3. Copy Unity's generated `TemplateData` folder into `dist/TemplateData`.
4. Open `dist/unity-config.json` and update the file names if your Unity export is not named `WebGL`.

The current build files are configured as:

- `dist/Build/WebGL.loader.js`
- `dist/Build/WebGL.data.gz`
- `dist/Build/WebGL.framework.js.gz`
- `dist/Build/WebGL.wasm.gz`

After those files are present, the website will load the Unity player automatically.

## Vercel deployment

This repo includes a root-level `vercel.json` that points Vercel at `dist` and adds the required Unity WebGL headers for precompressed `.gz` build files. Without these headers, the browser can download the files but Unity cannot parse them.

The Unity `.gz` assets are stored with Git LFS. In Vercel, open the project settings, go to **Git**, enable **Git Large File Storage (LFS)**, then redeploy. If LFS is off, Vercel deploys tiny pointer files instead of the real Unity assets, which causes `ERR_CONTENT_DECODING_FAILED` in the browser.

The deployment runs `node scripts/verify-unity-build.mjs` before publishing. It checks the loader, data, framework, and WebAssembly filenames from `dist/unity-config.json`, including their compression extensions, so missing assets and broken LFS checkouts fail before publishing. Run the same command locally to verify the export before deploying.

If the check reports a missing file, make sure the configured filename exactly matches the committed asset, including `.gz` when present. Enable Git LFS when the check specifically reports a Git LFS pointer.
