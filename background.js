// Open side panel on icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle all storage operations via messages from sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_WORDS') {
    chrome.storage.local.get(['vocab_words'], (res) => {
      sendResponse({ words: res.vocab_words || [] });
    });
    return true; // keep channel open for async
  }

  if (msg.type === 'SAVE_WORDS') {
    chrome.storage.local.set({ vocab_words: msg.words }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
