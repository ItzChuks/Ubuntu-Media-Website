// ── Ubuntu Media · shared UI helpers ──────────────────────────────────────
// Detail modal with image carousel, loading spinners, and button-loading
// states. Loaded before render.js / admin.js on every page that needs them.
"use strict";

(function () {
  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------- detail modal ----------
  let overlay, track, dotsWrap, prevBtn, nextBtn, titleEl, metaEl, descEl, extraEl, videoWrap, carouselWrap;
  let slides = [];
  let slideIndex = 0;

  function buildModal() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "ub-modal-overlay";
    overlay.innerHTML = `
      <div class="ub-modal" role="dialog" aria-modal="true">
        <button class="ub-modal-close" type="button" aria-label="Close">&times;</button>
        <div class="ub-modal-video" id="ubModalVideo"></div>
        <div class="ub-modal-carousel" id="ubModalCarousel">
          <div class="ub-modal-track" id="ubModalTrack"></div>
          <button class="ub-carousel-arrow prev" type="button" aria-label="Previous image">&#8249;</button>
          <button class="ub-carousel-arrow next" type="button" aria-label="Next image">&#8250;</button>
          <div class="ub-carousel-dots" id="ubModalDots"></div>
        </div>
        <div class="ub-modal-body">
          <span class="tc" id="ubModalMeta"></span>
          <h3 id="ubModalTitle"></h3>
          <p id="ubModalDesc"></p>
          <div id="ubModalExtra"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    track = overlay.querySelector("#ubModalTrack");
    dotsWrap = overlay.querySelector("#ubModalDots");
    prevBtn = overlay.querySelector(".ub-carousel-arrow.prev");
    nextBtn = overlay.querySelector(".ub-carousel-arrow.next");
    titleEl = overlay.querySelector("#ubModalTitle");
    metaEl = overlay.querySelector("#ubModalMeta");
    descEl = overlay.querySelector("#ubModalDesc");
    extraEl = overlay.querySelector("#ubModalExtra");
    videoWrap = overlay.querySelector("#ubModalVideo");
    carouselWrap = overlay.querySelector("#ubModalCarousel");

    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    overlay.querySelector(".ub-modal-close").addEventListener("click", closeModal);
    prevBtn.addEventListener("click", () => goTo(slideIndex - 1));
    nextBtn.addEventListener("click", () => goTo(slideIndex + 1));
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") goTo(slideIndex - 1);
      if (e.key === "ArrowRight") goTo(slideIndex + 1);
    });
  }

  function goTo(i) {
    if (!slides.length) return;
    slideIndex = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    dotsWrap.querySelectorAll(".ub-dot").forEach((d, di) => d.classList.toggle("active", di === slideIndex));
  }

  // opts: { title, meta, description, images: [url,...], videoEmbedUrl, extraHTML }
  function openModal(opts) {
    buildModal();
    titleEl.textContent = opts.title || "";
    metaEl.textContent = opts.meta || "";
    metaEl.style.display = opts.meta ? "" : "none";
    descEl.textContent = opts.description || "";
    descEl.style.display = opts.description ? "" : "none";
    extraEl.innerHTML = opts.extraHTML || "";

    if (opts.videoEmbedUrl) {
      videoWrap.style.display = "";
      videoWrap.innerHTML = `<iframe src="${esc(opts.videoEmbedUrl)}" title="${esc(opts.title || "")}" loading="lazy" allowfullscreen></iframe>`;
      carouselWrap.style.display = "none";
    } else {
      videoWrap.style.display = "none";
      videoWrap.innerHTML = "";
      slides = (opts.images || []).filter(Boolean);
      if (slides.length) {
        carouselWrap.style.display = "";
        track.innerHTML = slides.map(url => `<div class="ub-modal-slide" style="background-image:url('${esc(url)}')"></div>`).join("");
        dotsWrap.innerHTML = slides.length > 1 ? slides.map((_, i) => `<span class="ub-dot" data-i="${i}"></span>`).join("") : "";
        dotsWrap.querySelectorAll(".ub-dot").forEach(d => d.addEventListener("click", () => goTo(Number(d.dataset.i))));
        prevBtn.style.display = nextBtn.style.display = slides.length > 1 ? "" : "none";
        slideIndex = 0;
        track.style.transform = "translateX(0)";
        goTo(0);
      } else {
        carouselWrap.style.display = "none";
      }
    }

    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    videoWrap.innerHTML = ""; // stop any playing video
  }

  // ---------- loading helpers ----------
  function spinnerHTML(text) {
    return `<div class="loading-state"><span class="spinner"></span>${text ? esc(text) : ""}</div>`;
  }

  function setBtnLoading(btn, text) {
    if (!btn || btn.dataset.ubLoading === "1") return;
    btn.dataset.ubLoading = "1";
    btn.dataset.ubOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner dark"></span> ${esc(text || "Working…")}`;
  }

  function resetBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.ubOriginal !== undefined) {
      btn.innerHTML = btn.dataset.ubOriginal;
      delete btn.dataset.ubOriginal;
    }
    delete btn.dataset.ubLoading;
  }

  window.UbuntuUI = { openModal, closeModal, spinnerHTML, setBtnLoading, resetBtn, esc };
})();
