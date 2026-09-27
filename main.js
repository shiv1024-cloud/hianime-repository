(function () {
  "use strict";

  var SEEK = 10;
  var lastVideo = null;

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

    if (best) {
      lastVideo = best;
    }

    return best || lastVideo;
  }

  function togglePlay() {
    var v = findVideo();

    if (!v) {
      return false;
    }

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

  function seek(seconds) {
    var v = findVideo();

    if (!v) {
      return false;
    }

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

  function handleKey(e) {
    var handled = false;

    switch (e.keyCode) {

      // Samsung MediaPlayPause
      case 10252:
        handled = togglePlay();
        break;

      // Samsung MediaPlay
      case 415:
        var playVideo = findVideo();

        if (playVideo) {
          try {
            playVideo.play();
            handled = true;
          } catch (x) {}
        }
        break;

      // Samsung MediaPause
      case 19:
        var pauseVideo = findVideo();

        if (pauseVideo) {
          try {
            pauseVideo.pause();
            handled = true;
          } catch (x) {}
        }
        break;

      // Rewind / Left
      case 412:
      case 37:
        handled = seek(-SEEK);
        break;

      // Fast Forward / Right
      case 417:
      case 39:
        handled = seek(SEEK);
        break;

      // OK / Enter
      case 13:
        handled = togglePlay();
        break;
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

  document.addEventListener("keydown", handleKey, true);

})();
