export function serializeGraphDocument(graph) {
  return {
    name: graph?.name,
    nodes: Array.isArray(graph?.nodes) ? graph.nodes : [],
    frames: Array.isArray(graph?.frames) ? graph.frames : [],
    edges: Array.isArray(graph?.edges) ? graph.edges : [],
    viewport: graph?.viewport,
  };
}

export function stringifyGraphDocument(graph, space = 0) {
  return JSON.stringify(serializeGraphDocument(graph), null, space);
}
