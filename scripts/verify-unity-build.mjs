import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";

const config = JSON.parse(await readFile("dist/unity-config.json", "utf8"));
// Check the same filenames the player loads, including compression extensions.
const unityFiles = [
  config.loaderUrl,
  config.dataUrl,
  config.frameworkUrl,
  config.codeUrl,
].map((file) => path.join("dist", file.replace(/^\.\//, "")));

const lfsPointerPrefix = "version https://git-lfs.github.com/spec";
let hasError = false;
let hasLfsPointers = false;

for (const file of unityFiles) {
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
      hasLfsPointers = true;
      continue;
    }

    if (file.endsWith(".gz") && (bytes[0] !== 0x1f || bytes[1] !== 0x8b)) {
      console.error(`${file} is not a gzip-compressed Unity asset.`);
      hasError = true;
      continue;
    }

    if (metadata.size < 1024) {
      console.error(`${file} is unexpectedly small (${metadata.size} bytes).`);
      hasError = true;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        `${file} is missing. Check the filename in dist/unity-config.json and commit the matching Unity build asset.`
      );
    } else {
      console.error(`${file} could not be checked: ${error.message}`);
    }
    hasError = true;
  }
}

if (hasError) {
  console.error(
    "Unity WebGL asset verification failed. Fix the errors above before redeploying."
  );
  if (hasLfsPointers) {
    console.error(
      "Enable Git LFS for this Vercel project and redeploy to download the actual Unity assets."
    );
  }
  process.exit(1);
}

console.log("Unity WebGL assets are present.");
