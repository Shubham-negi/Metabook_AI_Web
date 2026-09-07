const canvas = document.querySelector("#unity-canvas");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const progressBar = document.querySelector("#progress-bar");
const statusText = document.querySelector("#status-text");
const reloadButton = document.querySelector("#reload-button");
const fullscreenButton = document.querySelector("#fullscreen-button");

let unityInstance = null;

const setStatus = (title, message, status, progress = 0) => {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  statusText.textContent = status;
  progressBar.style.width = `${Math.round(progress * 100)}%`;
  overlay.classList.remove("is-hidden");
};

const hideOverlay = () => {
  overlay.classList.add("is-hidden");
  statusText.textContent = "Running";
};

const loadConfig = async () => {
  const response = await fetch("./unity-config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("unity-config.json is missing.");
  }
  return response.json();
};

const checkFile = async (url) => {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} was not found.`);
  }
};

const injectScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-unity-loader="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.dataset.unityLoader = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} could not be loaded.`));
    document.body.appendChild(script);
  });

const startUnity = async () => {
  setStatus("Looking for your Unity build", "Checking the configured WebGL files.", "Checking", 0.05);

  try {
    if (unityInstance?.Quit) {
      await unityInstance.Quit();
      unityInstance = null;
    }

    const config = await loadConfig();
    await Promise.all([
      checkFile(config.loaderUrl),
      checkFile(config.dataUrl),
      checkFile(config.frameworkUrl),
      checkFile(config.codeUrl),
    ]);
    await injectScript(config.loaderUrl);

    if (typeof window.createUnityInstance !== "function") {
      throw new Error("Unity loader is present, but createUnityInstance was not found.");
    }

    setStatus("Starting Unity", "Loading the WebGL runtime and game assets.", "Loading", 0.12);
    unityInstance = await window.createUnityInstance(canvas, config, (progress) => {
      setStatus("Starting Unity", "Loading the WebGL runtime and game assets.", "Loading", progress);
    });
    hideOverlay();
  } catch (error) {
    setStatus(
      "Unity build not ready yet",
      `${error.message} Add your exported files and update unity-config.json if the file names differ.`,
      "Waiting for build",
      0
    );
  }
};

reloadButton.addEventListener("click", startUnity);

fullscreenButton.addEventListener("click", () => {
  if (unityInstance?.SetFullscreen) {
    unityInstance.SetFullscreen(1);
    return;
  }
  document.querySelector("#unity-frame").requestFullscreen?.();
});

startUnity();
