# Ubuntu Media — Appwrite + clean URLs setup

## 1. Appwrite project

```bash
npm install -g appwrite-cli
appwrite login
appwrite init project        # or: link to an existing project
```

This repo already has `appwrite.config.json` (database `ubuntu_content` with
tables `board_members`, `events`, `stories`, `podcast_episodes`, and a
storage bucket `ubuntu_media_files`). Push it:

```bash
appwrite push tables
appwrite push buckets
```

Open `appwrite.config.json` and set your real `projectId` and `endpoint`
first (Appwrite Console → your project → Settings).

## 2. Frontend config

Edit `js/config.js` and fill in the same `endpoint` / `projectId`
(and table/bucket IDs if you changed them from the defaults above).

## 3. Create your admin login

The admin dashboard uses Appwrite's own email/password auth — there's no
public sign-up form on purpose. Create the account yourself:

```bash
appwrite users create --user-id unique() --email you@ubuntumedia.ca --password "a-strong-password" --name "Admin"
```

Sign in at `/admin` with that email/password. Anyone signed in as an
Appwrite user can create/edit/delete content, so only create accounts for
people you trust — don't build a public registration page.

## 4. Clean URLs (no `.html`) — works everywhere, no config needed

Every page lives at `<name>/index.html` (e.g. `stories/index.html`,
`board/index.html`) instead of `<name>.html` at the root. Any static file
server — VS Code Live Server, `vercel dev`, Vercel production, Netlify,
GitHub Pages, `python -m http.server`, whatever — already serves a
folder's `index.html` when you request that folder's path, so
`/stories`, `/board`, `/admin`, etc. just work out of the box. There's
no rewrite rule to configure and nothing extra to run.

`vercel.json` still sets `"cleanUrls": true` / `"trailingSlash": false`
as a small extra safety net on Vercel (e.g. redirecting a stray
`/stories.html` request to `/stories`), but it's not what makes routing
work — the folder structure is.

If you use Live Server, just click "Go Live" from the project root as
normal and visit `http://localhost:5501/stories`, `/board`, etc.

## 5. Deploy

```bash
vercel        # preview
vercel --prod # production
```

## What's admin-editable

| Page | Table | Notes |
|---|---|---|
| Board (`/board`) | `board_members` | name, role, bio, photo |
| Events (`/events`) | `events` | title, optional date/time label, description, up to 5 photos |
| Stories (`/stories`) | `stories` | YouTube link, title, description |
| Podcasts (`/podcast`) | `podcast_episodes` | one or more listen links (YouTube/Spotify/Apple/Other), optional playlist grouping, title, description |
