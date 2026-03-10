const THEME_PRESET_SEQUENCE = ['blueprint', 'fjord', 'slate', 'paper', 'ember', 'chalkboard'];

const THEME_PRESET_LABELS = {
  blueprint: 'Blueprint',
  fjord: 'Fjord',
  slate: 'Slate',
  paper: 'Paper',
  ember: 'Ember',
  chalkboard: 'Chalkboard',
};

const THEME_PRESET_ICONS = {
  blueprint: 'bi-moon-stars',
  fjord: 'bi-water',
  slate: 'bi-cloud-fog2',
  paper: 'bi-sun',
  ember: 'bi-brightness-alt-high',
  chalkboard: 'bi-circle-half',
};

export function getThemePresetSequence() {
  return THEME_PRESET_SEQUENCE;
}

export function getThemePresetPresentation(uiThemePreset) {
  return {
    icon: THEME_PRESET_ICONS[uiThemePreset] || THEME_PRESET_ICONS.blueprint,
    title: THEME_PRESET_LABELS[uiThemePreset] || THEME_PRESET_LABELS.blueprint,
  };
}
