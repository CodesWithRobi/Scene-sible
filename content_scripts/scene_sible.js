const shareButton = document.querySelector('[aria-label="Share"]');
const topstuff = document.getElementById("topstuff");

// --- Check for required elements to prevent crashes ---
if (!shareButton || !topstuff) {
  console.log("Scene-sible: Missing required elements (Share button or topstuff container).");
} else {
  // Correctly replace the SVG inside the share button
  const originalSvg = shareButton.querySelector('svg');
  if (originalSvg) {
    originalSvg.outerHTML = `
      <svg class="fWWlmf JzISke" height="22" width="22" aria-hidden="true" viewBox="0 0 471 471" xmlns="http://www.w3.org/2000/svg">
        <path fill="var(--m3c23)" d="M235.5 471C235.5 438.423 229.22 407.807 216.66 379.155C204.492 350.503 187.811 325.579 166.616 304.384C145.421 283.189 120.498 266.508 91.845 254.34C63.1925 241.78 32.5775 235.5 0 235.5C32.5775 235.5 63.1925 229.416 91.845 217.249C120.498 204.689 145.421 187.811 166.616 166.616C187.811 145.421 204.492 120.497 216.66 91.845C229.22 63.1925 235.5 32.5775 235.5 0C235.5 32.5775 241.584 63.1925 253.751 91.845C266.311 120.497 283.189 145.421 304.384 166.616C325.579 187.811 350.503 204.689 379.155 217.249C407.807 229.416 438.423 235.5 471 235.5C438.423 235.5 407.807 241.78 379.155 254.34C350.503 266.508 325.579 283.189 304.384 304.384C283.189 325.579 266.311 350.503 253.751 379.155C241.584 407.807 235.5 438.423 235.5 471Z"></path>
      </svg>
    `;
  }

  const styles = `
        /* AI Overview Container Styles */
        .YzCcne { --m3c9: #f5c5c9; --m3c17: #424654; --IXoxUe: #9e9e9e; --m3c23: #cd1924; }
        .hdzaWe { font-family: Google Sans, Arial, sans-serif; position: relative; }
        .WAUd4 { padding: 16px 0; }
        .OZ9ddf { align-items: center; display: flex; flex-direction: row; grid-gap: 16px; justify-content: space-between; position: relative; }
        .nk9vdc { display: flex; flex-direction: row; gap: 16px; align-items: center; }
        .GYaNDc { flex-grow: 1; }
        .fWWlmf { display: block; }
        .JzISke { margin-right: -10px; }
        .Fzsovc { font-weight: 500; color: var(--m3c9); font-size: 14px; z-index: 1; }
        .rNSxBe { padding-bottom: 20px; }
        .GkDqAd { padding-left: 0; padding-right: 0; }
        .MyTwIe { max-width: 632px; }
        .KMCbD { border-bottom: 1px solid var(--m3c17); width: 100%; margin-top: 12px; }

        /* Loading Animation Styles */
        .hoqQCc { padding-bottom: 20px; }
        .MyTwIe { max-width: 632px; }
        .Ry8K5c {
            border-radius: 20px;
            height: 26px;
            width: 100%;
        }
        .Ry8K5c.FmaImf { margin-bottom: 10px; }
        .ToDgQ {
            position: relative;
            overflow: clip;
            background: var(--m3c13, #8b0f17); 
        }
        .VLPwxc {
            background: linear-gradient(110deg,transparent 15%,var(--m3c13, #8b0f17) 30%,var(--m3c20, #cd1924) 60%,var(--m3c20, #cd1924) 75%,var(--m3c13, #8b0f17) 90%,transparent 95%);
            width: 300%;
            position: absolute;
            height: 100%;
        }
        .ixPFxb { position: absolute; height: 100%; }
        
        .dGkdc, .dkKvuc, .wim3ad { 
            animation: 6000ms cubic-bezier(0.5,0,0.3,1) 0s infinite normal both running gradient-loading-slide;
        }

        @keyframes gradient-loading-slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .u7Pf1b { display: none; }

        /* Google's Content Styles */
        .f5cPye { letter-spacing: var(--m3t13); }
        .p2M1Qe .f5cPye { color: var(--YLNNHc, #e8e8e8); font-family: Google Sans, Arial, sans-serif; font-size: 16px; line-height: 24px; position: relative; }
        .rPeykc { margin: 10px 0; }
        .WaaZC:first-of-type .rPeykc:first-child { margin-top: 0; }
        .f5cPye ul { font-size: 16px; line-height: 24px; margin: 10px 0 20px 0; padding-inline-start: 16px; }
        .f5cPye li { padding-inline-start: 4px; margin-bottom: 8px; list-style: inherit; }
    `;
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  const aiResult = document.createElement("div");
  aiResult.id = "ai-result";
  aiResult.style.cssText = `
    display: none;
    opacity: 0;
    transition: opacity 300ms ease-in-out;
    padding: 0 16px;
  `;

  topstuff.before(aiResult);

  const loaderHTML = `
      <div class="YzCcne" style="margin-bottom: 30px;">
          <div class="hdzaWe">
              <div class="OZ9ddf WAUd4">
                  <div class="nk9vdc GYaNDc" style="flex-grow:1">
                      <div class="Fzsovc">
                          <div style="animation:0.4s cubic-bezier(0.4, 0, 0.2, 1) both low-confidence-header-fade-in">
                              Praying to St. Carlo Acutis...
                          </div>
                      </div>
                  </div>
              </div>
              
              <div class="MyTwIe" aria-valuetext="Generating" role="progressbar">
                  <div class="Ry8K5c FmaImf ToDgQ" style="width:100%"><div class="VLPwxc dGkdc" style="animation-delay:-1600ms"></div><div class="VLPwxc dkKvuc" style="animation-delay:400ms"></div><div class="VLPwxc wim3ad" style="animation-delay:2400ms"></div><div class="ixPFxb" style="filter:url(#_DEgQabqMF8eUseMPgri58AM_4)"></div></div>
                  <div class="Ry8K5c FmaImf ToDgQ" style="width:90%"><div class="VLPwxc dGkdc" style="animation-delay:-1400ms"></div><div class="VLPwxc dkKvuc" style="animation-delay:600ms"></div><div class="VLPwxc wim3ad" style="animation-delay:2600ms"></div><div class="ixPFxb" style="filter:url(#_DEgQabqMF8eUseMPgri58AM_4)"></div></div>
                  <div class="Ry8K5c FmaImf ToDgQ" style="width:92%"><div class="VLPwxc dGkdc" style="animation-delay:-1200ms"></div><div class="VLPwxc dkKvuc" style="animation-delay:800ms"></div><div class="VLPwxc wim3ad" style="animation-delay:2800ms"></div><div class="ixPFxb" style="filter:url(#_DEgQabqMF8eUseMPgri58AM_4)"></div></div>
                  <div class="Ry8K5c ToDgQ" style="width:75%"><div class="VLPwxc dGkdc" style="animation-delay:-1000ms"></div><div class="VLPwxc dkKvuc" style="animation-delay:1000ms"></div><div class="VLPwxc wim3ad" style="animation-delay:3000ms"></div><div class="ixPFxb" style="filter:url(#_DEgQabqMF8eUseMPgri58AM_4)"></div></div>
                  <svg class="u7Pf1b" aria-hidden="true"><defs><filter id="_DEgQabqMF8eUseMPgri58AM_4"><feTurbulence baseFrequency="1.5" numOctaves="5" seed="24"></feTurbulence><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 9 -4"></feColorMatrix><feComposite in="SourceGraphic" operator="in"></feComposite></filter></defs></svg>
              </div>
          </div>
      </div>
  `;

  async function getAnswer(prompt) {
    return new Promise((resolve) => {
      browser.runtime.sendMessage({ type: "fetch_movie_data", movieTitle: prompt }, response => {
        if (browser.runtime.lastError) {
          console.error("Error sending message to background script:", browser.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  function getRenderedContent(data) {
    const sexualActivityHTML = data.sexual_activity.map(item => `<li>${item.timestamp}: ${item.hint}</li>`).join('');
    const nudityHTML = data.nudity.map(item => `<li>${item.timestamp}: ${item.hint}</li>`).join('');
    const kissingHTML = data.kissing.map(item => `<li>${item.timestamp}: ${item.hint}</li>`).join('');

    return `
        <div class="YzCcne p2M1Qe" style="margin-bottom: 30px;">
            <div class="hdzaWe">
                <div class="OZ9ddf WAUd4">
                    <div class="nk9vdc GYaNDc" style="flex-grow:1">
                      <svg class="fWWlmf JzISke" height="22" width="22" aria-hidden="true" viewBox="0 0 471 471" xmlns="http://www.w3.org/2000/svg"><path fill="var(--m3c23)" d="M235.5 471C235.5 438.423 229.22 407.807 216.66 379.155C204.492 350.503 187.811 325.579 166.616 304.384C145.421 283.189 120.498 266.508 91.845 254.34C63.1925 241.78 32.5775 235.5 0 235.5C32.5775 235.5 63.1925 229.416 91.845 217.249C120.498 204.689 145.421 187.811 166.616 166.616C187.811 145.421 204.492 120.497 216.66 91.845C229.22 63.1925 235.5 32.5775 235.5 0C235.5 32.5775 241.584 63.1925 253.751 91.845C266.311 120.497 283.189 145.421 304.384 166.616C325.579 187.811 350.503 204.689 379.155 217.249C407.807 229.416 438.423 235.5 471 235.5C438.423 235.5 407.807 241.78 379.155 254.34C350.503 266.508 325.579 283.189 304.384 304.384C283.189 325.579 266.311 350.503 253.751 379.155C241.584 407.807 235.5 438.423 235.5 471Z"></path></svg>
                        <div class="Fzsovc" role="heading" aria-level="2">Calculated strategies to avoid near occasions..</div>
                    </div>
                </div>
                <div class="GkDqAd">
                    <div class="f5cPye">
                        <div class="WaaZC"><div class="rPeykc"><span><strong>Morality Scale:</strong> ${data.morality_scale}/10</span></div></div>
                        <div class="WaaZC"><div class="rPeykc"><span><strong>Watchability:</strong> ${data.watchability}/10</span></div></div>
                        
                        ${data.sexual_activity.length > 0 ? `
                        <div class="WaaZC">
                            <div class="rPeykc"><strong>Sexual Activity:</strong></div>
                            <ul style="margin: 0 0 10px 20px; list-style-type: disc;">${sexualActivityHTML}</ul>
                        </div>` : ''}

                        ${data.nudity.length > 0 ? `
                        <div class="WaaZC">
                            <div class="rPeykc"><strong>Nudity:</strong></div>
                            <ul style="margin: 0 0 10px 20px; list-style-type: disc;">${nudityHTML}</ul>
                        </div>` : ''}

                        ${data.kissing.length > 0 ? `
                        <div class="WaaZC">
                            <div class="rPeykc"><strong>Kissing:</strong></div>
                            <ul style="margin: 0 0 10px 20px; list-style-type: disc;">${kissingHTML}</ul>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  let loading = false;
  async function showAiResult() {
    if (loading) return;
    loading = true;
    if (topstuff) topstuff.style.display = "none";
    aiResult.innerHTML = loaderHTML;
    aiResult.style.display = "block";
    requestAnimationFrame(() => {
      aiResult.style.opacity = "1";
    });

    const movieTitleElement = document.querySelector('[data-attrid="title"]');
    const movieTitle = movieTitleElement ? movieTitleElement.innerText : "Unknown Movie";
    const data = await getAnswer(movieTitle);

    if (aiResult.style.display !== "block" || !data) {
      if (topstuff) topstuff.style.display = "block";
      aiResult.style.display = "none";
      aiResult.style.opacity = "0";
      loading = false;
      return;
    }

    aiResult.innerHTML = getRenderedContent(data);
    loading = false;
  }

  shareButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (aiResult.style.display === "none") {
      showAiResult();
    }
  });

  console.log("Scene-sible content script loaded successfully.");
}
