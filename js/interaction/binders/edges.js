export function bindEdgeInteractions({ edgeOverlayGroup, edgesGroup }, handlers) {
  edgesGroup.addEventListener('click', handlers.onEdgeClick);
  edgesGroup.addEventListener('dblclick', handlers.onEdgeDoubleClick);
  edgeOverlayGroup.addEventListener('click', handlers.onEdgeClick);
  edgeOverlayGroup.addEventListener('dblclick', handlers.onEdgeDoubleClick);
  edgesGroup.addEventListener('pointerdown', handlers.onEdgePointerDown);
  edgeOverlayGroup.addEventListener('pointerdown', handlers.onEdgePointerDown);
}
