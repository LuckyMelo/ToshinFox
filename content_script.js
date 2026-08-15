const url = window.location.href;

const DEFAULT_SETTINGS = {
  font: 'M PLUS Rounded 1c',
  debug_do_not_send_watch_log: false,
  features: {
    forceOpsttsNewTab: true,
    injectKosuNames: true
  },
  subtitle: {
    fontSize: 100,
    lineHeight: 130,
    highContrast: false
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

function injectScript(scriptName) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL(scriptName);
    script.onload = () => resolve(true);
    (document.head || document.documentElement).appendChild(script);
  });
}

function resolveStyleHref(stylePath) {
  return /^https?:\/\//i.test(stylePath) ? stylePath : browser.runtime.getURL(stylePath);
}

function injectStyleSheet(stylePath, fontName) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.href = resolveStyleHref(stylePath);
    link.rel = 'stylesheet';
    link.onload = () => resolve(true);
    (document.head || document.documentElement).appendChild(link);

    if (fontName) {
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        elements[i].style.fontFamily = `"${fontName}"`;
      }
    }
  });
}

function appendPlayerAssistStyle(settings) {
  if (!url.includes('https://pos2.toshin.com/VODPAS/')) {
    return;
  }

  const style = document.createElement('style');
  const fontSize = Math.max(70, Math.min(200, Number(settings.subtitle?.fontSize) || 100));
  const lineHeight = Math.max(100, Math.min(220, Number(settings.subtitle?.lineHeight) || 130));
  const contrastCss = settings.subtitle?.highContrast
    ? 'text-shadow: 0 0 4px #000, 0 0 8px #000; color: #fff !important; background: rgba(0,0,0,.45);'
    : '';

  style.textContent = `
    .shaka-text-container span {
      font-size: ${fontSize}% !important;
      line-height: ${lineHeight}% !important;
      ${contrastCss}
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}

function exposeSettingsToPage(settings) {
  document.documentElement.dataset.toshinfoxSettings = encodeURIComponent(JSON.stringify(settings));
}

async function redirectToLoginPage() {
  browser.runtime.sendMessage({
    title: 'セッション情報が破棄されたので再ログインしてください',
    msg: '東進学力POSでは個人情報保護の観点より、一定時間操作が無かった場合にセッション情報を破棄しています。'
  });
  window.location.href = 'https://pos.toshin.com/SSO1/SSOLogin/StudentLogin.aspx';
}

async function bootstrap() {
  await injectScript('content_interception.js');

  const storage = await browser.storage.sync.get(['settings', 'font', 'debug_do_not_send_watch_log']);
  const mergedSettings = deepMerge(DEFAULT_SETTINGS, storage.settings || {});
  if (!mergedSettings.font && storage.font) {
    mergedSettings.font = storage.font;
  }
  if (typeof storage.debug_do_not_send_watch_log === 'boolean') {
    mergedSettings.debug_do_not_send_watch_log = storage.debug_do_not_send_watch_log;
  }

  await injectStyleSheet(
    `https://fonts.googleapis.com/css?family=${encodeURIComponent(mergedSettings.font || DEFAULT_SETTINGS.font)}`,
    mergedSettings.font || DEFAULT_SETTINGS.font
  );

  exposeSettingsToPage(mergedSettings);
  appendPlayerAssistStyle(mergedSettings);

  if (url.toLowerCase().includes('https://pos.toshin.com/jkmr/student2/stdkobetsujukoyoyaku/kosuselect')) {
    if (mergedSettings.features?.injectKosuNames) {
      await injectScript('scripts/KosuSelect.js');
    }
  } else if (url.includes('https://pos2.toshin.com/VODPAS/')) {
    await injectScript('scripts/PlayerSelector.js');
  } else if (url.includes('https://pos.toshin.com/SSO1/SSOMenu/SessionError.html?aspxerrorpath=')) {
    await redirectToLoginPage();
  } else if (url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student')) {
    if (mergedSettings.features?.forceOpsttsNewTab) {
      await injectScript('scripts/OPSTTS_Student.js');
    }
  }
}

bootstrap().catch((error) => {
  console.error('[ToshinFox] content_script bootstrap failed:', error);
});
