import test from "node:test";
import assert from "node:assert/strict";

import { openGraphFile, saveGraphFile } from "../js/persistence/file.js";
import { serializeGraphDocument } from "../js/persistence/document.js";
import {
  loadAppSettingsFromStorage,
  loadGraphFromStorage,
  saveAppSettingsToStorage,
  saveGraphToStorage,
} from "../js/persistence/storage.js";
import { createStore } from "../js/state/store.js";
import { validateGraphPayload } from "../js/utils/graph.js";

function createGraph() {
  return {
    name: "Persistence Graph",
    nodes: [
      {
        id: "n-text",
        title: "Text node",
        description: "Body",
        kind: "text",
        x: 24,
        y: 48,
        width: 312,
        height: 168,
        frameId: "frame-1",
        colorKey: "sky",
        borderWidth: 3,
        borderStyle: "dashed",
      },
      {
        id: "n-image",
        title: "Image node",
        description: "Screenshot",
        kind: "image",
        x: 360,
        y: 120,
        width: 420,
        height: 300,
        colorKey: "mint",
        borderWidth: 2,
        borderStyle: "solid",
        imageData: "data:image/png;base64,aGVsbG8=",
        imageAspectRatio: 1.6,
      },
    ],
    frames: [
      {
        id: "frame-1",
        title: "Frame",
        description: "",
        x: 0,
        y: 0,
        width: 600,
        height: 400,
        borderWidth: 3,
        borderStyle: "solid",
        colorKey: "sage",
      },
    ],
    edges: [
      {
        id: "edge-1",
        from: "n-text",
        to: "n-image",
        fromAnchor: "right",
        toAnchor: "left",
        label: "links",
        strokeWidth: 4,
        strokeStyle: "dotted",
        edgeType: "straight",
        colorKey: "amber",
      },
    ],
    viewport: {
      panX: 100,
      panY: -40,
      zoom: 1.25,
    },
  };
}

test("serializeGraphDocument preserves full node payloads", () => {
  const graph = createGraph();

  assert.deepEqual(serializeGraphDocument(graph), graph);
});

test("saveGraphToStorage and loadGraphFromStorage round-trip text graphs through IndexedDB", async () => {
  const graph = createGraph();
  graph.nodes = [graph.nodes[0]];
  graph.edges = [];
  const fakeIndexedDb = createFakeIndexedDB();
  const originalIndexedDb = globalThis.indexedDB;

  globalThis.indexedDB = fakeIndexedDb;

  try {
    assert.equal(await saveGraphToStorage(graph), true);
    const loaded = await loadGraphFromStorage();
    assert.deepEqual(loaded, graph);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});

test("saveGraphToStorage and loadGraphFromStorage round-trip image graphs through IndexedDB blobs", async () => {
  const graph = createGraph();
  const fakeIndexedDb = createFakeIndexedDB();
  const originalIndexedDb = globalThis.indexedDB;

  globalThis.indexedDB = fakeIndexedDb;

  try {
    assert.equal(await saveGraphToStorage(graph), true);

    const dbState = fakeIndexedDb.__getDbState("hypernode.graph");
    assert.ok(dbState.stores.get("assets").records.has("node-image:n-image"));

    const loaded = await loadGraphFromStorage();
    assert.deepEqual(loaded, graph);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});

test("saveGraphToStorage deletes orphaned image assets", async () => {
  const graph = createGraph();
  const fakeIndexedDb = createFakeIndexedDB();
  const originalIndexedDb = globalThis.indexedDB;

  globalThis.indexedDB = fakeIndexedDb;

  try {
    assert.equal(await saveGraphToStorage(graph), true);

    const graphWithoutImage = {
      ...graph,
      nodes: [graph.nodes[0]],
      edges: [],
    };
    assert.equal(await saveGraphToStorage(graphWithoutImage), true);

    const dbState = fakeIndexedDb.__getDbState("hypernode.graph");
    assert.equal(
      dbState.stores.get("assets").records.has("node-image:n-image"),
      false,
    );
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});

test("saveAppSettingsToStorage and loadAppSettingsFromStorage still use localStorage", () => {
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
    saveAppSettingsToStorage({
      uiThemePreset: "ember",
      enabledThemePresets: ["ember", "tidepool"],
    });

    const loaded = loadAppSettingsFromStorage();
    assert.equal(loaded.uiThemePreset, "ember");
    assert.deepEqual(loaded.enabledThemePresets, ["ember", "tidepool"]);
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("saveGraphFile writes full node payloads to disk JSON", async () => {
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

test("openGraphFile accepts existing JSON payloads with inline imageData", async () => {
  const graph = createGraph();
  const originalWindow = globalThis.window;

  globalThis.window = {
    async showOpenFilePicker() {
      return [
        {
          async getFile() {
            return {
              async text() {
                return JSON.stringify(graph);
              },
            };
          },
        },
      ];
    },
  };

  try {
    const { graph: loaded } = await openGraphFile();
    assert.deepEqual(loaded, graph);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("graph validation and store import preserve explicit node geometry and metadata", () => {
  const graph = createGraph();

  assert.equal(validateGraphPayload(graph), true);

  const store = createStore(graph, null);
  assert.deepEqual(store.getState().nodes, graph.nodes);

  store.replaceGraph(graph);
  assert.deepEqual(store.getState().nodes, graph.nodes);
});

test("loadGraphFromStorage returns null when IndexedDB is unavailable", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  globalThis.indexedDB = undefined;

  try {
    assert.equal(await loadGraphFromStorage(), null);
    assert.equal(await saveGraphToStorage(createGraph()), false);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});

test("IndexedDB open failure and write failure do not throw uncaught errors", async () => {
  const originalIndexedDb = globalThis.indexedDB;

  try {
    globalThis.indexedDB = createFakeIndexedDB({ failOpen: true });
    assert.equal(await loadGraphFromStorage(), null);

    globalThis.indexedDB = createFakeIndexedDB({
      failPutInStore: "graphs",
    });
    assert.equal(await saveGraphToStorage(createGraph()), false);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});

function createFakeIndexedDB(options = {}) {
  const databases = new Map();

  return {
    open(name, version) {
      const request = createRequest();
      queueMicrotask(() => {
        if (options.failOpen) {
          request.error = new Error("open failed");
          request.dispatch("error");
          return;
        }

        let dbState = databases.get(name);
        const needsUpgrade = !dbState || dbState.version !== version;
        if (!dbState) {
          dbState = {
            version,
            stores: new Map(),
          };
          databases.set(name, dbState);
        } else {
          dbState.version = version;
        }

        const db = createDatabase(name, dbState, options);
        request.result = db;
        if (needsUpgrade) {
          request.dispatch("upgradeneeded");
        }
        request.dispatch("success");
      });
      return request;
    },
    __getDbState(name) {
      return databases.get(name);
    },
  };
}

function createDatabase(name, state, options) {
  return {
    name,
    objectStoreNames: {
      contains(storeName) {
        return state.stores.has(storeName);
      },
    },
    createObjectStore(storeName, config = {}) {
      if (!state.stores.has(storeName)) {
        state.stores.set(storeName, {
          keyPath: config.keyPath ?? null,
          records: new Map(),
        });
      }
      return createObjectStoreApi(state.stores.get(storeName), null, options);
    },
    transaction(storeNames, mode) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      void names;
      void mode;
      return createTransaction(state, options);
    },
  };
}

function createTransaction(state, options) {
  const listeners = new Map();
  let settled = false;
  let failed = false;
  let pendingOperations = 0;
  const transaction = {
    error: null,
    objectStore(storeName) {
      if (!state.stores.has(storeName)) {
        throw new Error(`Unknown store: ${storeName}`);
      }
      return createObjectStoreApi(
        state.stores.get(storeName),
        transaction,
        options,
      );
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
  };

  queueMicrotask(() => {
    transaction.__maybeComplete();
  });

  transaction.__fail = (error) => {
    if (failed || settled) return;
    failed = true;
    transaction.error = error;
    dispatchEvent(listeners, "error");
    dispatchEvent(listeners, "abort");
  };
  transaction.__queueOperation = () => {
    pendingOperations += 1;
  };
  transaction.__settleOperation = () => {
    pendingOperations = Math.max(0, pendingOperations - 1);
    transaction.__maybeComplete();
  };
  transaction.__maybeComplete = () => {
    if (failed || settled || pendingOperations > 0) return;
    settled = true;
    dispatchEvent(listeners, "complete");
  };

  return transaction;
}

function createObjectStoreApi(storeState, transaction, options) {
  return {
    get(key) {
      const request = createRequest();
      queueMicrotask(() => {
        request.result = cloneValue(storeState.records.get(key) ?? null);
        request.dispatch("success");
      });
      return request;
    },
    getAllKeys() {
      const request = createRequest();
      queueMicrotask(() => {
        request.result = [...storeState.records.keys()];
        request.dispatch("success");
      });
      return request;
    },
    put(value, key) {
      const request = createRequest();
      transaction?.__queueOperation();
      queueMicrotask(() => {
        if (options.failPutInStore && transaction && options.failPutInStore === inferStoreName(storeState)) {
          const error = new Error("put failed");
          request.error = error;
          request.dispatch("error");
          transaction.__fail(error);
          return;
        }
        const recordKey = storeState.keyPath
          ? value?.[storeState.keyPath]
          : key;
        storeState.records.set(recordKey, cloneValue(value));
        request.result = recordKey;
        request.dispatch("success");
        transaction?.__settleOperation();
      });
      return request;
    },
    delete(key) {
      const request = createRequest();
      transaction?.__queueOperation();
      queueMicrotask(() => {
        storeState.records.delete(key);
        request.dispatch("success");
        transaction?.__settleOperation();
      });
      return request;
    },
  };
}

function inferStoreName(targetStoreState) {
  if (targetStoreState.keyPath === "id") return "assets";
  return "graphs";
}

function createRequest() {
  const listeners = new Map();
  return {
    result: undefined,
    error: null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type) {
      dispatchEvent(listeners, type);
    },
  };
}

function dispatchEvent(listeners, type) {
  for (const listener of listeners.get(type) || []) {
    listener();
  }
}

function cloneValue(value) {
  if (value instanceof Blob) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
    );
  }
  return value;
}
