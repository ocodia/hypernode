import {
  ACTIVE_GRAPH_ID_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "../utils/constants.js";
import { serializeGraphDocument } from "./document.js";
import { sanitizeAppSettings, validateGraphPayload } from "../utils/graph.js";

const GRAPH_DB_NAME = "hypernode.documents";
const GRAPH_DB_VERSION = 1;
const DOCUMENT_STORE_NAME = "documents";
const ASSET_STORE_NAME = "assets";

export async function listStoredGraphs() {
  try {
    const db = await openGraphDatabase();
    if (!db) return [];

    const records = await getAllRecords(db, DOCUMENT_STORE_NAME);
    return records
      .filter(isPersistedDocumentRecord)
      .map(toStoredGraphSummary)
      .sort(compareStoredGraphSummaries);
  } catch {
    return [];
  }
}

export async function createStoredGraph(initialGraph = null) {
  try {
    const db = await openGraphDatabase();
    if (!db) return null;

    const graph = serializeGraphDocument(initialGraph || createBlankGraph());
    const documentId = createStoredGraphId();
    const timestamps = createDocumentTimestamps();
    const persisted = await createPersistedDocumentRecord(
      documentId,
      graph,
      timestamps,
    );

    await writePersistedDocumentRecord(db, persisted);
    return {
      id: documentId,
      graphSummary: toStoredGraphSummary(persisted.record),
    };
  } catch {
    return null;
  }
}

export async function loadStoredGraph(id) {
  try {
    if (typeof id !== "string" || !id) return null;

    const db = await openGraphDatabase();
    if (!db) return null;

    const record = await getRecord(db, DOCUMENT_STORE_NAME, id);
    if (!isPersistedDocumentRecord(record)) return null;

    const graph = await hydratePersistedDocumentRecord(db, record);
    if (!validateGraphPayload(graph)) return null;

    return {
      id,
      graph,
      graphSummary: toStoredGraphSummary(record),
    };
  } catch {
    return null;
  }
}

export async function saveStoredGraph(id, graph) {
  try {
    if (typeof id !== "string" || !id) return null;

    const db = await openGraphDatabase();
    if (!db) return null;

    const existing = await getRecord(db, DOCUMENT_STORE_NAME, id);
    const timestamps = createDocumentTimestamps(existing);
    const persisted = await createPersistedDocumentRecord(
      id,
      serializeGraphDocument(graph),
      timestamps,
    );

    await writePersistedDocumentRecord(db, persisted);
    return toStoredGraphSummary(persisted.record);
  } catch {
    return null;
  }
}

export async function deleteStoredGraph(id) {
  try {
    if (typeof id !== "string" || !id) return false;

    const db = await openGraphDatabase();
    if (!db) return false;

    const assetRecords = await getAllRecords(db, ASSET_STORE_NAME);
    const transaction = db.transaction(
      [DOCUMENT_STORE_NAME, ASSET_STORE_NAME],
      "readwrite",
    );
    const documentStore = transaction.objectStore(DOCUMENT_STORE_NAME);
    const assetStore = transaction.objectStore(ASSET_STORE_NAME);

    documentStore.delete(id);
    for (const assetRecord of assetRecords) {
      if (assetRecord?.documentId === id) {
        assetStore.delete(assetRecord.id);
      }
    }

    await waitForTransaction(transaction);
    return true;
  } catch {
    return false;
  }
}

export function getActiveGraphId() {
  try {
    const value = localStorage.getItem(ACTIVE_GRAPH_ID_STORAGE_KEY);
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

export function setActiveGraphId(id) {
  try {
    if (typeof id === "string" && id) {
      localStorage.setItem(ACTIVE_GRAPH_ID_STORAGE_KEY, id);
      return;
    }
    localStorage.removeItem(ACTIVE_GRAPH_ID_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadAppSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeAppSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveAppSettingsToStorage(settings) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(sanitizeAppSettings(settings)),
  );
}

export async function loadGraphFromStorage() {
  const activeId = getActiveGraphId();
  if (!activeId) return null;
  const loaded = await loadStoredGraph(activeId);
  return loaded?.graph ?? null;
}

export async function saveGraphToStorage(graph) {
  const activeId = getActiveGraphId();
  if (!activeId) return false;
  return Boolean(await saveStoredGraph(activeId, graph));
}

function createBlankGraph() {
  return {
    name: "Untitled",
    nodes: [],
    frames: [],
    edges: [],
  };
}

function createStoredGraphId() {
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `hypernode-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createDocumentTimestamps(existing = null) {
  const updatedAt = Date.now();
  const createdAt =
    Number.isFinite(existing?.createdAt) && existing.createdAt > 0
      ? existing.createdAt
      : updatedAt;
  return { createdAt, updatedAt };
}

function toStoredGraphSummary(record) {
  return {
    id: record.id,
    name: String(record.name || "Untitled"),
    createdAt: Number(record.createdAt) || 0,
    updatedAt: Number(record.updatedAt) || 0,
  };
}

function compareStoredGraphSummaries(a, b) {
  return (
    Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0) ||
    String(a?.name || "").localeCompare(String(b?.name || "")) ||
    String(a?.id || "").localeCompare(String(b?.id || ""))
  );
}

async function createPersistedDocumentRecord(documentId, graph, timestamps) {
  const assetIds = new Set();
  const nodes = await Promise.all(
    (Array.isArray(graph.nodes) ? graph.nodes : []).map(async (node) => {
      if (
        node?.kind !== "image" ||
        typeof node?.imageData !== "string" ||
        !node.imageData.startsWith("data:image/")
      ) {
        const nextNode = { ...node };
        delete nextNode.imageAssetId;
        return nextNode;
      }

      const imageAssetId = buildNodeImageAssetId(node.id);
      const storedAssetId = buildStoredAssetId(documentId, imageAssetId);
      const blob = await dataUrlToBlob(node.imageData);
      assetIds.add(storedAssetId);

      const nextNode = {
        ...node,
        imageAssetId,
        imageAsset: {
          id: storedAssetId,
          documentId,
          assetId: imageAssetId,
          mimeType: blob.type || inferMimeTypeFromDataUrl(node.imageData),
          blob,
        },
      };
      delete nextNode.imageData;
      return nextNode;
    }),
  );

  return {
    record: {
      id: documentId,
      name: graph.name,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
      nodes,
      frames: Array.isArray(graph.frames) ? graph.frames : [],
      edges: Array.isArray(graph.edges) ? graph.edges : [],
      viewport: graph.viewport,
    },
    assetIds,
  };
}

async function hydratePersistedDocumentRecord(db, record) {
  const nodes = await Promise.all(
    record.nodes.map(async (node) => {
      if (
        node?.kind !== "image" ||
        typeof node?.imageAssetId !== "string" ||
        !node.imageAssetId
      ) {
        return { ...node };
      }

      const assetRecord = await getRecord(
        db,
        ASSET_STORE_NAME,
        buildStoredAssetId(record.id, node.imageAssetId),
      );
      const imageData = assetRecord?.blob
        ? await blobToDataUrl(assetRecord.blob)
        : null;
      const hydratedNode = {
        ...node,
        ...(typeof imageData === "string" ? { imageData } : {}),
      };
      delete hydratedNode.imageAssetId;
      return hydratedNode;
    }),
  );

  return {
    name: record.name,
    nodes,
    frames: Array.isArray(record.frames) ? record.frames : [],
    edges: Array.isArray(record.edges) ? record.edges : [],
    viewport: record.viewport,
  };
}

async function writePersistedDocumentRecord(db, persisted) {
  const assetRecords = await getAllRecords(db, ASSET_STORE_NAME);
  const transaction = db.transaction(
    [DOCUMENT_STORE_NAME, ASSET_STORE_NAME],
    "readwrite",
  );
  const documentStore = transaction.objectStore(DOCUMENT_STORE_NAME);
  const assetStore = transaction.objectStore(ASSET_STORE_NAME);

  const storedNodes = persisted.record.nodes.map((node) => {
    if (
      node?.kind === "image" &&
      typeof node?.imageAssetId === "string" &&
      node.imageAsset
    ) {
      assetStore.put(node.imageAsset);
      const storedNode = { ...node };
      delete storedNode.imageAsset;
      return storedNode;
    }
    return { ...node };
  });

  documentStore.put({
    id: persisted.record.id,
    name: persisted.record.name,
    createdAt: persisted.record.createdAt,
    updatedAt: persisted.record.updatedAt,
    nodes: storedNodes,
    frames: persisted.record.frames,
    edges: persisted.record.edges,
    viewport: persisted.record.viewport,
  });

  for (const assetRecord of assetRecords) {
    if (
      assetRecord?.documentId === persisted.record.id &&
      !persisted.assetIds.has(assetRecord.id)
    ) {
      assetStore.delete(assetRecord.id);
    }
  }

  await waitForTransaction(transaction);
}

function openGraphDatabase() {
  if (
    typeof globalThis.indexedDB === "undefined" ||
    typeof globalThis.indexedDB.open !== "function"
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(GRAPH_DB_NAME, GRAPH_DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENT_STORE_NAME)) {
        db.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function getRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.addEventListener("success", () => resolve(request.result ?? null));
    request.addEventListener("error", () => reject(request.error));
  });
}

function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.addEventListener("success", () =>
      resolve(Array.isArray(request.result) ? request.result : []),
    );
    request.addEventListener("error", () => reject(request.error));
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted")),
    );
    transaction.addEventListener("error", () =>
      reject(transaction.error || new Error("IndexedDB transaction failed")),
    );
  });
}

function isPersistedDocumentRecord(value) {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Number.isFinite(value.createdAt) &&
    Number.isFinite(value.updatedAt) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    (value.frames === undefined || Array.isArray(value.frames))
  );
}

function buildNodeImageAssetId(nodeId) {
  return `node-image:${String(nodeId || "")}`;
}

function buildStoredAssetId(documentId, assetId) {
  return `${documentId}::${assetId}`;
}

async function dataUrlToBlob(dataUrl) {
  const [header, data] = String(dataUrl).split(",", 2);
  const mimeType = inferMimeTypeFromDataUrl(header);
  const isBase64 = /;base64$/i.test(header);
  if (isBase64) {
    const bytes = decodeBase64ToUint8Array(data || "");
    return new globalThis.Blob([bytes], { type: mimeType });
  }
  return new globalThis.Blob([decodeURIComponent(data || "")], {
    type: mimeType,
  });
}

function inferMimeTypeFromDataUrl(dataUrl) {
  const match = /^data:([^;,]+)[;,]/i.exec(String(dataUrl));
  return match?.[1] || "application/octet-stream";
}

async function blobToDataUrl(blob) {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Invalid blob data"));
      });
      reader.addEventListener("error", () =>
        reject(reader.error || new Error("Failed to read blob")),
      );
      reader.readAsDataURL(blob);
    });
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = encodeUint8ArrayToBase64(new Uint8Array(arrayBuffer));
  return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
}

function decodeBase64ToUint8Array(base64) {
  if (typeof globalThis.atob === "function") {
    const decoded = globalThis.atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  }

  if (typeof globalThis.Buffer !== "undefined") {
    return Uint8Array.from(globalThis.Buffer.from(base64, "base64"));
  }

  throw new Error("Base64 decoding is unavailable");
}

function encodeUint8ArrayToBase64(bytes) {
  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(bytes).toString("base64");
  }

  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return globalThis.btoa(binary);
  }

  throw new Error("Base64 encoding is unavailable");
}
