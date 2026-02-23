const DEFAULTS = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  delayMs: 140
};

const els = {
  provider: document.getElementById("provider"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  delayMs: document.getElementById("delayMs"),
  saveBtn: document.getElementById("saveBtn"),
  fixBtn: document.getElementById("fixBtn"),
  status: document.getElementById("status")
};

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.style.color = isError ? "#d33" : "";
}

async function loadSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  els.provider.value = data.provider;
  els.apiKey.value = data.apiKey;
  els.model.value = data.model;
  els.delayMs.value = data.delayMs;
}

async function saveSettings(showMessage = true) {
  const settings = {
    provider: els.provider.value,
    apiKey: els.apiKey.value.trim(),
    model: els.model.value.trim() || (els.provider.value === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini"),
    delayMs: Math.max(30, Number(els.delayMs.value) || DEFAULTS.delayMs)
  };
  await chrome.storage.sync.set(settings);
  if (showMessage) {
    setStatus("Settings saved.");
  }
  return settings;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

els.saveBtn.addEventListener("click", async () => {
  try {
    await saveSettings(true);
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, true);
  }
});

els.fixBtn.addEventListener("click", async () => {
  try {
    const settings = await saveSettings(false);
    if (!settings.apiKey) {
      setStatus("Add your API key first.", true);
      return;
    }

    setStatus("Sending selection for proofreading...");
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    await chrome.tabs.sendMessage(tab.id, {
      type: "proofread-selection",
      settings
    });
    setStatus("Working... keep the cursor focused in the same editor.");
  } catch (error) {
    setStatus(`Could not start: ${error.message}`, true);
  }
});

loadSettings().catch((error) => setStatus(`Load failed: ${error.message}`, true));
