import { SETTINGS_STORAGE_KEY, STORAGE_KEY } from '../utils/constants.js';
import { sanitizeAppSettings, validateGraphPayload } from '../utils/graph.js';

export function loadGraphFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!validateGraphPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGraphToStorage(graph) {
  const payload = JSON.stringify({
    name: graph.name,
    nodes: graph.nodes,
    frames: graph.frames,
    edges: graph.edges,
    viewport: graph.viewport,
  });
  localStorage.setItem(STORAGE_KEY, payload);
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
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeAppSettings(settings)));
}
