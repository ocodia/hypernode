import { validateGraphPayload } from '../utils/graph.js';

export function exportGraph(graph) {
  const payload = JSON.stringify({ nodes: graph.nodes, edges: graph.edges }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hypernode-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importGraphFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!validateGraphPayload(parsed)) {
    throw new Error('Invalid graph file format.');
  }
  return parsed;
}
