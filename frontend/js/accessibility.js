// Accessibility settings: text size, line spacing, high contrast, language.
// Settings are saved in this browser, so they stay on every page.
(function () {
  var KEY = "bloom_a11y";
  var SIZES = [0.875, 1, 1.15, 1.3];          // 87.5%, 100%, 115%, 130% of normal
  var DEFAULTS = { size: 1, wide: false, contrast: false };   // size = position in SIZES

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      return Object.assign({}, DEFAULTS, saved || {});
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var settings = load();

  // Apply the settings to the page
  function apply() {
    var root = document.documentElement;
    root.style.fontSize = (SIZES[settings.size] * 100) + "%";
    root.classList.toggle("a11y-wide", settings.wide);
    root.classList.toggle("a11y-contrast", settings.contrast);
  }
  apply();   // runs straight away, before the page draws, so there is no flicker

  function build() {
    var I18N = window.bloomI18n;   // the language engine (may be missing on a page)

    // 1. The gear button
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "a11y-btn";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Settings");
    btn.setAttribute("data-i18n-aria", "a11y.open");
    btn.setAttribute("data-i18n-title", "a11y.open");
    btn.title = "Settings";
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">settings</span>';

    var header = document.querySelector(".app-header");
    if (header) { header.appendChild(btn); }
    else { btn.classList.add("a11y-floating"); document.body.appendChild(btn); }

    // 2. The panel (English words are the default; the language engine swaps them)
    var panel = document.createElement("div");
    panel.className = "a11y-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Settings");
    panel.setAttribute("data-i18n-aria", "a11y.open");
    panel.hidden = true;
    panel.innerHTML =
      '<h2 class="a11y-main-title" data-i18n="a11y.settings">Settings</h2>' +

      // Section 1: Language (its own section, not part of accessibility)
      (I18N ?
      '<section class="a11y-section">' +
        '<h3 data-i18n="a11y.language">Language</h3>' +
        '<div class="a11y-group">' +
          '<button type="button" id="a11yLangEn">English</button>' +
          '<button type="button" id="a11yLangSw">Kiswahili</button>' +
        '</div>' +
      '</section>' : '') +

      // Section 2: Accessibility
      '<section class="a11y-section">' +
        '<h3 data-i18n="a11y.title">Accessibility</h3>' +
        '<div class="a11y-row"><span data-i18n="a11y.textSize">Text size</span>' +
          '<div class="a11y-group">' +
            '<button type="button" id="a11ySmaller" aria-label="Make text smaller" data-i18n-aria="a11y.smaller">A&minus;</button>' +
            '<button type="button" id="a11yNormal" aria-label="Normal text size" data-i18n-aria="a11y.normalSize">A</button>' +
            '<button type="button" id="a11yLarger" aria-label="Make text larger" data-i18n-aria="a11y.larger">A+</button>' +
          '</div><div class="a11y-size-label" id="a11ySizeLabel" aria-live="polite"></div></div>' +
        '<div class="a11y-row"><span data-i18n="a11y.spacing">Line spacing</span>' +
          '<div class="a11y-group">' +
            '<button type="button" id="a11yLinesNormal" data-i18n="a11y.normal">Normal</button>' +
            '<button type="button" id="a11yLinesWide" data-i18n="a11y.wider">Wider</button>' +
          '</div></div>' +
        '<div class="a11y-row"><span data-i18n="a11y.contrast">High contrast</span>' +
          '<div class="a11y-group">' +
            '<button type="button" id="a11yContrastOff" data-i18n="a11y.off">Off</button>' +
            '<button type="button" id="a11yContrastOn" data-i18n="a11y.on">On</button>' +
          '</div></div>' +
        // This button only resets the accessibility options, so it sits inside this section
        '<button type="button" class="a11y-reset" id="a11yReset" data-i18n="a11y.reset">Reset accessibility</button>' +
      '</section>';
    document.body.appendChild(panel);

    function $(id) { return document.getElementById(id); }

    // Update what the panel shows
    function refresh() {
      $("a11ySizeLabel").textContent = Math.round(SIZES[settings.size] * 100) + "%";
      $("a11ySmaller").disabled = settings.size === 0;
      $("a11yLarger").disabled = settings.size === SIZES.length - 1;
      $("a11yNormal").setAttribute("aria-pressed", settings.size === 1);
      $("a11yLinesNormal").setAttribute("aria-pressed", !settings.wide);
      $("a11yLinesWide").setAttribute("aria-pressed", settings.wide);
      $("a11yContrastOff").setAttribute("aria-pressed", !settings.contrast);
      $("a11yContrastOn").setAttribute("aria-pressed", settings.contrast);
      if (I18N) {
        $("a11yLangEn").setAttribute("aria-pressed", I18N.getLang() === "en");
        $("a11yLangSw").setAttribute("aria-pressed", I18N.getLang() === "sw");
      }
    }
    function change(patch) {
      Object.assign(settings, patch);
      save(settings); apply(); refresh();
    }

    $("a11ySmaller").onclick = function () { change({ size: Math.max(0, settings.size - 1) }); };
    $("a11yLarger").onclick  = function () { change({ size: Math.min(SIZES.length - 1, settings.size + 1) }); };
    $("a11yNormal").onclick  = function () { change({ size: 1 }); };
    $("a11yLinesNormal").onclick = function () { change({ wide: false }); };
    $("a11yLinesWide").onclick   = function () { change({ wide: true }); };
    $("a11yContrastOff").onclick = function () { change({ contrast: false }); };
    $("a11yContrastOn").onclick  = function () { change({ contrast: true }); };
    $("a11yReset").onclick = function () {
      change(Object.assign({}, DEFAULTS));     // resets size, spacing and contrast (the language is not changed)
    };
    if (I18N) {
      $("a11yLangEn").onclick = function () { I18N.setLang("en"); refresh(); };
      $("a11yLangSw").onclick = function () { I18N.setLang("sw"); refresh(); };
      I18N.apply();      // fill in the panel words in the current language
    }

    // Open and close the panel
    function toggle(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open);
      if (open) { $("a11yNormal").focus(); }
    }
    btn.onclick = function () { toggle(panel.hidden); };
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { toggle(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) { toggle(false); }
    });

    refresh();
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", build); }
  else { build(); }
})();