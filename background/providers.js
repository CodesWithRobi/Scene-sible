// background/providers.js — AI provider registry for Scene-sible v2.
// Pure fetch logic, NO browser.* APIs here so the module stays unit-testable.
// Every provider implements:
//   listModels(apiKey) -> Promise<[{ id, name, context, pricing }]>
//   analyze(apiKey, modelId, movieTitle) -> Promise<{ ok, data? | hint? }>
// Normalized pricing: { promptPerM, completionPerM, free } or null (unknown).

"use strict";

const ANALYSIS_SYSTEM_PROMPT = `You are a rigorous Catholic film reviewer in the tradition of USCCB movie ratings and Movieguide. Your job is to warn a faithful viewer about moral content so they can decide whether a film is safe to watch — or where to skip.
Analyze the movie given by the user. Respond ONLY with a single, valid JSON object matching this exact schema:
{
  "summary": "STRING — 1-3 sentence Catholic moral appraisal: the film's overall moral tone, its greatest risk, and your bottom line.",
  "morality_scale": "NUMBER 1-10 — 10 = morally edifying and safe for any faithful viewer; 1 = gravely immoral or glorifies serious sin. The score drops for ANY scene that presents sin as funny, normal, or desirable.",
  "watchability": "NUMBER 1-10 — how safe the film is to WATCH without falling into a near occasion of sin. 10 = completely safe to watch; 1 = seriously dangerous to watch (graphic sex, explicit nudity, extreme gore or torture, or anything that stokes lust or desensitizes to violence). This rates the WATCHING, not the film's quality. Meaningful sexual or gory content caps the score around 6; graphic or constant content drops it to 3 or below. Sexualized or sensual nudity also caps the score, but brief INCIDENTAL non-sexualized nudity (changing clothes, locker rooms, a rear view during a walk-by) is flagged for awareness and does NOT cap the score.",
  "sexual_activity": "ARRAY of {timestamp, hint}",
  "nudity": "ARRAY of {timestamp, hint}",
  "kissing": "ARRAY of {timestamp, hint}",
  "other_concerns": "ARRAY of {timestamp, hint} — violence/gore, coarse language, occult/supernatural evil, blasphemy, drug or alcohol abuse, disordered relationships, suicide."
}

CRITICAL COVERAGE RULES:
- Flag IMPLIED, OFFSCREEN, COMEDIC, and CARTOONISH sexual content too — not just explicit scenes. Include: groping and inappropriate touching, body-swap or possession scenarios used for sexual comedy (e.g. a character in another's body grabbing or examining breasts), innuendo, seduction, suggestive dancing, leering camera angles, fetishized or skimpy outfits, "fan service", and scenes that strongly imply sex. If a moment is implied, offscreen, or comedic, SAY SO in the hint (e.g. "implied", "offscreen", "comedic groping during body-swap").
- Nudity: include partial nudity, sexualized swimwear or lingerie, silhouette nudity, brief flashes, toplessness, and accidental exposure used for titillation. Also include brief INCIDENTAL non-sexualized nudity (changing, locker rooms, rear walk-by) and label it "(incidental, non-sexualized)" so parents can judge; it is NOT sexual content.
- Kissing: note whether it is chaste and brief or prolonged and passionate, and whether it is the film's moral focal point.
- Other concerns: list violence/gore, coarse or profane language, occult or demonic themes, blasphemy, drugs or alcohol, disordered relationships, suicide, and anything else a Catholic parent would want to know.
- Be exhaustive but precise: each entry is one distinct moment. Do not pad the lists and do not omit real content.

NON-SPOILER RULE:
- Describe the TYPE of content and its intensity — never reveal plot twists, surprises, endings, outcomes, or who survives. A viewer should be warned without the story being ruined.
- Do NOT write "a comet splits and destroys a town at the end". Instead write "Ending: intense disaster destruction and peril". Do not say "the main character dies"; say "Late: brief but intense violence in a perilous situation".
- Name characters only when unavoidable, and never state what happens to them (death, survival, reconciliation) unless that outcome is itself the moral content being flagged.
- Keep each hint generic enough to be safely read before watching.

SCORING RULES:
- Be strict. ANY meaningful near-occasion content — even subtle, comedic, or cartoonish — drops morality below 9. One such scene caps morality around 6; repeated or prominent sexual content drops it to 3 or lower. Brief incidental non-sexualized nudity (changing, locker rooms, a rear walk-by) is NOT a near-occasion scene: flag it, but do not let it drop the score.
- Do not give high scores just because a movie is "otherwise sweet" or "family-friendly". A body-swap groping scene in a romance anime is exactly the kind of content that must lower the score.
- When unsure whether content qualifies, FLAG it (stricter is safer).
- Never give watchability 9-10 to a film with any flagged sexual or gore content, or sexualized nudity. Brief incidental non-sexualized nudity alone does not block a high score.

TIMESTAMPS:
- Precise timecodes are rarely reliable. Prefer VAGUE PLACEMENT over false precision. Use "Beginning", "Early", "Middle", "Late", "Ending", "Act 1/2/3", or describe where the moment falls in the story (e.g. "during the body-swap montage", "at the summer festival", "on the train ride home") so a viewer knows roughly when to expect it.
- Only give a numeric timecode when you are confident of the film's runtime and the scene's position; a rough estimate is fine ("~40 min in"). Never fabricate precise-looking times.
- Put the placement in the "timestamp" field. The "hint" field describes WHAT happens, including whether it is implied, offscreen, or comedic.

Do not add any other text, explanation, or markdown formatting. Your entire response must be ONLY the JSON object.`;

// Gemini native structured-output schema (uppercase type names).
const ANALYSIS_SCHEMA_GEMINI = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING", description: "1-3 sentence Catholic moral appraisal: overall tone, greatest risk, bottom line." },
    morality_scale: { type: "NUMBER", description: "1-10 Catholic-moral score. Any scene presenting sin as funny or normal drops it below 9; one meaningful near-occasion scene caps it around 6. Brief incidental non-sexualized nudity is flagged but does not drop the score." },
    watchability: { type: "NUMBER", description: "1-10 safety of WATCHING without a near occasion of sin. Graphic sex, sexualized nudity, or extreme gore caps it around 6; constant graphic content drops it to 3 or below. Never 9-10 if sexual or gore content is flagged. Brief incidental non-sexualized nudity is flagged but does not cap the score." },
    sexual_activity: { type: "ARRAY", description: "Include implied, offscreen, comedic, body-swap groping, innuendo, fan service, seduction, suggestive dancing, skimpy/fetishized outfits, closed-door sex.", items: { type: "OBJECT", properties: { timestamp: { type: "STRING", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "STRING", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    nudity: { type: "ARRAY", description: "Include partial nudity, sexualized swimwear/lingerie, silhouettes, brief flashes, toplessness, accidental exposure used for titillation, and brief incidental non-sexualized nudity (label it '(incidental, non-sexualized)').", items: { type: "OBJECT", properties: { timestamp: { type: "STRING", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "STRING", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    kissing: { type: "ARRAY", description: "Note chaste/brief vs prolonged/passionate.", items: { type: "OBJECT", properties: { timestamp: { type: "STRING", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "STRING", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    other_concerns: { type: "ARRAY", description: "Violence/gore, coarse language, occult/demonic themes, blasphemy, drugs/alcohol, disordered relationships, suicide.", items: { type: "OBJECT", properties: { timestamp: { type: "STRING", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "STRING", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } }
  },
  required: ["summary", "morality_scale", "watchability", "sexual_activity", "nudity", "kissing", "other_concerns"]
};

// Anthropic tool input_schema (standard JSON Schema, lowercase type names).
const ANALYSIS_SCHEMA_ANTHROPIC = {
  type: "object",
  properties: {
    summary: { type: "string", description: "1-3 sentence Catholic moral appraisal: overall tone, greatest risk, bottom line." },
    morality_scale: { type: "number", description: "1-10 Catholic-moral score. Any scene presenting sin as funny or normal drops it below 9; one meaningful near-occasion scene caps it around 6. Brief incidental non-sexualized nudity is flagged but does not drop the score." },
    watchability: { type: "number", description: "1-10 safety of WATCHING without a near occasion of sin. Graphic sex, sexualized nudity, or extreme gore caps it around 6; constant graphic content drops it to 3 or below. Never 9-10 if sexual or gore content is flagged. Brief incidental non-sexualized nudity is flagged but does not cap the score." },
    sexual_activity: { type: "array", description: "Include implied, offscreen, comedic, body-swap groping, innuendo, fan service, seduction, suggestive dancing, skimpy/fetishized outfits, closed-door sex.", items: { type: "object", properties: { timestamp: { type: "string", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "string", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    nudity: { type: "array", description: "Include partial nudity, sexualized swimwear/lingerie, silhouettes, brief flashes, toplessness, accidental exposure used for titillation, and brief incidental non-sexualized nudity (label it '(incidental, non-sexualized)').", items: { type: "object", properties: { timestamp: { type: "string", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "string", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    kissing: { type: "array", description: "Note chaste/brief vs prolonged/passionate.", items: { type: "object", properties: { timestamp: { type: "string", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "string", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } },
    other_concerns: { type: "array", description: "Violence/gore, coarse language, occult/demonic themes, blasphemy, drugs/alcohol, disordered relationships, suicide.", items: { type: "object", properties: { timestamp: { type: "string", description: "Placement: Beginning/Early/Middle/Late/Act N or a story location; a rough timecode only when confident. Never a fabricated precise time." }, hint: { type: "string", description: "The type and intensity of the content, and whether implied/offscreen/comedic. NEVER reveal plot twists, surprises, or outcomes." } }, required: ["timestamp", "hint"] } }
  },
  required: ["summary", "morality_scale", "watchability", "sexual_activity", "nudity", "kissing", "other_concerns"]
};

// ---- Hand-maintained pricing tables (per 1M tokens, USD) -----------------
// VERIFY: Google/OpenAI/Anthropic do NOT expose pricing in their model APIs,
// so these must be updated manually when the providers change prices.
// `free: true` = eligible for the provider's free tier (rate-limited).

const GOOGLE_PRICING = {
  "gemini-3.6-flash": { prompt: 1.5, completion: 7.5, free: true },
  "gemini-3.5-flash": { prompt: 1.5, completion: 9.0, free: true },
  "gemini-3-flash": { prompt: 0.3, completion: 2.5, free: true },
  "gemini-2.5-flash": { prompt: null, completion: null, free: true },
  "gemini-2.5-flash-lite": { prompt: null, completion: null, free: true },
  "gemini-2.5-pro": { prompt: null, completion: null, free: true },
  "gemini-2.0-flash": { prompt: null, completion: null, free: true }
};

const OPENAI_PRICING = {
  "gpt-5.6-sol": { prompt: 5.0, completion: 30.0, free: false },
  "gpt-5.6-terra": { prompt: 2.0, completion: 12.0, free: false },
  "gpt-5.6-luna": { prompt: 0.2, completion: 1.2, free: false },
  "gpt-5-mini": { prompt: 0.25, completion: 2.0, free: false },
  "gpt-5-nano": { prompt: 0.05, completion: 0.4, free: false },
  "gpt-5": { prompt: 1.25, completion: 10.0, free: false },
  "gpt-4.1-mini": { prompt: 0.4, completion: 1.6, free: false },
  "gpt-4.1-nano": { prompt: 0.1, completion: 0.4, free: false },
  "gpt-4.1": { prompt: 2.0, completion: 8.0, free: false },
  "gpt-4o": { prompt: 2.5, completion: 10.0, free: false },
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6, free: false },
  "o3": { prompt: 2.0, completion: 8.0, free: false }
};

const ANTHROPIC_PRICING = {
  "claude-opus-4-6": { prompt: 15.0, completion: 75.0, free: false },
  "claude-sonnet-4-5": { prompt: 3.0, completion: 15.0, free: false },
  "claude-haiku-4-5": { prompt: 1.0, completion: 5.0, free: false }
};

// ---- Helpers --------------------------------------------------------------

// 429s do not consume quota, so retrying is safe. Delays are chosen to cover a
// full OVHcloud anonymous window (~60s) so a quiet IP recovers before we give up.
const RETRY_429_DELAYS_MS = [15000, 20000, 25000];
const RETRY_429_TOTAL_MS = Math.round(RETRY_429_DELAYS_MS.reduce((a, b) => a + b, 0) / 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls requestFn(), re-trying while the server answers 429 (auto-retry). The
// optional `delays` param exists so tests can shrink the backoff. Returns the
// last Response plus how many 429 retries happened. Non-429 responses return
// immediately; thrown network errors propagate unchanged.
async function postWith429Retry(requestFn, delays = RETRY_429_DELAYS_MS) {
  let res = await requestFn();
  let retries = 0;
  for (const delay of delays) {
    if (res.status !== 429) break;
    await sleep(delay);
    res = await requestFn();
    retries += 1;
  }
  return { res, retries };
}

function sortByName(a, b) {
  return (a.name || a.id).localeCompare(b.name || b.id);
}

// Free-tier models first, then paid; ties broken by name. Keeps the keyless /
// low-cost option at the top of the popup dropdown regardless of provider.
function sortFreeFirst(a, b) {
  const fa = a.pricing && a.pricing.free ? 0 : 1;
  const fb = b.pricing && b.pricing.free ? 0 : 1;
  if (fa !== fb) return fa - fb;
  return sortByName(a, b);
}

function toPricing(table, id) {
  const p = table[id];
  if (!p) return null;
  return { promptPerM: p.prompt, completionPerM: p.completion, free: !!p.free };
}

// Strip markdown fences / code wrappers and pull the first {...} block out.
function parseJSONText(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/```(?:json)?/gi, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

function clamp(n, min, max) {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Force the response into the shape the content script expects.
function sanitizeAnalysis(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const arr = (v) => (Array.isArray(v) ? v.map((i) => ({
    timestamp: String((i && i.timestamp) || "N/A"),
    hint: String((i && i.hint) || "")
  })) : []);
  return {
    summary: String((r.summary || "")).trim(),
    morality_scale: clamp(Number(r.morality_scale), 0, 10),
    watchability: clamp(Number(r.watchability), 0, 10),
    sexual_activity: arr(r.sexual_activity),
    nudity: arr(r.nudity),
    kissing: arr(r.kissing),
    other_concerns: arr(r.other_concerns)
  };
}

// OpenAI-compatible /chat/completions request, shared by OpenAI, OpenRouter
// and Pollinations. Retries without response_format if the model rejects it.
async function openAICompatibleAnalyze({ url, apiKey, modelId, movieTitle, label }) {
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
  };
  const buildBody = (jsonMode) => ({
    model: modelId,
    temperature: 0.1,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `Analyze this movie for Catholic-moral content: ${movieTitle}` }
    ]
  });

  const doPost = (jsonMode) => fetch(url, { method: "POST", headers, body: JSON.stringify(buildBody(jsonMode)) });

  const first = await postWith429Retry(() => doPost(true));
  let res = first.res;
  let retries = first.retries;
  let errText = "";
  if (res.status === 400) {
    errText = await res.text().catch(() => "");
    if (/response_format|json_object/i.test(errText)) {
      const second = await postWith429Retry(() => doPost(false));
      res = second.res;
      retries += second.retries;
    }
  }

  if (!res.ok) {
    const status = res.status;
    const hint = status === 401
      ? `${label}: invalid API key.`
      : status === 429
        ? `${label}: still rate limited after ${retries} auto-retries (~${RETRY_429_TOTAL_MS}s). Wait a minute, or use a provider with a higher limit.`
        : status === 402
          ? `${label}: account needs credits / payment method.`
          : `${label}: API error ${status}. ${errText.slice(0, 120)}`;
    return { ok: false, hint };
  }

  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) return { ok: false, hint: `${label}: empty response. Try another model.` };
  const parsed = parseJSONText(content);
  if (!parsed) return { ok: false, hint: `${label}: could not parse the model response as JSON.` };
  return { ok: true, data: sanitizeAnalysis(parsed) };
}

// ---- Providers ------------------------------------------------------------

const Providers = {

  ovhcloud: {
    id: "ovhcloud",
    label: "Free (no key)",
    needsKey: false,
    defaultModel: "gpt-oss-20b",
    // Exclude non-chat endpoints (embeddings, images, audio, guards, VL).
    CHAT_MODEL_FILTER: /whisper|bge-|stable-diffusion|guard|embed|-vl-|^vl$/i,
    async listModels() {
      try {
        const res = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/models");
        if (res.ok) {
          const data = await res.json();
          const chat = (data.data || [])
            .map((m) => m.id)
            .filter((id) => !this.CHAT_MODEL_FILTER.test(id));
          if (chat.length) {
            return chat.map((id) => ({
              id,
              name: `${id} — free, no key`,
              context: null,
              pricing: { promptPerM: 0, completionPerM: 0, free: true }
            })).sort(sortFreeFirst);
          }
        }
      } catch (e) { /* fall through to static list */ }
      return [{
        id: "gpt-oss-20b",
        name: "gpt-oss-20b — free, no key",
        context: null,
        pricing: { promptPerM: 0, completionPerM: 0, free: true }
      }];
    },
    async analyze(apiKey, modelId, movieTitle) {
      const r = await openAICompatibleAnalyze({
        url: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions",
        apiKey: null,
        modelId: modelId || "gpt-oss-20b",
        movieTitle,
        label: "Free tier"
      });
      if (!r.ok && /rate limited/i.test(r.hint)) {
        return {
          ok: false,
          hint: "Free tier: OVHcloud anonymous access is capped at ~2 requests/min per IP, and that pool is shared with everyone on your network. Already auto-retried for ~60s. Wait longer, switch networks, or add a provider API key in the popup for reliable results."
        };
      }
      return r;
    }
  },

  google: {
    id: "google",
    label: "Google AI Studio",
    needsKey: true,
    defaultModel: "gemini-2.5-flash",
    async listModels(apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey || "")}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gemini API ${res.status}`);
      const data = await res.json();
      return (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /^models\/gemini-/.test(m.name))
        .map((m) => {
          const id = m.name.replace(/^models\//, "");
          return {
            id,
            name: m.displayName || id,
            context: m.inputTokenLimit || null,
            pricing: toPricing(GOOGLE_PRICING, id)
          };
        })
        .sort(sortFreeFirst);
    },
    async analyze(apiKey, modelId, movieTitle) {
      const payload = {
        contents: [{ parts: [{ text: movieTitle }] }],
        systemInstruction: { parts: [{ text: ANALYSIS_SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA_GEMINI,
          temperature: 0.1
        }
      };
      const { res, retries } = await postWith429Retry(() => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      ));
      if (!res.ok) {
        const status = res.status;
        return {
          ok: false,
          hint: status === 401 || status === 403
            ? "Google AI Studio: invalid API key."
            : status === 404
              ? "Google AI Studio: model not found for this key."
              : status === 429
                ? `Google AI Studio: still rate limited after ${retries} auto-retries. The free tier has low per-minute limits — wait a minute and retry.`
                : `Google AI Studio: API error ${status}.`
        };
      }
      const result = await res.json();
      const text = result && result.candidates && result.candidates[0] && result.candidates[0].content &&
        result.candidates[0].content.parts && result.candidates[0].content.parts[0].text;
      if (!text) return { ok: false, hint: "Google AI Studio: empty response. Try another model." };
      const parsed = parseJSONText(text);
      if (!parsed) return { ok: false, hint: "Google AI Studio: could not parse the model response as JSON." };
      return { ok: true, data: sanitizeAnalysis(parsed) };
    }
  },

  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    needsKey: true,
    defaultModel: "openai/gpt-5-mini",
    async listModels(apiKey) {
      const res = await fetch("https://openrouter.ai/api/v1/models",
        apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined);
      if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
      const data = await res.json();
      return (data.data || []).map((m) => {
        const pr = m.pricing || {};
        const prompt = parseFloat(pr.prompt);
        const completion = parseFloat(pr.completion);
        const hasPrice = Number.isFinite(prompt) && Number.isFinite(completion);
        return {
          id: m.id,
          name: m.name || m.id,
          context: m.context_length || null,
          pricing: hasPrice
            ? {
                promptPerM: +((prompt * 1e6).toFixed(4)),
                completionPerM: +((completion * 1e6).toFixed(4)),
                free: prompt === 0 && completion === 0
              }
            : null
        };
      }).sort(sortFreeFirst);
    },
    async analyze(apiKey, modelId, movieTitle) {
      return openAICompatibleAnalyze({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        modelId,
        movieTitle,
        label: "OpenRouter"
      });
    }
  },

  openai: {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    needsKey: true,
    defaultModel: "gpt-5-mini",
    async listModels(apiKey) {
      const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = await res.json();
      return (data.data || [])
        .map((m) => m.id)
        .filter((id) => /^(gpt|o[0-9])/i.test(id))
        .map((id) => ({ id, name: id, context: null, pricing: toPricing(OPENAI_PRICING, id) }))
        .sort(sortFreeFirst);
    },
    async analyze(apiKey, modelId, movieTitle) {
      return openAICompatibleAnalyze({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey,
        modelId,
        movieTitle,
        label: "OpenAI"
      });
    }
  },

  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    needsKey: true,
    defaultModel: "claude-sonnet-4-5",
    async listModels(apiKey) {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const data = await res.json();
      return (data.data || [])
        .filter((m) => /^claude-/.test(m.id))
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          context: m.max_input_tokens || null,
          pricing: toPricing(ANTHROPIC_PRICING, m.id)
        }))
        .sort(sortFreeFirst);
    },
    async analyze(apiKey, modelId, movieTitle) {
      const payload = {
        model: modelId,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Analyze this movie for Catholic-moral content: ${movieTitle}` }],
        max_tokens: 2048,
        tools: [{
          name: "emit_movie_analysis",
          description: "Report the Catholic-moral analysis of the movie",
          input_schema: ANALYSIS_SCHEMA_ANTHROPIC
        }],
        tool_choice: { type: "tool", name: "emit_movie_analysis" }
      };
      const { res, retries } = await postWith429Retry(() => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(payload)
      }));
      if (!res.ok) {
        const status = res.status;
        return {
          ok: false,
          hint: status === 401
            ? "Anthropic: invalid API key."
            : status === 429
              ? `Anthropic: still rate limited after ${retries} auto-retries. Wait a minute and retry.`
              : `Anthropic: API error ${status}.`
        };
      }
      const data = await res.json();
      const toolUse = (data.content || []).find((b) => b.type === "tool_use" && b.name === "emit_movie_analysis");
      const raw = toolUse ? toolUse.input : (data.content && data.content[0] && data.content[0].text);
      if (!raw) return { ok: false, hint: "Anthropic: unexpected response shape." };
      const parsed = typeof raw === "string" ? parseJSONText(raw) : raw;
      if (!parsed) return { ok: false, hint: "Anthropic: could not parse the model response as JSON." };
      return { ok: true, data: sanitizeAnalysis(parsed) };
    }
  }
};

// Static curated fallbacks for the popup when a live model fetch fails or no
// key is saved yet (keeps the dropdown usable).
const CURATED_MODELS = {
  ovhcloud: [{ id: "gpt-oss-20b", name: "gpt-oss-20b — free, no key", context: null, pricing: { promptPerM: 0, completionPerM: 0, free: true } }],
  google: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-3-flash", "gemini-3.6-flash"]
    .map((id) => ({ id, name: id, context: null, pricing: toPricing(GOOGLE_PRICING, id) })),
  openrouter: [
    { id: "openai/gpt-5-mini", name: "GPT-5 mini (OpenAI)", context: null, pricing: { promptPerM: 0.25, completionPerM: 2.0, free: false } },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Google)", context: null, pricing: { promptPerM: 0.1, completionPerM: 0.4, free: false } },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct (Meta)", context: null, pricing: null }
  ],
  openai: ["gpt-5-mini", "gpt-5.6-luna", "gpt-4.1-mini", "gpt-5"]
    .map((id) => ({ id, name: id, context: null, pricing: toPricing(OPENAI_PRICING, id) })),
  anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-6"]
    .map((id) => ({ id, name: id, context: null, pricing: toPricing(ANTHROPIC_PRICING, id) }))
};

if (typeof self !== "undefined") {
  self.Providers = Providers;
  self.CURATED_MODELS = CURATED_MODELS;
  self.postWith429Retry = postWith429Retry;
  self.sortFreeFirst = sortFreeFirst;
}
