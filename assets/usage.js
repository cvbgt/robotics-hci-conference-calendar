// The generated sheet is fetched only on the first visit to the usage tab.
(() => {
  const tabs = [...document.querySelectorAll('.board-tabs [role="tab"]')];
  const panel = document.getElementById('usage-panel');
  const status = document.getElementById('usage-status');
  const content = document.getElementById('usage-content');
  const retry = document.getElementById('usage-retry');
  let loaded = false;
  let loading = false;

  async function loadSheet() {
    if (loaded || loading) return;
    retry.hidden = true;
    if (location.protocol === 'file:') {
      content.innerHTML = window.OFFLINE_USAGE || '<p>README-offline.md와 AGENTS.md에서 사용법과 갱신 방법을 확인하세요.</p>';
      loaded = true;
      status.textContent = '';
      return;
    }
    loading = true;
    content.setAttribute('aria-busy', 'true');
    status.textContent = '쓰는 법을 불러오는 중…';
    try {
      const response = await fetch('assets/cheatsheet.html');
      if (!response.ok) throw new Error('sheet unavailable');
      content.innerHTML = await response.text();
      loaded = true;
      status.textContent = '';
    } catch {
      status.textContent = '쓰는 법을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.';
      retry.hidden = false;
    } finally {
      content.removeAttribute('aria-busy');
      loading = false;
    }
  }

  function selectTab(tab) {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    }
    document.querySelector('.site-footer').hidden = !panel.hidden;
    const url = new URL(location.href);
    url.hash = panel.hidden ? '' : 'usage';
    history.replaceState(null, '', url);
    if (!panel.hidden) loadSheet();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = tabs[1 - index];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      next.focus();
      selectTab(next);
    });
  });
  retry.addEventListener('click', loadSheet);
  if (location.hash === '#usage') selectTab(tabs[1]);
})();
