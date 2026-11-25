# Metabook Unity WebGL Site

This site is ready to host a Unity WebGL export.

## Add your Unity build

1. In Unity, switch the platform to WebGL and build the project.
2. Copy Unity's generated `Build` folder into `dist/Build`.
3. Copy Unity's generated `TemplateData` folder into `dist/TemplateData`.
4. Commit and push.

GitHub refuses normal files of 100 MB or more, so the Unity build files (`dist/Build/*.unityweb` and `*.gz`) are stored with Git LFS (see `.gitattributes`). Git LFS must be installed (`git lfs install`). Each push uploads the new build to LFS storage, and each Vercel deploy downloads it, so both count against the account's LFS budget.

The pre-commit hook in `scripts/hooks/pre-commit` stops any commit that has a file of 100 MB or more not stored with LFS, before GitHub rejects the push. Install it once per clone, from the repo folder:

```sh
cp scripts/hooks/pre-commit .git/hooks/pre-commit
```

If the LFS budget runs out, `scripts/split-unity-data.ps1` can split the data file into normal-git parts under 100 MB instead (`dist/player.js` joins them in the browser). To leave LFS that way, also remove the LFS rules from `.gitattributes`.

## Vercel deployment

This repo includes a root-level `vercel.json` that points Vercel at `dist` and adds the required Unity WebGL headers for precompressed `.gz` build files. Without these headers, the browser can download the files but Unity cannot parse them.

The Unity build files are stored with Git LFS. In Vercel, open the project settings, go to **Git**, enable **Git Large File Storage (LFS)**, then redeploy. If LFS is off, Vercel deploys tiny pointer files instead of the real Unity assets, which causes `ERR_CONTENT_DECODING_FAILED` in the browser.

The deployment runs `node scripts/verify-unity-build.mjs` before publishing. It checks the loader, data, framework, and WebAssembly filenames from `dist/unity-config.json`, including their compression extensions, so missing assets and broken LFS checkouts fail before publishing. Run the same command locally to verify the export before deploying.

If the check reports a missing file, make sure the configured filename exactly matches the committed asset, including `.gz` when present. Enable Git LFS when the check specifically reports a Git LFS pointer.
