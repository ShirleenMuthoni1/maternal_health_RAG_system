// Language engine. Loads AFTER translations.js and BEFORE the other scripts.
// - Remembers the chosen language in this browser (English by default).
// - Fills in every element that has a data-i18n... attribute.
// - Gives other scripts a function t("key") that returns the text in the current language.
(function () {
  var KEY = "bloom_lang";
  var SUPPORTED = ["en", "sw"];

  function savedLang() {
    try {
      var l = localStorage.getItem(KEY);
      return SUPPORTED.indexOf(l) >= 0 ? l : "en";
    } catch (e) { return "en"; }
  }

  var lang = savedLang();
  document.documentElement.lang = lang;

  // Look up a word. If it is missing in Kiswahili, fall back to English, then to the key itself.
  function t(key) {
    var all = window.TRANSLATIONS || {};
    return (all[lang] && all[lang][key]) || (all.en && all.en[key]) || key;
  }

  // Fill in the page
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
  }

  function setLang(newLang) {
    if (SUPPORTED.indexOf(newLang) < 0) return;
    lang = newLang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply();
    // Tell other scripts (for example dashboard.js) so they can redraw their own text
    document.dispatchEvent(new CustomEvent("bloom:langchange", { detail: lang }));
  }

  window.t = t;
  window.bloomI18n = { t: t, apply: apply, setLang: setLang, getLang: function () { return lang; } };

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", apply); }
  else { apply(); }
})();