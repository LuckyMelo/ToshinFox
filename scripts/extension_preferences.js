const DEFAULT_SETTINGS = {
  font: 'M PLUS Rounded 1c',
  debug_do_not_send_watch_log: false,
  features: {
    removeRapidClickAlert: true,
    forceOpsttsNewTab: true,
    fastMasterTurbo: true,
    rewriteUserAgent: true,
    injectKosuNames: true
  },
  player: {
    speedPresets: [1, 1.25, 1.5, 2],
    rememberSpeed: true,
    enableABRepeat: true,
    enableBookmarks: true,
    enableNotes: true
  },
  subtitle: {
    fontSize: 100,
    lineHeight: 130,
    highContrast: false
  },
  shortcuts: {
    forwardKey: 'ArrowRight',
    backwardKey: 'ArrowLeft',
    speedUpKey: ']',
    speedDownKey: '[',
    pipKey: 'p',
    markAKey: 'a',
    markBKey: 'b',
    repeatToggleKey: 'r',
    bookmarkKey: 'm',
    noteKey: 'n'
  }
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') {
    return structuredClone(base);
  }
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const nextVal = override[key];
    const baseVal = base[key];
    if (Array.isArray(baseVal)) {
      output[key] = Array.isArray(nextVal) ? nextVal : [...baseVal];
    } else if (baseVal && typeof baseVal === 'object') {
      output[key] = deepMerge(baseVal, nextVal);
    } else {
      output[key] = nextVal;
    }
  }
  return output;
}

function getEl(id) {
  return document.getElementById(id);
}

function getSettingsFromForm() {
  return {
    font: getEl('font').value,
    debug_do_not_send_watch_log: getEl('debug_do_not_send_watch_log').checked,
    features: {
      removeRapidClickAlert: getEl('feature_removeRapidClickAlert').checked,
      forceOpsttsNewTab: getEl('feature_forceOpsttsNewTab').checked,
      fastMasterTurbo: getEl('feature_fastMasterTurbo').checked,
      rewriteUserAgent: getEl('feature_rewriteUserAgent').checked,
      injectKosuNames: getEl('feature_injectKosuNames').checked
    },
    player: {
      speedPresets: getEl('player_speedPresets').value
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0.25 && v <= 4),
      rememberSpeed: getEl('player_rememberSpeed').checked,
      enableABRepeat: getEl('player_enableABRepeat').checked,
      enableBookmarks: getEl('player_enableBookmarks').checked,
      enableNotes: getEl('player_enableNotes').checked
    },
    subtitle: {
      fontSize: Number(getEl('subtitle_fontSize').value) || 100,
      lineHeight: Number(getEl('subtitle_lineHeight').value) || 130,
      highContrast: getEl('subtitle_highContrast').checked
    },
    shortcuts: {
      forwardKey: getEl('shortcut_forwardKey').value,
      backwardKey: getEl('shortcut_backwardKey').value,
      speedUpKey: getEl('shortcut_speedUpKey').value,
      speedDownKey: getEl('shortcut_speedDownKey').value,
      pipKey: getEl('shortcut_pipKey').value,
      markAKey: getEl('shortcut_markAKey').value,
      markBKey: getEl('shortcut_markBKey').value,
      repeatToggleKey: getEl('shortcut_repeatToggleKey').value,
      bookmarkKey: getEl('shortcut_bookmarkKey').value,
      noteKey: getEl('shortcut_noteKey').value
    }
  };
}

function applySettingsToForm(settings) {
  const merged = deepMerge(DEFAULT_SETTINGS, settings || {});

  getEl('font').value = merged.font;
  getEl('debug_do_not_send_watch_log').checked = !!merged.debug_do_not_send_watch_log;

  getEl('feature_removeRapidClickAlert').checked = !!merged.features.removeRapidClickAlert;
  getEl('feature_forceOpsttsNewTab').checked = !!merged.features.forceOpsttsNewTab;
  getEl('feature_fastMasterTurbo').checked = !!merged.features.fastMasterTurbo;
  getEl('feature_rewriteUserAgent').checked = !!merged.features.rewriteUserAgent;
  getEl('feature_injectKosuNames').checked = !!merged.features.injectKosuNames;

  getEl('player_speedPresets').value = merged.player.speedPresets.join(',');
  getEl('player_rememberSpeed').checked = !!merged.player.rememberSpeed;
  getEl('player_enableABRepeat').checked = !!merged.player.enableABRepeat;
  getEl('player_enableBookmarks').checked = !!merged.player.enableBookmarks;
  getEl('player_enableNotes').checked = !!merged.player.enableNotes;

  getEl('subtitle_fontSize').value = merged.subtitle.fontSize;
  getEl('subtitle_lineHeight').value = merged.subtitle.lineHeight;
  getEl('subtitle_highContrast').checked = !!merged.subtitle.highContrast;

  getEl('shortcut_forwardKey').value = merged.shortcuts.forwardKey;
  getEl('shortcut_backwardKey').value = merged.shortcuts.backwardKey;
  getEl('shortcut_speedUpKey').value = merged.shortcuts.speedUpKey;
  getEl('shortcut_speedDownKey').value = merged.shortcuts.speedDownKey;
  getEl('shortcut_pipKey').value = merged.shortcuts.pipKey;
  getEl('shortcut_markAKey').value = merged.shortcuts.markAKey;
  getEl('shortcut_markBKey').value = merged.shortcuts.markBKey;
  getEl('shortcut_repeatToggleKey').value = merged.shortcuts.repeatToggleKey;
  getEl('shortcut_bookmarkKey').value = merged.shortcuts.bookmarkKey;
  getEl('shortcut_noteKey').value = merged.shortcuts.noteKey;
}

async function refreshDiagnostics() {
  const result = await browser.runtime.sendMessage({ type: 'getDiagnostics' });
  const rules = result?.diagnostics?.rules || {};
  const keys = Object.keys(rules).sort();
  const output = keys.length
    ? keys.map((key) => `${key}: count=${rules[key].count} last=${rules[key].lastMatchedAt} url=${rules[key].lastUrl}`).join('\n')
    : 'No rewrite rule hits yet.';
  getEl('diagnostics_output').value = output;
}

async function restoreOptions() {
  const storage = await browser.storage.sync.get(['settings', 'font', 'debug_do_not_send_watch_log']);
  const merged = deepMerge(DEFAULT_SETTINGS, storage.settings || {});
  if (!merged.font && storage.font) {
    merged.font = storage.font;
  }
  if (typeof storage.debug_do_not_send_watch_log === 'boolean') {
    merged.debug_do_not_send_watch_log = storage.debug_do_not_send_watch_log;
  }

  applySettingsToForm(merged);
  await refreshDiagnostics();
}

async function saveOptions(e) {
  e.preventDefault();
  const settings = getSettingsFromForm();
  await browser.runtime.sendMessage({ type: 'saveSettings', settings });
  getEl('save_status').textContent = '保存しました。';
  setTimeout(() => {
    getEl('save_status').textContent = '';
  }, 1500);
}

async function resetDiagnostics() {
  await browser.runtime.sendMessage({ type: 'resetDiagnostics' });
  await refreshDiagnostics();
}

document.addEventListener('DOMContentLoaded', async () => {
  await restoreOptions();
  document.querySelector('form').addEventListener('submit', saveOptions);
  getEl('refresh_diagnostics').addEventListener('click', refreshDiagnostics);
  getEl('reset_diagnostics').addEventListener('click', resetDiagnostics);
});
