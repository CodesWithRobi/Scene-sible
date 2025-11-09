const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

async function getMovieAnalysis(apiKey, movieTitle) {
    const API_URL = `${GEMINI_API_BASE_URL}?key=${apiKey}`;

    const systemPrompt = `You are an expert movie analyst providing information based on Catholic moral ethics. Analyze the following movie title. Respond ONLY with a single, valid JSON object that follows this exact schema: {
      "type": "OBJECT",
      "properties": {
        "morality_scale": { "type": "NUMBER", "description": "1-10 rating based on Catholic moral ethics." },
        "watchability": { "type": "NUMBER", "description": "1-10 rating of how watchable the movie is without falling into a near occasion of sin." },
        "sexual_activity": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": { "timestamp": { "type": "STRING" }, "hint": { "type": "STRING" } },
            "required": ["timestamp", "hint"]
          }
        },
        "nudity": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": { "timestamp": { "type": "STRING" }, "hint": { "type": "STRING" } },
            "required": ["timestamp", "hint"]
          }
        },
        "kissing": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": { "timestamp": { "type": "STRING" }, "hint": { "type": "STRING" } },
            "required": ["timestamp", "hint"]
          }
        }
      },
      "required": ["morality_scale", "watchability", "sexual_activity", "nudity", "kissing"]
    }. Do not add any other text, explanation, or markdown formatting. Your entire response must be ONLY the JSON object.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            "morality_scale": { "type": "NUMBER" },
            "watchability": { "type": "NUMBER" },
            "sexual_activity": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "timestamp": { "type": "STRING" },
                        "hint": { "type": "STRING" }
                    },
                    "required": ["timestamp", "hint"]
                }
            },
            "nudity": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "timestamp": { "type": "STRING" },
                        "hint": { "type": "STRING" }
                    },
                    "required": ["timestamp", "hint"]
                }
            },
            "kissing": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "timestamp": { "type": "STRING" },
                        "hint": { "type": "STRING" }
                    },
                    "required": ["timestamp", "hint"]
                }
            }
        },
        "required": ["morality_scale", "watchability", "sexual_activity", "nudity", "kissing"]
    };

    const payload = {
        contents: [{
            parts: [{
                text: movieTitle
            }]
        }],
        systemInstruction: {
            parts: [{
                text: systemPrompt
            }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.1
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            return {
                "morality_scale": 0,
                "watchability": 0,
                "sexual_activity": [],
                "nudity": [],
                "kissing": [{ "timestamp": "N/A", "hint": `API Error: ${response.status}. Check key or console.` }]
            };
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const jsonText = candidate.content.parts[0].text;
            const parsedJson = JSON.parse(jsonText);
            return parsedJson;
        } else {
            console.error("Invalid API response structure:", result);
            return null;
        }

    } catch (error) {
        console.error("Error during fetch call:", error);
        return null;
    }
}


// Listen for messages from the popup or content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "save_api_key") {
    // Save the API key to browser.storage.local
    browser.storage.local.set({ apiKey: request.apiKey }, () => {
      console.log("API Key saved successfully.");
      sendResponse({ status: "success" });
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  } else if (request.type === "get_api_key") {
    // Retrieve the API key from browser.storage.local
    browser.storage.local.get("apiKey", (data) => {
      if (data.apiKey) {
        sendResponse({ apiKey: data.apiKey });
      } else {
        sendResponse({ apiKey: null });
      }
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  } else if (request.type === "fetch_movie_data") {
    browser.storage.local.get("apiKey", (data) => {
        if (data.apiKey) {
            getMovieAnalysis(data.apiKey, request.movieTitle).then(analysis => {
                sendResponse(analysis);
            });
        } else {
            sendResponse({
                "morality_scale": 0,
                "watchability": 0,
                "sexual_activity": [],
                "nudity": [],
                "kissing": [{ "timestamp": "N/A", "hint": "API Key not set. Click the extension icon to set it." }]
            });
        }
    });
    return true; // Indicates we will send a response asynchronously
  }
});
