/**
 * 브라우저에서 index.html을 직접 열었을 때만 동작하는 재생기.
 * HyperFrames 스튜디오나 렌더러 안에서는 index.html이 표시해 둔 표식이 없으므로 아무 일도 하지 않는다.
 * 소리(#bgm)의 재생 시간을 시계로 삼아 타임라인과 장면(.clip) 표시를 맞춘다.
 */
(function () {
  if (!window.__promoStandalone) {
    return;
  }

  var root = document.getElementById("root");
  var DURATION = parseFloat(root.getAttribute("data-duration")) || 40;
  var POSTER_TIME = parseFloat(root.getAttribute("data-poster")) || 7.55;
  var STAGE_W = parseFloat(root.getAttribute("data-width")) || 1920;
  var STAGE_H = parseFloat(root.getAttribute("data-height")) || 1080;
  var BAR_H = 64;

  var audio = document.getElementById("bgm");
  var timeline = window.__timelines && window.__timelines[root.getAttribute("data-composition-id")];
  var clips = Array.prototype.slice.call(document.querySelectorAll(".clip"));
  var playing = false;
  var current = 0;

  /**
   * 요소를 만들어 붙인다.
   * @param {string} tag 태그 이름
   * @param {string} css 인라인 스타일
   * @param {string} [text] 글자
   * @returns {HTMLElement} 만든 요소
   */
  function make(tag, css, text) {
    var el = document.createElement(tag);
    el.style.cssText = css;
    if (text) {
      el.textContent = text;
    }
    document.body.appendChild(el);
    return el;
  }

  document.body.style.cssText = "margin:0;height:100vh;overflow:hidden;background:#0d2530;font-family:Galmuri11,sans-serif;font-weight:700;";
  root.style.cssText += ";position:absolute;left:0;top:0;width:" + STAGE_W + "px;height:" + STAGE_H + "px;transform-origin:0 0;";

  var overlay = make("div", "position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:rgba(13,37,48,.72);z-index:20;text-align:center;padding:0 24px 64px;");
  var title = document.createElement("div");
  title.style.cssText = "font-size:clamp(28px,6vw,64px);color:#fbf1d6;text-shadow:4px 4px 0 #10302f;line-height:1.2;";
  title.textContent = "우리반퀘스트";
  var sub = document.createElement("div");
  sub.style.cssText = "font-size:clamp(16px,2.6vw,26px);color:#ffd23f;text-shadow:3px 3px 0 #10302f;";
  sub.textContent = "소리를 켜고 보세요 · 40초 홍보 영상";
  var start = document.createElement("button");
  start.type = "button";
  start.style.cssText = "cursor:pointer;font:inherit;font-size:clamp(22px,4vw,40px);padding:14px 40px;background:#1fa38a;color:#fbf1d6;border:5px solid #10302f;box-shadow:7px 7px 0 #10302f;";
  start.textContent = "▶ 재생";
  var play = document.createElement("a");
  play.href = "/login";
  play.style.cssText = "display:none;font-size:clamp(18px,3vw,30px);padding:12px 32px;background:#ffd23f;color:#10302f;border:5px solid #10302f;box-shadow:7px 7px 0 #10302f;text-decoration:none;";
  play.textContent = "게임 하러 가기";
  overlay.appendChild(title);
  overlay.appendChild(sub);
  overlay.appendChild(start);
  overlay.appendChild(play);

  var bar = make("div", "position:fixed;left:0;right:0;bottom:0;height:" + BAR_H + "px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#10302f;color:#fbf1d6;z-index:30;box-sizing:border-box;");
  var toggle = document.createElement("button");
  var seek = document.createElement("input");
  var clock = document.createElement("span");
  var mute = document.createElement("button");
  var full = document.createElement("button");
  [toggle, mute, full].forEach(function (btn) {
    btn.type = "button";
    btn.style.cssText = "cursor:pointer;font:inherit;font-size:20px;min-width:52px;height:40px;background:#fbf1d6;color:#10302f;border:4px solid #0d2530;box-shadow:4px 4px 0 #0d2530;";
  });
  toggle.textContent = "▶";
  toggle.setAttribute("aria-label", "재생 또는 일시정지");
  mute.textContent = "소리";
  mute.setAttribute("aria-label", "소리 끄기 또는 켜기");
  full.textContent = "전체";
  full.setAttribute("aria-label", "전체 화면");
  seek.type = "range";
  seek.min = "0";
  seek.max = String(DURATION);
  seek.step = "0.01";
  seek.value = "0";
  seek.setAttribute("aria-label", "재생 위치");
  seek.style.cssText = "flex:1;accent-color:#ffd23f;height:32px;";
  clock.style.cssText = "font-size:18px;min-width:96px;text-align:right;white-space:nowrap;";
  bar.appendChild(toggle);
  bar.appendChild(seek);
  bar.appendChild(clock);
  bar.appendChild(mute);
  bar.appendChild(full);

  /**
   * 화면 크기에 맞춰 1920×1080 무대를 줄이고 가운데에 놓는다.
   */
  function fit() {
    var k = Math.min(window.innerWidth / STAGE_W, (window.innerHeight - BAR_H) / STAGE_H);
    var left = (window.innerWidth - STAGE_W * k) / 2;
    var top = (window.innerHeight - BAR_H - STAGE_H * k) / 2;
    root.style.transform = "translate(" + left + "px," + top + "px) scale(" + k + ")";
    clock.style.display = window.innerWidth < 520 ? "none" : "block";
  }

  /**
   * 시각 t에 맞는 장면만 보이게 하고 타임라인을 그 시각으로 옮긴다.
   * @param {number} t 초
   */
  function render(t) {
    current = Math.max(0, Math.min(DURATION - 0.001, t));
    clips.forEach(function (clip) {
      var from = parseFloat(clip.getAttribute("data-start"));
      var len = parseFloat(clip.getAttribute("data-duration"));
      clip.style.display = current >= from && current < from + len ? "block" : "none";
    });
    if (timeline) {
      timeline.time(current, false);
    }
    seek.value = String(current);
    var s = Math.floor(current);
    clock.textContent = "0:" + (s < 10 ? "0" : "") + s + " / 0:" + DURATION;
  }

  /**
   * 화면을 그릴 때마다 소리 시계를 읽어 장면을 갱신한다.
   */
  function tick() {
    if (playing) {
      render(audio.currentTime);
      if (audio.ended || audio.currentTime >= DURATION - 0.02) {
        finish();
      }
    }
    window.requestAnimationFrame(tick);
  }

  /**
   * 재생을 시작하거나 이어 간다.
   */
  function begin() {
    if (current >= DURATION - 0.05) {
      audio.currentTime = 0;
    }
    var promise = audio.play();
    playing = true;
    overlay.style.display = "none";
    toggle.textContent = "Ⅱ";
    if (promise && promise.catch) {
      promise.catch(function () {
        playing = false;
        toggle.textContent = "▶";
        overlay.style.display = "flex";
      });
    }
  }

  /**
   * 일시정지한다.
   */
  function halt() {
    audio.pause();
    playing = false;
    toggle.textContent = "▶";
  }

  /**
   * 끝까지 본 뒤 다시 보기와 게임으로 가는 버튼을 보여 준다.
   */
  function finish() {
    halt();
    render(DURATION - 0.02);
    title.textContent = "지금 바로 플레이!";
    sub.textContent = "penstagranm.vercel.app";
    start.textContent = "↻ 다시 보기";
    play.style.display = "inline-block";
    overlay.style.display = "flex";
  }

  start.addEventListener("click", function () {
    if (current >= DURATION - 0.05) {
      audio.currentTime = 0;
      render(0);
    }
    begin();
  });
  toggle.addEventListener("click", function () {
    if (playing) {
      halt();
    } else {
      begin();
    }
  });
  seek.addEventListener("input", function () {
    var t = parseFloat(seek.value);
    audio.currentTime = t;
    render(t);
  });
  mute.addEventListener("click", function () {
    audio.muted = !audio.muted;
    mute.textContent = audio.muted ? "무음" : "소리";
  });
  full.addEventListener("click", function () {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  });
  window.addEventListener("keydown", function (event) {
    if (event.code === "Space" && event.target === document.body) {
      event.preventDefault();
      toggle.click();
    }
  });
  window.addEventListener("resize", fit);

  fit();
  render(POSTER_TIME);
  window.requestAnimationFrame(tick);
})();
