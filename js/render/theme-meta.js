import { THEME_PRESETS } from '../shared/themes.js';

export const THEME_META = Object.fromEntries(
  THEME_PRESETS.map((theme) => [theme.id, { mode: theme.mode, color: theme.color }]),
);
