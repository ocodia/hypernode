import {
  getThemePresetById,
  getThemePresetSequence as getSharedThemePresetSequence,
  THEME_PRESETS,
} from '../shared/themes.js';

export function getThemePresetSequence(enabledThemeIds = null) {
  return getSharedThemePresetSequence(enabledThemeIds);
}

export function getThemePresetDefinitions() {
  return THEME_PRESETS.map(({ id, label, icon, mode, color }) => ({
    id,
    label,
    icon,
    mode,
    color,
  }));
}

export function getThemePresetPresentation(uiThemePreset) {
  const theme = getThemePresetById(uiThemePreset);
  return {
    icon: theme.icon,
    title: theme.label,
  };
}
