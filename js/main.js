import { bindInteractions } from "./interaction/bindings.js";
import { loadAppSettingsFromStorage, loadGraphFromStorage, saveAppSettingsToStorage, saveGraphToStorage } from "./persistence/storage.js";
import { createRenderer } from "./render/renderer.js";
import { createStore } from "./state/store.js";

const elements = {
  workspace: document.getElementById("workspace"),
  canvas: document.getElementById("canvas"),
  canvasDropZone: document.getElementById("canvas-drop-zone"),
  framesLayer: document.getElementById("frames-layer"),
  nodesLayer: document.getElementById("nodes-layer"),
  edgesLayer: document.getElementById("edges-layer"),
  edgesOverlayLayer: document.getElementById("edges-overlay-layer"),
  edgesGroup: document.getElementById("edges-group"),
  edgeDraftGroup: document.getElementById("edge-draft-group"),
  edgeOverlayGroup: document.getElementById("edge-overlay-group"),
  selectionControlsLayer: document.getElementById("selection-controls-layer"),
  focusLayer: document.getElementById("focus-layer"),
  selectionMarquee: document.getElementById("selection-marquee"),
  toasts: document.getElementById("toasts"),
  settingsStatus: document.getElementById("settings-status"),
  graphTitle: document.getElementById("graph-title"),
  viewportCoordinates: document.getElementById("viewport-coordinates"),
};

void bootstrap();

async function bootstrap() {
  const initialGraph = await loadGraphFromStorage();
  const initialSettings =
    loadAppSettingsFromStorage() ?? initialGraph?.settings ?? null;
  const store = createStore(initialGraph, initialSettings);
  const renderer = createRenderer(elements, store);

  let saveHandle = null;
  let saveRequestToken = 0;

  store.subscribe((state) => {
    renderer.render(state);

    if (saveHandle) window.clearTimeout(saveHandle);
    saveHandle = window.setTimeout(() => {
      const requestToken = ++saveRequestToken;
      void persistStateSnapshot(state, requestToken);
    }, 120);
  });

  bindInteractions(elements, store, {
    hasPersistedViewport: Boolean(initialGraph?.viewport),
  });

  if (elements.workspace instanceof HTMLElement) {
    elements.workspace.hidden = false;
  }

  renderer.render(store.getState());
  registerServiceWorker();

  async function persistStateSnapshot(state, requestToken) {
    const graph = {
      name: state.name,
      nodes: state.nodes,
      frames: state.frames,
      edges: state.edges,
      viewport: state.viewport,
    };

    await saveGraphToStorage(graph);
    if (requestToken !== saveRequestToken) return;
    saveAppSettingsToStorage(state.settings);
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Ignore registration errors in unsupported/private contexts.
    });
  });
}
