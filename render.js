// ── Ubuntu Media · public page renderers ─────────────────────────────────
// Runs after appwrite-client.js has set up window.UbuntuAppwrite.
// Each renderer only does anything if its target container exists on the
// current page, so this one file can be included on every page safely.

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function truncate(str, n) {
  const s = String(str ?? "");
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

// ================= BOARD =================
let boardData = [];

function boardCardHTML(m, fileUrl) {
  const photo = m.photo_file_id ? fileUrl(m.photo_file_id) : "";
  return `
    <div class="board-card">
      <div class="card-media" ${photo ? `style="background-image:url('${esc(photo)}')"` : ""}></div>
      <div class="card-body">
        <h3>${esc(m.name)}</h3>
        <span class="tc">${esc(m.role)}</span>
        <p class="excerpt">${esc(truncate(m.bio || "", 100))}</p>
        <div class="card-actions">
          <button class="view-details-btn" data-id="${m.$id}">View details</button>
        </div>
      </div>
    </div>`;
}

function renderBoardList(list) {
  const grid = document.getElementById("board-grid");
  const { fileUrl } = window.UbuntuAppwrite;
  if (!list.length) { grid.innerHTML = `<p class="lede content-empty">No board members match your search.</p>`; return; }
  grid.innerHTML = list.map(m => boardCardHTML(m, fileUrl)).join("");
  grid.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", () => openBoardDetail(btn.dataset.id)));
}

function openBoardDetail(id) {
  const m = boardData.find(r => r.$id === id);
  if (!m) return;
  const { fileUrl } = window.UbuntuAppwrite;
  window.UbuntuUI.openModal({
    title: m.name,
    meta: m.role,
    description: m.bio,
    images: m.photo_file_id ? [fileUrl(m.photo_file_id)] : []
  });
}

async function renderBoard() {
  const grid = document.getElementById("board-grid");
  if (!grid) return;
  const { tablesDB, cfg, Query } = window.UbuntuAppwrite;
  grid.innerHTML = window.UbuntuUI.spinnerHTML("Loading board members…");
  try {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId,
      tableId: cfg.tables.boardMembers,
      queries: [Query.orderAsc("order"), Query.limit(100)]
    });
    boardData = res.rows;
    if (!boardData.length) { grid.innerHTML = `<p class="lede">Board members will appear here soon.</p>`; return; }
    renderBoardList(boardData);
    wireToolbar("board", boardData, (q) => boardData.filter(m =>
      (m.name || "").toLowerCase().includes(q) || (m.role || "").toLowerCase().includes(q)
    ), renderBoardList);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="lede">Couldn't load board members right now.</p>`;
  }
}

// ================= EVENTS =================
let eventsData = [];

function eventCardHTML(ev, fileUrl) {
  const photos = ev.photo_file_ids || [];
  const cover = photos[0] ? fileUrl(photos[0]) : "";
  return `
    <article class="event-card">
      <div class="card-media" ${cover ? `style="background-image:url('${esc(cover)}')"` : ""}>
        ${ev.date_label ? `<span class="card-badge">${esc(ev.date_label)}</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${esc(ev.title)}</h3>
        ${ev.description ? `<p class="excerpt">${esc(truncate(ev.description, 110))}</p>` : ""}
        <div class="card-actions">
          <button class="view-details-btn" data-id="${ev.$id}">View details</button>
        </div>
      </div>
    </article>`;
}

function renderEventsList(list) {
  const el = document.getElementById("events-list");
  const { fileUrl } = window.UbuntuAppwrite;
  if (!list.length) { el.innerHTML = `<p class="lede content-empty">No events match your search.</p>`; return; }
  el.innerHTML = list.map(ev => eventCardHTML(ev, fileUrl)).join("");
  el.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", () => openEventDetail(btn.dataset.id)));
}

function openEventDetail(id) {
  const ev = eventsData.find(r => r.$id === id);
  if (!ev) return;
  const { fileUrl } = window.UbuntuAppwrite;
  const images = (ev.photo_file_ids || []).map(fileUrl);
  window.UbuntuUI.openModal({
    title: ev.title,
    meta: ev.date_label,
    description: ev.description,
    images
  });
}

async function renderEvents() {
  const list = document.getElementById("events-list");
  if (!list) return;
  const { tablesDB, cfg, Query } = window.UbuntuAppwrite;
  list.innerHTML = window.UbuntuUI.spinnerHTML("Loading events…");
  try {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId,
      tableId: cfg.tables.events,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)]
    });
    eventsData = res.rows;
    if (!eventsData.length) { list.innerHTML = `<p class="lede">No events on the calendar yet, check back soon.</p>`; return; }
    renderEventsList(eventsData);
    wireToolbar("events", eventsData, (q) => eventsData.filter(ev =>
      (ev.title || "").toLowerCase().includes(q) || (ev.description || "").toLowerCase().includes(q) || (ev.date_label || "").toLowerCase().includes(q)
    ), renderEventsList);
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="lede">Couldn't load events right now.</p>`;
  }
}

// ================= STORIES =================
let storiesData = [];

function storyCardHTML(st, youtubeId) {
  const yid = youtubeId(st.youtube_link);
  const thumb = yid ? `https://img.youtube.com/vi/${yid}/hqdefault.jpg` : "";
  return `
    <article class="story-card">
      <div class="card-media" ${thumb ? `style="background-image:url('${esc(thumb)}')"` : ""}></div>
      <div class="card-body">
        <h3>${esc(st.title)}</h3>
        ${st.description ? `<p class="excerpt">${esc(truncate(st.description, 110))}</p>` : ""}
        <div class="card-actions">
          <button class="view-details-btn" data-id="${st.$id}">View details</button>
        </div>
      </div>
    </article>`;
}

function renderStoriesList(list) {
  const grid = document.getElementById("stories-grid");
  const { youtubeId } = window.UbuntuAppwrite;
  if (!list.length) { grid.innerHTML = `<p class="lede content-empty">No stories match your search.</p>`; return; }
  grid.innerHTML = list.map(st => storyCardHTML(st, youtubeId)).join("");
  grid.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", () => openStoryDetail(btn.dataset.id)));
}

function openStoryDetail(id) {
  const st = storiesData.find(r => r.$id === id);
  if (!st) return;
  const { youtubeId } = window.UbuntuAppwrite;
  const yid = youtubeId(st.youtube_link);
  window.UbuntuUI.openModal({
    title: st.title,
    description: st.description,
    videoEmbedUrl: yid ? `https://www.youtube.com/embed/${yid}` : null,
    extraHTML: !yid ? `<a href="${esc(st.youtube_link)}" target="_blank" rel="noopener">Watch this story →</a>` : ""
  });
}

async function renderStories() {
  const grid = document.getElementById("stories-grid");
  if (!grid) return;
  const { tablesDB, cfg, Query } = window.UbuntuAppwrite;
  grid.innerHTML = window.UbuntuUI.spinnerHTML("Loading stories…");
  try {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId,
      tableId: cfg.tables.stories,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)]
    });
    storiesData = res.rows;
    if (!storiesData.length) { grid.innerHTML = `<p class="lede">Stories will appear here soon.</p>`; return; }
    renderStoriesList(storiesData);
    wireToolbar("stories", storiesData, (q) => storiesData.filter(st =>
      (st.title || "").toLowerCase().includes(q) || (st.description || "").toLowerCase().includes(q)
    ), renderStoriesList);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="lede">Couldn't load stories right now.</p>`;
  }
}

// ================= PODCAST EPISODES =================
let episodesData = [];
let episodesByPlaylist = {};

function platformLabel(p) {
  return { youtube: "YouTube", spotify: "Spotify", apple: "Apple Podcasts", other: "Listen" }[p] || "Listen";
}

function episodeCardHTML(ep, youtubeThumb) {
  const cover = (ep.listen_urls || []).map(youtubeThumb).find(Boolean) || "";
  const childCount = ep.is_playlist ? (episodesByPlaylist[ep.$id]?.length || 0) : 0;
  return `
    <article class="episode-card">
      <div class="card-media" ${cover ? `style="background-image:url('${esc(cover)}')"` : ""}>
        ${ep.is_playlist ? `<span class="card-badge">Playlist · ${childCount} episode${childCount === 1 ? "" : "s"}</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${esc(ep.title)}</h3>
        ${ep.description ? `<p class="excerpt">${esc(truncate(ep.description, 100))}</p>` : ""}
        <div class="card-actions">
          <button class="view-details-btn" data-id="${ep.$id}">View details</button>
        </div>
      </div>
    </article>`;
}

function renderEpisodesList(list) {
  const grid = document.getElementById("episodes-grid");
  const { youtubeThumb } = window.UbuntuAppwrite;
  if (!list.length) { grid.innerHTML = `<p class="lede content-empty">No episodes match your search.</p>`; return; }
  grid.innerHTML = list.map(ep => episodeCardHTML(ep, youtubeThumb)).join("");
  grid.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", () => openEpisodeDetail(btn.dataset.id)));
}

function openEpisodeDetail(id) {
  const ep = episodesData.find(r => r.$id === id);
  if (!ep) return;
  const { youtubeThumb } = window.UbuntuAppwrite;
  const links = (ep.listen_platforms || []).map((p, i) => {
    const url = (ep.listen_urls || [])[i];
    return url ? `<a class="pod-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(platformLabel(p))}</a>` : "";
  }).join(" &nbsp;·&nbsp; ");
  const cover = (ep.listen_urls || []).map(youtubeThumb).find(Boolean);
  const children = ep.is_playlist ? (episodesByPlaylist[ep.$id] || []) : [];
  const childrenHTML = children.length
    ? `<div class="episode-links" style="margin-top:14px;"><strong>${children.length} episode${children.length === 1 ? "" : "s"} in this playlist</strong></div>`
    : "";
  window.UbuntuUI.openModal({
    title: ep.title,
    meta: ep.is_playlist ? "Playlist" : "Episode",
    description: ep.description,
    images: cover ? [cover] : [],
    extraHTML: `<div class="episode-links" style="margin-top:10px;">${links}</div>${childrenHTML}`
  });
}

async function renderPodcastEpisodes() {
  const grid = document.getElementById("episodes-grid");
  if (!grid) return;
  const { tablesDB, cfg, Query } = window.UbuntuAppwrite;
  grid.innerHTML = window.UbuntuUI.spinnerHTML("Loading episodes…");
  try {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId,
      tableId: cfg.tables.podcastEpisodes,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)]
    });
    episodesByPlaylist = {};
    res.rows.forEach(e => { if (e.playlist_id) (episodesByPlaylist[e.playlist_id] ??= []).push(e); });
    episodesData = res.rows.filter(e => !e.playlist_id); // standalone + playlist headers only
    if (!episodesData.length) { grid.innerHTML = `<p class="lede">Episodes will appear here soon.</p>`; return; }
    renderEpisodesList(episodesData);
    wireToolbar("pod", episodesData, applyPodFilters, renderEpisodesList);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="lede">Couldn't load episodes right now.</p>`;
  }
}

function applyPodFilters(q) {
  const platformSel = document.getElementById("pod-filter");
  const platform = platformSel ? platformSel.value : "";
  return episodesData.filter(ep => {
    const matchesQ = !q || (ep.title || "").toLowerCase().includes(q) || (ep.description || "").toLowerCase().includes(q);
    const matchesPlatform = !platform || (ep.listen_platforms || []).includes(platform);
    return matchesQ && matchesPlatform;
  });
}

// ================= shared search/filter toolbar wiring =================
// prefix: id prefix used in the HTML ("board", "events", "stories", "pod")
// filterFn(query): returns the filtered array given a lowercase query string
// renderFn(list): re-renders the grid with the given list
function wireToolbar(prefix, data, filterFn, renderFn) {
  const searchInput = document.getElementById(`${prefix}-search`);
  const filterSelect = document.getElementById(`${prefix}-filter`);
  if (!searchInput && !filterSelect) return;
  const apply = () => {
    const q = (searchInput?.value || "").trim().toLowerCase();
    renderFn(filterFn(q));
  };
  if (searchInput) searchInput.addEventListener("input", apply);
  if (filterSelect) filterSelect.addEventListener("change", apply);
}

function run() {
  renderBoard();
  renderEvents();
  renderStories();
  renderPodcastEpisodes();
}

if (window.UbuntuAppwrite) run();
else document.addEventListener("ubuntu-appwrite-ready", run, { once: true });
