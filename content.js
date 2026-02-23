function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenize(text) {
  return text.split(/(\s+)/);
}

function diffTokens(source, target) {
  const a = tokenize(source);
  const b = tokenize(target);
  const n = a.length;
  const m = b.length;

  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "delete", index: i, value: a[i] });
      i += 1;
    } else {
      ops.push({ type: "insert", index: i, value: b[j] });
      j += 1;
    }
  }

  while (i < n) {
    ops.push({ type: "delete", index: i, value: a[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: "insert", index: i, value: b[j] });
    j += 1;
  }

  return { sourceTokens: a, ops };
}

function buildIntermediateStates(source, corrected) {
  if (source === corrected) {
    return [];
  }

  const { sourceTokens, ops } = diffTokens(source, corrected);
  const states = [];
  const working = [...sourceTokens];
  let offset = 0;

  for (const op of ops) {
    const idx = op.index + offset;
    if (op.type === "delete") {
      if (idx >= 0 && idx < working.length) {
        working.splice(idx, 1);
        offset -= 1;
        states.push(working.join(""));
      }
    } else {
      working.splice(idx, 0, op.value);
      offset += 1;
      states.push(working.join(""));
    }
  }

  if (!states.length || states[states.length - 1] !== corrected) {
    states.push(corrected);
  }

  return states;
}

function getEditableSelection() {
  const active = document.activeElement;

  if (active && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && active.type === "text"))) {
    const start = active.selectionStart;
    let end = active.selectionEnd;
    if (start == null || end == null || start === end) {
      throw new Error("Select text inside the input first.");
    }
    return {
      type: "input",
      element: active,
      text: active.value.slice(start, end),
      apply(nextText) {
        active.setRangeText(nextText, start, end, "select");
        end = start + nextText.length;
        active.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    throw new Error("Select text in an editable field first.");
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const editable = container.nodeType === Node.ELEMENT_NODE
    ? container.closest?.("[contenteditable='true']")
    : container.parentElement?.closest?.("[contenteditable='true']");

  if (!editable) {
    throw new Error("Selection must be inside an editable region.");
  }

  return {
    type: "contenteditable",
    range,
    selection,
    text: range.toString(),
    apply(nextText) {
      range.deleteContents();
      const node = document.createTextNode(nextText);
      range.insertNode(node);
      range.setStartBefore(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: nextText }));
    }
  };
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "proofread-selection") {
    return;
  }

  runProofread(message.settings).catch((error) => {
    console.error("Proofread failed", error);
    alert(`Proofread failed: ${error.message}`);
  });
});

async function runProofread(settings) {
  const target = getEditableSelection();
  const original = target.text;

  const response = await chrome.runtime.sendMessage({
    type: "proofread-request",
    payload: {
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      text: original
    }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Unknown proofreading error.");
  }

  const corrected = response.correctedText;
  const states = buildIntermediateStates(original, corrected);

  for (const state of states) {
    target.apply(state);
    await sleep(settings.delayMs);
  }
}
