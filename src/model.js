/**
 * Shared data contract for a "session".
 *
 * Every capture source (fake data, Web Speech API, future DOM scraping)
 * must ultimately produce an object shaped like this. Keeping this one
 * function as the boundary means the renderer never needs to know where
 * the data came from.
 *
 * Session = {
 *   sessionId: string,
 *   title: string,
 *   speakers: [{ id: string, name: string }],
 *   utterances: [{
 *     speakerId: string,
 *     start: number,
 *     end: number,
 *     interruptedBy: string | null
 *   }]
 * }
 *
 * Turns a session into the node/edge graph D3 needs. Each interruption
 * event becomes its OWN link (not aggregated by weight) — if the same
 * person interrupts the same person three times, you get three link
 * objects. popup.js is responsible for fanning duplicates apart visually
 * so they don't just stack into one invisible line.
 */
function sessionToGraph(session) {
  const talkTime = new Map(session.speakers.map((s) => [s.id, 0]));
  const links = [];

  for (const u of session.utterances) {
    const dur = Math.max(0, u.end - u.start);
    talkTime.set(u.speakerId, (talkTime.get(u.speakerId) || 0) + dur);

    // add each interuption
    if (u.interruptedBy) {
      links.push({ source: u.interruptedBy, target: u.speakerId });
    }
  }

  const nodes = session.speakers.map((s) => ({
    id: s.id,
    name: s.name,
    value: talkTime.get(s.id) || 0,
  }));

  return { nodes, links };
}

window.SpiderwebModel = { sessionToGraph };
