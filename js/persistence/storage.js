import { STORAGE_KEY } from '../utils/constants.js';
import { validateGraphPayload } from '../utils/graph.js';

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
    settings: graph.settings,
    nodes: graph.nodes,
    frames: graph.frames,
    edges: graph.edges,
  });
  localStorage.setItem(STORAGE_KEY, payload);
}
