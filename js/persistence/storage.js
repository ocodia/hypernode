import {
  SETTINGS_STORAGE_KEY,
  STORAGE_KEY,
} from "../utils/constants.js";
import { sanitizeAppSettings, validateGraphPayload } from "../utils/graph.js";
import { serializeGraphDocument } from "./document.js";

const GRAPH_DB_NAME = "hypernode.graph";
const GRAPH_DB_VERSION = 1;
const GRAPH_STORE_NAME = "graphs";
const ASSET_STORE_NAME = "assets";
const CURRENT_GRAPH_KEY = "current";

export async function loadGraphFromStorage() {
  try {
    const db = await openGraphDatabase();
    if (!db) return null;

    const persisted = await getRecord(db, GRAPH_STORE_NAME, CURRENT_GRAPH_KEY);
    if (!isPersistedGraphRecord(persisted)) return null;

    const graph = await hydratePersistedGraphRecord(db, persisted);
    return validateGraphPayload(graph) ? graph : null;
  } catch {
    return null;
  }
}

export async function saveGraphToStorage(graph) {
  try {
    const db = await openGraphDatabase();
    if (!db) return false;

    const document = serializeGraphDocument(graph);
    const persisted = await createPersistedGraphRecord(document);
    await writePersistedGraphRecord(db, persisted);
    return true;
  } catch {
    return false;
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
      if (!db.objectStoreNames.contains(GRAPH_STORE_NAME)) {
        db.createObjectStore(GRAPH_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function hydratePersistedGraphRecord(db, persisted) {
  const nodes = await Promise.all(
    persisted.nodes.map(async (node) => {
      if (
        node?.kind !== "image" ||
        typeof node?.imageAssetId !== "string" ||
        !node.imageAssetId
      ) {
        return { ...node };
      }

      const asset = await getRecord(db, ASSET_STORE_NAME, node.imageAssetId);
      const imageData = asset?.blob ? await blobToDataUrl(asset.blob) : null;
      const hydratedNode = {
        ...node,
        ...(typeof imageData === "string" ? { imageData } : {}),
      };
      delete hydratedNode.imageAssetId;
      return hydratedNode;
    }),
  );

  return {
    name: persisted.name,
    nodes,
    frames: Array.isArray(persisted.frames) ? persisted.frames : [],
    edges: Array.isArray(persisted.edges) ? persisted.edges : [],
    viewport: persisted.viewport,
  };
}

async function createPersistedGraphRecord(graph) {
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
      const blob = await dataUrlToBlob(node.imageData);
      assetIds.add(imageAssetId);

      const nextNode = {
        ...node,
        imageAssetId,
        imageAsset: {
          id: imageAssetId,
          mimeType: blob.type || inferMimeTypeFromDataUrl(node.imageData),
          blob,
        },
      };
      delete nextNode.imageData;
      return nextNode;
    }),
  );

  return {
    name: graph?.name,
    nodes,
    frames: Array.isArray(graph?.frames) ? graph.frames : [],
    edges: Array.isArray(graph?.edges) ? graph.edges : [],
    viewport: graph?.viewport,
    assetIds,
  };
}

async function writePersistedGraphRecord(db, persisted) {
  const existingAssetIds = new Set(await getAllKeys(db, ASSET_STORE_NAME));
  const transaction = db.transaction(
    [GRAPH_STORE_NAME, ASSET_STORE_NAME],
    "readwrite",
  );
  const graphStore = transaction.objectStore(GRAPH_STORE_NAME);
  const assetStore = transaction.objectStore(ASSET_STORE_NAME);

  const storedNodes = persisted.nodes.map((node) => {
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

  graphStore.put(
    {
      name: persisted.name,
      nodes: storedNodes,
      frames: persisted.frames,
      edges: persisted.edges,
      viewport: persisted.viewport,
    },
    CURRENT_GRAPH_KEY,
  );

  for (const assetId of existingAssetIds) {
    if (!persisted.assetIds.has(assetId)) {
      assetStore.delete(assetId);
    }
  }

  await waitForTransaction(transaction);
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

function getAllKeys(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();
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

function isPersistedGraphRecord(value) {
  return (
    value &&
    typeof value.name === "string" &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    (value.frames === undefined || Array.isArray(value.frames))
  );
}

function buildNodeImageAssetId(nodeId) {
  return `node-image:${String(nodeId || "")}`;
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

export { STORAGE_KEY };
