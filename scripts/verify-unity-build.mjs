import { open, stat } from "node:fs/promises";

const files = [
  "dist/Build/WebGL.data.gz",
  "dist/Build/WebGL.wasm.gz",
];

const plainFiles = ["dist/Build/WebGL.framework.js"];
const lfsPointerPrefix = "version https://git-lfs.github.com/spec";
let hasError = false;

for (const file of files) {
  try {
    const metadata = await stat(file);
    const handle = await open(file, "r");
    const sample = Buffer.alloc(256);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    await handle.close();
    const bytes = sample.subarray(0, bytesRead);

    if (bytes.toString("utf8", 0, lfsPointerPrefix.length) === lfsPointerPrefix) {
      console.error(`${file} is a Git LFS pointer, not the Unity asset.`);
      hasError = true;
      continue;
    }

    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
      console.error(`${file} is not a gzip-compressed Unity asset.`);
      hasError = true;
      continue;
    }

    if (metadata.size < 1024) {
      console.error(`${file} is unexpectedly small (${metadata.size} bytes).`);
      hasError = true;
    }
  } catch (error) {
    console.error(`${file} could not be checked: ${error.message}`);
    hasError = true;
  }
}

for (const file of plainFiles) {
  try {
    const metadata = await stat(file);
    const handle = await open(file, "r");
    const sample = Buffer.alloc(256);
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    await handle.close();
    const bytes = sample.subarray(0, bytesRead);

    if (bytes.toString("utf8", 0, lfsPointerPrefix.length) === lfsPointerPrefix) {
      console.error(`${file} is a Git LFS pointer, not the Unity asset.`);
      hasError = true;
      continue;
    }

    if (!bytes.toString("utf8").includes("unityFramework")) {
      console.error(`${file} does not look like a Unity framework script.`);
      hasError = true;
      continue;
    }

    if (metadata.size < 1024) {
      console.error(`${file} is unexpectedly small (${metadata.size} bytes).`);
      hasError = true;
    }
  } catch (error) {
    console.error(`${file} could not be checked: ${error.message}`);
    hasError = true;
  }
}

if (hasError) {
  console.error(
    "Unity WebGL assets are missing from the deployment checkout. Enable Git LFS for this Vercel project and redeploy."
  );
  process.exit(1);
}

console.log("Unity WebGL assets are present.");
