import test from 'node:test';
import assert from 'node:assert/strict';

import { saveGraphFile } from '../js/persistence/file.js';
import { serializeGraphDocument } from '../js/persistence/document.js';
import { loadGraphFromStorage, saveGraphToStorage } from '../js/persistence/storage.js';
import { createStore } from '../js/state/store.js';
import { validateGraphPayload } from '../js/utils/graph.js';

function createGraph() {
  return {
    name: 'Persistence Graph',
    nodes: [
      {
        id: 'n-text',
        title: 'Text node',
        description: 'Body',
        kind: 'text',
        x: 24,
        y: 48,
        width: 312,
        height: 168,
        frameId: 'frame-1',
        colorKey: 'sky',
        borderWidth: 3,
        borderStyle: 'dashed',
      },
      {
        id: 'n-image',
        title: 'Image node',
        description: 'Screenshot',
        kind: 'image',
        x: 360,
        y: 120,
        width: 420,
        height: 300,
        colorKey: 'mint',
        borderWidth: 2,
        borderStyle: 'solid',
        imageData: 'data:image/png;base64,abc',
        imageAspectRatio: 1.6,
      },
    ],
    frames: [
      {
        id: 'frame-1',
        title: 'Frame',
        description: '',
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        borderWidth: 3,
        borderStyle: 'solid',
        colorKey: 'sage',
      },
    ],
    edges: [
      {
        id: 'edge-1',
        from: 'n-text',
        to: 'n-image',
        fromAnchor: 'right',
        toAnchor: 'left',
        label: 'links',
        strokeWidth: 4,
        strokeStyle: 'dotted',
        edgeType: 'straight',
        colorKey: 'amber',
      },
    ],
    viewport: {
      panX: 100,
      panY: -40,
      zoom: 1.25,
    },
  };
}

test('serializeGraphDocument preserves full node payloads', () => {
  const graph = createGraph();

  assert.deepEqual(serializeGraphDocument(graph), graph);
});

test('saveGraphToStorage and loadGraphFromStorage round-trip node sizes and properties', () => {
  const graph = createGraph();
  const storage = new Map();
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  };

  try {
    saveGraphToStorage(graph);

    const saved = JSON.parse(storage.values().next().value);
    assert.deepEqual(saved.nodes, graph.nodes);
    assert.deepEqual(saved.viewport, graph.viewport);

    const loaded = loadGraphFromStorage();
    assert.deepEqual(loaded, graph);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('saveGraphFile writes full node payloads to disk JSON', async () => {
  const graph = createGraph();
  const writes = [];
  const originalWindow = globalThis.window;

  globalThis.window = {
    async showSaveFilePicker() {
      return {
        async createWritable() {
          return {
            async write(payload) {
              writes.push(payload);
            },
            async close() {},
          };
        },
      };
    },
  };

  try {
    await saveGraphFile(graph);

    assert.equal(writes.length, 1);
    const payload = JSON.parse(writes[0]);
    assert.deepEqual(payload.nodes, graph.nodes);
    assert.deepEqual(payload.frames, graph.frames);
    assert.deepEqual(payload.edges, graph.edges);
    assert.deepEqual(payload.viewport, graph.viewport);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('graph validation and store import preserve explicit node geometry and metadata', () => {
  const graph = createGraph();

  assert.equal(validateGraphPayload(graph), true);

  const store = createStore(graph, null);
  assert.deepEqual(store.getState().nodes, graph.nodes);

  store.replaceGraph(graph);
  assert.deepEqual(store.getState().nodes, graph.nodes);
});
