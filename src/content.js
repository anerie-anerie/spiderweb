// v0.1 stub — not wired to anything yet.
//
// This is the highest-risk part of the whole project (per the build plan):
// meeting platforms change their DOM constantly, so "detect who's speaking"
// via DOM inspection is inherently brittle. Do NOT start here.
//
// When you do get to this step, the shape of the work is:
//   1. Find the DOM signal Meet/Zoom uses for "this participant is
//      speaking" (usually a class that toggles on an avatar tile).
//   2. Use a MutationObserver to watch for that class toggling.
//   3. Turn on/off events into utterance {start, end} pairs, matching
//      the session data model in model.js.
//   4. chrome.runtime.sendMessage(...) each utterance to background.js.
//
// Until then, popup.js runs entirely on Web Speech API / fake data and
// never needs this file.

console.log("Conversation Spiderweb content script loaded (not yet active).");

// Content script looking for the caption button
const captionButton = document.querySelector('button[aria-label*="Turn on captions"]');
if (captionButton) {
  captionButton.click();
}
