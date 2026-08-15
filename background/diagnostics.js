(function () {
  const hits = {};

  function record(ruleName, url) {
    const current = hits[ruleName] || { count: 0, lastUrl: '', lastMatchedAt: '' };
    current.count += 1;
    current.lastUrl = url;
    current.lastMatchedAt = new Date().toISOString();
    hits[ruleName] = current;
  }

  function reset() {
    Object.keys(hits).forEach((key) => delete hits[key]);
  }

  function getSnapshot() {
    return {
      generatedAt: new Date().toISOString(),
      rules: hits
    };
  }

  self.ToshinFoxDiagnostics = {
    record,
    reset,
    getSnapshot
  };
})();
