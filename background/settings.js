(function () {
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

  function normalizeSettings(raw) {
    const merged = deepMerge(DEFAULT_SETTINGS, raw || {});
    merged.player.speedPresets = (Array.isArray(merged.player.speedPresets) ? merged.player.speedPresets : DEFAULT_SETTINGS.player.speedPresets)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0.25 && v <= 4)
      .slice(0, 6);
    if (!merged.player.speedPresets.length) {
      merged.player.speedPresets = [...DEFAULT_SETTINGS.player.speedPresets];
    }
    merged.subtitle.fontSize = Math.max(70, Math.min(200, Number(merged.subtitle.fontSize) || DEFAULT_SETTINGS.subtitle.fontSize));
    merged.subtitle.lineHeight = Math.max(100, Math.min(220, Number(merged.subtitle.lineHeight) || DEFAULT_SETTINGS.subtitle.lineHeight));
    return merged;
  }

  async function loadSettings() {
    const fromSync = await browser.storage.sync.get('settings');
    return normalizeSettings(fromSync.settings);
  }

  async function saveSettings(settings) {
    const normalized = normalizeSettings(settings);
    await browser.storage.sync.set({
      settings: normalized,
      font: normalized.font,
      debug_do_not_send_watch_log: normalized.debug_do_not_send_watch_log
    });
    return normalized;
  }

  self.ToshinFoxSettings = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings,
    normalizeSettings
  };
})();
