import { validateGraphPayload } from '../utils/graph.js';

const GRAPH_FILE_PICKER_TYPES = [{
  description: 'Hypernode Graph JSON',
  accept: {
    'application/json': ['.json'],
  },
}];

export function supportsFileSystemAccess() {
  return typeof window !== 'undefined'
    && typeof window.showOpenFilePicker === 'function'
    && typeof window.showSaveFilePicker === 'function';
}

export async function openGraphFile() {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    excludeAcceptAllOption: true,
    types: GRAPH_FILE_PICKER_TYPES,
  });

  const file = await handle.getFile();
  const graph = await parseGraphFile(file);
  return { handle, graph };
}

export async function saveGraphFile(graph, handle = null) {
  const targetHandle = handle || await window.showSaveFilePicker({
    suggestedName: `hypernode-${new Date().toISOString().slice(0, 10)}.json`,
    excludeAcceptAllOption: true,
    types: GRAPH_FILE_PICKER_TYPES,
  });

  const payload = JSON.stringify({ nodes: graph.nodes, edges: graph.edges }, null, 2);
  const writable = await targetHandle.createWritable();
  await writable.write(payload);
  await writable.close();
  return targetHandle;
}

async function parseGraphFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!validateGraphPayload(parsed)) {
    throw new Error('Invalid graph file format.');
  }
  return parsed;
}
