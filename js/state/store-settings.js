import { sanitizeAppSettings } from '../utils/graph.js';

export function getInitialSettings(initialGraph, initialSettings) {
  return sanitizeAppSettings(initialSettings ?? initialGraph?.settings ?? null);
}

export function getResolvedSettings(currentSettings, partialSettings) {
  return sanitizeAppSettings({ ...currentSettings, ...partialSettings });
}

export function settingsChanged(currentSettings, nextSettings) {
  return Object.keys(nextSettings).some((key) => currentSettings[key] !== nextSettings[key]);
}
