const kozaid = document.getElementById('LblKozaCode')?.innerText;

if (!kozaid) {
  console.warn('[ToshinFox] LblKozaCode not found.');
}

function normalizeWideText(value) {
  return (value || '')
    .replace(/[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[‐－―]/g, '-')
    .replace(/[～〜]/g, '~')
    .replace(/　/g, ' ');
}

function extractKozaMapWithDOM(html) {
  const map = {};
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('td[nowrap="nowrap"][align="Center"][valign="Middle"]');
    rows.forEach((td) => {
      const code = td.textContent?.replace(/ /g, '');
      const nameCell = td.nextElementSibling;
      if (code && nameCell) {
        map[code] = nameCell.textContent || '';
      }
    });
  } catch (error) {
    console.error('[ToshinFox] DOM parse failed, fallback to regex.', error);
  }
  return map;
}

function extractKozaMapFallback(html) {
  const map = {};
  const result = html.match(/<td nowrap="nowrap" align="Center" valign="Middle">.+?<\/td><td>.+?<\/td>/g);
  if (!result) {
    return map;
  }

  for (let i = 0; i < result.length; i++) {
    const kozainfo = result[i].substring(51, result[i].length - 5).split('</td><td>');
    const kozaNum = (kozainfo[0] || '').replace(/ /g, '');
    const kozaName = kozainfo[1] || '';
    if (kozaNum) {
      map[kozaNum] = kozaName;
    }
  }

  return map;
}

function applyKozaNames(kozaList) {
  const title2List = document.getElementsByClassName('tit_02');
  for (let i = 0; i < title2List.length; i++) {
    const rawCode = title2List[i].innerText.replace(/ /g, '');
    const name = kozaList[rawCode];
    if (!name) {
      continue;
    }
    const normalizedCode = normalizeWideText(title2List[i].innerText);
    const normalizedName = normalizeWideText(name);
    title2List[i].innerText = `${normalizedCode} - ${normalizedName}`;
  }
}

function handleKozaResponse(html) {
  const domMap = extractKozaMapWithDOM(html);
  const kozaList = Object.keys(domMap).length ? domMap : extractKozaMapFallback(html);
  applyKozaNames(kozaList);
}

if (kozaid) {
  $.ajax({
    url: `https://pos.toshin.com/KKS/KKS1/Page/Design/KozaInfo.aspx?KozaCode=${kozaid}&Refresh=1`,
    type: 'GET',
    statusCode: {
      200(data) {
        handleKozaResponse(data);
      },
      302(data) {
        handleKozaResponse(data.responseText || '');
      }
    }
  });
}
