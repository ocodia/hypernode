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
  width: 210,
  height: 80,
  minWidth: 160,
  minHeight: 40,
  title: "Untitled Node",
  borderWidth: 1,
  borderWidthMin: 1,
  borderWidthMax: 8,
  borderStyle: "solid",
};

export const FRAME_DEFAULTS = {
  width: 320,
  height: 200,
  minWidth: 200,
  minHeight: 140,
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
  name: "Untitled hypernode",
};

export const APP_SETTINGS_DEFAULTS = {
  uiThemePreset: "blueprint",
  enabledThemePresets: [...THEME_PRESET_IDS],
  uiRadiusPreset: "rounded",
  toolbarPosition: "top-left",
  toolbarOrientation: "horizontal",
  toastPosition: "bottom-right",
  metaPosition: "bottom-left",
  backgroundStyle: "dots",
  anchorsMode: "exact",
  arrowheads: "shown",
  arrowheadSizeStep: 0,
  nodeColorDefault: null,
};

export const EDGE_DEFAULTS = {
  strokeWidth: 2,
  strokeWidthMin: 1,
  strokeWidthMax: 8,
  strokeStyle: "solid",
  edgeType: "curved",
  colorKey: null,
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
