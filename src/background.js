// v0.1 stub. Later this becomes the source of truth for "is a session
// currently recording", since popup.js only runs while the popup is open
// but a service worker can persist state across popup opens/closes.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Conversation Spiderweb installed.");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SESSION_COMPLETE") {
    chrome.storage.local.set({ latestSession: msg.session }, () => {
      console.log("Conversation Spiderweb: session persisted to storage.");
    });
  }
});

// TODO: chrome.runtime.onMessage listener to receive utterance events
// from content.js and/or a Web Speech API capture running in the popup,
// append them to chrome.storage.local, and notify the popup to re-render.
