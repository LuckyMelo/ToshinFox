const url = window.location.href;

if (url.includes('https://pos2.toshin.com/VODPAS/')) {
  if (document.fdata !== undefined) {
    document.fdata.method = 'post';
    document.fdata.action = './PlayerSelector.aspx';
    document.fdata.target = '';
    document.fdata.submit();
  } else {
    const initData = document.getElementById('initData')?.value;
    const debug_do_not_send_watch_log = document.getElementById('debug_do_not_send_watch_log')?.value === 'true';

    document.addEventListener('shaka-ui-loaded', () => {
      initApp(initData, debug_do_not_send_watch_log);
    });
  }
}

function getPageSettings() {
  try {
    const raw = document.getElementById('toshinfox_settings')?.value || '{}';
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function ResizeBytesArray(validdtm, size) {
  const PK = 'NagaseDRMContensCrypt_' + validdtm;
  const var0 = [];
  for (let i = 0; i < 36; i++) {
    var0[i] = PK.substring(i, i + 1).charCodeAt();
  }
  let var1 = size;
  const var2 = [];
  for (let i = 0; i < var1; i++) {
    var2[i] = 0;
  }
  let var5 = 0;
  var1 = 0;
  while (var5 < var0.length) {
    const var4 = var1 + 1;
    var2[var1] = var2[var1] ^ var0[var5];
    var1 = var4 >= var2.length ? 0 : var4;
    var5++;
  }
  const r = [];
  for (let i = 0; i < size; i++) {
    r[i] = var2[i];
  }
  return r;
}

function decrypt(validdtm, d) {
  const key = ResizeBytesArray(validdtm, 32);
  const iv = ResizeBytesArray(validdtm, 16);
  const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
  const encryptedBytes = Uint8Array.from(atob(d), (c) => c.charCodeAt(0));
  const decryptedBytes = aesCbc.decrypt(encryptedBytes);
  return aesjs.utils.utf8.fromBytes(decryptedBytes).replace('\r', '').replace('\n', '').replace(/[\u{0000}-\u{001F}]/gu, '');
}

function initApp(url_param, debug_do_not_send_watch_log) {
  const settings = getPageSettings();

  const params = url_param.split(',');
  const param_list = {};
  for (let i = 0; i < params.length; i++) {
    param_list[params[i].split('=')[0]] = params[i].replace(params[i].split('=')[0] + '=', '');
  }

  const validdtm = param_list.validdtm;
  const SSO_TOKEN = param_list.SSO_TOKEN;
  const contentsinfo = decrypt(validdtm, param_list.contentsinfo);
  const url_2 = decrypt(validdtm, param_list.url_2).replace('WV/300', 'WV/800');

  const cParams = contentsinfo.split(',');
  const c_param_list = {};
  for (let i = 0; i < cParams.length; i++) {
    c_param_list[cParams[i].split('=')[0]] = cParams[i].substring(cParams[i].split('=')[0].length + 1);
  }
  c_param_list.title = decrypt(validdtm, c_param_list.title);

  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    initPlayer({
      ticket: param_list.ticket,
      manifestUri: url_2,
      param_list,
      SSO_TOKEN,
      validdtm,
      c_param_list,
      debug_do_not_send_watch_log,
      settings
    });
  } else {
    const message = 'Your browser is not supported!';
    const href = 'https://github.com/google/shaka-player#platform-and-browser-support-matrix';
    document.getElementById('error-display').className = '';
    document.getElementById('error-display-message').innerText = message;
    document.getElementById('error-display-link').href = href;
  }
}

function getLessonKey(cParam) {
  return `toshinfox:${cParam?.kozacd || 'unknown'}:${cParam?.kosuno || '0'}`;
}

function loadPlayerState(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { bookmarks: [], notes: [], speed: 1 };
  } catch (_error) {
    return { bookmarks: [], notes: [], speed: 1 };
  }
}

function savePlayerState(key, next) {
  localStorage.setItem(key, JSON.stringify(next));
}

function createPlayerNoticeContainer() {
  const box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.top = '12px';
  box.style.right = '12px';
  box.style.padding = '8px 10px';
  box.style.background = 'rgba(0,0,0,.75)';
  box.style.color = '#fff';
  box.style.fontSize = '12px';
  box.style.zIndex = '999999';
  box.style.borderRadius = '6px';
  box.hidden = true;
  document.body.appendChild(box);
  return box;
}

function showNotice(box, text) {
  box.textContent = text;
  box.hidden = false;
  clearTimeout(box.__timerId);
  box.__timerId = setTimeout(() => {
    box.hidden = true;
  }, 1800);
}

function applySubtitleAssist(settings) {
  const subtitle = settings?.subtitle || {};
  const style = document.createElement('style');
  const fontSize = Math.max(70, Math.min(200, Number(subtitle.fontSize) || 100));
  const lineHeight = Math.max(100, Math.min(220, Number(subtitle.lineHeight) || 130));
  const contrastCss = subtitle.highContrast
    ? 'text-shadow: 0 0 4px #000, 0 0 8px #000; color: #fff !important; background: rgba(0,0,0,.45);'
    : '';
  style.textContent = `.shaka-text-container span { font-size:${fontSize}% !important; line-height:${lineHeight}% !important; ${contrastCss}}`;
  document.head.appendChild(style);
}

function setupABRepeat(video, settings, notice) {
  if (!settings?.player?.enableABRepeat) {
    return {
      markA: () => {},
      markB: () => {},
      toggle: () => {}
    };
  }

  const state = { a: null, b: null, enabled: false };
  video.addEventListener('timeupdate', () => {
    if (!state.enabled || state.a == null || state.b == null) {
      return;
    }
    if (video.currentTime >= state.b) {
      video.currentTime = state.a;
    }
  });

  return {
    markA() {
      state.a = video.currentTime;
      showNotice(notice, `A点: ${state.a.toFixed(1)}s`);
    },
    markB() {
      state.b = video.currentTime;
      if (state.a != null && state.b < state.a) {
        const tmp = state.a;
        state.a = state.b;
        state.b = tmp;
      }
      showNotice(notice, `B点: ${state.b?.toFixed(1)}s`);
    },
    toggle() {
      state.enabled = !state.enabled && state.a != null && state.b != null;
      showNotice(notice, state.enabled ? 'A-Bリピート ON' : 'A-Bリピート OFF');
    }
  };
}

function setupShortcuts({ video, settings, cParam, notice }) {
  const lessonKey = getLessonKey(cParam);
  const persist = loadPlayerState(lessonKey);
  const presets = Array.isArray(settings?.player?.speedPresets) && settings.player.speedPresets.length
    ? settings.player.speedPresets
    : [1, 1.25, 1.5, 2];

  if (settings?.player?.rememberSpeed && Number.isFinite(persist.speed)) {
    video.playbackRate = persist.speed;
  }

  const abRepeat = setupABRepeat(video, settings, notice);

  function cycleRate(direction) {
    const sorted = [...presets].sort((a, b) => a - b);
    let idx = sorted.findIndex((v) => v >= video.playbackRate - 0.001 && v <= video.playbackRate + 0.001);
    if (idx === -1) {
      idx = sorted.findIndex((v) => v > video.playbackRate);
      if (idx === -1) {
        idx = 0;
      }
    }
    idx = (idx + direction + sorted.length) % sorted.length;
    video.playbackRate = sorted[idx];
    persist.speed = sorted[idx];
    savePlayerState(lessonKey, persist);
    showNotice(notice, `再生速度: x${sorted[idx]}`);
  }

  function setBookmark() {
    if (!settings?.player?.enableBookmarks) {
      return;
    }
    persist.bookmarks = persist.bookmarks || [];
    persist.bookmarks.push(Number(video.currentTime.toFixed(2)));
    persist.bookmarks = persist.bookmarks.slice(-20);
    savePlayerState(lessonKey, persist);
    showNotice(notice, `ブックマーク保存: ${video.currentTime.toFixed(1)}s`);
  }

  function setNote() {
    if (!settings?.player?.enableNotes) {
      return;
    }
    const content = prompt('この位置のメモを入力', '');
    if (!content) {
      return;
    }
    persist.notes = persist.notes || [];
    persist.notes.push({ at: Number(video.currentTime.toFixed(2)), text: content });
    persist.notes = persist.notes.slice(-30);
    savePlayerState(lessonKey, persist);
    showNotice(notice, 'メモを保存しました');
  }

  const shortcuts = settings?.shortcuts || {};
  document.addEventListener('keydown', (event) => {
    const key = event.key;
    const active = document.activeElement;
    if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) {
      return;
    }

    if (key === shortcuts.forwardKey) {
      video.currentTime += 5;
    } else if (key === shortcuts.backwardKey) {
      video.currentTime -= 10;
    } else if (key === shortcuts.speedUpKey) {
      cycleRate(1);
    } else if (key === shortcuts.speedDownKey) {
      cycleRate(-1);
    } else if (key === shortcuts.pipKey && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        video.requestPictureInPicture();
      }
    } else if (key === shortcuts.markAKey) {
      abRepeat.markA();
    } else if (key === shortcuts.markBKey) {
      abRepeat.markB();
    } else if (key === shortcuts.repeatToggleKey) {
      abRepeat.toggle();
    } else if (key === shortcuts.bookmarkKey) {
      setBookmark();
    } else if (key === shortcuts.noteKey) {
      setNote();
    } else {
      return;
    }
    event.preventDefault();
  });
}

function initPlayer({ ticket, manifestUri, param_list, SSO_TOKEN, validdtm, c_param_list, debug_do_not_send_watch_log, settings }) {
  const video = document.getElementById('video');
  const ui = video.ui;
  const controls = ui.getControls();
  const player = controls.getPlayer();

  player.configure({
    drm: {
      servers: {
        'com.widevine.alpha': 'https://drm.toshin.com/drmapi/wv/nagase?custom_data=' + ticket
      }
    }
  });

  createButtonForward();
  createButtonReplay();
  createButtonV10();
  createButtonV12();
  createButtonV15();
  createButtonV20();

  ui.configure({
    controlPanelElements: [
      'play_pause',
      'replay_10',
      'forward_5',
      'mute',
      'volume',
      'time_and_duration',
      'spacer',
      'x1.0',
      'x1.25',
      'x1.5',
      'x2.0',
      'picture_in_picture',
      'fullscreen',
      'overflow_menu'
    ],
    overflowMenuButtons: [
      'captions',
      'cast',
      'quality',
      'language',
      'picture_in_picture',
      'playback_rate',
      'airplay'
    ],
    seekBarColors: {
      base: 'rgba(255, 255, 255, 0.3)',
      buffered: 'rgba(128, 203, 196, 0.54)',
      played: 'rgb(128, 203, 196)'
    },
    volumeBarColors: {
      base: 'rgba(255, 255, 255, 0.54)',
      level: 'rgb(255, 255, 255)'
    },
    addBigPlayButton: false,
    castReceiverAppId: '1BA79154',
    clearBufferOnQualityChange: false,
    showUnbufferedStart: false,
    doubleClickForFullscreen: true,
    enableKeyboardPlaybackControls: true,
    enableFullscreenOnRotation: true,
    forceLandscapeOnFullscreen: false
  });

  const notice = createPlayerNoticeContainer();
  applySubtitleAssist(settings);
  setupShortcuts({ video, settings, cParam: c_param_list, notice });

  player.addEventListener('error', onErrorEvent);

  player.load(manifestUri).then(() => {
    if ('mediaSession' in navigator) {
      const title = c_param_list.title || '不明な講座名';
      const koza_number = c_param_list.kosuno ? `第${c_param_list.kosuno}講` : '不明な講数';
      const koza_code = c_param_list.kozacd || '不明な講座コード';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${title} (${koza_number})`,
        artist: '東進衛星予備校T-Pod君',
        album: `講座コード：${koza_code}`,
        artwork: [{ src: 'https://pos.toshin.com/SSO1/SSOMenu/IMAGES/webclip.png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => video.play());
      navigator.mediaSession.setActionHandler('pause', () => video.pause());
      navigator.mediaSession.setActionHandler('seekforward', () => (video.currentTime += 5));
      navigator.mediaSession.setActionHandler('nexttrack', () => (video.currentTime += 5));
      navigator.mediaSession.setActionHandler('seekbackward', () => (video.currentTime -= 10));
      navigator.mediaSession.setActionHandler('previoustrack', () => (video.currentTime -= 10));
    }

    if (!debug_do_not_send_watch_log) {
      sendRegistViewedContents(param_list, SSO_TOKEN, validdtm, c_param_list);
    }

    const spinner = document.getElementsByClassName('shaka-spinner-container')[0];
    if (spinner) {
      spinner.hidden = true;
    }
  }).catch(onError);
}

function sendRegistViewedContents(param_list, SSO_TOKEN, validdtm, c_param_list) {
  $.ajax({
    type: 'POST',
    url: 'https://pos2.toshin.com/DRM2/DRM25/Webservice/DRMWebService.asmx',
    dataType: 'xml',
    contentType: 'text/xml;charset=utf-8',
    beforeSend(xhr) {
      xhr.setRequestHeader('SOAPAction', 'http://pos.toshin.com/registViewedContents');
    },
    data: '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><registViewedContents xmlns="http://pos.toshin.com/" id="o0" c:root="1">' +
      `<contentsinfo i:type="d:string">${param_list.contentsinfo}</contentsinfo>` +
      `<SSO_TOKEN i:type="d:string">${SSO_TOKEN}</SSO_TOKEN>` +
      `<validdtm i:type="d:string">${validdtm}</validdtm>` +
      `<vodfilepath i:type="d:string">${c_param_list.vodfilepath}</vodfilepath></registViewedContents></v:Body></v:Envelope>`,
    error(xhr, _ajaxOptions, thrownError) {
      alert(`視聴履歴の送信に失敗 (status=${xhr.status})\n\n${thrownError}`);
    }
  });
}

function onErrorEvent(event) {
  onError(event.detail);
}

function onError(error) {
  document.getElementById('error-display').className = '';
  document.getElementById('error-display-message').innerText = `ERROR(${error.code}) : ${error.message}`;
  document.getElementById('error-display-link').href = `https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html#value:${error.code}`;
}
