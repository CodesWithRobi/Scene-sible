// popup.js — Scene-sible v2 settings UI.

"use strict";

const PROVIDERS = [
  { id: "ovhcloud", label: "Free" },
  { id: "google", label: "Google AI Studio" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" }
];

const KEY_NEEDED = { ovhcloud: false, google: true, openrouter: true, openai: true, anthropic: true };

const MODEL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const statusEl = document.getElementById("status");

function send(msg) {
  return browser.runtime.sendMessage(msg);
}

function fmtPrice(n) {
  if (n == null) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pricingLabel(pricing) {
  if (!pricing) return "pricing unknown";
  if (pricing.free) return "Free";
  const p = fmtPrice(pricing.promptPerM);
  const c = fmtPrice(pricing.completionPerM);
  if (p == null && c == null) return "pricing unknown";
  if (p == null) return `$${c}/1M out`;
  if (c == null) return `$${p}/1M in`;
  return `$${p} / $${c} per 1M`;
}

let settings = null;
let activeProvider = "ovhcloud";

async function init() {
  settings = await send({ type: "get_settings" });
  activeProvider = settings.provider || "ovhcloud";
  renderPills();
  await selectProvider(activeProvider);
  wireEvents();
}

function renderPills() {
  const container = document.getElementById("providerPills");
  container.innerHTML = "";
  for (const p of PROVIDERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill" + (p.id === activeProvider ? " active" : "");
    btn.textContent = p.label;
    btn.dataset.id = p.id;
    btn.addEventListener("click", () => selectProvider(p.id));
    container.appendChild(btn);
  }
}

async function selectProvider(id) {
  activeProvider = id;
  document.querySelectorAll("#providerPills .pill").forEach((b) =>
    b.classList.toggle("active", b.dataset.id === id));

  const needsKey = KEY_NEEDED[id];
  document.getElementById("keySection").hidden = !needsKey;
  document.getElementById("freeNote").hidden = needsKey;
  document.getElementById("apiKey").value = (settings.keys && settings.keys[id]) || "";

  await loadModels(id);
}

async function loadModels(id) {
  const select = document.getElementById("modelSelect");
  select.innerHTML = "";
  select.disabled = true;
  setModelMeta("");

  const cached = await getCachedModels(id);
  let list = cached || await fetchModels(id);

  if (!list.length) {
    list = [{ id: "", name: "No models available", context: null, pricing: null }];
  }

  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name ? `${m.name} — ${pricingLabel(m.pricing)}` : "No models available";
    opt.title = m.context ? `Context: ${m.context.toLocaleString()} tokens` : "";
    select.appendChild(opt);
  }

  const saved = settings.models && settings.models[id];
  const chosen = list.some((m) => m.id === saved) ? saved : (list[0] && list[0].id);
  select.value = chosen;
  select._sceneSibleList = list;
  updateModelMeta(select, list);
  select.disabled = false;
}

async function getCachedModels(id) {
  const data = await browser.storage.local.get("modelCache");
  const cache = (data.modelCache || {})[id];
  if (cache && cache.models && Date.now() - cache.ts < MODEL_CACHE_TTL) return cache.models;
  return null;
}

async function fetchModels(id) {
  const key = (settings.keys && settings.keys[id]) || "";
  const res = await send({ type: "list_models", provider: id, apiKey: key });
  const list = res.ok ? res.models : (res.models || []);
  const data = await browser.storage.local.get("modelCache");
  const cache = data.modelCache || {};
  cache[id] = { ts: Date.now(), models: list };
  await browser.storage.local.set({ modelCache: cache });
  return list;
}

function updateModelMeta(select, list) {
  const meta = document.getElementById("modelMeta");
  const m = list.find((x) => x.id === select.value);
  if (!m) { setModelMeta(""); return; }
  setModelMeta(m.context ? `${m.name} · ${m.context.toLocaleString()} token context` : "");
}

function setModelMeta(text) {
  document.getElementById("modelMeta").textContent = text;
}

function wireEvents() {
  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("refreshBtn").addEventListener("click", async () => {
    const data = await browser.storage.local.get("modelCache");
    const cache = data.modelCache || {};
    delete cache[activeProvider];
    await browser.storage.local.set({ modelCache: cache });
    await loadModels(activeProvider);
    showStatus("Model list refreshed.", "ok");
  });

  document.getElementById("toggleKey").addEventListener("click", () => {
    const input = document.getElementById("apiKey");
    const btn = document.getElementById("toggleKey");
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "Show" : "Hide";
  });

  document.getElementById("modelSelect").addEventListener("change", () => {
    const select = document.getElementById("modelSelect");
    updateModelMeta(select, select._sceneSibleList || []);
  });
}

async function saveSettings() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const model = document.getElementById("modelSelect").value;

  if (KEY_NEEDED[activeProvider] && !apiKey) {
    showStatus("Enter your API key first.", "error");
    return;
  }
  if (!model) {
    showStatus("Pick a model first.", "error");
    return;
  }

  const res = await send({ type: "save_settings", provider: activeProvider, apiKey, model });
  if (res && res.ok) {
    settings.provider = activeProvider;
    settings.keys[activeProvider] = apiKey;
    settings.models[activeProvider] = model;
    showStatus("Settings saved.", "ok");
  } else {
    showStatus("Failed to save settings.", "error");
  }
}

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status " + (kind || "");
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "status";
  }, 3000);
}

init();
