# Metabook Unity WebGL Site

This site is ready to host a Unity WebGL export.

## Add your Unity build

1. In Unity, switch the platform to WebGL and build the project.
2. Copy Unity's generated `Build` folder into `dist/Build`.
3. Copy Unity's generated `TemplateData` folder into `dist/TemplateData`.
4. Open `dist/unity-config.json` and update the file names if your Unity export is not named `Metabook`.

The current build files are configured as:

- `dist/Build/WebGL.loader.js`
- `dist/Build/WebGL.data.gz`
- `dist/Build/WebGL.framework.js.gz`
- `dist/Build/WebGL.wasm.gz`

After those files are present, the website will load the Unity player automatically.

## Vercel deployment

This repo includes a root-level `vercel.json` that points Vercel at `dist` and adds the required Unity WebGL headers for precompressed `.gz` build files. Without these headers, the browser can download the files but Unity cannot parse them.

The Unity `.gz` assets are stored with Git LFS. In Vercel, open the project settings, go to **Git**, enable **Git Large File Storage (LFS)**, then redeploy. If LFS is off, Vercel deploys tiny pointer files instead of the real Unity assets, which causes `ERR_CONTENT_DECODING_FAILED` in the browser.

The deployment runs `node scripts/verify-unity-build.mjs` before publishing so broken LFS checkouts fail instead of shipping a loading screen.
