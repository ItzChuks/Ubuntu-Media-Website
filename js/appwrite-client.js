// ── Ubuntu Media · shared Appwrite client (ES module) ────────────────────
// Loaded with <script type="module" src="js/appwrite-client.js"></script>
// Exposes everything on window.UbuntuAppwrite so plain <script> files
// (render.js, admin.js) can use it without needing to be modules themselves.

import {
  Client, Account, TablesDB, Storage, ID, Query
} from "https://cdn.jsdelivr.net/npm/appwrite@26/+esm";

const cfg = window.UBUNTU_APPWRITE_CONFIG;

const client = new Client()
  .setEndpoint(cfg.endpoint)
  .setProject(cfg.projectId);

const account = new Account(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

// Build a public, cache-busted view URL for a file in the media bucket.
function fileUrl(fileId) {
  if (!fileId) return "";
  return storage.getFileView({ bucketId: cfg.bucketId, fileId }).toString();
}

// Pull a YouTube video ID out of any common YouTube URL shape, regardless
// of query-param order (?si=...&v=ID as well as ?v=ID&t=30s), protocol,
// or subdomain (www./m./none).
function youtubeId(url) {
  if (!url) return null;
  let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/))([\w-]{11})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([\w-]{11})/);
  if (m) return m[1];
  return null;
}

// Pull a YouTube playlist ID (the `list=` param) out of a playlist or
// "watch video inside a playlist" URL.
function youtubePlaylistId(url) {
  if (!url) return null;
  const m = url.match(/[?&]list=([\w-]+)/);
  return m ? m[1] : null;
}

// Build a src URL for an <iframe> that will actually play the given
// YouTube link, whether it points at a single video or a playlist.
function youtubeEmbedUrl(url) {
  const vid = youtubeId(url);
  if (vid) return `https://www.youtube.com/embed/${vid}`;
  const list = youtubePlaylistId(url);
  if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
  return null;
}

function youtubeThumb(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

window.UbuntuAppwrite = {
  cfg, client, account, tablesDB, storage, ID, Query,
  fileUrl, youtubeId, youtubePlaylistId, youtubeEmbedUrl, youtubeThumb
};

// Let pages waiting on this module know it's ready.
document.dispatchEvent(new Event("ubuntu-appwrite-ready"));