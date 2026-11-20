// icons.js — icon 레이어 (lucide-static 1.31.0)
//
// **생성물이다.** 손으로 고치지 말 것 — 정본은 아래 벤더 SVG 이고, 그 바이트는
// vendor/manifest.json 이 sha256 으로 고정한다. 여기 구운 이유는 lucide 가 전부
// stroke="currentColor" 라서 인라인해야 색이 CSS(테마)를 따르기 때문이고(<img> 로 걸면
// 검정 고정 — 레코드 constraint), fetch 는 file:// 에서 막히는 데다 이 블루프린트가
// transport 를 두지 않기 때문이다.
//
// 출처:
//   alarm-clock      vendor/lucide-static/1.31.0/icons/alarm-clock.svg  sha256 3d35e286a36ffd6d…
//   calendar-days    vendor/lucide-static/1.31.0/icons/calendar-days.svg  sha256 fa849bd235329e3a…
//   calendar         vendor/lucide-static/1.31.0/icons/calendar.svg  sha256 827e462e523ef7d8…
//   external-link    vendor/lucide-static/1.31.0/icons/external-link.svg  sha256 f2f3ad9cbe2abb82…
//   file-text        vendor/lucide-static/1.31.0/icons/file-text.svg  sha256 adfe1f1106b1fe68…
//   info             vendor/lucide-static/1.31.0/icons/info.svg  sha256 729ce712e693bea7…
//   map-pin          vendor/lucide-static/1.31.0/icons/map-pin.svg  sha256 6d45ed87075d5bfa…
//   map              vendor/lucide-static/1.31.0/icons/map.svg  sha256 2a8b7bdb7b1ded73…
//   mic              vendor/lucide-static/1.31.0/icons/mic.svg  sha256 a9e9d1f5f99465c2…
//   pin              vendor/lucide-static/1.31.0/icons/pin.svg  sha256 19b073f150d62659…
//   x                vendor/lucide-static/1.31.0/icons/x.svg  sha256 0177910ef40637b4…
(function (global) {
  "use strict";
  var SVG = {
  "alarm-clock": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-alarm-clock\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <circle cx=\"12\" cy=\"13\" r=\"8\" /> <path d=\"M12 9v4l2 2\" /> <path d=\"M5 3 2 6\" /> <path d=\"m22 6-3-3\" /> <path d=\"M6.38 18.7 4 21\" /> <path d=\"M17.64 18.67 20 21\" /> </svg>",
  "calendar-days": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-calendar-days\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M8 2v3\" /> <path d=\"M16 2v3\" /> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" /> <path d=\"M3 9h18\" /> <path d=\"M8 13h.01\" /> <path d=\"M12 13h.01\" /> <path d=\"M16 13h.01\" /> <path d=\"M8 17h.01\" /> <path d=\"M12 17h.01\" /> <path d=\"M16 17h.01\" /> </svg>",
  "calendar": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-calendar\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M8 2v3\" /> <path d=\"M16 2v3\" /> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" /> <path d=\"M3 9h18\" /> </svg>",
  "external-link": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-external-link\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M15 3h6v6\" /> <path d=\"M10 14 21 3\" /> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" /> </svg>",
  "file-text": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-file-text\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M10 9H8\" /> <path d=\"M16 13H8\" /> <path d=\"M16 17H8\" /> </svg>",
  "info": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-info\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 16v-4\" /> <path d=\"M12 8h.01\" /> </svg>",
  "map-pin": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-map-pin\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" /> </svg>",
  "map": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-map\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\" /> <path d=\"M15 5.764v15\" /> <path d=\"M9 3.236v15\" /> </svg>",
  "mic": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-mic\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M12 19v3\" /> <path d=\"M19 10v2a7 7 0 0 1-14 0v-2\" /> <rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\" /> </svg>",
  "pin": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-pin\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M12 17v5\" /> <path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z\" /> </svg>",
  "x": "<!-- @license lucide-static v1.31.0 - ISC --> <svg class=\"i lucide lucide-x\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" > <path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" /> </svg>"
  };
  // name → 인라인 <svg> 문자열. cls 는 크기·색을 CSS 로 주기 위한 클래스.
  function icon(name, cls) {
    var svg = SVG[name];
    if (!svg) return "";
    if (cls) svg = svg.replace('class="i ', 'class="i ' + cls + " ");
    return svg.replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
  }
  global.ConfcalIcon = icon;
  global.ConfcalIcon.names = Object.keys(SVG);
})(window);
