export function isAppleDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgentDataPlatform = typeof navigator.userAgentData?.platform === 'string'
    ? navigator.userAgentData.platform
    : '';
  const platform = typeof navigator.platform === 'string' ? navigator.platform : '';
  const userAgent = typeof navigator.userAgent === 'string' ? navigator.userAgent : '';
  const combined = `${userAgentDataPlatform} ${platform} ${userAgent}`;

  if (/(iPhone|iPad|iPod|Mac)/i.test(combined)) {
    return true;
  }

  return platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1;
}

export function formatShortcutLabel(shortcut, options = {}) {
  const compact = options.compact === true;
  const appleDevice = options.appleDevice ?? isAppleDevice();

  let formatted = String(shortcut ?? '');
  formatted = formatted.replace(/Ctrl\/Cmd/g, appleDevice ? 'Cmd' : 'Ctrl');

  if (compact) {
    formatted = formatted.replace(/\s*\+\s*/g, '+');
  } else {
    formatted = formatted.replace(/\s*\+\s*/g, ' + ');
  }

  return formatted;
}
