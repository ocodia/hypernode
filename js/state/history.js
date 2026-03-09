import { cloneSelection } from '../shared/selection.js';

export function createHistoryManager(state) {
  function snapshot() {
    return {
      name: state.name,
      settings: structuredClone(state.settings),
      nodes: structuredClone(state.nodes),
      frames: structuredClone(state.frames),
      edges: structuredClone(state.edges),
      selection: cloneSelection(state.selection),
    };
  }

  function pushHistory(actionLabel) {
    state.history.past.push({ label: actionLabel, data: snapshot() });
    if (state.history.past.length > 100) {
      state.history.past.shift();
    }
    state.history.future = [];
  }

  return {
    snapshot,
    pushHistory,
  };
}
