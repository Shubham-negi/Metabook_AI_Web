# Metabook Unity WebGL Site

This site is ready to host a Unity WebGL export.

## Add your Unity build

1. In Unity, switch the platform to WebGL and build the project.
2. Copy Unity's generated `Build` folder into `dist/Build`.
3. Copy Unity's generated `TemplateData` folder into `dist/TemplateData`.
4. Commit and push.

GitHub refuses any file of 100 MB or more, and its error tells you to use Git LFS. This repo doesn't use LFS. Instead, the Unity data file is split into parts of up to 45 MB (`scripts/split-unity-data.ps1`), `dist/unity-config.json` lists them under `dataParts`, and `dist/player.js` joins them in the browser.

The pre-commit hook in `scripts/hooks/pre-commit` runs the split for you when a commit adds a fresh data file. It also stops any commit that still has a file of 100 MB or more. Install it once per clone, from the repo folder:

```sh
cp scripts/hooks/pre-commit .git/hooks/pre-commit
```

Without the hook, run the split yourself after copying a new build into `dist/Build`, before you commit:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/split-unity-data.ps1
```

## Vercel deployment

This repo includes a root-level `vercel.json` that points Vercel at `dist` and adds the required Unity WebGL headers for precompressed `.gz` build files. Without these headers, the browser can download the files but Unity cannot parse them.

The Unity build is stored as normal git files, so Vercel doesn't need Git LFS.

The deployment runs `node scripts/verify-unity-build.mjs` before publishing. It checks the loader, data, framework, and WebAssembly filenames from `dist/unity-config.json`, including their compression extensions, so missing assets and broken LFS checkouts fail before publishing. Run the same command locally to verify the export before deploying.

If the check reports a missing file, make sure the configured filename exactly matches the committed asset, including `.gz` when present. Enable Git LFS when the check specifically reports a Git LFS pointer.
