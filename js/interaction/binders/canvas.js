export function bindCanvasInteractions({ canvas, workspace }, handlers) {
  canvas.addEventListener('dblclick', handlers.onCanvasDoubleClick);
  canvas.addEventListener('pointerdown', handlers.onCanvasPointerDown);
  canvas.addEventListener('pointermove', handlers.onCanvasPointerMove);
  canvas.addEventListener('pointerup', handlers.onCanvasPointerUp);
  canvas.addEventListener('pointercancel', handlers.onCanvasPointerCancel);
  canvas.addEventListener('lostpointercapture', handlers.onCanvasLostPointerCapture);
  workspace.addEventListener('wheel', handlers.onWorkspaceWheel, { passive: false });
}
