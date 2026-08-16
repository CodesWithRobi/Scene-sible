// background.js — message router for Scene-sible v2.
// Depends on background/providers.js (loaded first in manifest, order matters).

"use strict";

const DEFAULT_SETTINGS = {
  provider: "ovhcloud",
  keys: { google: "", openrouter: "", openai: "", anthropic: "" },
  models: {
    google: Providers.google.defaultModel,
    openrouter: Providers.openrouter.defaultModel,
    openai: Providers.openai.defaultModel,
    anthropic: Providers.anthropic.defaultModel,
    ovhcloud: Providers.ovhcloud.defaultModel
  }
};

function getDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

async function getSettings() {
  const defaults = getDefaults();
  const data = await browser.storage.local.get(null);
  const stored = data.settings && typeof data.settings === "object" ? data.settings : {};
  const settings = {
    provider: Providers[stored.provider] ? stored.provider : defaults.provider,
    keys: Object.assign({}, defaults.keys, stored.keys || {}),
    models: Object.assign({}, defaults.models, stored.models || {})
  };
  // Migrate the v1 single-key storage shape.
  if (data.apiKey && !settings.keys.google) {
    settings.keys.google = String(data.apiKey);
  }
  return settings;
}

// Business-card contract: every non-ok path returns the schema-shaped object
// with a human-readable hint carried inside kissing[0].hint.
function errorContract(hint) {
  return {
    morality_scale: 0,
    watchability: 0,
    sexual_activity: [],
    nudity: [],
    kissing: [{ timestamp: "N/A", hint }],
    _meta: null
  };
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case "get_settings": {
          sendResponse(await getSettings());
          break;
        }

        case "save_settings": {
          const settings = await getSettings();
          if (request.provider && Providers[request.provider]) settings.provider = request.provider;
          if (typeof request.apiKey === "string" && Providers[settings.provider].needsKey) {
            settings.keys[settings.provider] = request.apiKey.trim();
          }
          if (typeof request.model === "string" && request.model) settings.models[settings.provider] = request.model;
          await browser.storage.local.set({ settings });
          sendResponse({ ok: true });
          break;
        }

        case "list_models": {
          const provider = Providers[request.provider];
          if (!provider) { sendResponse({ ok: false, error: "Unknown provider", models: [] }); return; }
          const settings = await getSettings();
          const apiKey = typeof request.apiKey === "string" ? request.apiKey : settings.keys[provider.id];
          try {
            const models = await provider.listModels(apiKey || "");
            sendResponse({ ok: true, models });
          } catch (err) {
            sendResponse({
              ok: false,
              error: (err && err.message) || String(err),
              models: CURATED_MODELS[provider.id] || []
            });
          }
          break;
        }

        case "fetch_movie_data": {
          const settings = await getSettings();
          const provider = Providers[request.provider] || Providers[settings.provider];
          const modelId = request.model || settings.models[provider.id] || provider.defaultModel;
          const apiKey = settings.keys[provider.id] || "";

          if (provider.needsKey && !apiKey) {
            sendResponse(errorContract(
              `${provider.label}: API key not set. Click the extension icon to add one.`
            ));
            return;
          }

          const result = await provider.analyze(apiKey, modelId, request.movieTitle);
          if (result.ok) {
            const d = result.data;
            const isEmpty = d.morality_scale === 0 && d.watchability === 0 &&
              Array.isArray(d.sexual_activity) && d.sexual_activity.length === 0 &&
              Array.isArray(d.nudity) && d.nudity.length === 0 &&
              Array.isArray(d.kissing) && d.kissing.length === 0;
            if (isEmpty) {
              sendResponse(errorContract(
                `${provider.label}: returned an empty analysis. Try again in a moment.`
              ));
            } else {
              sendResponse(Object.assign(result.data, { _meta: { provider: provider.id, model: modelId } }));
            }
          } else {
            sendResponse(errorContract(result.hint));
          }
          break;
        }

        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      console.error("Scene-sible background error:", err);
      sendResponse(errorContract(
        `Internal error: ${err && err.message ? err.message : String(err)}`
      ));
    }
  })();
  return true; // async response — must always return true
});
