import { sanitizeAppSettings } from '../utils/graph.js';

export function getInitialSettings(initialGraph, initialSettings) {
  return sanitizeAppSettings(initialSettings ?? initialGraph?.settings ?? null);
}

export function getResolvedSettings(currentSettings, partialSettings) {
  return sanitizeAppSettings({ ...currentSettings, ...partialSettings });
}

export function settingsChanged(currentSettings, nextSettings) {
  return Object.keys(nextSettings).some((key) => {
    const currentValue = currentSettings[key];
    const nextValue = nextSettings[key];
    if (Array.isArray(currentValue) || Array.isArray(nextValue)) {
      return !areSettingArraysEqual(currentValue, nextValue);
    }
    return currentValue !== nextValue;
  });
}

function areSettingArraysEqual(currentValue, nextValue) {
  if (!Array.isArray(currentValue) || !Array.isArray(nextValue)) {
    return currentValue === nextValue;
  }
  if (currentValue.length !== nextValue.length) return false;
  return currentValue.every((value, index) => value === nextValue[index]);
}
