# Conversation Spiderweb — skeleton

Working skeleton for step 1 and step 3 of the build plan: a force-directed
"spiderweb" graph rendering from fake data, inside a real Chrome extension
shell. Nothing here does live capture yet — that's intentional, see below.

## Run it

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**, select this folder
4. Click the extension icon in your toolbar — you'll see a spiderweb
   rendered from `data/fakeSession.json`

Node size = total talk time. Arrows = who interrupted whom, arrow
thickness = how many times.

## How it's organized

```
manifest.json        MV3 config
lib/d3.min.js         D3 bundled locally (extension pages can't load
                       remote scripts — CSP blocks CDNs like unpkg)
data/fakeSession.json Stand-in for a real recorded session
src/model.js           sessionToGraph() — the one function that turns a
                       session into nodes/links. Every future data source
                       must produce a "session" shaped object; nothing else
                       needs to change if you keep that contract.
src/popup.html/.css/.js  The graph UI (what you see in the toolbar popup)
src/background.js      Service worker stub — will hold session state later
src/content.js          Stub for future DOM-based speaker detection
```

## Where to go next (matches the build plan from before)

The riskiest, most fragile part of this whole project is DOM-scraping a
meeting platform to detect who's talking — that DOM changes without
notice and isn't yours to depend on. So the recommended order is:

1. **This skeleton** — done. Graph renders from fake data. ✅
2. **Real capture, the easy way first**: wire up the Web Speech API
   (`SpeechRecognition`) on your own mic from inside the popup or a
   dedicated tab, and turn transcription events into `utterances` matching
   the shape in `model.js`. This gets you a real end-to-end loop —
   record → parse → render — without touching anyone else's DOM.
3. **Persistence**: send each session to Supabase/Firebase
   (`sessions` table, owner_id, JSONB payload) instead of just holding it
   in `chrome.storage.local`.
4. **Auth**: Google OAuth via `chrome.identity`, since you're already in
   a Chrome extension.
5. **Sharing**: a read-only web view (separate small Next.js app) that
   renders a session by public ID — the same `sessionToGraph()` logic,
   reused server-side or in-browser.
6. **DOM-based multi-speaker detection** — only after everything above
   works for a single mic source. Treat this as a stretch goal, not v1.
   `src/content.js` has notes on where to start when you get there.

## A decision to make before step 2

Do you want live, in-call capture (harder, and per-platform DOM work
eventually) or post-meeting upload of a recording (much easier: you
control the audio file, can send it to a transcription API, and never
touch a meeting platform's DOM at all)? That choice changes a lot of what
comes after this skeleton — worth deciding before you build further.
