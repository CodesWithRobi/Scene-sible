document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  // Request the saved API key from the background script and populate the input
  browser.runtime.sendMessage({ type: "get_api_key" }, (response) => {
    if (response && response.apiKey) {
      apiKeyInput.value = response.apiKey;
    }
  });

  // Save the API key when the save button is clicked
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      browser.runtime.sendMessage({ type: "save_api_key", apiKey: apiKey }, () => {
        statusEl.textContent = "API Key saved!";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 2000);
      });
    } else {
      statusEl.textContent = "Please enter a valid API key.";
    }
  });
});
