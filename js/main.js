import { createStore } from './state/store.js';
import { createRenderer } from './render/renderer.js';
import { bindInteractions } from './interaction/bindings.js';
import { loadGraphFromStorage, saveGraphToStorage } from './persistence/storage.js';

const elements = {
  workspace: document.getElementById('workspace'),
  canvas: document.getElementById('canvas'),
  nodesLayer: document.getElementById('nodes-layer'),
  edgesLayer: document.getElementById('edges-layer'),
  edgesOverlayLayer: document.getElementById('edges-overlay-layer'),
  edgesGroup: document.getElementById('edges-group'),
  edgeDraftGroup: document.getElementById('edge-draft-group'),
  edgeOverlayGroup: document.getElementById('edge-overlay-group'),
  importStatus: document.getElementById('import-status'),
  importInput: document.getElementById('import-input'),
};

const initialGraph = loadGraphFromStorage();
const store = createStore(initialGraph);
const renderer = createRenderer(elements, store);

let saveHandle = null;
store.subscribe((state) => {
  renderer.render(state);

  if (saveHandle) window.clearTimeout(saveHandle);
  saveHandle = window.setTimeout(() => {
    saveGraphToStorage({ nodes: state.nodes, edges: state.edges });
  }, 120);
});

bindInteractions(elements, store);
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
