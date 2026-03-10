import { createStore } from './state/store.js';
import { createRenderer } from './render/renderer.js';
import { bindInteractions } from './interaction/bindings.js';
import { loadGraphFromStorage, saveGraphToStorage } from './persistence/storage.js';

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
  importStatus: document.getElementById('import-status'),
  settingsStatus: document.getElementById('settings-status'),
  graphTitle: document.getElementById('graph-title'),
  viewportCoordinates: document.getElementById('viewport-coordinates'),
};

const initialGraph = loadGraphFromStorage();
const store = createStore(initialGraph);
const renderer = createRenderer(elements, store);

let saveHandle = null;
store.subscribe((state) => {
  renderer.render(state);

  if (saveHandle) window.clearTimeout(saveHandle);
  saveHandle = window.setTimeout(() => {
    saveGraphToStorage({
      name: state.name,
    settings: state.settings,
    nodes: state.nodes,
    frames: state.frames,
    edges: state.edges,
  });
  }, 120);
});

bindInteractions(elements, store, { shouldCreateStarter: !initialGraph });
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
