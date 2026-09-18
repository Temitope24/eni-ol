/*
  Shared motion — page-to-page slides plus the small in-page animations
  (text roll, height swap, step push, sliding toggle thumb, progress fill).

  Asked for explicitly by the client review ("animations need to be well
  thought of"): nothing may look like a reload, content drops down / closes
  up instead of fading, pages slide in from the right and back out.
  Where that goes past PDC §5's 6-animation budget, the explicit request
  wins — but PDC §5's own bans still hold (no animated counters, no scroll
  effects), and prefers-reduced-motion turns every one of these off.

  Loaded in <head> on every public page: `pagereveal` has to be listening
  before the incoming page's first frame.

  Page-slide direction:
  - browser back / forward: history index, from navigation.activation
  - links marked data-nav="back" (← arrows) and ENIOL_MOTION.back() (✕):
    a sessionStorage flag set just before leaving
  - anything else: forward — the new page slides in from the right
*/
window.ENIOL_MOTION = (function () {
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function reduced() { return mq.matches; }

  var EASE = "cubic-bezier(.2,.7,.3,1)";      // PDC §5 standard curve
  var EASE_OUT = "cubic-bezier(.4,0,1,1)";    // PDC §5 exit curve
  var EASE_PUSH = "cubic-bezier(.32,.72,0,1)"; // long, soft settle for full-width slides
  var DIR_KEY = "eniol.navDir";

  // ---------------------------------------------------------------------
  // Page-to-page slides (cross-document View Transitions, see motion.css)
  // ---------------------------------------------------------------------
  function setDir(dir) { try { sessionStorage.setItem(DIR_KEY, dir); } catch (e) {} }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[data-nav='back']") : null;
    if (a) setDir("back");
  }, true);

  window.addEventListener("pagereveal", function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    var stored = null;
    try { stored = sessionStorage.getItem(DIR_KEY); sessionStorage.removeItem(DIR_KEY); } catch (err) {}
    var act = window.navigation && window.navigation.activation;
    if (reduced() || (act && act.navigationType === "reload")) { vt.skipTransition(); return; }
    var dir = stored || "forward";
    if (act && act.navigationType === "traverse" && act.from && act.entry) {
      dir = act.from.index > act.entry.index ? "back" : "forward";
    }
    vt.types.add(dir);
  });

  /** Leave "backwards": a real history.back() when the previous page is
      this site (keeps its scroll position), else a push that slides as back. */
  function back(fallbackHref) {
    var ref = document.referrer;
    if (ref && ref.indexOf(location.origin + "/") === 0 && ref.split("#")[0] !== location.href.split("#")[0] && history.length > 1) {
      history.back();
      return;
    }
    setDir("back");
    location.href = fallbackHref;
  }

  // ---------------------------------------------------------------------
  // Roll: the old value slides up and out, the new one slides up into place
  // (prices, the sticky-bar date, the step label, summary values).
  // Not a counter — PDC §5 bans animated counters.
  // ---------------------------------------------------------------------
  function roll(el, html, opts) {
    if (!el) return;
    opts = opts || {};
    if (el.__roll === undefined) el.__roll = el.innerHTML;
    if (el.__roll === html) return;
    var prev = el.__roll;
    el.__roll = html;
    if (opts.instant || reduced() || !el.getClientRects().length) { el.innerHTML = html; return; }
    var dy = opts.dir === "down" ? -1 : 1;
    el.classList.add("roll");
    if (getComputedStyle(el).display === "inline") el.classList.add("roll--inline");
    el.innerHTML = "<span class=\"roll__new\">" + html + "</span><span class=\"roll__old\" aria-hidden=\"true\">" + prev + "</span>";
    var nw = el.firstChild, od = el.lastChild;
    od.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(" + (-dy * 90) + "%)", opacity: 0 }],
      { duration: 220, easing: EASE_OUT, fill: "forwards" });
    var a = nw.animate([{ transform: "translateY(" + (dy * 90) + "%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: 380, delay: 60, easing: EASE, fill: "backwards" });
    a.onfinish = function () { if (el.__roll === html) el.innerHTML = html; };
  }

  // ---------------------------------------------------------------------
  // Collapse: height 0 ↔ content height (CSS grid-rows, see motion.css).
  // Closed panels are inert, so their radios aren't reachable by Tab.
  // ---------------------------------------------------------------------
  function setOpen(el, open) {
    if (!el) return;
    el.classList.toggle("is-open", !!open);
    if (open) el.removeAttribute("inert"); else el.setAttribute("inert", "");
  }

  // ---------------------------------------------------------------------
  // Swap: replace a container's content with the height animating from
  // the old size to the new one; the old content leaves (fade + drift)
  // while the new content arrives from the given direction.
  //   dir: "up" (default), "forward" (from the right), "back" (from the left)
  // `mutate` must render the new content into the (now empty) container.
  // ---------------------------------------------------------------------
  function swap(container, mutate, opts) {
    opts = opts || {};
    if (!container || reduced() || !container.getClientRects().length) { container.innerHTML = ""; mutate(); return; }
    if (container.__anims) container.__anims.forEach(function (a) { a.finish(); });
    var dir = opts.dir || "up";
    var cs = getComputedStyle(container);
    var h0 = container.offsetHeight;
    var ghost = document.createElement("div");
    while (container.firstChild) ghost.appendChild(container.firstChild);
    mutate();
    var fresh = Array.prototype.slice.call(container.children);
    var h1 = container.offsetHeight;

    ghost.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
    // A checked radio re-inserted with the same name would uncheck the new one.
    ghost.querySelectorAll("input[type=radio]").forEach(function (r) { r.removeAttribute("name"); });
    ghost.className = "swap-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.style.top = cs.paddingTop;
    ghost.style.left = cs.paddingLeft;
    ghost.style.right = cs.paddingRight;
    container.appendChild(ghost);
    container.classList.add("is-swapping");

    var d = opts.duration || 380, dist = opts.distance || 40;
    var inFrom = dir === "forward" ? "translateX(" + dist + "px)" : dir === "back" ? "translateX(" + -dist + "px)" : "translateY(10px)";
    var outTo = dir === "forward" ? "translateX(" + -dist + "px)" : dir === "back" ? "translateX(" + dist + "px)" : "translateY(-6px)";
    var anims = [];
    anims.push(ghost.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: outTo }], { duration: d * 0.55, easing: EASE_OUT, fill: "forwards" }));
    fresh.forEach(function (c) {
      anims.push(c.animate([{ opacity: 0, transform: inFrom }, { opacity: 1, transform: "none" }], { duration: d, delay: d * 0.18, easing: EASE, fill: "backwards" }));
    });
    if (Math.abs(h1 - h0) > 1) anims.push(container.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: d, easing: EASE }));
    container.__anims = anims;
    anims[anims.length - 1].onfinish = cleanup;
    Promise.all(anims.map(function (a) { return a.finished; })).then(cleanup, cleanup);
    function cleanup() {
      if (container.__anims !== anims) return;
      container.__anims = null;
      if (ghost.parentNode) ghost.remove();
      container.classList.remove("is-swapping");
    }
  }

  // ---------------------------------------------------------------------
  // Reveal: while a panel grows open (an option card's sub-options, an
  // accordion), keep it in view by following its bottom edge for as long
  // as the .collapse transition runs (see motion.css), rather than one
  // scrollIntoView() computed too early (before it has grown) or a jump
  // once it's done. Skips the sticky bar's own height so the last part of
  // the card doesn't end up hidden under it (it sits fixed over the page).
  // ---------------------------------------------------------------------
  function reveal(el) {
    if (!el) return;
    var stickyBar = document.querySelector(".sticky-bar");
    function overflowBelow() {
      var r = el.getBoundingClientRect();
      var sb = stickyBar ? stickyBar.getBoundingClientRect() : null;
      var limit = window.innerHeight - (sb ? sb.height : 0) - 16;
      if (r.top < 16) return r.top - 16; // also pull down into view if it's above the fold
      var over = r.bottom - limit;
      return over > 0 ? over : 0;
    }
    if (reduced()) { var n = overflowBelow(); if (n) window.scrollBy(0, n); return; }
    var start = performance.now(), dur = 420;
    (function step(now) {
      var n = overflowBelow();
      if (n) window.scrollBy(0, n);
      if (now - start < dur) requestAnimationFrame(step);
    })(start);
  }

  // ---------------------------------------------------------------------
  // Push: full-width pane slide between booking steps. The old step is
  // removed the instant this runs — before the browser paints a single
  // frame of it — so there is never a moment where two steps' text sits
  // on screen together. Only the incoming pane exists, sliding in from
  // the right (forward) or the left (back) over the page's own
  // background (every pane already paints that color, so nothing flashes
  // a different color while it arrives). This replaced an earlier
  // version with two panes animating side by side — a real phone
  // screenshot showed that reading as a stuck, cut-in-half screen rather
  // than a slide no matter how the animation was tuned, so this drops the
  // idea of showing any of the old step at all instead of trying again to
  // make that version run smoothly.
  // ---------------------------------------------------------------------
  function push(container, oldPane, newPane, dir) {
    if (!oldPane) return;
    oldPane.remove();
    if (reduced()) return;
    if (container.__push) container.__push.cancel();
    container.classList.add("is-pushing");
    var from = dir === "back" ? "translateX(-100%)" : "translateX(100%)";
    var a = newPane.animate([{ transform: from }, { transform: "translateX(0)" }], { duration: 380, easing: EASE_PUSH });
    container.__push = a;
    a.finished.then(done, done);
    function done() {
      if (container.__push !== a) return;
      container.__push = null;
      container.classList.remove("is-pushing");
    }
  }

  // ---------------------------------------------------------------------
  // Segmented control with a thumb that slides to the checked option.
  // Markup: .segmented.segmented--thumb > .segmented__thumb + label.segmented__item > input[type=radio]
  // ---------------------------------------------------------------------
  function segmented(root) {
    var thumb = root.querySelector(".segmented__thumb");
    function place(animate) {
      var act = null;
      root.querySelectorAll(".segmented__item").forEach(function (it) {
        var inp = it.querySelector("input");
        it.classList.toggle("is-active", !!(inp && inp.checked));
        if (inp && inp.checked) act = it;
      });
      if (!act || !act.offsetWidth) { if (!act) thumb.classList.remove("is-visible"); return; }
      var instant = !animate || reduced() || !thumb.classList.contains("is-visible");
      if (instant) thumb.style.transition = "none";
      thumb.style.width = act.offsetWidth + "px";
      thumb.style.transform = "translateX(" + act.offsetLeft + "px)";
      thumb.classList.add("is-visible");
      if (instant) { void thumb.offsetWidth; thumb.style.transition = ""; }
    }
    root.addEventListener("change", function () { place(true); });
    if (window.ResizeObserver) new ResizeObserver(function () { place(false); }).observe(root);
    place(false);
    root.__place = place;
    return place;
  }

  // ---------------------------------------------------------------------
  // Progress fill: eases to the new width with a light sheen running
  // across it while it moves — a loading bar, not a jump.
  // ---------------------------------------------------------------------
  function progress(fill, pct) {
    var w = pct + "%";
    if (fill.style.width === w) return;
    var first = !fill.style.width;
    if (first || reduced()) {
      fill.style.transition = "none";
      fill.style.width = w;
      void fill.offsetWidth;
      fill.style.transition = "";
      return;
    }
    fill.style.width = w;
    fill.classList.remove("is-filling");
    void fill.offsetWidth;
    fill.classList.add("is-filling");
  }

  return {
    reduced: reduced,
    EASE: EASE, EASE_OUT: EASE_OUT, EASE_PUSH: EASE_PUSH,
    back: back,
    roll: roll,
    setOpen: setOpen,
    reveal: reveal,
    swap: swap,
    push: push,
    segmented: segmented,
    progress: progress
  };
})();
