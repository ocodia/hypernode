import { bindInteractions } from "./interaction/bindings.js";
import {
  createStoredGraph,
  getActiveGraphId,
  listStoredGraphs,
  loadAppSettingsFromStorage,
  loadStoredGraph,
  saveAppSettingsToStorage,
  saveStoredGraph,
  setActiveGraphId,
} from "./persistence/storage.js";
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
  const initial = await resolveInitialStoredGraph();
  const initialSettings = loadAppSettingsFromStorage() ?? null;
  const store = createStore(initial.graph, initialSettings);
  const renderer = createRenderer(elements, store);

  let saveHandle = null;
  let saveRequestToken = 0;

  store.subscribe((state) => {
    renderer.render(state);

    if (saveHandle) window.clearTimeout(saveHandle);
    const graphSnapshot = snapshotGraphState(state);
    const settingsSnapshot = cloneSettingsSnapshot(state.settings);
    const activeDocumentId = getActiveGraphId();

    saveHandle = window.setTimeout(() => {
      const requestToken = ++saveRequestToken;
      void persistStateSnapshot(
        activeDocumentId,
        graphSnapshot,
        settingsSnapshot,
        requestToken,
      );
    }, 120);
  });

  bindInteractions(elements, store, {
    hasPersistedViewport: Boolean(initial.graph?.viewport),
  });

  if (elements.workspace instanceof HTMLElement) {
    elements.workspace.hidden = false;
  }

  renderer.render(store.getState());
  registerServiceWorker();

  async function persistStateSnapshot(
    activeDocumentId,
    graphSnapshot,
    settingsSnapshot,
    requestToken,
  ) {
    if (activeDocumentId) {
      await saveStoredGraph(activeDocumentId, graphSnapshot);
    }
    if (requestToken !== saveRequestToken) return;
    saveAppSettingsToStorage(settingsSnapshot);
  }
}

async function resolveInitialStoredGraph() {
  const storedGraphs = await listStoredGraphs();
  if (!storedGraphs.length) {
    const graph = createBlankGraph();
    const created = await createStoredGraph(graph);
    if (created?.id) {
      setActiveGraphId(created.id);
    }
    return {
      id: created?.id || null,
      graph,
      graphSummary: created?.graphSummary || null,
    };
  }

  const activeGraphId = getActiveGraphId();
  const candidateIds = [
    activeGraphId,
    ...storedGraphs.map((graph) => graph.id).filter((id) => id !== activeGraphId),
  ].filter(Boolean);

  for (const id of candidateIds) {
    const loaded = await loadStoredGraph(id);
    if (!loaded?.graph) continue;
    setActiveGraphId(id);
    return loaded;
  }

  const fallbackGraph = createBlankGraph();
  const created = await createStoredGraph(fallbackGraph);
  if (created?.id) {
    setActiveGraphId(created.id);
  }
  return {
    id: created?.id || null,
    graph: fallbackGraph,
    graphSummary: created?.graphSummary || null,
  };
}

function snapshotGraphState(state) {
  return {
    name: state.name,
    nodes: state.nodes,
    frames: state.frames,
    edges: state.edges,
    viewport: state.viewport,
  };
}

function cloneSettingsSnapshot(settings) {
  return JSON.parse(JSON.stringify(settings || {}));
}

function createBlankGraph() {
  return {
    name: "Untitled",
    nodes: [],
    frames: [],
    edges: [],
  };
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Ignore registration errors in unsupported/private contexts.
    });
  });
}
