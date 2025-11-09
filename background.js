// background.js

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "save_api_key") {
    // Save the API key to chrome.storage.local
    chrome.storage.local.set({ apiKey: request.apiKey }, () => {
      console.log("API Key saved successfully.");
      sendResponse({ status: "success" });
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  } else if (request.type === "get_api_key") {
    // Retrieve the API key from chrome.storage.local
    chrome.storage.local.get("apiKey", (data) => {
      if (data.apiKey) {
        sendResponse({ apiKey: data.apiKey });
      } else {
        sendResponse({ apiKey: null });
      }
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});
