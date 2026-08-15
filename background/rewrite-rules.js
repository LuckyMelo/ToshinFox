(function () {
  function escapeAttributeValue(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function rewriteTrainingResultWithFallback(str, state) {
    if (!str.includes('Explanation.aspx') || !state.KosokuMasterXMLData) {
      return str;
    }

    const result = str.match(/<a href="javascript:void\(window\.open\('Explanation\.aspx\?questionNo=\d{2,6}',''\)\)"><span>問題へ<\/span><\/a>/g);
    if (!result || !result.length) {
      return str;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(state.KosokuMasterXMLData, 'text/xml');
      for (let i = 0; i < result.length; i++) {
        const question = xmlDoc.getElementsByTagName('Question')[i];
        const textList = xmlDoc.getElementsByTagName('QuestionTextList')[i];
        if (!question || !textList) {
          continue;
        }

        const answerType = question.getElementsByTagName('AnswerType')[0]?.textContent;
        if (answerType !== '0') {
          continue;
        }

        let word = textList.getElementsByTagName('QuestionText')[0]?.textContent || '';
        if (!word) {
          continue;
        }

        if (word.includes('<span style = "text-decoration : overline">')) {
          const match = word.match(/>.+?<\/span>/g);
          if (!match || !match[0]) {
            continue;
          }
          word = match[0].replace('</span>', '').slice(1);
          const questionNumber = question.getElementsByTagName('QuestionNumber')[0]?.textContent;
          if (!questionNumber) {
            continue;
          }
          str = str.replace(result[i], `<a href="./Explanation.aspx?questionNo=${questionNumber}" target="_blank"><span>${word}</span></a>`);
        } else {
          str = str.replace(result[i], `<a href="https://www.ei-navi.jp/dictionary/content/${word}/#word_detail" target="_blank"><span>${word}</span></a>`);
        }
      }
    } catch (error) {
      console.error('[ToshinFox] Failed to parse training XML:', error);
    }

    return str;
  }

  function createResponseRewriteRules() {
    return [
      {
        name: 'player_selector_html_injection',
        test: ({ str }) => str.includes('A477C046-2D9B-40CF-94C0-427C9C99E580://nagase.com/openwith'),
        apply: ({ str, settings }) => {
          const match = str.match("href='.*3'");
          if (!match || !match[0]) {
            return str;
          }

          let d = match[0].replace("href='A477C046-2D9B-40CF-94C0-427C9C99E580://nagase.com/openwith", '');
          d = d.substring(1, d.length - 1);

          const shakaPlayerElementsScript = browser.runtime.getURL('./scripts/PlayerSelectorShakaElements.js');
          const serializedSettings = btoa(unescape(encodeURIComponent(JSON.stringify(settings || {}))));

          return (
            '<!DOCTYPE html><head><title>PlayerSelector</title>' +
            '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
            '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>' +
            '<link rel="stylesheet" type="text/css" href="https://ajax.googleapis.com/ajax/libs/shaka-player/3.2.0/controls.css">' +
            '<link rel="stylesheet" type="text/css" href="https://shaka-player-demo.appspot.com/dist/demo.css">' +
            '<script defer src="https://shaka-player-demo.appspot.com/node_modules/eme-encryption-scheme-polyfill/index.js"></script>' +
            '<script defer src="https://shaka-player-demo.appspot.com/node_modules/material-design-lite/dist/material.min.js"></script>' +
            '<script defer src="https://shaka-player-demo.appspot.com/node_modules/dialog-polyfill/dist/dialog-polyfill.js"></script>' +
            '<script src="https://ajax.googleapis.com/ajax/libs/shaka-player/3.2.0/shaka-player.ui.debug.js"></script>' +
            `<script defer src="${shakaPlayerElementsScript}"></script>` +
            '<script defer src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>' +
            '<script type="text/javascript" src="https://cdn.rawgit.com/ricmoo/aes-js/e27b99df/index.js"></script>' +
            '<style>body {width: 100vw; max-width:100vw; height: 56.25vw; max-height:100vh; background:black;} #video {width: auto; height: 100%;} .video-container {width: 100vw; max-width:100vw; height: 56.25vw; max-height:100vh;}</style>' +
            '</head><body>' +
            '<div id="error-display" class="hidden"><div id="error-display-close-button"><p>x</p></div><p id="error-display-message"></p><a id="error-display-link" href="#" target="_blank">エラーコードの詳細</a></div><main class="mdl-layout__content" id="main-div">' +
            '<div data-shaka-player-container class="video-container" data-shaka-player-cast-receiver-id="1BA79154">' +
            '<video data-shaka-player autoplay id="video" poster="https://i.ytimg.com/vi/I631zx0ahn0/maxresdefault.jpg"></video></div></main>' +
            `<input id="initData" type="hidden" value="${d}"/>` +
            `<input id="debug_do_not_send_watch_log" type="hidden" value="${settings?.debug_do_not_send_watch_log || false}"/>` +
            `<input id="toshinfox_settings" type="hidden" value="${escapeAttributeValue(serializedSettings)}"/>` +
            '</body></html>'
          );
        }
      },
      {
        name: 'stdkoza_movie_resize',
        test: ({ url }) => url.includes('/StdKozaJuko/Start'),
        apply: ({ str }) => str.replaceAll(
          '<div class="movie">',
          '<script>setInterval(function(){$(\'.movie2 iframe\').css(\'height\',  document.getElementById("ifViewer").clientWidth/16*9 + \'px\');},500);</script><div class="movie2">'
        )
      },
      {
        name: 'dashbord_user_agent_redirect',
        test: ({ url, str }) => url === 'https://pos.toshin.com/JKMR/Student2/StdDashBord/DashBord' && str.includes('navigator.userAgent'),
        apply: ({ str }) => str.replace('navigator.userAgent;', '"Android";\nfnRedirectSmartDevice2();')
      },
      {
        name: 'kks_charset_fix',
        test: ({ url }) => url.includes('https://pos.toshin.com/KKS/KKS1/Page/Design/KozaInfo.aspx?KozaCode='),
        apply: ({ str }) => str.replace('charset=shift_jis', 'charset=utf8')
      },
      {
        name: 'rbt_trainingpage_message',
        test: ({ url }) => url.includes('https://pos2.toshin.com/RBT2/RBT_Student/Js/training/TrainingPage.js'),
        apply: ({ str }) => str.replace('this._modalFrame.show("問題を作成中です・・・", "trainigForm");', 'this._modalFrame.show("問題を作成中だゾ！", trainigForm);')
      },
      {
        name: 'fast_master_turbo',
        test: ({ url, settings }) => settings?.features?.fastMasterTurbo && url.includes('https://pos2.toshin.com/RBT2/RBT_Student/Js/training/BkotTrainingProcess.js'),
        apply: ({ str }) => {
          let output = str;
          output = output.replace('BkotTrainingProcess.C_ANSWER_MODE_CHECK;', 'BkotTrainingProcess.C_ANSWER_MODE_CHECK; this.onAnswerCheck();');
          return output.replace(/this._waitTimer.informTimeout\(\);/g, 'if(this.getIsImmediate()){if(this._currentQuestion._result==0){this._waitTimer.setMS(50);}else{this._waitTimer.setMS(2000);} this._waitTimer.informTimeout();}');
        }
      },
      {
        name: 'capture_training_xml',
        test: ({ url }) => url.includes('https://pos2.toshin.com/RBT2/RBT_Student/WebHandlers/TrainingQuestionRequest.ashx?qn='),
        apply: ({ str, state }) => {
          state.KosokuMasterXMLData = str;
          return str;
        }
      },
      {
        name: 'training_result_link_embed',
        test: ({ url }) => url.includes('https://pos2.toshin.com/RBT2/RBT_Student/Page/Student/TrainingResult.aspx'),
        apply: ({ str, state }) => rewriteTrainingResultWithFallback(
          str.replace("if (typeof(oncontextmenu_protect) == 'function') {oncontextmenu_protect();}", ''),
          state
        )
      },
      {
        name: 'olt_checked_bugfix',
        test: ({ url }) => url === 'https://olt.toshin.com/OLT/Student4_R/Student/OALT_Test.aspx' || url.includes('https://olt.toshin.com/OLT/Student4_R/Student/OACT_Test.aspx'),
        apply: ({ str }) => str.replace('if (obj[i].checked == true) {', 'if (obj[i].parentElement.className=="checked") {')
      },
      {
        name: 'oalt_window_fix',
        test: ({ url }) => url.includes('https://olt.toshin.com/OLT/Student4_R/Student/OALT_OALTConfirmation.aspx'),
        apply: ({ str }) => str.replace("var winHandle = window.open(sTestQuery, 'fs', 'fullscreen=yes,menubar=no,status=no,toolbar=no,scrollbars=yes');", "var winHandle = window.open(sTestQuery, 'fs', 'fullscreen=no,menubar=yes,location=yes,status=yes,toolbar=yes,scrollbars=yes,resizable=yes');")
      },
      {
        name: 'oact_window_fix',
        test: ({ url }) => url.includes('https://olt.toshin.com/OLT/Student4_R/Student/OACT_OACTConfirmation.aspx'),
        apply: ({ str }) => str.replace("var winHandle = window.open(sTestQuery, 'fs', 'fullscreen=yes,menubar=no,location=0,status=no,toolbar=no,scrollbars=yes');", "var winHandle = window.open(sTestQuery, 'fs', 'fullscreen=no,menubar=yes,location=yes,status=yes,toolbar=yes,scrollbars=yes,resizable=yes');")
      },
      {
        name: 'opstts_enshurireki_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/EnshuRireki.js'),
        apply: ({ str }) => {
          let output = str.replace("window.open(url, '_blank', 'scrollbars=yes,resizable=yes');", "window.open(url, '_blank').focus();");
          return output.replace("window.open(this.getAttribute('data-button'), '_blank', 'top=0,left=0,width=' + screen.width + ',height=' + screen.height + ',scrollbars=yes,resizable=yes');", "window.open(this.getAttribute('data-button'), '_blank').focus();");
        }
      },
      {
        name: 'opstts_kekkashosai_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/KekkaShosai.js'),
        apply: ({ str }) => str.replace("window.open(url, '_blank', 'scrollbars=yes,resizable=yes');", "window.open(url, '_blank').focus();")
      },
      {
        name: 'opstts_zentairireki_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/ZentaiRireki.js'),
        apply: ({ str }) => str.replace(", 'top=0,left=0,width=1366,height=' + screen.height + ',scrollbars=yes,resizable=yes');", ').focus();')
      },
      {
        name: 'opstts_enshukaishi_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/EnshuKaishi.js'),
        apply: ({ str }) => {
          let output = str.replaceAll(", 'top=0,left=0,width=' + screen.width + ',height=' + screen.height + ',scrollbars=yes,resizable=yes');", ').focus();');
          return output.replace(", 'top=0,left=0,width=1024,height=' + screen.height + ',scrollbars=yes,resizable=yes');", ').focus();');
        }
      },
      {
        name: 'opstts_mondaiinsatsu_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/MondaiKaitoInsatsu.js'),
        apply: ({ str }) => str.replace(", 'scrollbars=yes,resizable=yes');", ').focus();')
      },
      {
        name: 'opstts_commonheader_new_tab',
        test: ({ url, settings }) => settings?.features?.forceOpsttsNewTab && url.includes('https://pos.toshin.com/OPSTTS/OPSTTS_Student/wwwroot/js/CommonHeader.js'),
        apply: ({ str }) => str.replace(", 'top=0,left=0,width=1024,height=' + screen.height + ',scrollbars=yes,resizable=yes');", ').focus();')
      },
      {
        name: 'fallback_player_post',
        test: () => true,
        apply: ({ str }) => str.replace(
          "onclick='playerready_window_open",
          "onload='document.fdata.method=\"post\";document.fdata.action=\"./PlayerSelector.aspx\";document.fdata.submit();'"
        )
      }
    ];
  }

  function applyPrimaryRewrite(context, diagnostics) {
    const rules = createResponseRewriteRules();
    let output = context.str;

    for (const rule of rules) {
      const nextContext = { ...context, str: output };
      if (!rule.test(nextContext)) {
        continue;
      }
      const nextOutput = rule.apply(nextContext);
      if (typeof nextOutput === 'string' && nextOutput !== output) {
        diagnostics.record(rule.name, context.url);
      }
      output = typeof nextOutput === 'string' ? nextOutput : output;
      if (rule.name !== 'capture_training_xml') {
        break;
      }
    }

    return output;
  }

  function applyCommonJsRewrite(context, diagnostics) {
    const shouldRemoveAlert = context.settings?.features?.removeRapidClickAlert;
    if (!shouldRemoveAlert) {
      return context.str;
    }

    const output = context.str.replace(/alert\("連続クリックはお控えください"\);/g, 'console.log("Popup was removed! hahaha")');
    if (output !== context.str) {
      diagnostics.record('remove_rapid_click_alert', context.url);
    }
    return output;
  }

  self.ToshinFoxRules = {
    applyPrimaryRewrite,
    applyCommonJsRewrite
  };
})();
