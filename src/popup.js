
// load the data
async function loadFakeSession() {
  const res = await fetch(chrome.runtime.getURL("data/fakeSession.json"));
  return res.json();
}

// redenr the graph 
function renderGraph(session) {
  const { nodes, links } = window.SpiderwebModel.sessionToGraph(session);

  document.getElementById("sessionTitle").textContent = session.title;

  const svg = d3.select("#graph");
  //replace old graph
  svg.selectAll("*").remove();

  const width = 420;
  const height = 340;

  // build arrow
  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 39)
    .attr("refY", 0)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
    .attr("class", "link-arrow")
    .attr("fill", "#e23636")
    .attr("d", "M0,-5L10,0L0,5");

    // makes the circle size accoridng to who talked the most
  const maxTalk = d3.max(nodes, (d) => d.value) || 1;
  const radius = d3.scaleSqrt().domain([0, maxTalk]).range([14, 32]);

  // Each interruption is its own link now (no weight aggregation), so
  // repeated source->target pairs would draw exactly on top of each
  // other. Group them and give each one an index/count so the tick
  // handler can fan them into separate curves.
  groupParallelLinks(links);

  // physical simulation of movement
  const sim = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-260))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide((d) => radius(d.value) + 18))
    .force("link", d3.forceLink(links).id((d) => d.id).distance(120));

    // create path look
  const link = svg.append("g")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", "link")
    .attr("stroke-width", 2.5)
    .attr("marker-end", "url(#arrow)");

  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(sim));

  const SPIDEY_COLORS = ["#e23636", "#1b3f8b"]; // red / blue, alternating per speaker

  node.append("circle")
    .attr("r", (d) => radius(d.value))
    .attr("fill", (d, i) => SPIDEY_COLORS[i % SPIDEY_COLORS.length]);

  node.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 4)
    .text((d) => d.name);

  // see EVERY nodes position (to avoid overalp)
  sim.on("tick", () => {
    link.attr("d", (d) => linkPath(d, nodes, radius));
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  renderTalkTimeBar(nodes);
}

function renderTalkTimeBar(nodes) {
  const bar = document.getElementById("talkTimeBar");
  bar.innerHTML = "";
  const max = d3.max(nodes, (d) => d.value) || 1;

  for (const n of [...nodes].sort((a, b) => b.value - a.value)) {
    console.log(max);
    const row = document.createElement("div");
    row.className = "talk-row";
    row.innerHTML = `
      <span class="name">${n.name}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(n.value / max) * 100}%"></span></span>
      <span class="seconds">${Math.round(n.value)}s</span>
    `;
    bar.appendChild(row);
  }
}

// Tags each link with linkIndex/linkCount among links sharing the same
// ordered source->target pair, so linkPath() can offset duplicates apart.
function groupParallelLinks(links) {
  const pairGroups = new Map();
  links.forEach((l) => {
    const key = `${l.source}->${l.target}`;
    if (!pairGroups.has(key)) pairGroups.set(key, []);
    pairGroups.get(key).push(l);
  });
  pairGroups.forEach((group) => {
    group.forEach((l, i) => {
      l.linkIndex = i;
      l.linkCount = group.length;
    });
  });
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return { dist: Math.hypot(px - cx, py - cy), t };
}

// Straight line when a pair has only one interruption between them and
// nothing else is in the way; a quadratic curve otherwise. Curvature
// comes from two sources, added together:
//   1. fan-out — separates duplicate links between the same pair
//   2. avoidance — bends the line away from any OTHER node whose circle
//      the straight path would otherwise cut through
function linkPath(d, allNodes, radiusScale) {
  const dx = d.target.x - d.source.x;
  const dy = d.target.y - d.source.y;
  const dr = Math.hypot(dx, dy) || 1;
  const nx = -dy / dr; // unit vector perpendicular to the line
  const ny = dx / dr;

  const mid = (d.linkCount - 1) / 2;
  let curvature = (d.linkIndex - mid) * 22;

  const clearance = 14; // extra px beyond a node's radius to route around it
  for (const n of allNodes) {
    if (n.id === d.source.id || n.id === d.target.id) continue;
    const { dist, t } = distanceToSegment(n.x, n.y, d.source.x, d.source.y, d.target.x, d.target.y);
    if (t <= 0.05 || t >= 0.95) continue; // node is out past the endpoints, ignore
    const needed = radiusScale(n.value) + clearance;
    if (dist < needed) {
      const cross = dx * (n.y - d.source.y) - dy * (n.x - d.source.x);
      const side = cross > 0 ? -1 : 1; // bend away from whichever side the node is on
      curvature += side * (needed - dist + 16);
    }
  }

  if (curvature === 0) {
    return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
  }

  const mx = (d.source.x + d.target.x) / 2;
  const my = (d.source.y + d.target.y) / 2;
  const cx = mx + nx * curvature;
  const cy = my + ny * curvature;

  return `M${d.source.x},${d.source.y} Q${cx},${cy} ${d.target.x},${d.target.y}`;
}

function drag(sim) {
  function started(event, d) {
    if (!event.active) sim.alphaTarget(0.2).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function ended(event, d) {
    if (!event.active) sim.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3.drag().on("start", started).on("drag", dragged).on("end", ended);
}

loadFakeSession().then(renderGraph);

// TODO (step 4 of the build plan): replace loadFakeSession() with either
//   a) chrome.storage.local.get("latestSession") after content.js/Web
//      Speech API writes a real session there, or
//   b) a chrome.runtime.onMessage listener that receives live utterance
//      events and re-renders incrementally instead of loading once.
