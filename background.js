const SYSTEM_PROMPT = `You are a careful proofreader.
Fix grammar, punctuation, spelling, and obvious word-usage issues.
Keep meaning, tone, and formatting as close as possible.
Return ONLY the corrected text with no commentary.`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "proofread-request") {
    return;
  }

  proofreadText(message.payload)
    .then((result) => sendResponse({ ok: true, correctedText: result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function proofreadText(payload) {
  const { provider, apiKey, model, text } = payload;
  if (!text?.trim()) {
    throw new Error("No selected text to proofread.");
  }

  if (provider === "gemini") {
    return callGemini({ apiKey, model, text });
  }

  return callOpenAI({ apiKey, model, text });
}

async function callOpenAI({ apiKey, model, text }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty result.");
  }
  return content;
}

async function callGemini({ apiKey, model, text }) {
  const useModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(useModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: { temperature: 0 },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nText to correct:\n${text}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini error ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!content) {
    throw new Error("Gemini returned an empty result.");
  }
  return content;
}
