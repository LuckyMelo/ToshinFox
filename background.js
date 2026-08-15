importScripts('background/settings.js', 'background/diagnostics.js', 'background/rewrite-rules.js');

const state = {
  KosokuMasterXMLData: '',
  settings: ToshinFoxSettings.normalizeSettings(),
  debug_do_not_send_watch_log: false
};

function log(...args) {
  if (state.settings?.debug_do_not_send_watch_log) {
    console.log(...args);
  }
}

async function refreshSettings() {
  try {
    const settings = await ToshinFoxSettings.loadSettings();
    state.settings = settings;
    state.debug_do_not_send_watch_log = settings.debug_do_not_send_watch_log;
  } catch (error) {
    console.error('[ToshinFox] Failed to load settings:', error);
    state.settings = ToshinFoxSettings.normalizeSettings();
    state.debug_do_not_send_watch_log = state.settings.debug_do_not_send_watch_log;
  }
}

refreshSettings();

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') {
    return;
  }
  if (changes.settings || changes.debug_do_not_send_watch_log || changes.font) {
    refreshSettings();
  }
});

function removeRedirectLocationHeader(responseHeaders) {
  if (!Array.isArray(responseHeaders)) {
    return responseHeaders;
  }
  return responseHeaders.filter((header) => header.name.toLowerCase() !== 'location');
}

function decodeChunks(chunks) {
  const decoder = new TextDecoder('utf-8');
  if (chunks.length === 1) {
    return decoder.decode(chunks[0]);
  }
  let str = '';
  for (let i = 0; i < chunks.length; i++) {
    str += decoder.decode(chunks[i], { stream: i < chunks.length - 1 });
  }
  return str;
}

function rewriteWithFilter(details, rewriteFunction) {
  const filter = browser.webRequest.filterResponseData(details.requestId);
  const encoder = new TextEncoder();
  const chunks = [];

  filter.ondata = (event) => {
    chunks.push(event.data);
  };

  filter.onstop = () => {
    let str = decodeChunks(chunks);
    try {
      str = rewriteFunction(str);
    } catch (error) {
      console.error('[ToshinFox] Rewrite error:', error);
    }
    filter.write(encoder.encode(str));
    filter.close();
  };
}

function onPrimaryHeadersReceived(details) {
  log('[ToshinFox] Loading:', details.url);

  if (details.url.endsWith('PlayerSelector.aspx')) {
    refreshSettings();
  }

  if (
    state.settings?.features?.injectKosuNames &&
    details.url.includes('/Page/Design/KozaInfo.aspx?KozaCode=')
  ) {
    return { responseHeaders: removeRedirectLocationHeader(details.responseHeaders) };
  }

  rewriteWithFilter(details, (str) =>
    ToshinFoxRules.applyPrimaryRewrite(
      {
        url: details.url,
        str,
        details,
        settings: state.settings,
        state
      },
      ToshinFoxDiagnostics
    )
  );

  return {};
}

function onCommonJsHeadersReceived(details) {
  log('[ToshinFox] Loading common js:', details.url);

  rewriteWithFilter(details, (str) =>
    ToshinFoxRules.applyCommonJsRewrite(
      {
        url: details.url,
        str,
        details,
        settings: state.settings,
        state
      },
      ToshinFoxDiagnostics
    )
  );

  return {};
}

function rewriteUserAgentHeader(e) {
  if (!state.settings?.features?.rewriteUserAgent) {
    return { requestHeaders: e.requestHeaders };
  }

  e.requestHeaders.forEach((header) => {
    if (header.name.toLowerCase() === 'user-agent') {
      header.value = 'Mozilla/5.0 (Linux; Android 12.0; Pixel 5 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.86 Mobile Safari/537.36';
    }
  });
  ToshinFoxDiagnostics.record('rewrite_user_agent', e.url);
  return { requestHeaders: e.requestHeaders };
}

browser.webRequest.onHeadersReceived.addListener(
  onPrimaryHeadersReceived,
  {
    urls: [
      'https://pos2.toshin.com/VODPAS/PlayerSelector5old/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/PlayerSelector5/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/PlayerSelector5pc/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/STG/PlayerSelector5/PlayerSelector.aspx*',
      'https://pos2.toshin.com/openwith*',
      'https://pos.toshin.com/JKMR/Student2/StdDashBord/DashBord',
      'https://test.toshin.com/TEST_2012/JKM/Student/StdKozaJuko/Start',
      'https://pos.toshin.com/JKMR/Student2/StdKozaJuko/Start',
      'https://pos2.toshin.com/RBT2/RBT_Student/Js/training/TrainingPage.js?*',
      'https://pos2.toshin.com/RBT2/RBT_Student/Js/training/BkotTrainingProcess.js*',
      'https://pos2.toshin.com/RBT2/RBT_Student/WebHandlers/TrainingQuestionRequest.ashx?qn=*',
      'https://pos2.toshin.com/RBT2/RBT_Student/Page/Student/TrainingResult.aspx',
      'https://pos.toshin.com/KKS/KKS1/Page/Design/KozaInfo.aspx?KozaCode=*',
      'https://pos.toshin.com/KKS/KKS2/Page/Design/KozaInfo.aspx?KozaCode=*',
      'https://pos.toshin.com/KKS/KKS3/Page/Design/KozaInfo.aspx?KozaCode=*',
      'https://olt.toshin.com/OLT/Student4_R/Student/OALT_Test.aspx',
      'https://olt.toshin.com/OLT/Student4_R/Student/OACT_Test.aspx*',
      'https://olt.toshin.com/OLT/Student4_R/Student/OALT_OALTConfirmation.aspx*',
      'https://olt.toshin.com/OLT/Student4_R/Student/OACT_OACTConfirmation.aspx*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/EnshuRireki.js*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/KekkaShosai.js*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/ZentaiRireki.js*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/EnshuKaishi.js*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/MondaiKaitoInsatsu.js*',
      'https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/CommonHeader.js*'
    ]
  },
  ['blocking', 'responseHeaders']
);

browser.webRequest.onHeadersReceived.addListener(
  onCommonJsHeadersReceived,
  {
    urls: [
      'https://pos.toshin.com/JKMR/Student1/js/Common.js',
      'https://pos.toshin.com/JKMR/Student2/js/Common.js',
      'https://test.toshin.com/TEST_2012/JKM/Student/js/Common.js'
    ]
  },
  ['blocking', 'responseHeaders']
);

browser.webRequest.onBeforeSendHeaders.addListener(
  rewriteUserAgentHeader,
  {
    urls: [
      'https://pos2.toshin.com/VODPAS/PlayerSelector5old/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/PlayerSelector5/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/PlayerSelector5pc/PlayerSelector.aspx*',
      'https://pos2.toshin.com/VODPAS/STG/PlayerSelector5/PlayerSelector.aspx*'
    ]
  },
  ['blocking', 'requestHeaders']
);

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === 'getDiagnostics') {
    return Promise.resolve({
      diagnostics: ToshinFoxDiagnostics.getSnapshot(),
      settings: state.settings
    });
  }

  if (message?.type === 'resetDiagnostics') {
    ToshinFoxDiagnostics.reset();
    return Promise.resolve({ ok: true });
  }

  if (message?.type === 'saveSettings' && message?.settings) {
    return ToshinFoxSettings.saveSettings(message.settings).then((saved) => ({ ok: true, settings: saved }));
  }

  if (message?.type === 'getSettings') {
    return Promise.resolve({ settings: state.settings });
  }

  if (!message || typeof message !== 'object') {
    return Promise.resolve({ ok: false });
  }

  const notificationTitle = message.title || 'ToshinFox';
  const notificationMessage = message.msg || message.message || '通知を受信しました。';

  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('./icons/ic_main.png'),
    title: notificationTitle,
    message: notificationMessage
  });

  return Promise.resolve({ ok: true });
});
