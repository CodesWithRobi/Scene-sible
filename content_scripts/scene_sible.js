const shareButton = document.querySelector('[aria-label="Share"]');
const topstuff = document.getElementById("topstuff");

if (!shareButton || !topstuff) {
  console.log("Scene-sible: Missing required elements (Share button or topstuff container).");
} else {
  const styles = `
        /* AI Overview Container Styles */
        .YzCcne { --m3c9: #eef0ff; --m3c17: #424654; --IXoxUe: #9e9e9e; --m3c23: #7aacff; }
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
            background: var(--m3c13, #3c4043); 
        }
        .VLPwxc {
            background: linear-gradient(110deg,transparent 15%,var(--m3c13, #3c4043) 30%,var(--m3c20, #5f6368) 60%,var(--m3c20, #5f6368) 75%,var(--m3c13, #3c4043) 90%,transparent 95%);
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

  // This is a mock function. In a real extension, this would make an API call.
  async function getAnswer(movieTitle) {
    console.log(`Getting chastity score for: ${movieTitle}`);
    // Simulate an API call by returning a mock JSON object.
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          "morality_scale": 7,
          "watchability": 8,
          "sexual_activity": [
            { "timestamp": "1:05:20", "hint": "Implied sexual activity, no nudity" }
          ],
          "nudity": [
            { "timestamp": "0:55:10", "hint": "Brief female nudity, side view" }
          ],
          "kissing": [
            { "timestamp": "0:25:45", "hint": "Passionate kiss" },
            { "timestamp": "1:30:12", "hint": "Simple kiss" }
          ]
        });
      }, 1000);
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
                        <div class="Fzsovc" role="heading" aria-level="2">Scene-sible Score</div>
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

    const movieTitleInput = document.querySelector('input[name="q"]');
    const movieTitle = movieTitleInput ? movieTitleInput.value : "Unknown Movie";
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
