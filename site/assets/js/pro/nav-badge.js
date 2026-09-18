/*
  Shared "Demandes" badge — batch B23. Every pro page's sidebar (desktop)
  and bottom-nav (mobile) carries a [data-badge="demandes"] span in the
  same spot R01/R12 draw the count pill; this fills both copies from
  S.requestsToValidate().length and keeps them live via S.subscribe(), the
  same pattern demo-bar.js uses for its own cliente/pro links.
*/
(function () {
  var S = window.ENIOL_STORE;

  function render() {
    var n = S.requestsToValidate().length;
    document.querySelectorAll('[data-badge="demandes"]').forEach(function (el) {
      el.hidden = n === 0;
      el.textContent = n;
    });
  }

  function init() {
    render();
    S.subscribe(render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
