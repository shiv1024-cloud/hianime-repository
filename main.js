(function () {
  "use strict";

  var SEEK = 10;
  var focusedElement = null;
  var refreshTimer = null;

  /* ---------------- VIDEO CONTROLS ---------------- */

  function findVideo() {
    var videos = document.getElementsByTagName("video");
    var best = null;
    var bestScore = -1;

    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var score = 0;

      if (v.readyState > 0) score += 5;
      if (!v.paused && !v.ended) score += 30;
      if (v.currentSrc || v.src) score += 5;

      try {
        var r = v.getBoundingClientRect();

        if (r.width > 300 && r.height > 150) {
          score += 10;
        }
      } catch (e) {}

      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }

    return best;
  }

  function togglePlay() {
    var v = findVideo();

    if (!v) return false;

    try {
      if (v.paused || v.ended) {
        var p = v.play();

        if (p && p.catch) {
          p.catch(function () {});
        }
      } else {
        v.pause();
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function playVideo() {
    var v = findVideo();

    if (!v) return false;

    try {
      var p = v.play();

      if (p && p.catch) {
        p.catch(function () {});
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function pauseVideo() {
    var v = findVideo();

    if (!v) return false;

    try {
      v.pause();
      return true;
    } catch (e) {
      return false;
    }
  }

  function seek(seconds) {
    var v = findVideo();

    if (!v) return false;

    try {
      var current = Number(v.currentTime);
      var duration = Number(v.duration);

      if (!isFinite(current)) {
        current = 0;
      }

      var target = current + seconds;

      if (isFinite(duration) && duration > 0) {
        target = Math.max(0, Math.min(duration, target));
      } else {
        target = Math.max(0, target);
      }

      v.currentTime = target;

      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------------- PAGE NAVIGATION ---------------- */

  function isVisible(el) {
    if (!el) return false;

    try {
      var style = window.getComputedStyle(el);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return false;
      }

      var r = el.getBoundingClientRect();

      return r.width > 2 && r.height > 2;
    } catch (e) {
      return false;
    }
  }

  function isInteractive(el) {
    if (!el || !isVisible(el)) return false;

    if (el.disabled) return false;

    if (el.getAttribute("aria-hidden") === "true") return false;

    if (el.tagName === "A") {
      return true;
    }

    if (
      el.tagName === "BUTTON" ||
      el.tagName === "INPUT" ||
      el.tagName === "SELECT" ||
      el.tagName === "TEXTAREA"
    ) {
      return true;
    }

    if (el.tagName === "VIDEO") {
      return true;
    }

    if (el.getAttribute("role") === "button") {
      return true;
    }

    if (el.hasAttribute("tabindex")) {
      return Number(el.getAttribute("tabindex")) >= 0;
    }

    return false;
  }

  function getInteractiveElements() {
    var selector =
      "a,button,input,select,textarea,video,[role='button'],[tabindex]";

    var nodes = document.querySelectorAll(selector);
    var result = [];

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];

      if (!isInteractive(el)) continue;

      /*
       * Avoid duplicate nested elements.
       * If an interactive element is completely inside another
       * interactive element, prefer the outer one.
       */
      var parent = el.parentElement;
      var nested = false;

      while (parent) {
        if (
          parent !== el &&
          isInteractive(parent) &&
          parent.contains(el)
        ) {
          nested = true;
          break;
        }

        parent = parent.parentElement;
      }

      if (!nested) {
        result.push(el);
      }
    }

    return result;
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();

    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  }

  function clearFocusStyle() {
    if (!focusedElement) return;

    try {
      focusedElement.removeAttribute("data-hianime-remote-focus");
      focusedElement.style.removeProperty("outline");
      focusedElement.style.removeProperty("outline-offset");
    } catch (e) {}
  }

  function applyFocusStyle(el) {
    clearFocusStyle();

    focusedElement = el;

    if (!el) return;

    try {
      el.setAttribute("data-hianime-remote-focus", "true");

      el.style.setProperty(
        "outline",
        "4px solid #00ffff",
        "important"
      );

      el.style.setProperty(
        "outline-offset",
        "4px",
        "important"
      );

      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      });
    } catch (e) {}
  }

  function setInitialFocus() {
    var elements = getInteractiveElements();

    if (!elements.length) return;

    /*
     * Prefer the search input on the HiAnime home page.
     */
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      if (
        el.tagName === "INPUT" &&
        (
          el.type === "search" ||
          el.type === "text"
        )
      ) {
        applyFocusStyle(el);
        return;
      }
    }

    applyFocusStyle(elements[0]);
  }

  function moveFocus(direction) {
    var elements = getInteractiveElements();

    if (!elements.length) return false;

    /*
     * If nothing is selected yet, start with the first suitable element.
     */
    if (
      !focusedElement ||
      elements.indexOf(focusedElement) === -1
    ) {
      setInitialFocus();
      return true;
    }

    /*
     * Don't steal arrow keys while typing in a search box.
     */
    var active = document.activeElement;

    if (
      active &&
      (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT" ||
        active.isContentEditable
      )
    ) {
      return false;
    }

    var current = centerOf(focusedElement);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < elements.length; i++) {
      var candidate = elements[i];

      if (candidate === focusedElement) continue;

      var point = centerOf(candidate);

      var dx = point.x - current.x;
      var dy = point.y - current.y;

      var primary;
      var secondary;

      if (direction === "left") {
        if (dx >= -5) continue;

        primary = -dx;
        secondary = Math.abs(dy);
      } else if (direction === "right") {
        if (dx <= 5) continue;

        primary = dx;
        secondary = Math.abs(dy);
      } else if (direction === "up") {
        if (dy >= -5) continue;

        primary = -dy;
        secondary = Math.abs(dx);
      } else {
        if (dy <= 5) continue;

        primary = dy;
        secondary = Math.abs(dx);
      }

      /*
       * Strongly prefer elements that are actually in the
       * direction pressed, while still allowing movement
       * between differently sized/positioned website elements.
       */
      var score = primary + secondary * 1.5;

      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) {
      applyFocusStyle(best);
      return true;
    }

    return false;
  }

  /* ---------------- SELECT / ENTER ---------------- */

  function activateFocusedElement() {
    var el = focusedElement;

    if (!el) {
      setInitialFocus();
      return true;
    }

    /*
     * Search box / text input:
     * focus it so the Samsung TV keyboard can appear.
     */
    if (
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA"
    ) {
      try {
        el.focus();

        /*
         * Do NOT prevent the normal input behavior.
         * The TV's on-screen keyboard needs this.
         */
        return false;
      } catch (e) {
        return false;
      }
    }

    /*
     * Select boxes.
     */
    if (el.tagName === "SELECT") {
      try {
        el.focus();
        el.click();
        return true;
      } catch (e) {
        return false;
      }
    }

    /*
     * Links, buttons and HiAnime controls.
     */
    try {
      el.focus();

      if (typeof el.click === "function") {
        el.click();
        return true;
      }
    } catch (e) {}

    return false;
  }

  /* ---------------- DYNAMIC WEBSITE SUPPORT ---------------- */

  function refreshFocus() {
    if (!focusedElement) {
      setInitialFocus();
      return;
    }

    if (!document.documentElement.contains(focusedElement)) {
      focusedElement = null;
      setInitialFocus();
    }
  }

  function startObserver() {
    if (!window.MutationObserver) return;

    try {
      var observer = new MutationObserver(function () {
        clearTimeout(refreshTimer);

        refreshTimer = setTimeout(function () {
          refreshFocus();
        }, 150);
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    } catch (e) {}
  }

  /* ---------------- REMOTE KEY HANDLER ---------------- */

  function handleKey(e) {
    var key = e.keyCode;
    var handled = false;

    /*
     * Arrow keys = website navigation.
     *
     * We deliberately DON'T use Left/Right for seeking anymore.
     * This is important because it lets you navigate anime,
     * episodes, servers, search results, etc.
     */
    if (key === 37) {
      handled = moveFocus("left");
    } else if (key === 38) {
      handled = moveFocus("up");
    } else if (key === 39) {
      handled = moveFocus("right");
    } else if (key === 40) {
      handled = moveFocus("down");
    }

    /*
     * Enter / OK
     */
    else if (key === 13) {
      var active = document.activeElement;

      /*
       * If the TV keyboard/input is already active,
       * don't hijack Enter.
       */
      if (
        active &&
        (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable
        )
      ) {
        return;
      }

      handled = activateFocusedElement();
    }

    /*
     * Media Play/Pause
     */
    else if (key === 10252) {
      handled = togglePlay();
    }

    /*
     * Media Play
     */
    else if (key === 415) {
      handled = playVideo();
    }

    /*
     * Media Pause
     */
    else if (key === 19) {
      handled = pauseVideo();
    }

    /*
     * Dedicated rewind button
     */
    else if (key === 412) {
      handled = seek(-SEEK);
    }

    /*
     * Dedicated fast-forward button
     */
    else if (key === 417) {
      handled = seek(SEEK);
    }

    if (handled) {
      if (e.preventDefault) {
        e.preventDefault();
      }

      if (e.stopPropagation) {
        e.stopPropagation();
      }
    }
  }

  /* ---------------- START ---------------- */

  function init() {
    /*
     * Give the page a moment to render its navigation.
     */
    setTimeout(function () {
      setInitialFocus();
    }, 1200);

    startObserver();

    /*
     * Capture remote keys before the website gets them.
     */
    document.addEventListener(
      "keydown",
      handleKey,
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
