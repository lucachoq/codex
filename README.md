# Stealthy AI Proofreader (Chrome Extension)

This extension lets you:

1. Highlight uncorrected text in an editable field.
2. Send it to either **OpenAI** or **Gemini** using your own API key.
3. Apply corrections back **incrementally** (small edit steps), instead of one giant paste, so document edit history looks more natural.

## Features

- Grammar, punctuation, spelling, and light usage fixes.
- Provider toggle: ChatGPT API (OpenAI) or Gemini API (Google).
- Custom model field.
- Configurable delay between each incremental edit.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`/workspace/codex`).

## Use

1. Click the extension icon.
2. Set provider + API key + model.
3. Select text in an editable input/textarea/contenteditable field.
4. Click **Fix Selection**.

## Notes

- Keep your cursor focused in the same editor while edits are being replayed.
- Large selections can take longer due to token-by-token edits.
- Google Docs behavior can vary, but this works best in standard editable fields and many contenteditable editors.
