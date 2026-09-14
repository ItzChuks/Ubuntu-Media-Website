// ── Ubuntu Media · admin dashboard ────────────────────────────────────────
"use strict";

function boot() {
  const { account, tablesDB, storage, cfg, ID, Query } = window.UbuntuAppwrite;

  const loginScreen = document.getElementById("loginScreen");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const signOutBtn = document.getElementById("signOutBtn");

  // ---------- auth ----------
  async function checkAuth() {
    try {
      await account.get();
      loginScreen.style.display = "none";
      dashboard.style.display = "block";
      loadAll();
    } catch {
      loginScreen.style.display = "flex";
      dashboard.style.display = "none";
    }
  }

  const { setBtnLoading, resetBtn } = window.UbuntuUI;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    setBtnLoading(submitBtn, "Signing in…");
    try {
      await account.createEmailPasswordSession({ email, password });
      await checkAuth();
    } catch (err) {
      loginError.textContent = err.message || "Couldn't sign in. Check your email and password.";
    } finally {
      resetBtn(submitBtn);
    }
  });

  signOutBtn.addEventListener("click", async () => {
    setBtnLoading(signOutBtn, "Signing out…");
    try { await account.deleteSession({ sessionId: "current" }); } catch {}
    await checkAuth();
    resetBtn(signOutBtn);
  });

  // ---------- tabs ----------
  const tabButtons = document.querySelectorAll(".admin-tab");
  const panels = document.querySelectorAll(".admin-panel");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  async function uploadFile(file) {
    if (!file) return null;
    const res = await storage.createFile({ bucketId: cfg.bucketId, fileId: ID.unique(), file });
    return res.$id;
  }

  async function deleteFileSafe(fileId) {
    if (!fileId) return;
    try { await storage.deleteFile({ bucketId: cfg.bucketId, fileId }); } catch {}
  }

  function loadAll() {
    loadBoard();
    loadEvents();
    loadStories();
    loadPodcasts();
  }

  // ================= BOARD MEMBERS =================
  const boardForm = document.getElementById("boardForm");
  const boardList = document.getElementById("boardCurrentList");
  const boardCount = document.getElementById("boardCount");
  let editingBoardId = null;

  async function loadBoard() {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId, tableId: cfg.tables.boardMembers,
      queries: [Query.orderAsc("order"), Query.limit(200)]
    });
    boardCount.textContent = res.rows.length;
    boardList.innerHTML = res.rows.map((m) => `
      <div class="admin-item">
        <img class="admin-thumb round" src="${m.photo_file_id ? esc(storage.getFileView({ bucketId: cfg.bucketId, fileId: m.photo_file_id })) : ''}" alt="">
        <div class="admin-item-info">
          <strong>${esc(m.name)}</strong>
          <span>${esc(m.role)}</span>
        </div>
        <div class="admin-item-actions">
          <button class="link-btn" data-edit="${m.$id}">Edit</button>
          <button class="danger-btn" data-delete="${m.$id}">Delete</button>
        </div>
      </div>`).join("") || `<p class="admin-empty">No board members yet.</p>`;

    boardList.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editBoard(btn.dataset.edit, res.rows)));
    boardList.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteBoard(btn.dataset.delete, res.rows, btn)));
  }

  function editBoard(id, rows) {
    const m = rows.find((r) => r.$id === id);
    if (!m) return;
    editingBoardId = id;
    document.getElementById("boardName").value = m.name || "";
    document.getElementById("boardRole").value = m.role || "";
    document.getElementById("boardBio").value = m.bio || "";
    document.getElementById("boardFormTitle").textContent = "Edit board member";
    document.getElementById("boardSubmitBtn").textContent = "Save changes";
    window.scrollTo({ top: boardForm.offsetTop - 100, behavior: "smooth" });
  }

  async function deleteBoard(id, rows, btn) {
    if (!confirm("Delete this board member?")) return;
    setBtnLoading(btn, "Deleting…");
    try {
      const m = rows.find((r) => r.$id === id);
      await tablesDB.deleteRow({ databaseId: cfg.databaseId, tableId: cfg.tables.boardMembers, rowId: id });
      if (m?.photo_file_id) await deleteFileSafe(m.photo_file_id);
      loadBoard();
    } catch (err) {
      alert(err.message || "Couldn't delete this board member.");
      resetBtn(btn);
    }
  }

  boardForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("boardSubmitBtn");
    setBtnLoading(submitBtn, editingBoardId ? "Saving…" : "Adding…");
    try {
      const name = document.getElementById("boardName").value.trim();
      const role = document.getElementById("boardRole").value.trim();
      const bio = document.getElementById("boardBio").value.trim();
      const file = document.getElementById("boardPhoto").files[0];
      const data = { name, role, bio, order: 0 };
      if (file) data.photo_file_id = await uploadFile(file);

      if (editingBoardId) {
        await tablesDB.updateRow({ databaseId: cfg.databaseId, tableId: cfg.tables.boardMembers, rowId: editingBoardId, data });
      } else {
        await tablesDB.createRow({ databaseId: cfg.databaseId, tableId: cfg.tables.boardMembers, rowId: ID.unique(), data });
      }
      resetBtn(submitBtn);
      resetBoardForm();
      loadBoard();
    } catch (err) {
      alert(err.message || "Couldn't save this board member.");
      resetBtn(submitBtn);
    }
  });

  document.getElementById("boardCancelEdit").addEventListener("click", resetBoardForm);
  function resetBoardForm() {
    editingBoardId = null;
    boardForm.reset();
    document.getElementById("boardFormTitle").textContent = "Add a board member";
    document.getElementById("boardSubmitBtn").textContent = "Save member";
  }

  // ================= EVENTS =================
  const eventForm = document.getElementById("eventForm");
  const eventList = document.getElementById("eventCurrentList");
  const eventCount = document.getElementById("eventCount");
  let editingEventId = null;

  async function loadEvents() {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId, tableId: cfg.tables.events,
      queries: [Query.orderDesc("$createdAt"), Query.limit(200)]
    });
    eventCount.textContent = res.rows.length;
    eventList.innerHTML = res.rows.map((ev) => {
      const cover = (ev.photo_file_ids || [])[0];
      return `
      <div class="admin-item">
        <img class="admin-thumb" src="${cover ? esc(storage.getFileView({ bucketId: cfg.bucketId, fileId: cover })) : ''}" alt="">
        <div class="admin-item-info">
          <strong>${esc(ev.title)}</strong>
          <span>${esc(ev.date_label || "")} ${(ev.photo_file_ids || []).length ? `· ${ev.photo_file_ids.length} photo(s)` : ""}</span>
        </div>
        <div class="admin-item-actions">
          <button class="link-btn" data-edit="${ev.$id}">Edit</button>
          <button class="danger-btn" data-delete="${ev.$id}">Delete</button>
        </div>
      </div>`;
    }).join("") || `<p class="admin-empty">No events yet.</p>`;

    eventList.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editEvent(btn.dataset.edit, res.rows)));
    eventList.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteEvent(btn.dataset.delete, res.rows, btn)));
  }

  function editEvent(id, rows) {
    const ev = rows.find((r) => r.$id === id);
    if (!ev) return;
    editingEventId = id;
    document.getElementById("eventTitle").value = ev.title || "";
    document.getElementById("eventDateLabel").value = ev.date_label || "";
    document.getElementById("eventDescription").value = ev.description || "";
    document.getElementById("eventFormTitle").textContent = "Edit event";
    document.getElementById("eventSubmitBtn").textContent = "Save changes";
    window.scrollTo({ top: eventForm.offsetTop - 100, behavior: "smooth" });
  }

  async function deleteEvent(id, rows, btn) {
    if (!confirm("Delete this event?")) return;
    setBtnLoading(btn, "Deleting…");
    try {
      const ev = rows.find((r) => r.$id === id);
      await tablesDB.deleteRow({ databaseId: cfg.databaseId, tableId: cfg.tables.events, rowId: id });
      for (const fid of ev?.photo_file_ids || []) await deleteFileSafe(fid);
      loadEvents();
    } catch (err) {
      alert(err.message || "Couldn't delete this event.");
      resetBtn(btn);
    }
  }

  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("eventSubmitBtn");
    setBtnLoading(submitBtn, editingEventId ? "Saving…" : "Adding…");
    try {
      const title = document.getElementById("eventTitle").value.trim();
      const date_label = document.getElementById("eventDateLabel").value.trim();
      const description = document.getElementById("eventDescription").value.trim();
      const files = Array.from(document.getElementById("eventPhotos").files).slice(0, 5);
      const data = { title, date_label, description };
      if (files.length) data.photo_file_ids = await Promise.all(files.map(uploadFile));

      if (editingEventId) {
        await tablesDB.updateRow({ databaseId: cfg.databaseId, tableId: cfg.tables.events, rowId: editingEventId, data });
      } else {
        await tablesDB.createRow({ databaseId: cfg.databaseId, tableId: cfg.tables.events, rowId: ID.unique(), data });
      }
      resetBtn(submitBtn);
      resetEventForm();
      loadEvents();
    } catch (err) {
      alert(err.message || "Couldn't save this event.");
      resetBtn(submitBtn);
    }
  });

  document.getElementById("eventCancelEdit").addEventListener("click", resetEventForm);
  function resetEventForm() {
    editingEventId = null;
    eventForm.reset();
    document.getElementById("eventPhotoCount").textContent = "0 / 5 photos attached";
    document.getElementById("eventFormTitle").textContent = "Add an event";
    document.getElementById("eventSubmitBtn").textContent = "Save event";
  }
  document.getElementById("eventPhotos").addEventListener("change", (e) => {
    document.getElementById("eventPhotoCount").textContent = `${Math.min(e.target.files.length, 5)} / 5 photos attached`;
  });

  // ================= STORIES =================
  const storyForm = document.getElementById("storyForm");
  const storyList = document.getElementById("storyCurrentList");
  const storyCount = document.getElementById("storyCount");
  let editingStoryId = null;

  async function loadStories() {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId, tableId: cfg.tables.stories,
      queries: [Query.orderDesc("$createdAt"), Query.limit(200)]
    });
    storyCount.textContent = res.rows.length;
    storyList.innerHTML = res.rows.map((st) => {
      const yid = window.UbuntuAppwrite.youtubeId(st.youtube_link);
      return `
      <div class="admin-item">
        <img class="admin-thumb" src="${yid ? `https://img.youtube.com/vi/${yid}/default.jpg` : ''}" alt="">
        <div class="admin-item-info">
          <strong>${esc(st.title)}</strong>
          <span>${esc(st.description || "")}</span>
        </div>
        <div class="admin-item-actions">
          <button class="link-btn" data-edit="${st.$id}">Edit</button>
          <button class="danger-btn" data-delete="${st.$id}">Delete</button>
        </div>
      </div>`;
    }).join("") || `<p class="admin-empty">No stories yet.</p>`;

    storyList.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editStory(btn.dataset.edit, res.rows)));
    storyList.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteStory(btn.dataset.delete, btn)));
  }

  function editStory(id, rows) {
    const st = rows.find((r) => r.$id === id);
    if (!st) return;
    editingStoryId = id;
    document.getElementById("storyYoutubeLink").value = st.youtube_link || "";
    document.getElementById("storyTitle").value = st.title || "";
    document.getElementById("storyDescription").value = st.description || "";
    document.getElementById("storyFormTitle").textContent = "Edit story";
    document.getElementById("storySubmitBtn").textContent = "Save changes";
    window.scrollTo({ top: storyForm.offsetTop - 100, behavior: "smooth" });
  }

  async function deleteStory(id, btn) {
    if (!confirm("Delete this story?")) return;
    setBtnLoading(btn, "Deleting…");
    try {
      await tablesDB.deleteRow({ databaseId: cfg.databaseId, tableId: cfg.tables.stories, rowId: id });
      loadStories();
    } catch (err) {
      alert(err.message || "Couldn't delete this story.");
      resetBtn(btn);
    }
  }

  storyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("storySubmitBtn");
    setBtnLoading(submitBtn, editingStoryId ? "Saving…" : "Adding…");
    try {
      const data = {
        youtube_link: document.getElementById("storyYoutubeLink").value.trim(),
        title: document.getElementById("storyTitle").value.trim(),
        description: document.getElementById("storyDescription").value.trim()
      };
      if (editingStoryId) {
        await tablesDB.updateRow({ databaseId: cfg.databaseId, tableId: cfg.tables.stories, rowId: editingStoryId, data });
      } else {
        await tablesDB.createRow({ databaseId: cfg.databaseId, tableId: cfg.tables.stories, rowId: ID.unique(), data });
      }
      resetBtn(submitBtn);
      resetStoryForm();
      loadStories();
    } catch (err) {
      alert(err.message || "Couldn't save this story.");
      resetBtn(submitBtn);
    }
  });

  document.getElementById("storyCancelEdit").addEventListener("click", resetStoryForm);
  function resetStoryForm() {
    editingStoryId = null;
    storyForm.reset();
    document.getElementById("storyFormTitle").textContent = "Add a story";
    document.getElementById("storySubmitBtn").textContent = "Save story";
  }

  // ================= PODCASTS =================
  const podForm = document.getElementById("podForm");
  const podList = document.getElementById("podCurrentList");
  const podCount = document.getElementById("podCount");
  const podLinksWrap = document.getElementById("podLinksWrap");
  const podPlaylistSelect = document.getElementById("podPlaylistSelect");
  const podIsPlaylist = document.getElementById("podIsPlaylist");
  let editingPodId = null;
  let allPodRows = [];

  function addLinkRow(platform = "youtube", url = "") {
    const row = document.createElement("div");
    row.className = "pod-link-row";
    row.innerHTML = `
      <select class="pod-link-platform">
        <option value="youtube" ${platform === "youtube" ? "selected" : ""}>YouTube</option>
        <option value="spotify" ${platform === "spotify" ? "selected" : ""}>Spotify</option>
        <option value="apple" ${platform === "apple" ? "selected" : ""}>Apple Podcasts</option>
        <option value="other" ${platform === "other" ? "selected" : ""}>Other</option>
      </select>
      <input type="url" class="pod-link-url" placeholder="https://www.youtube.com/watch?v=..." value="${url.replace(/"/g, "&quot;")}">
      <button type="button" class="link-btn pod-link-remove">Remove</button>
    `;
    row.querySelector(".pod-link-remove").addEventListener("click", () => {
      if (podLinksWrap.children.length > 1) row.remove();
    });
    podLinksWrap.appendChild(row);
  }
  document.getElementById("podAddLink").addEventListener("click", () => addLinkRow());

  function refreshPlaylistOptions(excludeId = null) {
    const playlists = allPodRows.filter((r) => r.is_playlist && r.$id !== excludeId);
    podPlaylistSelect.innerHTML = `<option value="">— Standalone episode —</option>` +
      playlists.map((p) => `<option value="${p.$id}">${esc(p.title)}</option>`).join("");
  }

  async function loadPodcasts() {
    const res = await tablesDB.listRows({
      databaseId: cfg.databaseId, tableId: cfg.tables.podcastEpisodes,
      queries: [Query.orderDesc("$createdAt"), Query.limit(200)]
    });
    allPodRows = res.rows;
    podCount.textContent = res.rows.length;
    refreshPlaylistOptions();
    podList.innerHTML = res.rows.map((ep) => {
      const platform = (ep.listen_platforms || [])[0] || "other";
      const url = (ep.listen_urls || [])[0] || "";
      const yid = platform === "youtube" ? window.UbuntuAppwrite.youtubeId(url) : null;
      return `
      <div class="admin-item">
        <img class="admin-thumb round" src="${yid ? `https://img.youtube.com/vi/${yid}/default.jpg` : ''}" alt="">
        <div class="admin-item-info">
          <span class="admin-tag">${esc(platform.toUpperCase())}${ep.is_playlist ? " · PLAYLIST" : ""}</span>
          <strong>${esc(ep.title)}</strong>
          <span>${esc(ep.description || "")}</span>
        </div>
        <div class="admin-item-actions">
          <button class="link-btn" data-edit="${ep.$id}">Edit</button>
          <button class="danger-btn" data-delete="${ep.$id}">Delete</button>
        </div>
      </div>`;
    }).join("") || `<p class="admin-empty">No episodes yet.</p>`;

    podList.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editPod(btn.dataset.edit)));
    podList.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deletePod(btn.dataset.delete, btn)));
  }

  function editPod(id) {
    const ep = allPodRows.find((r) => r.$id === id);
    if (!ep) return;
    editingPodId = id;
    podLinksWrap.innerHTML = "";
    const platforms = ep.listen_platforms?.length ? ep.listen_platforms : ["youtube"];
    const urls = ep.listen_urls?.length ? ep.listen_urls : [""];
    platforms.forEach((p, i) => addLinkRow(p, urls[i] || ""));
    podIsPlaylist.checked = !!ep.is_playlist;
    refreshPlaylistOptions(id);
    podPlaylistSelect.value = ep.playlist_id || "";
    document.getElementById("podTitle").value = ep.title || "";
    document.getElementById("podDescription").value = ep.description || "";
    document.getElementById("podFormTitle").textContent = "Edit podcast entry";
    document.getElementById("podSubmitBtn").textContent = "Save changes";
    window.scrollTo({ top: podForm.offsetTop - 100, behavior: "smooth" });
  }

  async function deletePod(id, btn) {
    if (!confirm("Delete this podcast entry?")) return;
    setBtnLoading(btn, "Deleting…");
    try {
      await tablesDB.deleteRow({ databaseId: cfg.databaseId, tableId: cfg.tables.podcastEpisodes, rowId: id });
      loadPodcasts();
    } catch (err) {
      alert(err.message || "Couldn't delete this entry.");
      resetBtn(btn);
    }
  }

  podForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("podSubmitBtn");
    setBtnLoading(submitBtn, editingPodId ? "Saving…" : "Adding…");
    try {
      const platforms = Array.from(podLinksWrap.querySelectorAll(".pod-link-platform")).map((s) => s.value);
      const urls = Array.from(podLinksWrap.querySelectorAll(".pod-link-url")).map((i) => i.value.trim());
      const data = {
        title: document.getElementById("podTitle").value.trim(),
        description: document.getElementById("podDescription").value.trim(),
        is_playlist: podIsPlaylist.checked,
        playlist_id: podPlaylistSelect.value || null,
        listen_platforms: platforms,
        listen_urls: urls
      };
      if (editingPodId) {
        await tablesDB.updateRow({ databaseId: cfg.databaseId, tableId: cfg.tables.podcastEpisodes, rowId: editingPodId, data });
      } else {
        await tablesDB.createRow({ databaseId: cfg.databaseId, tableId: cfg.tables.podcastEpisodes, rowId: ID.unique(), data });
      }
      resetBtn(submitBtn);
      resetPodForm();
      loadPodcasts();
    } catch (err) {
      alert(err.message || "Couldn't save this entry.");
      resetBtn(submitBtn);
    }
  });

  document.getElementById("podCancelEdit").addEventListener("click", resetPodForm);
  function resetPodForm() {
    editingPodId = null;
    podForm.reset();
    podLinksWrap.innerHTML = "";
    addLinkRow();
    refreshPlaylistOptions();
    document.getElementById("podFormTitle").textContent = "Add to the podcast";
    document.getElementById("podSubmitBtn").textContent = "Save";
  }
  addLinkRow(); // seed one row on first load

  checkAuth();
}

if (window.UbuntuAppwrite) boot();
else document.addEventListener("ubuntu-appwrite-ready", boot, { once: true });
