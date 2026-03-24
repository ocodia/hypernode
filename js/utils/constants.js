import { THEME_PRESET_IDS } from "../shared/themes.js";

export const STORAGE_KEY = "hypernode.graph.v2";
export const SETTINGS_STORAGE_KEY = "hypernode.settings.v1";
export const VIEWPORT_LIMITS = {
  minZoom: 0.35,
  maxZoom: 2.5,
  defaultZoom: 1,
  defaultPanX: 0,
  defaultPanY: 0,
};

export const NODE_DEFAULTS = {
  width: 216,
  height: 144,
  minWidth: 48,
  minHeight: 48,
  title: "Untitled Node",
  borderWidth: 1,
  borderWidthMin: 1,
  borderWidthMax: 8,
  borderStyle: "solid",
};

export const FRAME_DEFAULTS = {
  width: 336,
  height: 216,
  minWidth: 216,
  minHeight: 144,
  title: "Untitled Frame",
  borderWidth: 3,
  borderWidthMin: 1,
  borderWidthMax: 8,
  borderStyle: "solid",
};

export const IMAGE_NODE_DEFAULTS = {
  kind: "image",
  metaHeight: 64,
  minImageWidth: 120,
  minImageHeight: 90,
};

export const NODE_COLOR_KEYS = [
  "sage",
  "sky",
  "amber",
  "rose",
  "slate",
  "teal",
  "violet",
  "peach",
  "mint",
  "indigo",
];

export const GRAPH_DEFAULTS = {
  name: "Untitled",
};

export const APP_SETTINGS_DEFAULTS = {
  uiThemePreset: "tidepool",
  enabledThemePresets: [...THEME_PRESET_IDS],
  uiRadiusPreset: "soft",
  toolbarPosition: "top-left",
  toolbarOrientation: "horizontal",
  toastPosition: "bottom-right",
  metaPosition: "bottom-left",
  backgroundStyle: "dots",
  anchorsMode: "exact",
  arrowheads: "shown",
  arrowheadSizeStep: 0,
  nodeColorDefault: null,
  edgeTypeDefault: "curved",
  snapToGrid: true,
};

export const EDGE_DEFAULTS = {
  strokeWidth: 2,
  strokeWidthMin: 1,
  strokeWidthMax: 8,
  strokeStyle: "solid",
  edgeType: "curved",
  colorKey: null,
  label: "",
};

export const EDGE_STROKE_STYLES = ["solid", "dashed", "dotted"];
export const EDGE_TYPES = ["curved", "straight", "orthogonal"];

export const KEYBOARD_LINKED_NODE = {
  horizontalGap: 56,
  verticalOffset: 0,
  overlapPadding: 10,
  collisionStepY: 96,
  maxCollisionChecks: 10,
};

export const KEYBOARD_DIRECTIONAL_SELECTION = {
  axisEpsilon: 0.01,
  tieEpsilon: 0.01,
};
