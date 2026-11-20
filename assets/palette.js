// palette.js — static-derived-doc 블루프린트의 `palette` 레이어 (open-color 1.9.1)
//
// 정본 핀: dashboard-lab ui-assets/records/open-color.md. 벤더 CSS 가 :root 에 --oc-* 130개를
// 선언하므로, 값을 코드에 복사하지 않고 **런타임에 계산된 스타일에서 읽는다** — dashboard-lab
// 렌더러가 렌더 시점에 CSS 를 파싱하는 것과 같은 규율의 no-build 판이다. 팔레트가 바뀌면
// 화면과 그림이 같이 바뀌고, 둘이 어긋날 자리가 없다.
(function (global) {
  'use strict';

  var root = document.documentElement;

  // '--oc-blue-5' 또는 'blue-5' 둘 다 받는다.
  function token(name) {
    var key = name.indexOf('--') === 0 ? name : '--oc-' + name;
    // Theme roles can change while the page is open; read the current value.
    return getComputedStyle(root).getPropertyValue(key).trim();
  }

  // 계열 이름 목록 → 그림용 색 배열. 벤더 CSS 가 없으면 빈 문자열이 나오므로,
  // 그때는 호출자가 chart 기본색을 쓰도록 undefined 를 남긴다.
  function series(names, shade) {
    return names.map(function (n) { return token(n + '-' + (shade || 5)) || undefined; });
  }

  global.ConfcalPalette = { token: token, series: series };
})(window);
