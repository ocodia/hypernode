export function bindEdgeInteractions({ edgeOverlayGroup, edgesGroup }, handlers) {
  edgesGroup.addEventListener('click', handlers.onEdgeClick);
  edgeOverlayGroup.addEventListener('click', handlers.onEdgeClick);
  edgesGroup.addEventListener('pointerdown', handlers.onEdgePointerDown);
  edgeOverlayGroup.addEventListener('pointerdown', handlers.onEdgePointerDown);
}
