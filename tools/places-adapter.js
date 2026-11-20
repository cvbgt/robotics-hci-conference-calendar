  const byToken = Object.fromEntries(Object.entries(aliases).map(([key, value]) => [key.toLowerCase(), value]));
  function tokens(location) {
    return String(location || '').replace(/\([^)]*\)/g, '').split(/[,·/]/)
      .map(token => token.trim()).filter(token => /[a-z]/i.test(token) && !/[가-힣]/.test(token));
  }
  function korean(location) {
    return tokens(location).map(token => byToken[token.toLowerCase()] || '').join(' ');
  }
  global.PLACES = { aliases: Object.freeze(byToken), tokens, korean };
})(window);
