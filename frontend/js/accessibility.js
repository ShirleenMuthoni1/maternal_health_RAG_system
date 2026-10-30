// Accessibility settings: text size, line spacing, high contrast.
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
    // 1. The button
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "a11y-btn";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Accessibility settings");
    btn.title = "Accessibility settings";
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">settings</span>';
 
    var header = document.querySelector(".app-header");
    if (header) { header.appendChild(btn); }
    else { btn.classList.add("a11y-floating"); document.body.appendChild(btn); }
 
    // 2. The panel
    var panel = document.createElement("div");
    panel.className = "a11y-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Accessibility settings");
    panel.hidden = true;
    panel.innerHTML =
      '<h2>Accessibility</h2>' +
      '<div class="a11y-row"><span>Text size</span>' +
        '<div class="a11y-group">' +
          '<button type="button" id="a11ySmaller" aria-label="Make text smaller">A&minus;</button>' +
          '<button type="button" id="a11yNormal" aria-label="Normal text size">A</button>' +
          '<button type="button" id="a11yLarger" aria-label="Make text larger">A+</button>' +
        '</div><div class="a11y-size-label" id="a11ySizeLabel" aria-live="polite"></div></div>' +
      '<div class="a11y-row"><span>Line spacing</span>' +
        '<div class="a11y-group">' +
          '<button type="button" id="a11yLinesNormal">Normal</button>' +
          '<button type="button" id="a11yLinesWide">Wider</button>' +
        '</div></div>' +
      '<div class="a11y-row"><span>High contrast</span>' +
        '<div class="a11y-group">' +
          '<button type="button" id="a11yContrastOff">Off</button>' +
          '<button type="button" id="a11yContrastOn">On</button>' +
        '</div></div>' +
      '<button type="button" class="a11y-reset" id="a11yReset">Reset to default</button>';
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
    $("a11yReset").onclick = function () { change(Object.assign({}, DEFAULTS)); };
 
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