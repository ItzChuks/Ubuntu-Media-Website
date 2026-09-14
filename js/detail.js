// ── Ubuntu Media · shared detail page ─────────────────────────────────────
// One page (/detail#type=<board|event|story|episode>&id=<rowId>) handles
// every card type on the site. It shows the full item, then a "related"
// grid of the other items in that same table with a live search box.
// Params live in the hash (not the query string) so they survive a host's
// /detail -> /detail/ clean-URL redirect, which strips query strings but
// never touches the hash. Because navigating between two #hash URLs on the
// same page does NOT reload the document, everything below re-runs on the
// "hashchange" event too (that's how clicking a related card, which only
// changes the hash, still swaps in the new item).
"use strict";

(function () {
  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function platformLabel(p) {
    return { youtube: "YouTube", spotify: "Spotify", apple: "Apple Podcasts", other: "Listen" }[p] || "Listen";
  }

  const TYPES = {
    board:   { table: "boardMembers",    kicker: "Board",    backHref: "/board",   collectionLabel: "board members" },
    event:   { table: "events",          kicker: "Event",     backHref: "/events",  collectionLabel: "events" },
    story:   { table: "stories",         kicker: "Story",     backHref: "/stories", collectionLabel: "stories" },
    episode: { table: "podcastEpisodes", kicker: "Podcast",   backHref: "/podcast", collectionLabel: "episodes" }
  };

  const root = document.getElementById("detail-root");
  const backLink = document.getElementById("detail-back");
  const relatedSection = document.getElementById("related-section");
  const relatedTitle = document.getElementById("related-title");
  const relatedGrid = document.getElementById("related-grid");
  const relatedSearch = document.getElementById("related-search");

  if (!root) return;

  // Per-load state, reset every time the hash (and therefore the item)
  // changes, so a stale row from a previous item never leaks into the next.
  let type = null, id = null, typeCfg = null;
  let allRows = [];
  let baseRelated = [];
  let searchWired = false;

  function mediaFor(row) {
    const { fileUrl, youtubeThumb } = window.UbuntuAppwrite;
    if (type === "board") return row.photo_file_id ? fileUrl(row.photo_file_id) : "";
    if (type === "event") return (row.photo_file_ids || [])[0] ? fileUrl(row.photo_file_ids[0]) : "";
    if (type === "story") return youtubeThumb(row.youtube_link) || "";
    if (type === "episode") return (row.listen_urls || []).map(youtubeThumb).find(Boolean) || "";
    return "";
  }

  function relatedCardHTML(row) {
    const cover = mediaFor(row);
    const title = esc(row.title || row.name || "Untitled");
    return `
      <a class="related-card" href="/detail#type=${type}&id=${encodeURIComponent(row.$id)}">
        <div class="related-media" ${cover ? `style="background-image:url('${esc(cover)}')"` : ""}></div>
        <span>${title}</span>
      </a>`;
  }

  function renderRelated(list) {
    if (!relatedGrid) return;
    if (!list.length) { relatedGrid.innerHTML = `<p class="lede content-empty">Nothing else to show yet.</p>`; return; }
    relatedGrid.innerHTML = list.map(relatedCardHTML).join("");
  }

  function carouselHTML(photos) {
    if (!photos.length) return `<div class="detail-media"></div>`;
    if (photos.length === 1) return `<div class="detail-media" style="background-image:url('${esc(photos[0])}')"></div>`;
    const slides = photos.map(u => `<div class="detail-carousel-slide" style="background-image:url('${esc(u)}')"></div>`).join("");
    const dots = photos.map((_, i) => `<button type="button" class="ub-dot${i === 0 ? " active" : ""}" data-i="${i}" aria-label="Go to image ${i + 1}"></button>`).join("");
    return `
      <div class="detail-carousel" id="eventCarousel">
        <div class="detail-carousel-track" id="eventCarouselTrack">${slides}</div>
        <button type="button" class="detail-carousel-arrow prev" aria-label="Previous image">&#8249;</button>
        <button type="button" class="detail-carousel-arrow next" aria-label="Next image">&#8250;</button>
        <div class="detail-carousel-dots" id="eventCarouselDots">${dots}</div>
        <span class="detail-carousel-count" id="eventCarouselCount">1 / ${photos.length}</span>
      </div>`;
  }

  function wireCarousel(count) {
    const wrap = document.getElementById("eventCarousel");
    if (!wrap || count < 2) return;
    const track = document.getElementById("eventCarouselTrack");
    const dotsWrap = document.getElementById("eventCarouselDots");
    const countEl = document.getElementById("eventCarouselCount");
    let index = 0;
    function goTo(i) {
      index = (i + count) % count;
      track.style.transform = `translateX(-${index * 100}%)`;
      dotsWrap.querySelectorAll(".ub-dot").forEach((d, di) => d.classList.toggle("active", di === index));
      if (countEl) countEl.textContent = `${index + 1} / ${count}`;
    }
    wrap.querySelector(".detail-carousel-arrow.prev").addEventListener("click", () => goTo(index - 1));
    wrap.querySelector(".detail-carousel-arrow.next").addEventListener("click", () => goTo(index + 1));
    dotsWrap.querySelectorAll(".ub-dot").forEach(d => d.addEventListener("click", () => goTo(Number(d.dataset.i))));
    let startX = null;
    wrap.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(dx > 0 ? index - 1 : index + 1);
      startX = null;
    });
  }

  function renderDetail(row) {
    const { fileUrl, youtubeId } = window.UbuntuAppwrite;
    let mediaHTML = "";
    let title = "", meta = "", description = "", extraHTML = "";
    let eventPhotoCount = 0;

    if (type === "board") {
      title = row.name; meta = row.role; description = row.bio;
      const photo = row.photo_file_id ? fileUrl(row.photo_file_id) : "";
      mediaHTML = `<div class="detail-media detail-media--round" ${photo ? `style="background-image:url('${esc(photo)}')"` : ""}></div>`;
    } else if (type === "event") {
      title = row.title; meta = row.date_label; description = row.description;
      const photos = (row.photo_file_ids || []).map(fileUrl).filter(Boolean);
      eventPhotoCount = photos.length;
      mediaHTML = carouselHTML(photos);
    } else if (type === "story") {
      title = row.title; description = row.description;
      const yid = youtubeId(row.youtube_link);
      mediaHTML = yid
        ? `<div class="detail-video"><iframe src="https://www.youtube.com/embed/${yid}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe></div>`
        : `<div class="detail-media"></div>`;
      if (!yid && row.youtube_link) extraHTML += `<a class="btn" href="${esc(row.youtube_link)}" target="_blank" rel="noopener">Watch this story →</a>`;
    } else if (type === "episode") {
      title = row.title; meta = row.is_playlist ? "Playlist" : "Episode"; description = row.description;
      const platforms = row.listen_platforms || [];
      const urls = row.listen_urls || [];
      const videoEmbeds = [];
      const fallbackLinks = [];
      platforms.forEach((p, i) => {
        const url = urls[i];
        if (!url) return;
        const embedSrc = p === "youtube" ? window.UbuntuAppwrite.youtubeEmbedUrl(url) : null;
        if (embedSrc) {
          videoEmbeds.push(`<div class="detail-video"><iframe src="${esc(embedSrc)}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe></div>`);
        } else {
          fallbackLinks.push(`<a class="pod-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(platformLabel(p))}</a>`);
        }
      });

      if (videoEmbeds.length) {
        mediaHTML = videoEmbeds.length > 1
          ? `<div class="detail-video-list">${videoEmbeds.join("")}</div>`
          : videoEmbeds[0];
      } else {
        const cover = urls.map(window.UbuntuAppwrite.youtubeThumb).find(Boolean);
        mediaHTML = `<div class="detail-media" ${cover ? `style="background-image:url('${esc(cover)}')"` : ""}></div>`;
      }
      if (fallbackLinks.length) extraHTML += `<div class="episode-links" style="margin-top:14px;">${fallbackLinks.join(" &nbsp;·&nbsp; ")}</div>`;
      if (row.is_playlist) {
        const children = allRows.filter(r => r.playlist_id === row.$id);
        if (children.length) {
          extraHTML += `<div class="detail-playlist"><h4>${children.length} episode${children.length === 1 ? "" : "s"} in this playlist</h4><ul>${children.map(c => `<li>${esc(c.title)}</li>`).join("")}</ul></div>`;
        }
      }
    }

    document.title = `${title || "Details"} | Ubuntu Media`;
    root.innerHTML = `
      ${mediaHTML}
      <div class="detail-body">
        <span class="tc">${esc(typeCfg.kicker)}${meta ? ` · ${esc(meta)}` : ""}</span>
        <h1>${esc(title)}</h1>
        ${description ? `<p class="detail-desc">${esc(description)}</p>` : ""}
        ${extraHTML}
      </div>`;
    if (type === "event") wireCarousel(eventPhotoCount);
    window.scrollTo(0, 0);
  }

  async function load() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    type = params.get("type");
    id = params.get("id");
    typeCfg = TYPES[type];

    if (relatedSearch) relatedSearch.value = "";
    searchWired = false;

    if (!typeCfg || !id) {
      root.innerHTML = `<p class="lede">We couldn't find that page — it may have been moved.</p>`;
      if (relatedSection) relatedSection.style.display = "none";
      return;
    }
    if (relatedSection) relatedSection.style.display = "";

    if (backLink) backLink.href = typeCfg.backHref;
    if (relatedTitle) relatedTitle.textContent = `More ${typeCfg.collectionLabel}`;
    if (relatedSearch) relatedSearch.placeholder = `Search ${typeCfg.collectionLabel}…`;

    root.innerHTML = window.UbuntuUI.spinnerHTML("Loading…");
    const { tablesDB, cfg, Query } = window.UbuntuAppwrite;
    try {
      const res = await tablesDB.listRows({
        databaseId: cfg.databaseId,
        tableId: cfg.tables[typeCfg.table],
        queries: [Query.limit(100)]
      });
      allRows = res.rows;
      const row = allRows.find(r => r.$id === id);
      if (!row) {
        root.innerHTML = `<p class="lede">This item couldn't be found — it may have been removed.</p>`;
        if (relatedSection) relatedSection.style.display = "none";
        return;
      }
      renderDetail(row);

      baseRelated = (type === "episode" ? allRows.filter(r => !r.playlist_id) : allRows).filter(r => r.$id !== id);
      renderRelated(baseRelated);
      if (relatedSearch && !searchWired) {
        relatedSearch.addEventListener("input", () => {
          const q = relatedSearch.value.trim().toLowerCase();
          const filtered = !q ? baseRelated : baseRelated.filter(r =>
            (r.title || r.name || "").toLowerCase().includes(q) ||
            (r.description || r.bio || r.role || r.date_label || "").toLowerCase().includes(q)
          );
          renderRelated(filtered);
        });
        searchWired = true;
      }
    } catch (e) {
      console.error(e);
      root.innerHTML = `<p class="lede">Couldn't load this right now.</p>`;
    }
  }

  window.addEventListener("hashchange", load);

  if (window.UbuntuAppwrite) load();
  else document.addEventListener("ubuntu-appwrite-ready", load, { once: true });
})();
