// Source: /ui-assets/tokens/theme-toggle.js (fleet canon v3), copied 2026-10-16.
/* Fleet theme toggle -- ui-assets/tokens/theme-toggle.js (token canon v3).
 *
 * Default is the viewer's SYSTEM setting. A button cycles 시스템 -> 밝게 -> 어둡게
 * and the choice is remembered per browser (localStorage "confcal-theme"; "system"
 * stores nothing). Boards inline this file in <head>, BEFORE their stylesheet,
 * so the stored choice lands before first paint (no light flash on a dark pick).
 *
 *   <html lang="ko">                         canon.css boards: data-theme is written
 *   <html data-theme-attr="data-bs-theme">   bootstrap boards: the resolved light|dark
 *                                            is written to that attribute instead
 *   <button type="button" class="theme-toggle" data-theme-toggle></button>
 *
 * For data-theme, "system" REMOVES the attribute and canon.css's
 * prefers-color-scheme block decides. An attribute that cannot express "system"
 * (data-bs-theme) gets the resolved value and follows OS changes live.
 * Storage that throws (private mode, blocked site data) degrades to an
 * in-memory choice for the page's lifetime. No dependencies, no network.
 */
(function () {
  var KEY = "confcal-theme";
  var root = document.documentElement;
  var attr = root.getAttribute("data-theme-attr") || "data-theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var LABEL = { system: "시스템", light: "밝게", dark: "어둡게" };
  var ICON = { system: "◐", light: "☀", dark: "☾" };
  var NEXT = { system: "light", light: "dark", dark: "system" };

  function stored() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch (e) { return "system"; }
  }
  var pref = stored();

  function save(v) {
    try {
      if (v === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, v);
    } catch (e) { /* in-memory only */ }
  }

  function label() {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.textContent = ICON[pref] + " " + LABEL[pref];
      b.setAttribute("aria-label", "화면 밝기: " + LABEL[pref] + " — 누르면 " + LABEL[NEXT[pref]]);
      b.title = "화면 밝기: " + LABEL[pref] + " (시스템 → 밝게 → 어둡게)";
    }
  }

  function apply() {
    var resolved = pref === "system" ? (mq && mq.matches ? "dark" : "light") : pref;
    if (attr === "data-theme") {
      if (pref === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", pref);
    } else {
      root.setAttribute(attr, resolved);
    }
    root.setAttribute("data-theme-pref", pref);
    label();
  }

  apply();
  if (mq) {
    var follow = function () { if (pref === "system") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", follow);
    else if (mq.addListener) mq.addListener(follow);
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-theme-toggle]") : null;
    if (!b) return;
    pref = NEXT[pref];
    save(pref);
    apply();
  });
  // Buttons rendered after this script ran (body, htmx swaps) get their label.
  document.addEventListener("DOMContentLoaded", label);
  document.addEventListener("htmx:afterSwap", label);
})();
