export function createMutationTools({ notify, pushHistory, syncAutoAnchorsForAllEdges }) {
  function applyStateChange(actionLabel, mutate, options = {}) {
    if (!options.skipHistory && actionLabel) {
      pushHistory(actionLabel);
    }
    mutate();
    if (!options.skipAnchorSync) {
      syncAutoAnchorsForAllEdges();
    }
    if (!options.skipNotify) {
      notify();
    }
  }

  return {
    applyStateChange,
  };
}
