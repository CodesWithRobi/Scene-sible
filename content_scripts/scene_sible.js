// Scene-sible v2 content script.
// Detects movie/TV knowledge-panel results on Google search, arms the Share
// button (or a floating backup button when Google moves/removes Share), and
// injects a Catholic-moral AI overview lookalike.

(() => {
  "use strict";

  // Knowledge-graph signals that mark a result as a movie / TV series.
  // A result must have a title AND one of these signals to count as a movie.
  const MOVIE_SIGNALS = [
    '[data-attrid^="kc:/film/"]', // verified Aug 2026 (Interstellar)
    '[data-attrid^="kc:/tv/"]',   // verified Aug 2026 (Breaking Bad)
    '[data-md="371"]'             // "Where to watch" block (fallback)
  ];

  const STAR_SVG = `
    <svg class="fWWlmf JzISke" height="22" width="22" aria-hidden="true" viewBox="0 0 471 471" xmlns="http://www.w3.org/2000/svg">
      <path fill="var(--m3c23)" d="M235.5 471C235.5 438.423 229.22 407.807 216.66 379.155C204.492 350.503 187.811 325.579 166.616 304.384C145.421 283.189 120.498 266.508 91.845 254.34C63.1925 241.78 32.5775 235.5 0 235.5C32.5775 235.5 63.1925 229.416 91.845 217.249C120.498 204.689 145.421 187.811 166.616 166.616C187.811 145.421 204.492 120.497 216.66 91.845C229.22 63.1925 235.5 32.5775 235.5 0C235.5 32.5775 241.584 63.1925 253.751 91.845C266.311 120.497 283.189 145.421 304.384 166.616C325.579 187.811 350.503 204.689 379.155 217.249C407.807 229.416 438.423 235.5 471 235.5C438.423 235.5 407.807 241.78 379.155 254.34C350.503 266.508 325.579 283.189 304.384 304.384C283.189 325.579 266.311 350.503 253.751 379.155C241.584 407.807 235.5 438.423 235.5 471Z"></path>
    </svg>
  `;

  const state = {
    href: location.href,
    armed: false,
    shareEl: null,
    shareOriginalHtml: null,
    shareHandler: null,
    fab: null,
    cardHost: null,
    movieTitle: null,
    loading: false
  };

  // ---- Detection ----------------------------------------------------------

  function findShareButton() {
    return document.querySelector('[aria-label="Share"]');
  }

  function findTitle() {
    return document.querySelector('[data-attrid="title"]');
  }

  function hasMovieSignal() {
    return document.querySelector(MOVIE_SIGNALS.join(",")) !== null;
  }

  function isMoviePage() {
    const title = findTitle();
    if (!title) return false;
    return hasMovieSignal();
  }

  function extractTitle(el) {
    let t = (el.textContent || "").trim();
    // Knowledge panels can append year/rating/release junk — cut at the first
    // separator (newline, bullet, dot) or common metadata keywords.
    const cut = t.search(/[\n·•]|(?=Rated\s|IMDb|Release)/i);
    if (cut > 0) t = t.slice(0, cut).trim();
    return t || "Unknown Movie";
  }

  // ---- Styling (scoped, deterministic colors) ----------------------------

  const STYLES = `
    /* Scene-sible card — minimal, self-contained surface. No Google AI-overview
       class spoofing; all colors are ours (light by default, dark override).
       Vars live on #scene-sible-card (the host) so all inner content inherits
       the same theme. The card is borderless — it sits on the page and matches
       the surrounding background. */
    #scene-sible-card {
      --ss-accent: #c62828;
      --ss-text: #202124;
      --ss-muted: #5f6368;
      --ss-border: #e8e8e8;
      box-sizing: border-box;
      max-width: 632px;
      margin-bottom: 30px;
      padding: 12px 24px 0;
    }
    /* Closed card leaves no empty space behind. */
    #scene-sible-card:empty { display: none; }
    @media (prefers-color-scheme: dark) {
      #scene-sible-card {
        --ss-accent: #f5c5c9;
        --ss-text: #e8e8e8;
        --ss-muted: #9e9e9e;
        --ss-border: #3c4043;
      }
    }

    .ss-card {
      font-family: "Google Sans", Arial, sans-serif;
      color: var(--ss-text);
      font-size: 15px;
      line-height: 1.5;
    }

    .ss-eyebrow {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.01em;
      color: var(--ss-accent, #c62828);
      margin: 0 0 4px 0;
    }
    .ss-summary {
      font-style: italic;
      color: var(--ss-muted, #5f6368);
      margin: 0 0 14px 0;
    }

    .ss-ratings {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin: 4px 0 0 0;
    }
    .ss-rating { display: flex; flex-direction: column; gap: 2px; }
    .ss-rating-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ss-muted, #5f6368);
    }
    .ss-rating-value { font-size: 30px; font-weight: 600; line-height: 1.1; }

    .ss-section {
      border-top: 1px solid var(--ss-border, #e8e8e8);
      margin-top: 14px;
      padding-top: 12px;
    }
    .ss-section-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--ss-muted, #5f6368);
      margin: 0 0 8px 0;
    }
    .ss-list { list-style: none; margin: 0; padding: 0; }
    .ss-item {
      display: flex;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .ss-item:last-child { margin-bottom: 0; }
    .ss-ts { font-weight: 500; flex-shrink: 0; }
    .ss-ts::after { content: " — "; font-weight: 400; color: var(--ss-muted, #5f6368); }
    .ss-hint { color: var(--ss-text); }

    /* Error chip — sits inside the panel surface. */
    #scene-sible-card .scene-sible-error {
      color: var(--ss-text, #202124);
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      #scene-sible-card .scene-sible-error { background: #3b0d0d; border-color: #7f1d1d; }
    }

    /* Loader shimmer — the St. Carlo skeleton, scoped to itself. */
    .ss-loader { --m3c13: #8b0f17; --m3c20: #cd1924; }
    .ss-loader .Ry8K5c { border-radius: 20px; height: 26px; width: 100%; }
    .ss-loader .Ry8K5c.FmaImf { margin-bottom: 10px; }
    .ss-loader .ToDgQ { position: relative; overflow: clip; background: var(--m3c13); }
    .ss-loader .VLPwxc {
      background: linear-gradient(110deg, transparent 15%, var(--m3c13) 30%, var(--m3c20) 60%, var(--m3c20) 75%, var(--m3c13) 90%, transparent 95%);
      width: 300%; position: absolute; height: 100%;
    }
    .ss-loader .ixPFxb { position: absolute; height: 100%; }
    .ss-loader .dGkdc, .ss-loader .dkKvuc, .ss-loader .wim3ad {
      animation: 6000ms cubic-bezier(0.5, 0, 0.3, 1) 0s infinite normal both running gradient-loading-slide;
    }
    .ss-loader .u7Pf1b { display: none; }
    @keyframes gradient-loading-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes ss-fade-in {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: none; }
    }
  `;

  // ---- DOM helpers --------------------------------------------------------

  function createDOM(type, props, ...children) {
    const elem = document.createElement(type);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === "style" && typeof v === "string") elem.style.cssText = v;
        else if (k in elem && !k.includes("-")) elem[k] = v;
        else elem.setAttribute(k, v);
      }
    }
    for (const child of children) {
      if (child == null) continue;
      if (typeof child === "string") elem.appendChild(document.createTextNode(child));
      else elem.appendChild(child);
    }
    return elem;
  }

  function getCardHost() {
    if (state.cardHost && state.cardHost.isConnected) return state.cardHost;
    state.cardHost = createDOM("div", { id: "scene-sible-card" });
    const anchor = document.getElementById("topstuff") ||
      document.getElementById("center_col") ||
      document.body;
    anchor.before(state.cardHost);
    return state.cardHost;
  }

  // ---- UI: loader (kept from v1 — user loves it) -------------------------

  const TAGLINES = [
    "Calculated strategies to avoid near occasions..",
    "Discerned through prayer and reason..",
    "A Catholic lens on screen and story..",
    "Keeping watch over what enters the heart..",
    "Faithful viewing, mindful choices..",
    "Judged by the light of the Gospel..",
    "Guard your heart, watch wisely.."
  ];
  const LOADER_PHRASES = [
    "Praying to St. Carlo Acutis...",
    "Calling on St. Carlo Acutis...",
    "Eucharist, prayer, wisdom...",
    "Offering this search up to heaven...",
    "St. Carlo, patron of the internet, intercede...",
    "Seeking the peace that surpasses screens..."
  ];
  function makeRandomPicker(list) {
    let last = -1;
    return () => {
      let i;
      do {
        i = Math.floor(Math.random() * list.length);
      } while (i === last && list.length > 1);
      last = i;
      return list[i];
    };
  }
  const nextTagline = makeRandomPicker(TAGLINES);
  const nextLoaderPhrase = makeRandomPicker(LOADER_PHRASES);

  function getLoader() {
    return createDOM("div", { className: "ss-card ss-loader" },
      createDOM("div", { className: "ss-eyebrow" },
        createDOM("div", { style: "animation:0.4s cubic-bezier(0.4, 0, 0.2, 1) both ss-fade-in" }, nextLoaderPhrase())
      ),
      createDOM("div", { "aria-valuetext": "Generating", role: "progressbar" },
          createDOM("div", { className: "Ry8K5c FmaImf ToDgQ", style: "width:100%" },
            createDOM("div", { className: "VLPwxc dGkdc", style: "animation-delay:-1600ms" }),
            createDOM("div", { className: "VLPwxc dkKvuc", style: "animation-delay:400ms" }),
            createDOM("div", { className: "VLPwxc wim3ad", style: "animation-delay:2400ms" }),
            createDOM("div", { className: "ixPFxb", style: "filter:url(#_DEgQabqMF8eUseMPgri58AM_4)" })
          ),
          createDOM("div", { className: "Ry8K5c FmaImf ToDgQ", style: "width:90%" },
            createDOM("div", { className: "VLPwxc dGkdc", style: "animation-delay:-1400ms" }),
            createDOM("div", { className: "VLPwxc dkKvuc", style: "animation-delay:600ms" }),
            createDOM("div", { className: "VLPwxc wim3ad", style: "animation-delay:2600ms" }),
            createDOM("div", { className: "ixPFxb", style: "filter:url(#_DEgQabqMF8eUseMPgri58AM_4)" })
          ),
          createDOM("div", { className: "Ry8K5c FmaImf ToDgQ", style: "width:92%" },
            createDOM("div", { className: "VLPwxc dGkdc", style: "animation-delay:-1200ms" }),
            createDOM("div", { className: "VLPwxc dkKvuc", style: "animation-delay:800ms" }),
            createDOM("div", { className: "VLPwxc wim3ad", style: "animation-delay:2800ms" }),
            createDOM("div", { className: "ixPFxb", style: "filter:url(#_DEgQabqMF8eUseMPgri58AM_4)" })
          ),
          createDOM("div", { className: "Ry8K5c ToDgQ", style: "width:75%" },
            createDOM("div", { className: "VLPwxc dGkdc", style: "animation-delay:-1000ms" }),
            createDOM("div", { className: "VLPwxc dkKvuc", style: "animation-delay:1000ms" }),
            createDOM("div", { className: "VLPwxc wim3ad", style: "animation-delay:3000ms" }),
            createDOM("div", { className: "ixPFxb", style: "filter:url(#_DEgQabqMF8eUseMPgri58AM_4)" })
          ),
          createDOM("svg", { className: "u7Pf1b", "aria-hidden": "true" },
            createDOM("defs", null,
              createDOM("filter", { id: "_DEgQabqMF8eUseMPgri58AM_4" },
                createDOM("feTurbulence", { baseFrequency: "1.5", numOctaves: "5", seed: "24" }),
                createDOM("feColorMatrix", { values: "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 9 -4" }),
                createDOM("feComposite", { in: "SourceGraphic", operator: "in" })
              )
            )
          )
        )
      );
  }

  // ---- UI: rendered result -------------------------------------------------

  function getRenderedContent(data) {
    const wrapper = createDOM("div", { className: "ss-card" });

    // Error contract: all zeros + empty arrays with the message carried in
    // kissing[0].hint. Treat any all-empty result as an error even if the
    // hint is missing (model returned garbage).
    const isZero = data && data.morality_scale === 0 && data.watchability === 0 &&
      Array.isArray(data.sexual_activity) && data.sexual_activity.length === 0 &&
      Array.isArray(data.nudity) && data.nudity.length === 0;
    const hint = isZero && Array.isArray(data.kissing) && data.kissing.length === 1
      ? data.kissing[0].hint
      : isZero ? "The analysis came back empty. Try again." : null;

    if (hint) {
      wrapper.appendChild(createDOM("div", { className: "scene-sible-error" }, hint));
      return wrapper;
    }

    const createListItem = (item) => createDOM("li", { className: "ss-item" },
      createDOM("span", { className: "ss-ts" }, item.timestamp),
      createDOM("span", { className: "ss-hint" }, item.hint));
    const createSection = (title, items) => {
      if (!items || items.length === 0) return null;
      return createDOM("div", { className: "ss-section" },
        createDOM("div", { className: "ss-section-title" }, title),
        createDOM("ul", { className: "ss-list" }, ...items.map(createListItem)));
    };

    wrapper.appendChild(createDOM("div", { className: "ss-eyebrow", role: "heading", "aria-level": "2" },
      nextTagline()));
    if (data.summary) {
      wrapper.appendChild(createDOM("div", { className: "ss-summary" }, data.summary));
    }
    wrapper.appendChild(createDOM("div", { className: "ss-ratings" },
      createDOM("div", { className: "ss-rating" },
        createDOM("span", { className: "ss-rating-label" }, "Morality Scale"),
        createDOM("span", { className: "ss-rating-value" }, `${data.morality_scale}/10`)),
      createDOM("div", { className: "ss-rating" },
        createDOM("span", { className: "ss-rating-label" }, "Watchability"),
        createDOM("span", { className: "ss-rating-value" }, `${data.watchability}/10`))
    ));
    for (const [title, items] of [["Sexual Activity", data.sexual_activity], ["Nudity", data.nudity], ["Kissing", data.kissing], ["Other Concerns", data.other_concerns]]) {
      const section = createSection(title, items);
      if (section) wrapper.appendChild(section);
    }
    return wrapper;
  }

  // ---- Background call -----------------------------------------------------

  function getAnswer(movieTitle) {
    return new Promise((resolve) => {
      browser.runtime.sendMessage({ type: "fetch_movie_data", movieTitle }, (response) => {
        if (browser.runtime.lastError) {
          console.error("Scene-sible: background message failed:", browser.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ---- Trigger paths -------------------------------------------------------

  function toggleResult() {
    const host = getCardHost();
    if (host.children.length > 0) {
      host.innerHTML = "";
      return;
    }
    showAiResult();
  }

  async function showAiResult() {
    if (state.loading) return;
    state.loading = true;
    const host = getCardHost();
    host.innerHTML = "";
    host.appendChild(getLoader());
    const data = await getAnswer(state.movieTitle || "Unknown Movie");
    state.loading = false;

    // Bail out silently if the user navigated away or closed the card.
    if (!host.isConnected) return;

    host.innerHTML = "";
    if (data) {
      host.appendChild(getRenderedContent(data));
    } else {
      host.appendChild(createDOM("div", { className: "scene-sible-error" },
        "No response from the background script."));
    }
  }

  // Primary trigger: the Share button. Swap its SVG, keep its shape/position,
  // toggle the card on click.
  function armShareButton(shareEl) {
    if (state.armed) return;
    const originalHtml = shareEl.innerHTML;
    const svg = shareEl.querySelector("svg");
    if (svg) svg.outerHTML = STAR_SVG;

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleResult();
    };
    shareEl.addEventListener("click", handler, true);
    shareEl.style.cursor = "pointer";

    state.armed = true;
    state.shareEl = shareEl;
    state.shareOriginalHtml = originalHtml;
    state.shareHandler = handler;
  }

  // Backup trigger: no Share button on the page but it IS a movie. Inject a
  // floating action button so the feature still works when Google moves the
  // Share button around or hides it on certain layouts.
  function createFab() {
    if (state.fab && state.fab.isConnected) return;
    const fab = createDOM("button", {
      id: "scene-sible-fab",
      title: "Scene-sible: analyze movie",
      "aria-label": "Scene-sible: analyze movie"
    });
    fab.innerHTML = STAR_SVG;
    const svg = fab.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "26");
      svg.setAttribute("height", "26");
      const path = svg.querySelector("path");
      if (path) path.setAttribute("fill", "#ffffff");
    }
    fab.style.cssText = [
      "position:fixed",
      "bottom:20px",
      "right:20px",
      "width:56px",
      "height:56px",
      "border-radius:50%",
      "border:none",
      "background:#cd1924",
      "color:#fff",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      "z-index:2147483647",
      "box-shadow:0 4px 14px rgba(0,0,0,.25)",
      "padding:0"
    ].join(";") + ";";
    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleResult();
    });
    (document.body || document.documentElement).appendChild(fab);
    state.fab = fab;
  }

  // ---- Lifecycle -----------------------------------------------------------

  function teardown() {
    if (state.shareEl && state.shareHandler) {
      state.shareEl.removeEventListener("click", state.shareHandler, true);
      if (state.shareOriginalHtml !== null) state.shareEl.innerHTML = state.shareOriginalHtml;
      state.shareEl.style.cursor = "";
    }
    if (state.fab) {
      state.fab.remove();
      state.fab = null;
    }
    if (state.cardHost) {
      state.cardHost.innerHTML = "";
      state.cardHost.remove();
      state.cardHost = null;
    }
    state.armed = false;
    state.shareEl = null;
    state.shareHandler = null;
    state.movieTitle = null;
    state.loading = false;
  }

  function init() {
    if (!isMoviePage()) {
      if (state.armed || state.fab) teardown();
      return;
    }
    state.movieTitle = extractTitle(findTitle());

    const share = findShareButton();
    if (share) {
      armShareButton(share);
    } else {
      // Google moved/removed the Share button but this is still a movie —
      // fall back to the floating button (backup plan).
      createFab();
    }
  }

  // Inject styles once.
  const styleTag = document.createElement("style");
  styleTag.type = "text/css";
  styleTag.innerText = STYLES;
  styleTag.id = "scene-sible-styles";
  document.head.appendChild(styleTag);

  // Initial run + SPA watcher: Google re-renders results without a page load.
  init();
  setInterval(() => {
    if (location.href !== state.href) {
      state.href = location.href;
      teardown();
      init();
    }
  }, 800);

  console.log("Scene-sible v2 content script loaded.");
})();
