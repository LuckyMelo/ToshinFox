const url = window.location.href;

function readSettingsFromDataset() {
  try {
    const encoded = document.documentElement.dataset.toshinfoxSettings;
    return encoded ? JSON.parse(decodeURIComponent(encoded)) : {};
  } catch (_error) {
    return {};
  }
}

function forceOpenInNewTab() {
  const links = document.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    if (links[i].textContent === '戻る') {
      links[i].href = 'javascript:close();';
    } else if (
      links[i].href.includes('/OPSTTS/OPSTTS_Student/ZentaiRireki') ||
      links[i].href.includes('/OPSTTS/OPSTTS_Student/KozaTop') ||
      links[i].textContent === '取得講座一覧へ'
    ) {
      // no-op
    } else {
      links[i].target = '_blank';
    }
  }

  const forms = document.getElementsByTagName('form');
  for (let i = 0; i < forms.length; i++) {
    if (forms[i].action === 'https://pos.toshin.com/OPSTTS/OPSTTS_Student/EnshuKaishi') {
      forms[i].target = '_blank';
    }
  }

  const buttons = document.getElementsByTagName('button');
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].value && buttons[i].value.includes('/OPSTTS/OPSTTS_Student/KaitoYoshiInsatsu?EnshuSetId=')) {
      buttons[i].value = '/OPSTTS/OPSTTS_Student/Contents/GetAnswerSheetPdf?' + buttons[i].value.split('?')[1];
    }
  }
}

if (url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student')) {
  const settings = readSettingsFromDataset();
  if (settings?.features?.forceOpsttsNewTab !== false) {
    forceOpenInNewTab();
  }
}
