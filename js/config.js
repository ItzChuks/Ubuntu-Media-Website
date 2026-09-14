// ── Ubuntu Media · Appwrite connection settings ──────────────────────────
// Fill these in with the values from your Appwrite project (Project Settings
// → API Credentials) and from appwrite.config.json (same IDs used there).
// This file is loaded before appwrite-client.js on every page.

window.UBUNTU_APPWRITE_CONFIG = {
  endpoint: "https://fra.cloud.appwrite.io/v1", // your Appwrite endpoint (region subdomain)
  projectId: "6aa7d1ab876af73d2c75",                  // Appwrite project ID
  databaseId: "ubuntu_content",                  // must match appwrite.config.json
  tables: {
    boardMembers: "board_members",
    events: "events",
    stories: "stories",
    podcastEpisodes: "podcast_episodes"
  },
  bucketId: "ubuntu_media_files"
};
