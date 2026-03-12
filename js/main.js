import { createStore } from './state/store.js';
import { createRenderer } from './render/renderer.js';
import { bindInteractions } from './interaction/bindings.js';
import {
  loadAppSettingsFromStorage,
  loadGraphFromStorage,
  saveAppSettingsToStorage,
  saveGraphToStorage,
} from './persistence/storage.js';

const elements = {
  workspace: document.getElementById('workspace'),
  canvas: document.getElementById('canvas'),
  canvasDropZone: document.getElementById('canvas-drop-zone'),
  framesLayer: document.getElementById('frames-layer'),
  nodesLayer: document.getElementById('nodes-layer'),
  edgesLayer: document.getElementById('edges-layer'),
  edgesOverlayLayer: document.getElementById('edges-overlay-layer'),
  edgesGroup: document.getElementById('edges-group'),
  edgeDraftGroup: document.getElementById('edge-draft-group'),
  edgeOverlayGroup: document.getElementById('edge-overlay-group'),
  selectionControlsLayer: document.getElementById('selection-controls-layer'),
  focusLayer: document.getElementById('focus-layer'),
  selectionMarquee: document.getElementById('selection-marquee'),
  toasts: document.getElementById('toasts'),
  settingsStatus: document.getElementById('settings-status'),
  graphTitle: document.getElementById('graph-title'),
  viewportCoordinates: document.getElementById('viewport-coordinates'),
};

const initialGraph = loadGraphFromStorage();
const initialSettings = loadAppSettingsFromStorage() ?? initialGraph?.settings ?? null;
const store = createStore(initialGraph, initialSettings);
const renderer = createRenderer(elements, store);

let saveHandle = null;
store.subscribe((state) => {
  renderer.render(state);

  if (saveHandle) window.clearTimeout(saveHandle);
  saveHandle = window.setTimeout(() => {
    saveGraphToStorage({
      name: state.name,
      nodes: state.nodes,
      frames: state.frames,
      edges: state.edges,
      viewport: state.viewport,
    });
    saveAppSettingsToStorage(state.settings);
  }, 120);
});

bindInteractions(elements, store, {
  hasPersistedViewport: Boolean(initialGraph?.viewport),
});
// Unhide workspace before first render so DOM measurements (offsetWidth etc.)
// return real values; both run in the same JS task so there is no FOUC.
if (elements.workspace instanceof HTMLElement) {
  elements.workspace.hidden = false;
}
renderer.render(store.getState());
registerServiceWorker();

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ignore registration errors in unsupported/private contexts.
    });
  });
}
